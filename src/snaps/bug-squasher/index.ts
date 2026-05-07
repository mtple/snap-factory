/**
 * bug-squasher — tiny snap-native 3x3 bug hunt for builders.
 *
 * Components: text, cell_grid, badge, progress, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "bug-squasher";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type BugCell = { row: number; col: number; color: Accent; content: string; value: string };

const BUG_LABELS = ["CSS", "API", "ENV", "DB", "AUTH", "CACHE", "TYPE", "404", "TIME"];
const MISS_LINES = [
  "The bug saw your cursor and filed for remote work.",
  "You squashed a TODO. Useful, but the bug escaped.",
  "False alarm: just a semicolon doing performance art.",
  "You found a console.log wearing a trench coat.",
  "Close. The bug left tiny footprints in the diff.",
];
const HIT_LINES = [
  "Direct hit. The stack trace has been returned to the earth.",
  "Squashed. Ship bell rings in the distance.",
  "Bug deleted. The wizard marks the PR as emotionally green.",
  "Clean hit. QA sends one cautious thumbs-up.",
];

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

function bugIndexFor(fid: number, date = todayKey()): number {
  return hashText(`bug-squasher:${fid || "anon"}:${date}`) % 9;
}

function cleanPick(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? "-1"), 10);
  if (!Number.isFinite(parsed)) return -1;
  return parsed >= 0 && parsed <= 8 ? parsed : -1;
}

function boardCells(reveal?: { picked: number; bug: number }): BugCell[] {
  return BUG_LABELS.map((label, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const isBug = reveal?.bug === index;
    const isPick = reveal?.picked === index;
    const hit = isBug && isPick;
    const color: Accent = hit ? "green" : isBug ? "red" : isPick ? "amber" : (index + row) % 2 === 0 ? "gray" : "blue";
    const content = hit ? "💥" : isBug ? "🐛" : isPick ? "👀" : label;
    return { row, col, color, content, value: String(index) };
  });
}

function shareButton(self: string, text = "I played Bug Squasher. Nine cells, one sneaky production bug. 🐛", label = "Share hunt"): SnapElementInput {
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
      children: ["title", "intro", "hint", "grid", "share_btn"],
    },
    title: { type: "text", props: { content: "Bug Squasher", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "One production bug is hiding in this 3×3 board. Tap a cell before it ships itself.", size: "sm", align: "center" },
    },
    hint: { type: "badge", props: { label: "Daily per FID", variant: "outline" } },
    grid: {
      type: "cell_grid",
      props: { name: "cell", cols: 3, rows: 3, rowHeight: 44, cellAspectRatio: "square", cells: boardCells() },
      on: { press: { action: "submit", params: { target: `${self}?pick=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function renderResult(self: string, fid: number, picked: number): SnapHandlerResult {
  const bug = bugIndexFor(fid);
  const hit = picked === bug;
  const seed = hashText(`${fid}:${picked}:${bug}:${todayKey()}`);
  const line = hit ? HIT_LINES[seed % HIT_LINES.length] : MISS_LINES[seed % MISS_LINES.length];
  const distance = picked < 0 ? 0 : Math.abs(Math.floor(picked / 3) - Math.floor(bug / 3)) + Math.abs((picked % 3) - (bug % 3));
  const heat = hit ? 100 : Math.max(18, 100 - distance * 27);
  const clue = hit ? "Bug located. Please enjoy this tiny confetti incident." : `Heat: ${distance <= 1 ? "dangerously warm" : "mildly cursed"}. The bug was in ${BUG_LABELS[bug]}.`;
  const shareText = hit
    ? "I squashed today's Bug Squasher bug in one tap. Suspiciously competent. 🐛"
    : `I missed the Bug Squasher bug. It was hiding in ${BUG_LABELS[bug]}. Rude.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "heat", "result", "again", "share_btn"],
    },
    title: { type: "text", props: { content: hit ? "Bug squashed" : "Bug escaped", weight: "bold", align: "center" } },
    grid: { type: "cell_grid", props: { cols: 3, rows: 3, rowHeight: 34, cellAspectRatio: "square", cells: boardCells({ picked, bug }) } },
    badge: { type: "badge", props: { label: hit ? "Clean deploy" : "Needs one more PR", variant: "outline" } },
    heat: { type: "progress", props: { label: "Bug heat", value: heat, max: 100 } },
    result: { type: "text", props: { content: `${line}\n${clue}`, size: "sm", align: "center" } },
    again: {
      type: "button",
      props: { label: "Hunt again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, hit ? "Share victory" : "Share miss"),
  };

  return { version: "2.0", theme: { accent: hit ? "green" : "amber" }, effects: hit ? ["confetti"] : undefined, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderStart(self);
    }

    const fid = ctx.action.user.fid;
    const picked = cleanPick(ctx.action.inputs?.cell ?? ctx.action.inputs?.grid_tap);
    return renderResult(self, fid, picked);
  },
  {
    openGraph: {
      title: "Bug Squasher",
      description: "A tiny snap-native 3×3 bug hunt for builders. Tap once, find the gremlin.",
    },
  },
);

export default app;
