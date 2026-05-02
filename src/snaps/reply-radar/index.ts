/**
 * reply-radar — a tiny Farcaster reply triage utility.
 *
 * Components: input, toggle_group, slider, switch, badge, progress, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "reply-radar";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Intent = "Kind" | "Sharp" | "Curious" | "Pass";

type Reading = {
  verdict: "Send it" | "Soften it" | "Ask instead" | "Save draft";
  safety: number;
  accent: Accent;
  recommendation: string;
  tips: string[];
  confetti: boolean;
};

const INTENTS: Intent[] = ["Kind", "Sharp", "Curious", "Pass"];
const HEAT_WORDS = ["always", "never", "obvious", "wrong", "cope", "trash", "bad take", "literally", "everyone"];
const QUESTION_WORDS = ["what", "why", "how", "could", "would", "is", "are", "?"];

function cleanDraft(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function asIntent(raw: unknown): Intent {
  const value = String(raw ?? "Kind");
  return INTENTS.includes(value as Intent) ? (value as Intent) : "Kind";
}

function asSpice(raw: unknown): number {
  const value = Number(raw ?? 4);
  if (!Number.isFinite(value)) return 4;
  return Math.max(0, Math.min(10, Math.round(value)));
}

function asBool(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function hashParts(parts: Array<string | number | boolean>): number {
  const text = parts.join("|");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function countMatches(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0);
}

function buildReading(draft: string, intent: Intent, spice: number, publicThread: boolean, fid: number): Reading {
  const heat = countMatches(draft, HEAT_WORDS);
  const questions = countMatches(draft, QUESTION_WORDS);
  const lengthPenalty = draft.length > 120 ? 8 : draft.length < 12 ? 10 : 0;
  const seed = hashParts([draft || "empty", intent, spice, publicThread, fid || 0]);
  const publicPenalty = publicThread ? 10 : 0;
  let safety = 86 - spice * 5 - heat * 9 - lengthPenalty - publicPenalty;

  if (intent === "Kind") safety += 12;
  if (intent === "Curious") safety += 8 + Math.min(questions * 3, 9);
  if (intent === "Sharp") safety -= 12;
  if (intent === "Pass") safety -= 4;
  safety = Math.max(8, Math.min(98, safety + (seed % 9) - 4));

  if (!draft) {
    return {
      verdict: "Save draft",
      safety: 24,
      accent: "gray",
      recommendation: "Radar needs words first. Write the reply, then let the little tower scan for smoke.",
      tips: ["• Add the point", "• Name the ask", "• Keep one human sentence"],
      confetti: false,
    };
  }

  if (intent === "Pass" || safety < 34) {
    return {
      verdict: "Save draft",
      safety,
      accent: "amber",
      recommendation: "Save this one for later. The thread heat is louder than the useful signal right now.",
      tips: ["• Wait ten minutes", "• Delete one jab", "• Reply only if it helps"],
      confetti: false,
    };
  }

  if (intent === "Curious" || (questions > 0 && spice <= 5)) {
    return {
      verdict: "Ask instead",
      safety,
      accent: "teal",
      recommendation: "Lead with a real question. Curiosity keeps the door open and still lets you disagree.",
      tips: ["• Start with what/why/how", "• Quote one specific point", "• Drop the courtroom voice"],
      confetti: safety >= 82,
    };
  }

  if (safety < 68 || intent === "Sharp" || spice >= 7 || heat > 0) {
    return {
      verdict: "Soften it",
      safety,
      accent: "purple",
      recommendation: "There is a good reply in here. Sand one edge off before the timeline sees it.",
      tips: ["• Swap certainty for signal", "• Cut the hottest word", "• Make it about the idea"],
      confetti: false,
    };
  }

  return {
    verdict: "Send it",
    safety,
    accent: "green",
    recommendation: "Clean signal. Send it while the thought is still warm and the goblins are quiet.",
    tips: ["• Clear point", "• Low drama", "• Good thread citizen"],
    confetti: true,
  };
}

function shareButton(self: string, text = "Reply Radar checks thread heat before you hit send") {
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
      children: ["title", "sub", "draft", "intent", "spice", "public", "buttons"],
    },
    title: { type: "text", props: { content: "Reply Radar", weight: "bold", align: "center" } },
    sub: {
      type: "text",
      props: { content: "Paste a reply draft. Get a tiny read before you enter the public square.", size: "sm", align: "center" },
    },
    draft: { type: "input", props: { name: "draft", label: "Reply draft", placeholder: "I think the missing piece is...", maxLength: 180 } },
    intent: {
      type: "toggle_group",
      props: { name: "intent", label: "Intent", options: INTENTS.map((label) => ({ label, value: label })), defaultValue: "Kind" },
    },
    spice: { type: "slider", props: { name: "spice", label: "Spice", min: 0, max: 10, step: 1, defaultValue: 4 } },
    public: { type: "switch", props: { name: "public", label: "Public thread" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["scan", "share_btn"] },
    scan: { type: "button", props: { label: "Scan reply", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, reading: Reading): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "safety", "recommendation", "tips", "buttons"],
    },
    title: { type: "text", props: { content: "Radar sweep complete", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: reading.verdict, variant: "outline" } },
    safety: { type: "progress", props: { label: "Thread safety", value: reading.safety, max: 100 } },
    recommendation: { type: "text", props: { content: reading.recommendation, align: "center" } },
    tips: { type: "text", props: { content: reading.tips.join("\n"), size: "sm" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: { type: "button", props: { label: "Scan again", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, `Reply Radar verdict: ${reading.verdict}. Thread safety ${reading.safety}%.`),
  };

  return {
    version: "1.0",
    ...(reading.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: reading.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const inputs = ctx.action.inputs ?? {};
  const draft = cleanDraft(inputs.draft);
  const intent = asIntent(inputs.intent);
  const spice = asSpice(inputs.spice);
  const publicThread = asBool(inputs.public);
  const reading = buildReading(draft, intent, spice, publicThread, ctx.action.user?.fid ?? 0);

  return resultPage(self, reading);
});

export default app;
