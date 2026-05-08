/**
 * group-chat-oracle — a playful group chat naming oracle.
 *
 * Components: input, toggle_group, slider, badge, progress, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "group-chat-oracle";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Vibe = "Cozy" | "Chaos" | "Serious" | "Goblin";

type Reading = {
  name: string;
  rule: string;
  warning: string;
  drama: number;
  badge: string;
  accent: Accent;
  confetti: boolean;
};

const VIBES: Vibe[] = ["Cozy", "Chaos", "Serious", "Goblin"];

const PREFIXES: Record<Vibe, string[]> = {
  Cozy: ["Tiny", "Warm", "Blanket", "Lantern", "Soup"],
  Chaos: ["Emergency", "Unsupervised", "Cursed", "All-Caps", "Kitchen Fire"],
  Serious: ["Committee", "Working Group", "Council", "Briefing", "Department"],
  Goblin: ["Goblin", "Possum", "Snack", "Basement", "Mushroom"],
};

const NOUNS: Record<Vibe, string[]> = {
  Cozy: ["Nest", "Porch", "Tea Room", "Couch", "Weather Station"],
  Chaos: ["Incident Room", "Side Quest", "Group Project", "Alarm Bell", "Confetti Cannon"],
  Serious: ["Minutes", "Roadmap", "War Room", "Alignment Desk", "Policy Hole"],
  Goblin: ["Burrow", "Snack Drawer", "Council", "Trash Palace", "Portal"],
};

const RULES: Record<Vibe, string[]> = {
  Cozy: [
    "Reply with one useful thing and one tiny delight.",
    "No emergency pings before snacks have been considered.",
    "If someone says 'quick question,' bring a blanket and patience.",
  ],
  Chaos: [
    "All plans must survive one bad idea and one worse emoji.",
    "Screenshots are admissible evidence, but only if cropped poorly.",
    "The first person to say 'hear me out' becomes temporary mayor.",
  ],
  Serious: [
    "Agenda first, tangents second, existential dread optional.",
    "Every decision needs an owner, a deadline, and one ceremonial shrug.",
    "If the thread loops twice, the oracle demands a one-sentence summary.",
  ],
  Goblin: [
    "Snack reports outrank status reports.",
    "All mysterious links must be described like a tiny cursed artifact.",
    "No one may invoke the spreadsheet without feeding it a fresh name.",
  ],
};

const WARNINGS: Record<Vibe, string[]> = {
  Cozy: [
    "May become a mutual support hammock with surprisingly sharp memes.",
    "High risk of someone saying 'proud of you' and meaning it.",
    "The chat will slowly adopt a shared weather system.",
  ],
  Chaos: [
    "This chat can turn a 2-minute decision into folklore.",
    "Mute before opening in public. The goblins type in bursts.",
    "One typo away from a side quest with budget implications.",
  ],
  Serious: [
    "May create a subcommittee if left unattended overnight.",
    "Someone will say 'circling back' and the room temperature will drop.",
    "The notes doc is already watching.",
  ],
  Goblin: [
    "If the chat gets quiet, it is probably chewing through a cable.",
    "Do not feed after midnight unless you want fourteen polls.",
    "The archive will make no sense to future historians.",
  ],
};

const TOPIC_FALLBACKS = ["the thing", "the plan", "the bit", "the mission", "the group project"];

function cleanTopic(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

function cleanVibe(raw: unknown): Vibe {
  const value = String(raw ?? "Cozy");
  return VIBES.includes(value as Vibe) ? (value as Vibe) : "Cozy";
}

function cleanDrama(raw: unknown): number {
  const parsed = Number(raw ?? 35);
  if (!Number.isFinite(parsed)) return 35;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function hashParts(parts: Array<string | number>): number {
  const text = parts.join("|");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: number, salt: number): T {
  return items[(seed + salt * 2654435761) % items.length];
}

function titleChunk(topic: string, seed: number): string {
  if (!topic) return pick(TOPIC_FALLBACKS, seed, 5);
  const words = topic
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (words.length === 0) return pick(TOPIC_FALLBACKS, seed, 6);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

function buildReading(topic: string, vibe: Vibe, dramaInput: number, fid: number): Reading {
  const seed = hashParts([SNAP_NAME, topic || "blank", vibe, dramaInput, fid || 0]);
  const drama = Math.max(3, Math.min(100, dramaInput + (seed % 17) - 8));
  const chunk = titleChunk(topic, seed);
  const prefix = pick(PREFIXES[vibe], seed, 1);
  const noun = pick(NOUNS[vibe], seed, 2);
  const name = `${prefix} ${chunk} ${noun}`.replace(/\s+/g, " ").trim().slice(0, 64);
  const rule = pick(RULES[vibe], seed, 3);
  const warning = pick(WARNINGS[vibe], seed, 4);

  const accent: Accent = vibe === "Cozy" ? "green" : vibe === "Chaos" ? "pink" : vibe === "Serious" ? "blue" : "purple";
  const badge = drama >= 75 ? "Drama goblin active" : drama >= 45 ? "Manageable nonsense" : "Surprisingly civilized";

  return { name, rule, warning, drama, badge, accent, confetti: drama <= 25 || drama >= 90 };
}

function shareButton(self: string, text = "The Group Chat Oracle renamed my tiny council. Proceed with snacks.", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sub", "topic", "vibe", "drama", "buttons"],
    },
    title: { type: "text", props: { content: "Group Chat Oracle", weight: "bold", align: "center" } },
    sub: {
      type: "text",
      props: { content: "Name the chat, set the vibe, receive one sacred house rule.", size: "sm", align: "center" },
    },
    topic: { type: "input", props: { name: "topic", label: "What is this chat about?", placeholder: "founders, friends, lunch, chaos...", maxLength: 72 } },
    vibe: {
      type: "toggle_group",
      props: { name: "vibe", label: "Vibe", options: VIBES.map((label) => ({ label, value: label })), defaultValue: "Cozy" },
    },
    drama: { type: "slider", props: { name: "drama", label: "Drama level", min: 0, max: 100, step: 5, defaultValue: 35 } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["ask", "share_btn"] },
    ask: {
      type: "button",
      props: { label: "Ask oracle", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=cast` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, reading: Reading): SnapHandlerResult {
  const shareText = `Group Chat Oracle says my chat is “${reading.name}.” ${reading.badge}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "drama", "rule", "warning", "buttons"],
    },
    title: { type: "text", props: { content: reading.name, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: reading.badge, variant: "outline" } },
    drama: { type: "progress", props: { label: "Chat drama", value: reading.drama, max: 100 } },
    rule: { type: "text", props: { content: `House rule: ${reading.rule}`, align: "center" } },
    warning: { type: "text", props: { content: `Warning: ${reading.warning}`, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: {
      type: "button",
      props: { label: "Try another", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share oracle"),
  };

  return {
    version: "2.0",
    ...(reading.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: reading.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const inputs = ctx.action.inputs ?? {};
    const topic = cleanTopic(inputs.topic);
    const vibe = cleanVibe(inputs.vibe);
    const drama = cleanDrama(inputs.drama);
    const fid = ctx.action.user.fid;

    return resultPage(self, buildReading(topic, vibe, drama, fid));
  },
  {
    openGraph: {
      title: "Group Chat Oracle",
      description: "Name a group chat, pick the vibe, and receive a tiny sacred house rule.",
    },
  },
);

export default app;
