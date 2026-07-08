/**
 * community-call-bingo — a tiny tappable bingo card for Farcaster community-call chaos.
 *
 * Components: text, badge, cell_grid, button, stack
 * Actions: submit, compose_cast
 * State: stateless URL params
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
  cells: Cell[];
  badge: string;
  accent: Accent;
  salt: number;
  checked: Set<number>;
  checkedMask: string;
  checkedCount: number;
  hasBingo: boolean;
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
const BINGO_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function asSalt(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9999, Math.floor(parsed)));
}

function parseChecked(value: string | null): Set<number> {
  const set = new Set<number>();
  for (const part of String(value ?? "").split(".")) {
    if (part === "") continue;
    const index = Number(part);
    if (Number.isInteger(index) && index >= 0 && index <= 8) set.add(index);
  }
  return set;
}

function checkedMask(checked: Set<number>): string {
  return [...checked].sort((a, b) => a - b).join(".");
}

function cellInput(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = String(value ?? "");
  if (text === "") return null;
  const index = Number(text);
  return Number.isInteger(index) && index >= 0 && index <= 8 ? index : null;
}

function toggleChecked(checked: Set<number>, index: number | null): Set<number> {
  const next = new Set(checked);
  if (index === null) return next;
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}

function hasBingo(checked: Set<number>): boolean {
  return BINGO_LINES.some((line) => line.every((index) => checked.has(index)));
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

export function buildCard(fid: number, salt: number, checked = new Set<number>()): BingoCard {
  const safeFid = Math.max(0, Math.floor(fid || 0));
  const seed = hashText(`${todayKey()}|${safeFid}|${salt}|community-call-bingo`);
  const rand = mulberry32(seed);
  const squares = pickNine(rand);
  const accent = ACCENTS[seed % ACCENTS.length] ?? "purple";
  const badge = hasBingo(checked) ? "BINGO" : (BADGES[Math.floor(rand() * BADGES.length)] ?? BADGES[0]);
  const palette: Accent[] = [accent, "gray", "teal", "amber"];
  const cells: Cell[] = squares.map((square, index) => {
    const marked = checked.has(index);
    return {
      row: Math.floor(index / 3),
      col: index % 3,
      color: marked ? "green" : (palette[(index + seed) % palette.length] ?? accent),
      content: marked ? `✓ ${square}` : square,
      value: String(index),
    };
  });

  return {
    squares,
    cells,
    badge,
    accent: hasBingo(checked) ? "green" : accent,
    salt,
    checked,
    checkedMask: checkedMask(checked),
    checkedCount: checked.size,
    hasBingo: hasBingo(checked),
  };
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
        content: "Deal a tappable 3x3 card for feature teasers, awkward pauses, roadmap fog, demos, and community-call chaos.",
        align: "center",
      },
    },
    hint: {
      type: "text",
      props: { content: "Tap cells as they happen. Three in a row means the call goblin wins.", size: "sm", align: "center" },
    },
    deal: {
      type: "button",
      props: { label: "Deal my card", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?salt=0&checked=` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, card: BingoCard): SnapHandlerResult {
  const nextSalt = (card.salt + 1) % 10000;
  const status = card.hasBingo
    ? "BINGO. The roadmap fog has formed a line."
    : card.checkedCount === 0
      ? "Tap a cell when it happens. Marked cells turn green."
      : `${card.checkedCount}/9 marked. Keep watching the call.`;
  const shareText = card.hasBingo
    ? "I hit Community Call Bingo. Roadmap fog successfully manifested."
    : `My Community Call Bingo card has ${card.checkedCount}/9 squares marked.`;
  const target = `${self}?salt=${card.salt}&checked=${card.checkedMask}`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "status", "new_card", "share_btn"],
    },
    title: { type: "text", props: { content: "Your call bingo card", weight: "bold", align: "center" } },
    grid: {
      type: "cell_grid",
      props: {
        name: "cell",
        cols: 3,
        rows: 3,
        rowHeight: 52,
        cells: card.cells,
      },
      on: { press: { action: "submit", params: { target } } },
    },
    badge: { type: "badge", props: { label: card.badge, variant: "outline", color: card.hasBingo ? "green" : "accent" } },
    status: { type: "text", props: { content: status, size: "sm", align: "center" } },
    new_card: {
      type: "button",
      props: { label: "New card", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?salt=${nextSalt}&checked=` } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return { version: "2.0", theme: { accent: card.accent }, effects: card.hasBingo ? ["confetti"] : undefined, ui: { root: "page", elements } };
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
    const checked = toggleChecked(parseChecked(url.searchParams.get("checked")), cellInput(ctx.action.inputs?.cell));
    return resultPage(self, buildCard(fid, salt, checked));
  },
  {
    openGraph: {
      title: "Community Call Bingo",
      description: "Deal a tappable bingo card for Farcaster community-call chaos.",
    },
  },
);

export default app;
