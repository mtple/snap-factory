/**
 * app-idea-speedrun — tiny app concept generator.
 *
 * Components: toggle_group, slider, progress, badge, item_group, item, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "app-idea-speedrun";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Audience = keyof typeof AUDIENCES;
type Mechanic = keyof typeof MECHANICS;
type Concept = {
  name: string;
  badge: string;
  pitch: string;
  firstScreen: string;
  magic: string;
  risk: string;
  speed: number;
  accent: Accent;
};

const AUDIENCES = {
  builders: {
    label: "Builders",
    noun: "builders",
    people: "shipping in public",
    pains: ["scope fog", "demo nerves", "half-finished side quests"],
    accent: "blue" as const,
  },
  creators: {
    label: "Creators",
    noun: "creators",
    people: "posting before the algorithm blinks",
    pains: ["blank-page panic", "content leftovers", "caption wobble"],
    accent: "purple" as const,
  },
  teams: {
    label: "Teams",
    noun: "teams",
    people: "trying to agree quickly",
    pains: ["meeting drift", "decision lint", "handoff fog"],
    accent: "teal" as const,
  },
  friends: {
    label: "Friends",
    noun: "friends",
    people: "making plans in group chat",
    pains: ["where-to-go loops", "soft maybes", "snack diplomacy"],
    accent: "green" as const,
  },
} as const;

const MECHANICS = {
  poll: {
    label: "Poll",
    object: "one-tap crowd vote",
    screen: "Four bold choices, instant tiny verdict, share the split.",
    magic: ["turns vague preference into visible momentum", "makes the room pick a lane"],
  },
  checklist: {
    label: "Checklist",
    object: "micro-checklist",
    screen: "Three boxes, one confidence meter, one next click.",
    magic: ["turns dread into a receipt", "makes progress feel suspiciously official"],
  },
  generator: {
    label: "Generator",
    object: "little generator",
    screen: "Pick two knobs; receive a named plan with a goblin footnote.",
    magic: ["adds a tiny drumroll before the useful bit", "makes repeat visits feel fresh"],
  },
  game: {
    label: "Tiny game",
    object: "30-second game",
    screen: "Tap a grid, reveal a result, dare someone to beat it.",
    magic: ["smuggles learning in under a snack-sized challenge", "turns a task into a dare"],
  },
} as const;

const VIBES = [
  { label: "Useful", value: 2, name: "Desk", adjective: "clear", badge: "practical sprite", risk: "May be too useful to be funny." },
  { label: "Playful", value: 5, name: "Goblin", adjective: "friendly", badge: "tiny delight", risk: "Jokes can outrun the product if left unsupervised." },
  { label: "Chaotic", value: 8, name: "Meteor", adjective: "unreasonable", badge: "chaos MVP", risk: "Needs one very calm primary button." },
] as const;

function pickKey<T extends Record<string, unknown>>(raw: unknown, options: T, fallback: keyof T): keyof T {
  const value = String(raw ?? fallback);
  return value in options ? (value as keyof T) : fallback;
}

function vibeInput(raw: unknown): number {
  const parsed = Number(raw ?? 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function tinyHash(parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nearestVibe(vibe: number) {
  return VIBES.reduce((best, current) => (Math.abs(current.value - vibe) < Math.abs(best.value - vibe) ? current : best));
}

function titleCase(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildConcept(audienceKey: Audience, mechanicKey: Mechanic, vibe: number, fid: number): Concept {
  const audience = AUDIENCES[audienceKey];
  const mechanic = MECHANICS[mechanicKey];
  const vibeMeta = nearestVibe(vibe);
  const seed = tinyHash([audienceKey, mechanicKey, vibe, fid || 0]);
  const pain = audience.pains[seed % audience.pains.length] ?? audience.pains[0];
  const magic = mechanic.magic[seed % mechanic.magic.length] ?? mechanic.magic[0];
  const speed = Math.max(28, Math.min(96, 44 + vibe * 4 + (seed % 17)));
  const names = [
    `${vibeMeta.name} ${titleCase(mechanic.object)}`,
    `${titleCase(audience.noun)} ${vibeMeta.name}`,
    `${titleCase(pain.split(" ")[0] ?? "Tiny")} Sprint`,
  ];
  const name = names[seed % names.length] ?? names[0];

  return {
    name,
    badge: vibeMeta.badge,
    pitch: `A ${vibeMeta.adjective} ${mechanic.object} for ${audience.people}: it attacks ${pain} before it grows teeth.`,
    firstScreen: mechanic.screen,
    magic: `Why it works: it ${magic}.`,
    risk: vibe >= 8 ? vibeMeta.risk : speed < 60 ? "Ship it as a tiny test before adding accounts, charts, or lore." : "Keep it one-screen until users ask for depth.",
    speed,
    accent: vibe >= 8 ? "amber" : audience.accent,
  };
}

function shareButton(self: string, text = "Try App Idea Speedrun") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "intro", "audience", "mechanic", "vibe", "actions"] },
    title: { type: "text", props: { content: "App Idea Speedrun", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Pick who it helps, how it works, and how weird it should be. The wizard returns one tiny app concept.", size: "sm", align: "center" },
    },
    audience: {
      type: "toggle_group",
      props: {
        name: "audience",
        label: "Audience",
        defaultValue: "builders",
        options: Object.entries(AUDIENCES).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    mechanic: {
      type: "toggle_group",
      props: {
        name: "mechanic",
        label: "Mechanic",
        defaultValue: "generator",
        options: Object.entries(MECHANICS).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    vibe: { type: "slider", props: { name: "vibe", label: "Weirdness", min: 1, max: 10, step: 1, defaultValue: 5 } },
    go: {
      type: "button",
      props: { label: "Speedrun idea", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=generate` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["go", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, concept: Concept): SnapHandlerResult {
  const shareText = `App Idea Speedrun gave me “${concept.name}”: ${concept.pitch}`.slice(0, 260);
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "pitch", "speed", "details", "actions"] },
    title: { type: "text", props: { content: concept.name, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: concept.badge, variant: "outline" } },
    pitch: { type: "text", props: { content: concept.pitch, align: "center" } },
    speed: { type: "progress", props: { label: `Prototype speed: ${concept.speed}%`, value: concept.speed, max: 100, color: concept.accent } },
    screen_item: { type: "item", props: { title: "First screen", description: concept.firstScreen } },
    magic_item: { type: "item", props: { title: "Magic", description: concept.magic } },
    risk_item: { type: "item", props: { title: "Guardrail", description: concept.risk } },
    details: { type: "item_group", props: {}, children: ["screen_item", "magic_item", "risk_item"] },
    again: { type: "button", props: { label: "Run again", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: concept.accent }, effects: concept.speed >= 82 ? ["confetti"] : undefined, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const action = url.searchParams.get("action");
  if (action !== "generate") {
    return startPage(self);
  }

  const audience = pickKey(ctx.action.inputs?.audience, AUDIENCES, "builders") as Audience;
  const mechanic = pickKey(ctx.action.inputs?.mechanic, MECHANICS, "generator") as Mechanic;
  const vibe = vibeInput(ctx.action.inputs?.vibe);
  return resultPage(self, buildConcept(audience, mechanic, vibe, ctx.action.user.fid));
}, {
  openGraph: {
    title: "App Idea Speedrun",
    description: "Pick audience, mechanic, and vibe to generate a tiny app concept.",
  },
});

export { buildConcept, pickKey, vibeInput };
export default app;
