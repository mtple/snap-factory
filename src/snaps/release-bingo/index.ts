/**
 * release-bingo — a tiny bingo card for upcoming Snap release-note chaos.
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
const SNAP_NAME = "release-bingo";

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
  "Someone asks if Frames are back",
  "A button learns a new trick",
  "Composer magic gets demoed",
  "Release notes say beta twice",
  "A builder ships during lunch",
  "One schema field becomes lore",
  "Someone discovers open_snap",
  "A tiny poll causes discourse",
  "Docs update mid-thread",
  "A grid starts acting smug",
  "A teaser contains three eyes",
  "Someone says native feel",
  "The sample app is copied",
  "A cast becomes a control panel",
  "Reply guy requests chess",
  "Free space: it works live",
  "A screenshot hides the answer",
  "Everyone tests at once",
  "A JSON error gets dramatic",
  "The client cache is haunted",
  "A new action appears quietly",
  "Someone posts a receipt",
  "The wizard reads the docs",
  "A mini app waves from backstage",
];

const BADGES = ["Teaser weather", "Docs goblin mode", "Builder omen", "Ship it carefully", "Spec crystal ball"];
const ACCENTS: Accent[] = ["teal", "purple", "amber", "green", "blue", "pink"];

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
  const seed = hashText(`${todayKey()}|${safeFid}|${salt}|release-bingo`);
  const rand = mulberry32(seed);
  const squares = pickNine(rand);
  const accent = ACCENTS[seed % ACCENTS.length] ?? "teal";
  const badge = BADGES[Math.floor(rand() * BADGES.length)] ?? BADGES[0];
  const palette: Accent[] = [accent, "gray", "purple", "amber"];
  const cells: Cell[] = squares.map((_, index) => ({
    row: Math.floor(index / 3),
    col: index % 3,
    color: palette[(index + seed) % palette.length] ?? accent,
  }));
  const highlights = [squares[0], squares[4], squares[8]].filter(Boolean);

  return { squares, highlights, cells, badge, accent, salt };
}

function shareButton(self: string, text = "I dealt Snap Release Bingo. Tiny prophecy, large docs energy.") {
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
    title: { type: "text", props: { content: "Snap Release Bingo", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "A 3x3 prophecy card for the next wave of Snap release-note chaos.",
        align: "center",
      },
    },
    hint: {
      type: "text",
      props: { content: "Deal a card, watch the /snaps timeline, and mark squares spiritually.", size: "sm", align: "center" },
    },
    deal: {
      type: "button",
      props: { label: "Deal my card", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?salt=0` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, card: BingoCard): SnapHandlerResult {
  const nextSalt = (card.salt + 1) % 10000;
  const list = card.highlights.map((square) => `• ${square}`).join("\n");
  const shareText = `My Snap Release Bingo card says:\n${card.highlights.map((square) => `• ${square}`).join("\n")}\nDeal yours.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "list", "new_card", "share_btn"],
    },
    title: { type: "text", props: { content: "Your release-note prophecy", weight: "bold", align: "center" } },
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
      title: "Snap Release Bingo",
      description: "Deal a tiny bingo card for the next wave of Snap release-note chaos.",
    },
  },
);

export default app;
