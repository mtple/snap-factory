/**
 * onchain-score-guess — guess your playful Base onchain score before reveal.
 *
 * Components: text, slider, progress, badge, item_group, item, button, stack
 * Actions: submit, compose_cast
 * State: Turso KV per FID weekly streak + best hit
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "onchain-score-guess";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type GuessStats = {
  streak: number;
  bestOff: number | null;
  bestGuess: number | null;
  lastWeek: string | null;
  lastHit: boolean;
};

type Verdict = {
  tier: string;
  badge: string;
  line: string;
  accent: Accent;
  hit: boolean;
};

const DEFAULT_STATS: GuessStats = { streak: 0, bestOff: null, bestGuess: null, lastWeek: null, lastHit: false };

function utcWeekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function scoreFor(fid: number, week: string): number {
  const input = `${fid}:${week}:base-blue-oracle`;
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 100) + 1;
}

function parseGuess(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function statsKey(fid: number): string {
  return `${SNAP_NAME}:fid:${fid}:stats`;
}

function normalizeStats(value: unknown): GuessStats {
  if (!value || typeof value !== "object") return { ...DEFAULT_STATS };
  const raw = value as Partial<GuessStats>;
  return {
    streak: typeof raw.streak === "number" && Number.isFinite(raw.streak) ? Math.max(0, Math.round(raw.streak)) : 0,
    bestOff: typeof raw.bestOff === "number" && Number.isFinite(raw.bestOff) ? Math.max(0, Math.round(raw.bestOff)) : null,
    bestGuess: typeof raw.bestGuess === "number" && Number.isFinite(raw.bestGuess) ? Math.max(1, Math.min(100, Math.round(raw.bestGuess))) : null,
    lastWeek: typeof raw.lastWeek === "string" ? raw.lastWeek : null,
    lastHit: raw.lastHit === true,
  };
}

function verdictFor(offBy: number): Verdict {
  if (offBy === 0) return { tier: "Exact hit", badge: "oracle grade", line: "Bullseye. The blue chain blinked twice.", accent: "green", hit: true };
  if (offBy <= 3) return { tier: "Within 3", badge: "nearly psychic", line: "Close enough to hear the sequencer humming.", accent: "teal", hit: true };
  if (offBy <= 10) return { tier: "Within 10", badge: "good read", line: "A respectable onchain squint.", accent: "blue", hit: true };
  if (offBy <= 25) return { tier: "Drifted", badge: "wallet fog", line: "Not wrong, just reading a different mempool cloud.", accent: "amber", hit: false };
  return { tier: "Rugged by math", badge: "try again", line: "The score goblin moved the decimal in spirit.", accent: "red", hit: false };
}

async function updateStats(fid: number, week: string, guess: number, offBy: number, hit: boolean): Promise<GuessStats> {
  const key = statsKey(fid);
  const current = normalizeStats(await store.get(key));
  const bestOff = current.bestOff === null ? offBy : Math.min(current.bestOff, offBy);
  const bestGuess = current.bestOff === null || offBy < current.bestOff ? guess : current.bestGuess;

  let streak = current.streak;
  let lastHit = current.lastHit;
  if (current.lastWeek !== week) {
    streak = hit ? current.streak + 1 : 0;
    lastHit = hit;
  }

  const next: GuessStats = { streak, bestOff, bestGuess, lastWeek: week, lastHit };
  await store.set(key, next);
  return next;
}

function shareButton(self: string, text = "Guess your Base onchain score before the wizard reveals it."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share snap", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function shell(elements: Elements, accent: Accent, effects?: ["confetti"]): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent },
    ...(effects ? { effects } : {}),
    ui: { root: "page", elements },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "guess", "go", "share_btn"],
    },
    title: { type: "text", props: { content: "Base Score Guess", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Guess your playful Base onchain score from 1–100. Then the wizard reveals this week’s number and tracks your streak.",
        size: "sm",
        align: "center",
      },
    },
    guess: { type: "slider", props: { name: "guess", label: "Your guess", min: 1, max: 100, step: 1, defaultValue: 50 } },
    go: {
      type: "button",
      props: { label: "Reveal my score", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=guess` } } },
    },
    share_btn: shareButton(self),
  };
  return shell(elements, "blue");
}

function resultPage(self: string, fid: number, week: string, guess: number, score: number, stats: GuessStats): SnapHandlerResult {
  const offBy = Math.abs(score - guess);
  const verdict = verdictFor(offBy);
  const accuracy = Math.max(0, 100 - offBy);
  const shareText = `I guessed ${guess}; my Base onchain score was ${score}. ${verdict.tier} on Base Score Guess.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "summary", "stats", "actions"],
    },
    title: { type: "text", props: { content: `Score ${score} · guessed ${guess}`, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: verdict.badge, variant: "outline", color: verdict.accent } },
    meter: { type: "progress", props: { label: `Accuracy: ${accuracy}%`, value: accuracy, max: 100, color: verdict.accent } },
    summary: {
      type: "text",
      props: {
        content: `${verdict.line} You were off by ${offBy}. This is the ${week} Base score for FID ${fid}.`,
        size: "sm",
        align: "center",
      },
    },
    item_1: { type: "item", props: { title: "Current streak", description: `${stats.streak} week${stats.streak === 1 ? "" : "s"} within 10` } },
    item_2: { type: "item", props: { title: "Best miss", description: stats.bestOff === null ? "No guesses yet" : `${stats.bestOff} point${stats.bestOff === 1 ? "" : "s"}` } },
    item_3: { type: "item", props: { title: "Best guess", description: stats.bestGuess === null ? "—" : String(stats.bestGuess) } },
    stats: { type: "item_group", props: {}, children: ["item_1", "item_2", "item_3"] },
    again: { type: "button", props: { label: "Try again", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return shell(elements, verdict.accent, offBy === 0 ? ["confetti"] : undefined);
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") !== "guess") {
      return startPage(self);
    }

    const fid = ctx.action.user.fid;
    const week = utcWeekKey();
    const guess = parseGuess(ctx.action.inputs?.guess);
    const score = scoreFor(fid, week);
    const offBy = Math.abs(score - guess);
    const verdict = verdictFor(offBy);
    const stats = await updateStats(fid, week, guess, offBy, verdict.hit);

    return resultPage(self, fid, week, guess, score, stats);
  },
  {
    openGraph: {
      title: "Base Score Guess",
      description: "Guess your playful Base onchain score from 1–100, then reveal this week’s number and streak.",
    },
  },
);

export { scoreFor, parseGuess, utcWeekKey, verdictFor };
export default app;
