/**
 * community-call-bingo — a tiny bingo card for Farcaster community-call chaos.
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
const SNAP_NAME = "community-call-bingo";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Cell = { row: number; col: number; color: Accent; content: string; value: string };

type BingoCard = {
  squares: string[];
  highlights: string[];
  cells: Cell[];
  badge: string;
  accent: Accent;
  salt: number;
};

const SQUARES = [
  "Soon™",
  "Roadmap fog",
  "Demo reload",
  "Awkward pause",
  "Feature tease",
  "Rewards question",
  "Mid-call ship",
  "Quick update",
  "Screen-share curse",
  "Docs request",
  "Poll derail",
  "Native feel",
  "Beta caveat",
  "Bug = roadmap",
  "Cross-talk",
  "GM free space",
  "After the call",
  "Tiny alpha",
  "Recording ask",
  "One more q",
  "Almost metric",
  "Demo gods",
  "Recap cast",
  "Wizard omen",
];

const BADGES = ["call gremlin", "roadmap weather", "demo omen", "feature fog", "recap goblin"];
const ACCENTS: Accent[] = ["purple", "teal", "amber", "blue", "green", "pink"];

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

export function buildCard(fid: number, salt: number): BingoCard {
  const safeFid = Math.max(0, Math.floor(fid || 0));
  const seed = hashText(`${todayKey()}|${safeFid}|${salt}|community-call-bingo`);
  const rand = mulberry32(seed);
  const squares = pickNine(rand);
  const accent = ACCENTS[seed % ACCENTS.length] ?? "purple";
  const badge = BADGES[Math.floor(rand() * BADGES.length)] ?? BADGES[0];
  const palette: Accent[] = [accent, "gray", "teal", "amber"];
  const cells: Cell[] = squares.map((square, index) => ({
    row: Math.floor(index / 3),
    col: index % 3,
    color: palette[(index + seed) % palette.length] ?? accent,
    content: square,
    value: String(index),
  }));
  const highlights = [squares[0], squares[4], squares[8]].filter(Boolean);

  return { squares, highlights, cells, badge, accent, salt };
}

function shareButton(self: string, text = "I dealt Community Call Bingo. Roadmap fog, demo gods, tiny chaos.") {
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
    title: { type: "text", props: { content: "Community Call Bingo", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Deal a readable 3x3 card for feature teasers, awkward pauses, roadmap fog, demos, and community-call chaos.",
        align: "center",
      },
    },
    hint: {
      type: "text",
      props: { content: "Bring it to the next Farcaster call. Mark squares spiritually; do not shout bingo unless deserved.", size: "sm", align: "center" },
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
  const shareText = `My Community Call Bingo card says:\n${card.highlights.map((square) => `• ${square}`).join("\n")}\nDeal yours.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "watch", "new_card", "share_btn"],
    },
    title: { type: "text", props: { content: "Your call chaos card", weight: "bold", align: "center" } },
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
    watch: { type: "text", props: { content: `Center-line watch:\n${list}`, size: "sm", align: "center" } },
    new_card: {
      type: "button",
      props: { label: "New card", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?salt=${nextSalt}` } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return { version: "2.0", theme: { accent: card.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get") {
      return startPage(self);
    }

    const fid = ctx.action.user.fid;
    const salt = asSalt(url.searchParams.get("salt"));
    return resultPage(self, buildCard(fid, salt));
  },
  {
    openGraph: {
      title: "Community Call Bingo",
      description: "Deal a tiny bingo card for Farcaster community-call chaos.",
    },
  },
);

export default app;
