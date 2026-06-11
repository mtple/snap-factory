/**
 * farcaster-creature-type — reveal your timeline creature and habitat.
 *
 * Components: toggle_group, slider, switch, progress, item_group, item, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "farcaster-creature-type";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Habit = keyof typeof HABITS;
type Habitat = keyof typeof HABITATS;

type Creature = {
  name: string;
  badge: string;
  habitat: string;
  tells: string;
  snack: string;
  signal: number;
  accent: Accent;
};

const HABITS = {
  reply: { label: "Reply gremlin", noun: "Reply", instinct: "appears whenever a thread gets spicy", accent: "purple" as const },
  build: { label: "Build goblin", noun: "Build", instinct: "turns vague ideas into suspicious little demos", accent: "blue" as const },
  lurk: { label: "Lurker owl", noun: "Lurker", instinct: "sees every subtweet and blinks only once", accent: "teal" as const },
  boost: { label: "Boost fairy", noun: "Boost", instinct: "sprinkles likes on underfed experiments", accent: "pink" as const },
} as const;

const HABITATS = {
  cozy: { label: "Cozy corner", place: "the cozy reply moss", food: "warm context crumbs" },
  launch: { label: "Launch dock", place: "the midnight shipyard", food: "fresh changelog berries" },
  chaos: { label: "Chaos swamp", place: "the group-chat bog", food: "one cursed screenshot" },
  base: { label: "Base cave", place: "the blue onchain grotto", food: "tiny gas-fee pebbles" },
} as const;

const CREATURE_BITS = ["Moth", "Goblin", "Capybara", "Wyrm", "Raccoon", "Phoenix", "Slug", "Fox"];
const MOODS = [
  { label: "Soft", value: 2, suffix: "with velvet notifications", badge: "gentle timeline beast" },
  { label: "Chatty", value: 5, suffix: "wearing three reply bells", badge: "social field guide" },
  { label: "Feral", value: 8, suffix: "typing from a tiny thundercloud", badge: "feral but useful" },
] as const;

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickKey<T extends Record<string, unknown>>(raw: unknown, options: T, fallback: keyof T): keyof T {
  const value = String(raw ?? fallback);
  return value in options ? (value as keyof T) : fallback;
}

function cleanEnergy(raw: unknown): number {
  const parsed = Number(raw ?? 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function cleanSwitch(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function nearestMood(energy: number) {
  return MOODS.reduce((best, current) => (Math.abs(current.value - energy) < Math.abs(best.value - energy) ? current : best));
}

function makeCreature(habitKey: Habit, habitatKey: Habitat, energy: number, afterDark: boolean, fid: number): Creature {
  const habit = HABITS[habitKey];
  const habitat = HABITATS[habitatKey];
  const mood = nearestMood(energy);
  const seed = hashText(`${habitKey}:${habitatKey}:${energy}:${afterDark}:${fid || "anon"}`);
  const bit = CREATURE_BITS[seed % CREATURE_BITS.length] ?? "Goblin";
  const name = `${habit.noun} ${bit}`;
  const signal = Math.max(20, Math.min(98, 35 + energy * 5 + (afterDark ? 11 : 0) + (seed % 13)));

  return {
    name,
    badge: mood.badge,
    habitat: `${habitat.place}${afterDark ? " after dark" : " at scroll o'clock"}`,
    tells: `Known behavior: ${habit.instinct}, ${mood.suffix}.`,
    snack: `Leave out ${habitat.food}; it may follow you into the next thread.`,
    signal,
    accent: afterDark ? "amber" : habit.accent,
  };
}

function shareButton(self: string, text = "Find your Farcaster Creature Type.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "intro", "habit", "habitat", "energy", "night", "actions"] },
    title: { type: "text", props: { content: "Farcaster Creature Type", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Pick your timeline habits. The wizard reveals your native creature, habitat, and snack offering.", size: "sm", align: "center" },
    },
    habit: {
      type: "toggle_group",
      props: { name: "habit", label: "Timeline habit", defaultValue: "build", options: Object.entries(HABITS).map(([value, config]) => ({ label: config.label, value })) },
    },
    habitat: {
      type: "toggle_group",
      props: { name: "habitat", label: "Preferred habitat", defaultValue: "cozy", options: Object.entries(HABITATS).map(([value, config]) => ({ label: config.label, value })) },
    },
    energy: { type: "slider", props: { name: "energy", label: "Timeline energy", min: 1, max: 10, step: 1, defaultValue: 5 } },
    night: { type: "switch", props: { name: "night", label: "Mostly appears after dark", defaultValue: false } },
    reveal: {
      type: "button",
      props: { label: "Reveal creature", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=reveal` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["reveal", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, creature: Creature): SnapHandlerResult {
  const shareText = `My Farcaster Creature Type is ${creature.name}: ${creature.habitat}.`;
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "signal", "details", "actions"] },
    title: { type: "text", props: { content: creature.name, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: creature.badge, variant: "outline" } },
    signal: { type: "progress", props: { label: `Timeline signal: ${creature.signal}%`, value: creature.signal, max: 100, color: creature.accent } },
    habitat_item: { type: "item", props: { title: "Habitat", description: creature.habitat } },
    tell_item: { type: "item", props: { title: "Field marks", description: creature.tells } },
    snack_item: { type: "item", props: { title: "Snack offering", description: creature.snack } },
    details: { type: "item_group", props: {}, children: ["habitat_item", "tell_item", "snack_item"] },
    again: { type: "button", props: { label: "Try again", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText, "Share creature"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: creature.accent }, effects: creature.signal >= 90 ? ["confetti"] : undefined, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const action = url.searchParams.get("action");
    if (action !== "reveal") {
      return startPage(self);
    }

    const habit = pickKey(ctx.action.inputs?.habit, HABITS, "build") as Habit;
    const habitat = pickKey(ctx.action.inputs?.habitat, HABITATS, "cozy") as Habitat;
    const energy = cleanEnergy(ctx.action.inputs?.energy);
    const afterDark = cleanSwitch(ctx.action.inputs?.night);
    const creature = makeCreature(habit, habitat, energy, afterDark, ctx.action.user.fid);
    return resultPage(self, creature);
  },
  {
    openGraph: {
      title: "Farcaster Creature Type",
      description: "Pick your social habits and reveal your timeline creature and habitat.",
    },
  },
);

export { cleanEnergy, cleanSwitch, makeCreature, pickKey };
export default app;
