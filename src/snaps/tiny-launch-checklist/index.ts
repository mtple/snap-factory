/**
 * tiny-launch-checklist — turn a launch idea into a five-step preflight.
 *
 * Components: input, toggle_group, progress, badge, item_group, item, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "tiny-launch-checklist";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type LaunchKind = keyof typeof LAUNCH_KINDS;

type LaunchPlan = {
  title: string;
  badge: string;
  confidence: number;
  accent: Accent;
  steps: string[];
  note: string;
};

const LAUNCH_KINDS = {
  app: { label: "App", noun: "app", accent: "blue" as const, base: 76 },
  cast: { label: "Cast", noun: "cast", accent: "purple" as const, base: 82 },
  token: { label: "Token", noun: "token", accent: "amber" as const, base: 68 },
  event: { label: "Event", noun: "event", accent: "green" as const, base: 73 },
};

function cleanIdea(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function kindInput(raw: unknown): LaunchKind {
  const value = String(raw ?? "app");
  return value in LAUNCH_KINDS ? (value as LaunchKind) : "app";
}

function tinyHash(text: string, kind: LaunchKind, fid: number): number {
  let hash = (fid || 101) + kind.length * 17;
  for (const char of text || "launch") hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash;
}

function buildPlan(idea: string, kindKey: LaunchKind, fid: number): LaunchPlan {
  const kind = LAUNCH_KINDS[kindKey];
  const launch = idea || `tiny ${kind.noun}`;
  const seed = tinyHash(launch, kindKey, fid);
  const clarityBonus = Math.min(12, Math.floor(launch.length / 9));
  const confidence = Math.max(42, Math.min(96, kind.base + clarityBonus - (seed % 11)));
  const risky = confidence < 66;

  const steps = [
    `Name the promise: one sentence for what ${launch} does and who it helps.`,
    `Cut scope to the smallest useful ${kind.noun}; move every extra feature to “later.”`,
    "Make the first screen explain itself in under 8 seconds.",
    kindKey === "token"
      ? "Write the risks, fees, and no-hype caveat before anyone asks."
      : kindKey === "event"
        ? "Confirm time, place/link, host, and backup plan in one visible spot."
        : kindKey === "cast"
          ? "Draft the hook, proof, and ask; delete one sentence from each."
          : "Test the happy path, empty state, and one cursed edge case.",
    risky ? "Launch to a tiny circle first; collect one sharp note, then widen." : "Post the receipt: what shipped, why now, and what to try next.",
  ];

  return {
    title: risky ? "Launch Needs a Helmet" : "Tiny Launch Cleared",
    badge: risky ? "pilot first" : "ship lane",
    confidence,
    accent: risky ? "amber" : kind.accent,
    steps,
    note: risky
      ? "The idea is launchable, but the wizard recommends a smaller first audience and one crisp proof point."
      : "Good enough to leave the tower. Keep the launch tiny, legible, and easy to reply to.",
  };
}

function shareButton(self: string, text = "Try Tiny Launch Checklist") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error
    ? ["title", "intro", "error", "idea", "kind", "go", "share_btn"]
    : ["title", "intro", "idea", "kind", "go", "share_btn"];

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "Tiny Launch Checklist", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Enter a launch idea. Get a five-step preflight and a confidence meter before the confetti lies to you.",
        size: "sm",
        align: "center",
      },
    },
    idea: {
      type: "input",
      props: {
        name: "idea",
        label: "Launch idea",
        placeholder: "a tiny Base app for weekend builders",
        maxLength: 160,
      },
    },
    kind: {
      type: "toggle_group",
      props: {
        name: "kind",
        label: "Launch type",
        defaultValue: "app",
        options: Object.entries(LAUNCH_KINDS).map(([value, kind]) => ({ label: kind.label, value })),
      },
    },
    go: {
      type: "button",
      props: { label: "Run preflight", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=check` } } },
    },
    share_btn: shareButton(self),
  };

  if (error) {
    elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  }

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, idea: string, plan: LaunchPlan): SnapHandlerResult {
  const shareText = `Tiny Launch Checklist cleared “${idea}” with ${plan.confidence}% confidence.`.slice(0, 260);
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "confidence", "steps", "note", "actions"] },
    title: { type: "text", props: { content: plan.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: plan.badge, variant: "outline" } },
    confidence: { type: "progress", props: { label: `Launch confidence: ${plan.confidence}%`, value: plan.confidence, max: 100, color: plan.accent } },
    step_1: { type: "item", props: { title: "1", description: plan.steps[0] } },
    step_2: { type: "item", props: { title: "2", description: plan.steps[1] } },
    step_3: { type: "item", props: { title: "3", description: plan.steps[2] } },
    step_4: { type: "item", props: { title: "4", description: plan.steps[3] } },
    step_5: { type: "item", props: { title: "5", description: plan.steps[4] } },
    steps: { type: "item_group", props: {}, children: ["step_1", "step_2", "step_3", "step_4", "step_5"] },
    note: { type: "text", props: { content: plan.note, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "Check another", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: plan.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const idea = cleanIdea(ctx.action.inputs?.idea);
  if (!idea) {
    return startPage(self, "Give the launch a name first. Even goblins need a label.");
  }

  const kind = kindInput(ctx.action.inputs?.kind);
  return resultPage(self, idea, buildPlan(idea, kind, ctx.action.user.fid));
}, {
  openGraph: {
    title: "Tiny Launch Checklist",
    description: "Enter a launch idea; get a five-step preflight and confidence meter.",
  },
});

export { buildPlan, cleanIdea, kindInput };
export default app;
