/**
 * pitch-haiku — turn a rough idea into a tiny launch haiku.
 *
 * Components: input, toggle_group, slider, switch, progress, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "pitch-haiku";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Tone = "Builder" | "Degen" | "Cozy" | "Cosmic";

type HaikuResult = {
  title: string;
  badge: string;
  haiku: string;
  note: string;
  clarity: number;
  accent: Accent;
  confetti: boolean;
};

const TONES: Tone[] = ["Builder", "Degen", "Cozy", "Cosmic"];
const FALLBACK_IDEAS = ["tiny tool", "better group chat", "calmer launch", "weird little app", "timeline snack"];

const LINE_BANK: Record<Tone, { first: string[]; second: string[]; third: string[]; note: string[] }> = {
  Builder: {
    first: ["Ship the small wedge now", "One button finds daylight", "Roadmap fog gets trimmed", "A prototype wakes"],
    second: ["users tap, nod, then forgive", "edge cases form a queue", "the demo learns to breathe", "scope goblins lose their hats"],
    third: ["merge before lunch", "docs arrive later", "the changelog smiles", "bugs file paperwork"],
    note: ["Clear enough to ship as a tiny experiment.", "Keep the promise small and the feedback loop loud.", "The wizard recommends one real user before one more feature."],
  },
  Degen: {
    first: ["Green candles whisper", "A mascot buys the dip", "The group chat says send", "Liquidity winks"],
    second: ["vibes outrun the spreadsheet", "risk wears tiny sunglasses", "due diligence is typing", "the roadmap smells like rockets"],
    third: ["size the chaos down", "maybe do research", "ape, but politely", "bag secured maybe"],
    note: ["Fun pitch, but give it one adult sentence before launch.", "The alpha is there; the wizard asks for fewer fireworks.", "High vibe density. Add one proof point so it survives daylight."],
  },
  Cozy: {
    first: ["Soft launch at sunrise", "A calm feature opens", "Tiny lantern app", "Warm pixels make room"],
    second: ["friends find the useful corner", "the onboarding brings snacks", "no one needs a manifesto", "quiet value takes a seat"],
    third: ["invite five kind nerds", "let the beta nap", "make the button kind", "ship with clean socks"],
    note: ["Gentle, useful, and probably better if the first version is boring on purpose.", "The pitch wants less thunder and more obvious care.", "Cozy works when the next action is unmistakable."],
  },
  Cosmic: {
    first: ["Moon math opens tabs", "A comet names the repo", "Stars approve the build", "The roadmap grows antlers"],
    second: ["users orbit the weird core", "gravity signs the changelog", "the demo hums in purple", "metrics wear wizard robes"],
    third: ["ship the portal small", "one ritual, then launch", "summon kinder scope", "beta under Saturn"],
    note: ["Excellent lore cloud. Anchor it with one sentence a stranger understands.", "The weirdness is a feature; the entry point needs a doorknob.", "Cosmic is allowed. Confusing is expensive."],
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

function cleanIdea(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 90);
}

function cleanTone(raw: unknown): Tone {
  const value = String(raw ?? "Builder");
  return TONES.includes(value as Tone) ? (value as Tone) : "Builder";
}

function cleanHype(raw: unknown): number {
  const parsed = Number(raw ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function isOn(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function pick<T>(items: T[], seed: number, salt: number): T {
  return items[(seed + salt * 2654435761) % items.length] ?? items[0];
}

function fallbackIdea(fid: number): string {
  return pick(FALLBACK_IDEAS, hashText(`${SNAP_NAME}:fallback:${fid || 0}`), 1);
}

function buildHaiku(ideaInput: string, tone: Tone, hype: number, jargon: boolean, fid: number): HaikuResult {
  const idea = ideaInput || fallbackIdea(fid);
  const seed = hashText([SNAP_NAME, idea.toLowerCase(), tone, hype, jargon ? "jargon" : "plain", fid || 0].join("|"));
  const bank = LINE_BANK[tone];
  const clarityBase = 92 - Math.abs(hype - 58) + (tone === "Cozy" ? 8 : 0) - (tone === "Degen" ? 6 : 0) - (jargon ? 13 : 0);
  const clarity = Math.max(12, Math.min(99, clarityBase + (seed % 13) - 6));
  const accent: Accent = clarity >= 78 ? "green" : tone === "Cosmic" ? "purple" : tone === "Degen" ? "amber" : clarity < 45 ? "red" : "teal";
  const title = clarity >= 78 ? "Pitch has legs" : clarity >= 55 ? "Tiny pitch, workable" : "Fog machine detected";
  const badge = clarity >= 78 ? "Investor haiku" : clarity >= 55 ? "Beta-shaped" : "Needs one plain noun";
  const jargonLine = jargon ? " Synergy goblin translated reluctantly." : " Human words mostly survived.";
  const note = `${pick(bank.note, seed, 4)}${jargonLine}`;
  const haiku = [
    pick(bank.first, seed, 1),
    pick(bank.second, seed, 2),
    pick(bank.third, seed, 3),
  ].join("\n");

  return {
    title,
    badge,
    haiku: `${idea}:\n${haiku}`,
    note,
    clarity,
    accent,
    confetti: clarity >= 86,
  };
}

function shareButton(self: string, text = "Pitch Haiku turned my rough idea into tiny launch poetry.", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "sub", "idea", "tone", "hype", "jargon", "buttons"] },
    title: { type: "text", props: { content: "Pitch Haiku", weight: "bold", align: "center" } },
    sub: { type: "text", props: { content: "Give the wizard a rough idea. Get a tiny launch haiku plus a clarity meter.", size: "sm", align: "center" } },
    idea: { type: "input", props: { name: "idea", label: "Project or idea", placeholder: "AI inbox broom, social garden, etc.", maxLength: 90 } },
    tone: { type: "toggle_group", props: { name: "tone", label: "Pitch tone", options: TONES.map((label) => ({ label, value: label })), defaultValue: "Builder" } },
    hype: { type: "slider", props: { name: "hype", label: "Hype level", min: 0, max: 100, step: 5, defaultValue: 55 } },
    jargon: { type: "switch", props: { name: "jargon", label: "Let jargon goblin help" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["make", "share_btn"] },
    make: { type: "button", props: { label: "Write haiku", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?compose=1` } } } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, result: HaikuResult): SnapHandlerResult {
  const shareText = `Pitch Haiku gave my idea ${result.clarity}% clarity. Tiny launch poetry acquired.`;
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "meter", "poem", "note", "buttons"] },
    title: { type: "text", props: { content: result.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: result.badge, variant: "outline" } },
    meter: { type: "progress", props: { label: "Pitch clarity", value: result.clarity, max: 100 } },
    poem: { type: "text", props: { content: result.haiku, align: "center" } },
    note: { type: "text", props: { content: result.note, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: { type: "button", props: { label: "Try another", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText, "Share haiku"),
  };

  return {
    version: "2.0",
    theme: { accent: result.accent },
    ...(result.confetti ? { effects: ["confetti" as const] } : {}),
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
      return startPage(self);
    }

    const result = buildHaiku(cleanIdea(ctx.action.inputs?.idea), cleanTone(ctx.action.inputs?.tone), cleanHype(ctx.action.inputs?.hype), isOn(ctx.action.inputs?.jargon), fid);
    return resultPage(self, result);
  },
  {
    openGraph: {
      title: "Pitch Haiku",
      description: "Turn a rough idea into tiny launch poetry with a clarity meter and wizard notes.",
    },
  },
);

export default app;
