/**
 * no-code-spellbook — tiny automation recipes for workflow pain.
 *
 * Components: input, toggle_group, slider, switch, badge, progress, item_group, item, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "no-code-spellbook";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Pain = keyof typeof PAINS;
type Constraint = keyof typeof CONSTRAINTS;

type Spell = {
  title: string;
  badge: string;
  incantation: string;
  confidence: number;
  accent: Accent;
  steps: string[];
  note: string;
  confetti: boolean;
};

const PAINS = {
  inbox: {
    label: "Inbox swamp",
    noun: "inbox swamp",
    verb: "triage",
    trigger: "new message or form response",
    output: "one labeled action queue",
    accent: "blue" as const,
  },
  leads: {
    label: "Lead wrangling",
    noun: "lead pile",
    verb: "capture",
    trigger: "new signup, DM, or calendar booking",
    output: "one tidy lead row plus follow-up reminder",
    accent: "teal" as const,
  },
  reports: {
    label: "Weekly reports",
    noun: "report cauldron",
    verb: "summarize",
    trigger: "Friday morning or new spreadsheet row",
    output: "one short status digest",
    accent: "purple" as const,
  },
  approvals: {
    label: "Approvals limbo",
    noun: "approval maze",
    verb: "route",
    trigger: "new request with a missing yes/no",
    output: "one decision trail with owner and deadline",
    accent: "amber" as const,
  },
  content: {
    label: "Content chores",
    noun: "content chore pile",
    verb: "repurpose",
    trigger: "new idea, doc, or customer quote",
    output: "one reusable draft bundle",
    accent: "pink" as const,
  },
} as const;

const CONSTRAINTS = {
  free: { label: "Free tools", tone: "keep the spell scrappy", friction: 9 },
  fast: { label: "30 min", tone: "favor one ugly working path", friction: 5 },
  careful: { label: "Low-risk", tone: "add approvals before action", friction: 13 },
  solo: { label: "Solo ops", tone: "avoid handoffs and heroic dashboards", friction: 7 },
} as const;

function painInput(raw: unknown): Pain {
  const value = String(raw ?? "inbox");
  return value in PAINS ? (value as Pain) : "inbox";
}

function constraintInput(raw: unknown): Constraint {
  const value = String(raw ?? "fast");
  return value in CONSTRAINTS ? (value as Constraint) : "fast";
}

function cleanTask(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function asNumber(raw: unknown, fallback: number): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function boolInput(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function hashParts(parts: Array<string | number | boolean>): number {
  let hash = 2166136261;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSpell(painKey: Pain, constraintKey: Constraint, task: string, chaos: number, humanGate: boolean, fid: number): Spell {
  const pain = PAINS[painKey];
  const constraint = CONSTRAINTS[constraintKey];
  const subject = task || pain.noun;
  const seed = hashParts([painKey, constraintKey, subject, chaos, humanGate, fid || 0]);
  const confidence = Math.max(44, Math.min(96, 83 - chaos * 2 - constraint.friction + (seed % 23) + (humanGate ? 8 : 0)));
  const safe = humanGate || constraintKey === "careful";
  const zaps = ["Zapier", "Make", "Airtable", "Notion", "Google Sheets", "Tally"];
  const source = zaps[seed % zaps.length] ?? "Zapier";
  const sink = zaps[(seed + 2) % zaps.length] ?? "Google Sheets";

  return {
    title: confidence >= 78 ? "Spell Looks Shippable" : "Spell Needs Gloves",
    badge: safe ? "supervised magic" : confidence >= 78 ? "no-code wand" : "tiny pilot first",
    incantation: `${source} watches for ${pain.trigger}, ${sink} stores the truth, and one tiny rule turns ${subject} into ${pain.output}.`,
    confidence,
    accent: confidence < 62 ? "amber" : pain.accent,
    steps: [
      `Trigger: when ${pain.trigger} appears, copy only the useful fields into a clean table.`,
      `Transform: ${pain.verb} ${subject} with one rule, one tag, and one fallback for weird inputs.`,
      safe
        ? "Human gate: send a preview to the owner before anything public or expensive happens."
        : `Deliver: post ${pain.output} where the next person already works, then log the receipt.`,
    ],
    note: `${constraint.tone}. Start with five test records; if the goblin behaves, let it run for one day.`,
    confetti: confidence >= 84,
  };
}

function shareButton(self: string, text = "Try No-Code Spellbook") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error
    ? ["title", "intro", "error", "task", "pain", "constraint", "settings"]
    : ["title", "intro", "task", "pain", "constraint", "settings"];

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "No-Code Spellbook", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick a workflow pain. Get a tiny automation recipe you can build without summoning an engineer.",
        size: "sm",
        align: "center",
      },
    },
    task: {
      type: "input",
      props: {
        name: "task",
        label: "Workflow or task",
        placeholder: "sorting sponsor requests",
        maxLength: 140,
      },
    },
    pain: {
      type: "toggle_group",
      props: {
        name: "pain",
        label: "Pain point",
        defaultValue: "inbox",
        options: Object.entries(PAINS).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    constraint: {
      type: "toggle_group",
      props: {
        name: "constraint",
        label: "Constraint",
        defaultValue: "fast",
        options: Object.entries(CONSTRAINTS).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    chaos: {
      type: "slider",
      props: { name: "chaos", label: "Workflow chaos", min: 1, max: 10, step: 1, defaultValue: 5 },
    },
    gate: {
      type: "switch",
      props: { name: "gate", label: "Require human review", defaultValue: true },
    },
    brew: {
      type: "button",
      props: { label: "Brew recipe", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=brew` } } },
    },
    share_btn: shareButton(self),
    settings: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["chaos", "gate", "brew", "share_btn"] },
  };

  if (error) {
    elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  }

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, task: string, spell: Spell): SnapHandlerResult {
  const shareText = `No-Code Spellbook brewed: ${spell.title.toLowerCase()} for ${task || "a workflow goblin"}.`.slice(0, 260);
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "incantation", "meter", "steps", "note", "actions"] },
    title: { type: "text", props: { content: spell.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: spell.badge, variant: "outline" } },
    incantation: { type: "text", props: { content: spell.incantation, size: "sm", align: "center" } },
    meter: { type: "progress", props: { label: `Automation confidence: ${spell.confidence}%`, value: spell.confidence, max: 100, color: spell.accent } },
    step_1: { type: "item", props: { title: "1. Catch", description: spell.steps[0] } },
    step_2: { type: "item", props: { title: "2. Transform", description: spell.steps[1] } },
    step_3: { type: "item", props: { title: "3. Deliver", description: spell.steps[2] } },
    steps: { type: "item_group", props: {}, children: ["step_1", "step_2", "step_3"] },
    note: { type: "text", props: { content: spell.note, size: "sm", align: "center" } },
    again: {
      type: "button",
      props: { label: "Brew another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return {
    version: "2.0",
    ...(spell.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: spell.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const action = url.searchParams.get("action");
  if (action !== "brew") {
    return startPage(self);
  }

  const task = cleanTask(ctx.action.inputs?.task);
  const pain = painInput(ctx.action.inputs?.pain);
  const constraint = constraintInput(ctx.action.inputs?.constraint);
  const chaos = asNumber(ctx.action.inputs?.chaos, 5);
  const gate = boolInput(ctx.action.inputs?.gate);
  return resultPage(self, task, buildSpell(pain, constraint, task, chaos, gate, ctx.action.user.fid));
}, {
  openGraph: {
    title: "No-Code Spellbook",
    description: "Pick a workflow pain and brew a tiny no-code automation recipe.",
  },
});

export { buildSpell, cleanTask, constraintInput, painInput };
export default app;
