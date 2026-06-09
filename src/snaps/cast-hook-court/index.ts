/**
 * cast-hook-court — courtroom verdicts for Farcaster cast hooks.
 *
 * Components: input, toggle_group, slider, badge, progress, item_group, item, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "cast-hook-court";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Tone = keyof typeof TONES;

type Verdict = {
  title: "Banger" | "Try again" | "Legally threadable";
  badge: string;
  score: number;
  accent: Accent;
  ruling: string;
  edit: string;
  exhibit: string;
  confetti: boolean;
};

const TONES = {
  useful: { label: "Useful", bonus: 8, noun: "utility" },
  spicy: { label: "Spicy", bonus: 2, noun: "heat" },
  curious: { label: "Curious", bonus: 10, noun: "question" },
  launch: { label: "Launch", bonus: 5, noun: "launch" },
  lore: { label: "Lore", bonus: 4, noun: "lore" },
} as const;

const STRONG_STARTS = ["hot take", "i built", "what if", "today", "gm", "why", "how", "wait", "new", "tiny"];
const VAGUE_WORDS = ["thing", "stuff", "soon", "maybe", "probably", "interesting", "vibes", "thoughts"];
const COURT_NOTES = [
  "The first five words do jury duty.",
  "Specific nouns beat fog machines.",
  "A tiny promise needs a visible payoff.",
  "Leave one door open for replies.",
];

function cleanHook(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function asTone(raw: unknown): Tone {
  const value = String(raw ?? "useful");
  return value in TONES ? (value as Tone) : "useful";
}

function asSpice(raw: unknown): number {
  const parsed = Number(raw ?? 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function hashParts(parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function includesAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildVerdict(hook: string, tone: Tone, spice: number, fid: number): Verdict {
  const words = wordCount(hook);
  const lower = hook.toLowerCase();
  const seed = hashParts([hook || "empty", tone, spice, fid || 0]);
  const hasQuestion = lower.includes("?") || lower.startsWith("why ") || lower.startsWith("how ") || lower.startsWith("what ");
  const hasSpecifics = /\b\d+\b/.test(hook) || hook.includes(":") || hook.includes("—") || hook.includes("-");
  const hasStrongStart = includesAny(lower.slice(0, 42), STRONG_STARTS);
  const isVague = includesAny(lower, VAGUE_WORDS);
  const tooLong = hook.length > 145 || words > 26;
  const tooShort = words < 4;

  let score = 46 + TONES[tone].bonus + spice * 3 + (seed % 9);
  if (hasQuestion) score += 9;
  if (hasSpecifics) score += 11;
  if (hasStrongStart) score += 8;
  if (isVague) score -= 14;
  if (tooLong) score -= 15;
  if (tooShort) score -= 18;
  if (spice >= 9 && tone !== "spicy") score -= 7;
  score = Math.max(8, Math.min(98, score));

  if (!hook) {
    return {
      title: "Try again",
      badge: "no evidence",
      score: 18,
      accent: "gray",
      ruling: "The court cannot rule on an empty exhibit. Put one cast hook on the stand.",
      edit: "Start with a clear noun and one reason people should care.",
      exhibit: "Missing: defendant, stakes, and tiny payoff.",
      confetti: false,
    };
  }

  if (score >= 82) {
    return {
      title: "Banger",
      badge: "case closed",
      score,
      accent: "green",
      ruling: "The hook enters with a point, a little voltage, and enough space for replies.",
      edit: tooLong ? "Trim one clause so the punch lands faster." : "Ship it before the bailiff starts workshopping.",
      exhibit: COURT_NOTES[seed % COURT_NOTES.length] ?? COURT_NOTES[0],
      confetti: true,
    };
  }

  if (score >= 57) {
    return {
      title: "Legally threadable",
      badge: "allowed with edits",
      score,
      accent: "amber",
      ruling: "The court permits posting, but demands one sharper reason to keep reading.",
      edit: hasSpecifics ? "Move the strongest detail into the first sentence." : "Add one concrete number, name, or image.",
      exhibit: `This has ${TONES[tone].noun}; now give it a cleaner opening beat.`,
      confetti: false,
    };
  }

  return {
    title: "Try again",
    badge: "sustained",
    score,
    accent: "red",
    ruling: "The jury sees the idea, but the hook is wearing too much fog in public.",
    edit: tooShort ? "Add the stakes: who is this for, and what changes?" : "Cut vague words and lead with the weirdest true detail.",
    exhibit: isVague ? "Objection: vibes are not evidence." : "Objection: the payoff arrives late.",
    confetti: false,
  };
}

function shareButton(self: string, text = "Cast Hook Court is in session") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error ? ["title", "intro", "error", "hook", "tone", "spice", "buttons"] : ["title", "intro", "hook", "tone", "spice", "buttons"];
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "Cast Hook Court", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Submit a cast opener. The wizard judge rules: banger, try again, or legally threadable.", size: "sm", align: "center" },
    },
    hook: { type: "input", props: { name: "hook", label: "Cast hook", placeholder: "What if your next app was tiny on purpose?", maxLength: 180 } },
    tone: {
      type: "toggle_group",
      props: { name: "tone", label: "Intent", defaultValue: "useful", options: Object.entries(TONES).map(([value, config]) => ({ value, label: config.label })) },
    },
    spice: { type: "slider", props: { name: "spice", label: "Spice", min: 1, max: 10, step: 1, defaultValue: 5 } },
    judge: { type: "button", props: { label: "Judge hook", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?action=judge` } } } },
    share_btn: shareButton(self),
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["judge", "share_btn"] },
  };

  if (error) {
    elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  }

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, hook: string, verdict: Verdict): SnapHandlerResult {
  const shareText = `Cast Hook Court verdict: ${verdict.title} (${verdict.score}/100).`.slice(0, 260);
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "score", "ruling", "receipts", "buttons"] },
    title: { type: "text", props: { content: verdict.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: verdict.badge, variant: "outline" } },
    score: { type: "progress", props: { label: `Hook score: ${verdict.score}/100`, value: verdict.score, max: 100, color: verdict.accent } },
    ruling: { type: "text", props: { content: verdict.ruling, align: "center" } },
    edit_item: { type: "item", props: { title: "Judge's edit", description: verdict.edit } },
    exhibit_item: { type: "item", props: { title: "Exhibit A", description: verdict.exhibit } },
    receipts: { type: "item_group", props: {}, children: ["edit_item", "exhibit_item"] },
    again: { type: "button", props: { label: "Try another", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText || `Cast Hook Court judged: ${hook.slice(0, 80)}`),
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return {
    version: "2.0",
    ...(verdict.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: verdict.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  if (url.searchParams.get("action") !== "judge") {
    return startPage(self);
  }

  const hook = cleanHook(ctx.action.inputs?.hook);
  if (!hook) {
    return startPage(self, "Enter a hook first. The court needs evidence.");
  }

  const tone = asTone(ctx.action.inputs?.tone);
  const spice = asSpice(ctx.action.inputs?.spice);
  const fid = ctx.action.user?.fid ?? 0;
  return resultPage(self, hook, buildVerdict(hook, tone, spice, fid));
}, {
  openGraph: {
    title: "Cast Hook Court",
    description: "Submit a cast hook and get a tiny wizard-court ruling.",
  },
});

export { buildVerdict, cleanHook, asTone };
export default app;
