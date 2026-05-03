/**
 * timeline-bingo — a tiny daily bingo card for the Farcaster feed.
 *
 * Components: text, badge, cell_grid, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "timeline-bingo";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Cell = { row: number; col: number; color: Accent };

type BingoCard = {
  squares: string[];
  highlights: string[];
  cells: Cell[];
  badge: string;
  accent: Accent;
  salt: number;
};

const SQUARES = [
  "Someone says shipping",
  "A founder posts a poll",
  "GM arrives six hours late",
  "A bot compliments itself",
  "Hot take becomes homework",
  "Frame veteran says snap",
  "Builder asks for feedback",
  "Reply guy turns poet",
  "New tool drops quietly",
  "Someone explains Base",
  "A tiny launch appears",
  "The timeline debates tabs",
  "A meme gets serious",
  "A quote-cast goes feral",
  "Someone touches grass",
  "Free space: one typo",
  "A graph appears unasked",
  "The group chat leaks",
  "A dev says soon",
  "A wizard overdelivers",
  "Someone asks what changed",
  "A thread needs a map",
  "Coffee becomes strategy",
  "One cast fixes your day",
];

const BADGES = ["Low-key chaos", "Builder weather", "Reply goblin mode", "Surprisingly accurate", "Today’s omen"];
const ACCENTS: Accent[] = ["teal", "purple", "amber", "green", "pink", "blue"];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function asSalt(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9999, Math.floor(parsed)));
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickNine(rand: () => number): string[] {
  const pool = [...SQUARES];
  const picks: string[] = [];
  while (picks.length < 9 && pool.length > 0) {
    const index = Math.floor(rand() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item) picks.push(item);
  }
  return picks;
}

function buildCard(fid: number, salt: number): BingoCard {
  const safeFid = Math.max(0, Math.floor(fid || 0));
  const seed = hashText(`${todayKey()}|${safeFid}|${salt}`);
  const rand = mulberry32(seed);
  const squares = pickNine(rand);
  const accent = ACCENTS[seed % ACCENTS.length] ?? "teal";
  const badge = BADGES[Math.floor(rand() * BADGES.length)] ?? BADGES[0];
  const hot: Accent[] = [accent, "gray", "amber", "purple"];
  const cells: Cell[] = squares.map((_, index) => ({
    row: Math.floor(index / 3),
    col: index % 3,
    color: hot[(index + seed) % hot.length] ?? accent,
  }));
  const highlights = [squares[0], squares[4], squares[8]].filter(Boolean);

  return { squares, highlights, cells, badge, accent, salt };
}

function shareButton(self: string, text = "I dealt today’s Timeline Bingo on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "hint", "deal", "share_btn"],
    },
    title: { type: "text", props: { content: "Timeline Bingo", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Get a tiny 3x3 bingo card for today’s Farcaster feed.",
        align: "center",
      },
    },
    hint: {
      type: "text",
      props: { content: "Deal a card, then scroll until the prophecy gets uncomfortable.", size: "sm", align: "center" },
    },
    deal: {
      type: "button",
      props: { label: "Deal my card", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?salt=0` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, card: BingoCard): SnapHandlerResult {
  const nextSalt = (card.salt + 1) % 10000;
  const list = card.highlights.map((square) => `• ${square}`).join("\n");
  const shareText = `My Timeline Bingo card says:\n${card.highlights.map((square) => `• ${square}`).join("\n")}\nDeal yours.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "list", "new_card", "share_btn"],
    },
    title: { type: "text", props: { content: "Today’s card", weight: "bold", align: "center" } },
    grid: {
      type: "cell_grid",
      props: {
        cols: 3,
        rows: 3,
        rowHeight: 44,
        cells: card.cells,
      },
    },
    badge: { type: "badge", props: { label: card.badge, variant: "outline" } },
    list: { type: "text", props: { content: list, size: "sm" } },
    new_card: {
      type: "button",
      props: { label: "New card", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?salt=${nextSalt}` } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return { version: "2.0", theme: { accent: card.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get") {
      return startPage(self);
    }

    const fid = ctx.action.user?.fid ?? 0;
    const salt = asSalt(url.searchParams.get("salt"));
    return resultPage(self, buildCard(fid, salt));
  },
  {
    openGraph: {
      title: "Timeline Bingo",
      description: "Deal a tiny bingo card for today’s Farcaster feed.",
    },
  },
);

export default app;
