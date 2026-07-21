/**
 * tiny-tap-test — tap the green cell before the timer goblin catches you.
 *
 * Components: text, badge, cell_grid, progress, button, stack
 * Actions: submit, compose_cast
 * State: stateless URL params
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "tiny-tap-test";
const GRID_SIZE = 25;
const WIN_HITS = 5;
const MAX_TAPS = 7;

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Cell = { row: number; col: number; color: Accent; content: string; value: string };

type RunState = {
  hits: number;
  taps: number;
  streak: number;
  lastHit: boolean | null;
  target: number;
  done: boolean;
  won: boolean;
  score: number;
  accuracy: number;
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

function clampInt(value: string | null, min: number, max: number): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function cellInput(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < GRID_SIZE ? parsed : null;
}

function targetFor(fid: number, taps: number, hits: number, streak: number): number {
  const safeFid = Math.max(0, Math.floor(fid || 0));
  return hashText(`tiny-tap-test:${todayKey()}:${safeFid}:${taps}:${hits}:${streak}`) % GRID_SIZE;
}

function scoreFor(hits: number, taps: number, streak: number): number {
  const misses = Math.max(0, taps - hits);
  return Math.max(0, hits * 100 + streak * 15 - misses * 30 - taps * 7);
}

function buildState(fid: number, url: URL): RunState {
  const hits = clampInt(url.searchParams.get("h"), 0, WIN_HITS);
  const taps = clampInt(url.searchParams.get("t"), 0, MAX_TAPS);
  const streak = clampInt(url.searchParams.get("st"), 0, WIN_HITS);
  const last = url.searchParams.get("last");
  const lastHit = last === "hit" ? true : last === "miss" ? false : null;
  const target = targetFor(fid, taps, hits, streak);
  const done = hits >= WIN_HITS || taps >= MAX_TAPS;
  const won = hits >= WIN_HITS;
  const score = scoreFor(hits, taps, streak);
  const accuracy = taps === 0 ? 0 : Math.round((hits / taps) * 100);
  return { hits, taps, streak, lastHit, target, done, won, score, accuracy };
}

function cellsFor(state: RunState): Cell[] {
  return Array.from({ length: GRID_SIZE }, (_, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const isTarget = index === state.target && !state.done;
    const color: Accent = state.done ? (index % 2 === 0 ? "gray" : "blue") : isTarget ? "green" : (row + col) % 2 === 0 ? "purple" : "gray";
    const content = state.done ? "·" : isTarget ? "TAP" : "";
    return { row, col, color, content, value: String(index) };
  });
}

function nextTarget(self: string, state: RunState): string {
  return `${self}?h=${state.hits}&t=${state.taps}&st=${state.streak}`;
}

function shareButton(self: string, text = "I took the Tiny Tap Test. Five green cells, one timer goblin, no mercy.") {
  return {
    type: "button" as const,
    props: { label: "Share run", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function page(self: string, state: RunState): SnapHandlerResult {
  const remaining = Math.max(0, MAX_TAPS - state.taps);
  const timer = Math.max(0, Math.round((remaining / MAX_TAPS) * 100));
  const target = nextTarget(self, state);
  const status = state.done
    ? state.won
      ? `Cleared: ${state.hits}/${WIN_HITS} targets, ${state.accuracy}% accuracy, score ${state.score}.`
      : `Goblin got you: ${state.hits}/${WIN_HITS} targets, ${state.accuracy}% accuracy, score ${state.score}.`
    : state.taps === 0
      ? "Tap green cells. You get 7 taps to hit 5 targets. Purple cells are decoys."
      : state.lastHit
        ? `Hit. ${state.hits}/${WIN_HITS} targets, ${remaining} taps left. New green cell is live.`
        : `Miss. ${state.hits}/${WIN_HITS} targets, ${remaining} taps left. Aim for the green TAP cell.`;
  const badge = state.done ? (state.won ? "speed gremlin dodged" : "timer goblin wins") : state.lastHit === null ? "ready" : state.lastHit ? "clean hit" : "decoy tapped";
  const shareText = state.done
    ? `Tiny Tap Test: ${state.hits}/${WIN_HITS} targets, ${state.accuracy}% accuracy, score ${state.score}.`
    : "I am chasing green cells in Tiny Tap Test. The timer goblin is rude.";

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "timer", "grid", "badge", "status", "new_run", "share_btn"] },
    title: { type: "text", props: { content: state.done ? "Tiny Tap Test result" : "Tiny Tap Test", weight: "bold", align: "center" } },
    timer: { type: "progress", props: { label: state.done ? `Score ${state.score}` : "Timer goblin distance", value: state.done ? state.score : timer, max: state.done ? 600 : 100 } },
    grid: {
      type: "cell_grid",
      props: { name: "cell", cols: 5, rows: 5, rowHeight: 32, cells: cellsFor(state) },
      on: { press: { action: "submit", params: { target } } },
    },
    badge: { type: "badge", props: { label: badge, variant: "outline", color: state.done ? (state.won ? "green" : "red") : "accent" } },
    status: { type: "text", props: { content: status, size: "sm", align: "center" } },
    new_run: {
      type: "button",
      props: { label: state.done ? "Play again" : "Reset run", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return { version: "2.0", theme: { accent: state.done ? (state.won ? "green" : "red") : "purple" }, effects: state.won ? ["confetti"] : undefined, ui: { root: "page", elements } };
}

function updateState(fid: number, url: URL, picked: number | null): RunState {
  const current = buildState(fid, url);
  if (url.searchParams.get("reset") === "1") return buildState(fid, new URL(url.origin + url.pathname));
  if (current.done) return current;
  const hit = picked === current.target;
  const hits = Math.min(WIN_HITS, current.hits + (hit ? 1 : 0));
  const taps = Math.min(MAX_TAPS, current.taps + 1);
  const streak = hit ? Math.min(WIN_HITS, current.streak + 1) : 0;
  const nextUrl = new URL(url.origin + url.pathname);
  nextUrl.searchParams.set("h", String(hits));
  nextUrl.searchParams.set("t", String(taps));
  nextUrl.searchParams.set("st", String(streak));
  nextUrl.searchParams.set("last", hit ? "hit" : "miss");
  return buildState(fid, nextUrl);
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const fid = ctx.action.type === "post" ? ctx.action.user.fid : (ctx.action.user?.fid ?? 0);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return page(self, buildState(fid, new URL(url.origin + url.pathname)));
    }

    return page(self, updateState(fid, url, cellInput(ctx.action.inputs?.cell)));
  },
  {
    openGraph: {
      title: "Tiny Tap Test",
      description: "Tap the green target cells before the timer goblin catches you.",
    },
  },
);

export default app;
