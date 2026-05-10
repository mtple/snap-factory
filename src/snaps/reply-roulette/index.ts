/**
 * reply-roulette — pick a reply strategy and see if you survive the timeline.
 *
 * Components: text, badge, toggle_group, progress, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "reply-roulette";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Strategy = "Clarify" | "Joke" | "Disagree" | "Log off";

type Scenario = {
  prompt: string;
  safest: Strategy;
  trap: Strategy;
  badge: string;
};

const STRATEGIES: Strategy[] = ["Clarify", "Joke", "Disagree", "Log off"];
const SCENARIOS: Scenario[] = [
  {
    prompt: "A huge thread says builders should ship less and strategize more. Everyone is typing paragraphs.",
    safest: "Clarify",
    trap: "Joke",
    badge: "Strategy fog",
  },
  {
    prompt: "Someone posts: “hot take: every app is just a spreadsheet with anxiety.” The quote-casts are circling.",
    safest: "Joke",
    trap: "Disagree",
    badge: "Meme weather",
  },
  {
    prompt: "A founder announces a pivot in extremely calm language. The replies smell faintly of panic.",
    safest: "Clarify",
    trap: "Disagree",
    badge: "Pivot fumes",
  },
  {
    prompt: "Your mutual asks for brutal feedback, then immediately likes every soft compliment first.",
    safest: "Log off",
    trap: "Clarify",
    badge: "Feedback trap",
  },
  {
    prompt: "A cast with no punctuation claims the timeline is finally healing. Nobody agrees on what it means.",
    safest: "Joke",
    trap: "Clarify",
    badge: "Vibe ambiguity",
  },
];

const SAFE_LINES = [
  "You threaded the needle. The timeline briefly respects your paperwork.",
  "Clean escape. The reply gremlins found a louder target.",
  "You survived with only mild notification smoke.",
  "Excellent restraint. A wizard stamps your reply license.",
];

const RISK_LINES = [
  "Technically alive, spiritually tagged into a 47-reply subplot.",
  "You caused a tiny discourse ripple. Nothing fatal, but the mentions are warm.",
  "A respectable attempt. The timeline gives you one suspicious side-eye.",
  "You walk away with your shoes smoking and one new muted keyword.",
];

const TRAP_LINES = [
  "Oh no. You stepped on the obvious rake and the rake quote-cast itself.",
  "The timeline has assigned you homework. Rookie mistake.",
  "Instant side quest. Your notifications are now a haunted drawer.",
  "You became the example in someone else’s thread. Grim but educational.",
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

function scenarioFor(fid: number): Scenario {
  return SCENARIOS[hashText(`reply-roulette:${fid || "anon"}:${todayKey()}`) % SCENARIOS.length] ?? SCENARIOS[0];
}

function normalizeStrategy(value: unknown): Strategy {
  return STRATEGIES.includes(value as Strategy) ? (value as Strategy) : "Clarify";
}

function scoreChoice(fid: number, choice: Strategy, scenario: Scenario): number {
  if (choice === scenario.safest) return 88 + (hashText(`${fid}:${choice}:safe`) % 12);
  if (choice === scenario.trap) return 9 + (hashText(`${fid}:${choice}:trap`) % 18);
  return 41 + (hashText(`${fid}:${choice}:risk`) % 32);
}

function lineFor(score: number, fid: number, choice: Strategy): string {
  const seed = hashText(`${fid}:${choice}:${score}:${todayKey()}`);
  if (score >= 80) return SAFE_LINES[seed % SAFE_LINES.length];
  if (score <= 30) return TRAP_LINES[seed % TRAP_LINES.length];
  return RISK_LINES[seed % RISK_LINES.length];
}

function accentFor(score: number): Accent {
  if (score >= 80) return "green";
  if (score <= 30) return "red";
  return "amber";
}

function shareButton(self: string, text = "I spun Reply Roulette: one chaotic Farcaster thread, one survival strategy.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderStart(self: string, fid: number): SnapHandlerResult {
  const scenario = scenarioFor(fid);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "scenario", "picker", "submit_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Reply Roulette", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: scenario.badge, variant: "outline" } },
    scenario: {
      type: "text",
      props: { content: scenario.prompt, align: "center" },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "strategy",
        label: "Choose your reply survival strategy",
        options: STRATEGIES,
        orientation: "vertical",
        variant: "outline",
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Spin the thread", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?spin=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function renderResult(self: string, fid: number, choice: Strategy): SnapHandlerResult {
  const scenario = scenarioFor(fid);
  const score = scoreChoice(fid, choice, scenario);
  const safe = choice === scenario.safest;
  const trapped = choice === scenario.trap;
  const title = safe ? "Clean reply escape" : trapped ? "Rake detected" : "Mentions warming";
  const verdict = lineFor(score, fid, choice);
  const tacticalNote = safe
    ? `${choice} was the safest play. Annoyingly mature.`
    : trapped
      ? `${choice} was the trap. The safer move was ${scenario.safest}.`
      : `${choice} was playable, but ${scenario.safest} had the cleanest exit.`;
  const shareText = safe
    ? "I survived Reply Roulette with a clean timeline escape. 🧙"
    : `Reply Roulette gave me ${score}% thread survival. I may need a helmet.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "verdict", "note", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `${choice}: ${score}% survival`, variant: "outline" } },
    meter: { type: "progress", props: { label: "Thread survival", value: score, max: 100 } },
    verdict: { type: "text", props: { content: verdict, align: "center" } },
    note: { type: "text", props: { content: tacticalNote, size: "sm", align: "center" } },
    again_btn: {
      type: "button",
      props: { label: "Spin again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, safe ? "Share escape" : "Share verdict"),
  };

  return {
    version: "2.0",
    theme: { accent: accentFor(score) },
    effects: safe ? ["confetti"] : undefined,
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
      return renderStart(self, fid);
    }

    return renderResult(self, fid, normalizeStrategy(ctx.action.inputs?.strategy));
  },
  {
    openGraph: {
      title: "Reply Roulette",
      description: "Choose a reply strategy for a chaotic Farcaster thread and see if you survive the mentions.",
    },
  },
);

export default app;
