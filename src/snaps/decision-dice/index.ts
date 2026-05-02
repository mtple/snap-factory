/**
 * decision-dice — a playful productivity decision helper.
 *
 * Components: toggle_group, slider, switch, badge, progress, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "decision-dice";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type DecisionType = "work" | "social" | "money" | "chore";

type Roll = {
  label: string;
  recommendation: string;
  note: string;
  confidence: number;
  accent: Accent;
  confetti: boolean;
};

const TYPE_COPY: Record<DecisionType, { label: string; verbs: string[] }> = {
  work: {
    label: "Work",
    verbs: ["ship the small version", "ask one clarifying question", "schedule a 20-minute sprint", "delegate the annoying piece"],
  },
  social: {
    label: "Social",
    verbs: ["send the kind text", "say yes with a time box", "offer a rain check", "make the plan simpler"],
  },
  money: {
    label: "Money",
    verbs: ["wait one day", "buy the practical option", "set a tiny budget cap", "skip it and keep the cash"],
  },
  chore: {
    label: "Tiny chore",
    verbs: ["do the 5-minute version", "set a timer and start", "clear the most visible mess", "make future-you a note"],
  },
};

function asDecisionType(value: unknown): DecisionType {
  if (value === "work" || value === "social" || value === "money" || value === "chore") return value;
  return "work";
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
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

function buildRoll(type: DecisionType, stakes: number, overthinking: boolean, fid: number): Roll {
  const config = TYPE_COPY[type];
  const seed = hashParts([type, stakes, overthinking, fid || 0]);
  const choice = config.verbs[seed % config.verbs.length] ?? config.verbs[0];
  const boldness = (seed % 41) + 50;
  const confidence = Math.max(18, Math.min(96, boldness - stakes * 2 + (overthinking ? 7 : 0)));

  if (overthinking && stakes <= 4) {
    return {
      label: "Stop looping",
      recommendation: `${config.label}: ${choice}. Your brain already voted twice.`,
      note: "Low stakes plus high spin means the dice says: move.",
      confidence,
      accent: "purple",
      confetti: false,
    };
  }

  if (stakes >= 8) {
    return {
      label: "Slow roll",
      recommendation: `${config.label}: ${choice}, but sleep on it first.`,
      note: "High-stakes dice are advisors, not bosses.",
      confidence: Math.min(confidence, 72),
      accent: "amber",
      confetti: false,
    };
  }

  if (confidence >= 80) {
    return {
      label: "Green light",
      recommendation: `${config.label}: ${choice}. Do it before the tab goes stale.`,
      note: "The tiny oracle sees enough signal to proceed.",
      confidence,
      accent: "green",
      confetti: true,
    };
  }

  return {
    label: "Tiny yes",
    recommendation: `${config.label}: ${choice}. Keep it reversible.`,
    note: "A small next step beats another committee meeting in your head.",
    confidence,
    accent: type === "money" ? "teal" : "blue",
    confetti: false,
  };
}

function shareButton(self: string, text = "I rolled the Decision Dice on @freeturtle") {
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
      children: ["title", "sub", "kind", "stakes", "loop", "roll", "share_btn"],
    },
    title: { type: "text", props: { content: "Decision Dice", weight: "bold", align: "center" } },
    sub: {
      type: "text",
      props: { content: "For tiny forks in the road. Pick the realm, set the stakes, then roll.", size: "sm", align: "center" },
    },
    kind: {
      type: "toggle_group",
      props: {
        name: "kind",
        label: "What kind of decision?",
        defaultValue: "work",
        options: [
          { label: "Work", value: "work" },
          { label: "Social", value: "social" },
          { label: "Money", value: "money" },
          { label: "Chore", value: "chore" },
        ],
      },
    },
    stakes: { type: "slider", props: { name: "stakes", label: "Stakes", min: 1, max: 10, step: 1, defaultValue: 4 } },
    loop: { type: "switch", props: { name: "loop", label: "I am overthinking it" } },
    roll: { type: "button", props: { label: "Roll decision", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, roll: Roll): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "answer", "confidence", "note", "again", "share_btn"],
    },
    title: { type: "text", props: { content: "The dice have spoken", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: roll.label, variant: "outline" } },
    answer: { type: "text", props: { content: roll.recommendation, align: "center" } },
    confidence: { type: "progress", props: { label: "Oracle confidence", value: roll.confidence, max: 100 } },
    note: { type: "text", props: { content: roll.note, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "Roll again", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, `Decision Dice told me: ${roll.recommendation}`),
  };

  return {
    version: "1.0",
    ...(roll.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: roll.accent },
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
  const type = asDecisionType(inputs.kind);
  const stakes = asNumber(inputs.stakes, 4);
  const overthinking = asBool(inputs.loop);
  const roll = buildRoll(type, stakes, overthinking, ctx.action.user?.fid ?? 0);
  return resultPage(self, roll);
});

export default app;
