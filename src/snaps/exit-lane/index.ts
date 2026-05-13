/**
 * exit-lane — tap one room in a Farcaster reply maze and try to find the exit.
 *
 * Components: text, badge, cell_grid, progress, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "exit-lane";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type CellValue = "mute" | "bookmark" | "draft" | "grass" | "coffee" | "thread" | "ratio" | "gm" | "portal";

type Outcome = {
  title: string;
  badge: string;
  line: string;
  detail: string;
  escape: number;
  accent: Accent;
  confetti?: boolean;
};

const CELLS: Array<{ row: number; col: number; value: CellValue; content: string; color: Accent }> = [
  { row: 0, col: 0, value: "mute", content: "🙈", color: "gray" },
  { row: 0, col: 1, value: "bookmark", content: "🔖", color: "blue" },
  { row: 0, col: 2, value: "draft", content: "✍️", color: "purple" },
  { row: 1, col: 0, value: "grass", content: "🌿", color: "green" },
  { row: 1, col: 1, value: "coffee", content: "☕", color: "amber" },
  { row: 1, col: 2, value: "thread", content: "🧵", color: "teal" },
  { row: 2, col: 0, value: "ratio", content: "📉", color: "red" },
  { row: 2, col: 1, value: "gm", content: "☀️", color: "pink" },
  { row: 2, col: 2, value: "portal", content: "🌀", color: "purple" },
];

const OUTCOMES: Record<CellValue, Omit<Outcome, "escape">> = {
  mute: {
    title: "Soft exit found",
    badge: "Blessed mute",
    line: "You slipped out through the velvet mute curtain. Nobody noticed, which is the whole point.",
    detail: "The reply maze loses 22 goblins of power when you refuse to quote-cast the bait.",
    accent: "gray",
  },
  bookmark: {
    title: "Bookmark trap",
    badge: "Later goblin",
    line: "You saved the thread for later. Later is now a haunted folder with snacks.",
    detail: "Good instincts, questionable follow-through. The maze respects your aspirational filing system.",
    accent: "blue",
  },
  draft: {
    title: "Draft corridor",
    badge: "Almost posted",
    line: "You wrote three perfect replies and deleted two. The remaining sentence is wearing a tiny helmet.",
    detail: "This is not an exit, but it is character development with punctuation.",
    accent: "purple",
  },
  grass: {
    title: "Actual exit",
    badge: "Door to outside",
    line: "You opened the grass door. The timeline hissed, then became one tab less powerful.",
    detail: "Congratulations: you escaped the reply maze using ancient sunlight technology.",
    accent: "green",
    confetti: true,
  },
  coffee: {
    title: "Caffeine loop",
    badge: "Hot take warmer",
    line: "You found coffee. Helpful, but now your draft has footnotes and a minor legal department.",
    detail: "Energy restored. Escape probability improved, but the maze smells productive now.",
    accent: "amber",
  },
  thread: {
    title: "Thread tunnel",
    badge: "One more reply",
    line: "The thread tunnel promised context and delivered a second, smaller maze inside the first one.",
    detail: "Classic architecture. Very Farcaster. Zero building permits.",
    accent: "teal",
  },
  ratio: {
    title: "Ratio swamp",
    badge: "Ankles grabbed",
    line: "You stepped into the ratio swamp. A frog with a checkmark asked for sources.",
    detail: "Retreat calmly. Do not make eye contact with the quote-cast reeds.",
    accent: "red",
  },
  gm: {
    title: "GM side door",
    badge: "Friendly detour",
    line: "You found the GM side door. Everyone waved. Somehow you are still in the app.",
    detail: "Morale improved. Escape postponed until after one more wholesome notification.",
    accent: "pink",
  },
  portal: {
    title: "Wizard portal",
    badge: "Chaotic shortcut",
    line: "The portal blinked, complimented your PFP, and dropped you two rooms closer to freedom.",
    detail: "Not the clean exit, but the maze has filed a complaint with wizard HR.",
    accent: "purple",
  },
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCell(value: unknown): CellValue {
  const asString = String(value ?? "portal");
  return CELLS.some((cell) => cell.value === asString) ? (asString as CellValue) : "portal";
}

function escapeScore(fid: number, value: CellValue): number {
  if (value === "grass") return 100;
  const seed = hashText(`${SNAP_NAME}:${todayKey()}:${fid || "anon"}:${value}`);
  const base: Record<CellValue, number> = {
    mute: 82,
    bookmark: 48,
    draft: 61,
    grass: 100,
    coffee: 56,
    thread: 33,
    ratio: 12,
    gm: 70,
    portal: 77,
  };
  return Math.min(99, Math.max(1, (base[value] ?? 50) + (seed % 17) - 8));
}

function shareButton(self: string, text = "I tried Exit Lane, a tiny reply-maze escape snap.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderStart(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "prompt", "maze", "hint", "share_btn"],
    },
    title: { type: "text", props: { content: "Exit Lane", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: "Reply maze micro-game", variant: "outline" } },
    prompt: {
      type: "text",
      props: { content: "You are trapped in a thread that keeps growing new opinions. Tap one room to hunt for the exit.", align: "center" },
    },
    maze: {
      type: "cell_grid",
      props: {
        name: "room",
        cols: 3,
        rows: 3,
        rowHeight: 52,
        cellAspectRatio: "square",
        cells: CELLS.map((cell) => ({
          row: cell.row,
          col: cell.col,
          color: cell.color,
          content: cell.content,
          value: cell.value,
        })),
      },
      on: { press: { action: "submit", params: { target: `${self}?escape=1` } } },
    },
    hint: { type: "text", props: { content: "No strategy guide. The maze changes its paperwork daily.", size: "sm", align: "center" } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "green" }, ui: { root: "page", elements } };
}

function renderResult(self: string, fid: number, value: CellValue): SnapHandlerResult {
  const template = OUTCOMES[value] ?? OUTCOMES.portal;
  const escape = escapeScore(fid, value);
  const shareText = value === "grass" ? "I escaped the Exit Lane reply maze through the grass door. 🌿" : `Exit Lane gave my reply-maze escape odds ${escape}%.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "line", "detail", "buttons"],
    },
    title: { type: "text", props: { content: template.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: template.badge, variant: "outline", color: template.accent } },
    meter: { type: "progress", props: { label: "Escape odds", value: escape, max: 100 } },
    line: { type: "text", props: { content: template.line, align: "center" } },
    detail: { type: "text", props: { content: template.detail, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again_btn", "share_btn"] },
    again_btn: {
      type: "button",
      props: { label: "Re-enter maze", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share result"),
  };

  return {
    version: "2.0",
    theme: { accent: template.accent },
    ...(template.confetti ? { effects: ["confetti" as const] } : {}),
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const fid = ctx.action.type === "get" ? (ctx.action.user?.fid ?? 0) : ctx.action.user.fid;

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderStart(self);
    }

    return renderResult(self, fid, normalizeCell(ctx.action.inputs?.room));
  },
  {
    openGraph: {
      title: "Exit Lane",
      description: "Tap one room and try to escape a tiny Farcaster reply maze.",
    },
  },
);

export default app;
