/**
 * fridge-oracle — turn suspicious fridge contents into one tiny meal plan.
 *
 * Components: input, slider, switch, badge, progress, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "fridge-oracle";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Reading = {
  title: string;
  badge: string;
  plan: string;
  rule: string;
  confidence: number;
  accent: Accent;
};

const LOW_HUNGER_PLANS = [
  "Snack plate: put the safest thing, the crunchiest thing, and one dip-adjacent item on a plate. That counts.",
  "Toast treaty: toast something, add salt/fat/acid, and stop pretending this needs a recipe.",
  "Bowl of mercy: warm the most cooperative leftovers and add one fresh-ish topping for dignity.",
];

const MID_HUNGER_PLANS = [
  "Chaos bowl: base + protein-ish item + crunchy thing + sauce. Stir until it looks intentional.",
  "Skillet pact: chop the edible suspects, heat hard, finish with sauce. Serve before doubt arrives.",
  "Wrap protocol: anything can be lunch if folded inside bread and renamed confidently.",
];

const HIGH_HUNGER_PLANS = [
  "Emergency feast: make the fastest carb, add two fridge survivors, crown it with sauce, eat standing up if necessary.",
  "Big bowl doctrine: double the base, double the topping, no tiny garnish theater tonight.",
  "Pan raid: fry the sturdy bits first, add soft bits last, call it rustic and move on.",
];

const MICROWAVE_RULES = [
  "Microwave law: cover it, add a splash of water, stir halfway. The oracle hates lava corners.",
  "Use a mug or bowl with headroom. The cleanup goblin is already watching.",
  "Heat in short bursts. If it hisses like a dragon, you went too far.",
];

const NORMAL_RULES = [
  "Add acid or crunch at the end. That is where fake cooking becomes real cooking.",
  "If two ingredients are boring, sauce is the mediator.",
  "Plate it like a person made it on purpose. Morale is a seasoning.",
];

function clampNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cleanIngredients(value: unknown): string {
  if (typeof value !== "string") return "mystery leftovers";
  return value.replace(/\s+/g, " ").trim().slice(0, 120) || "mystery leftovers";
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length] ?? items[0];
}

function makeReading(ingredients: string, hunger: number, microwave: boolean, fid: number): Reading {
  const pool = hunger < 34 ? LOW_HUNGER_PLANS : hunger > 72 ? HIGH_HUNGER_PLANS : MID_HUNGER_PLANS;
  const seed = ingredients.split("").reduce((sum, char) => sum + char.charCodeAt(0), fid || 17) + hunger + (microwave ? 31 : 0);
  const confidence = Math.max(18, Math.min(98, 44 + Math.round(hunger / 2) - (microwave ? 4 : 0) + (seed % 17)));
  const label = hunger > 72 ? "Hangry field unit" : hunger < 34 ? "Snack diplomacy" : "Dinner salvage";

  return {
    title: microwave ? "Microwave Oracle" : "Fridge Oracle",
    badge: label,
    plan: `${pick(pool, seed)} Use: ${ingredients}.`,
    rule: pick(microwave ? MICROWAVE_RULES : NORMAL_RULES, seed + 7),
    confidence,
    accent: hunger > 72 ? "amber" : microwave ? "purple" : "green",
  };
}

function shareButton(self: string, text = "The Fridge Oracle inspected my leftovers and survived."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share oracle", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "ingredients", "hunger", "microwave", "submit_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Fridge Oracle", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Type the fridge suspects. Get one tiny meal plan with minimal culinary mythology.", size: "sm", align: "center" },
    },
    ingredients: {
      type: "input",
      props: { name: "ingredients", label: "What do you have?", placeholder: "eggs, rice, sad spinach", maxLength: 120 },
    },
    hunger: { type: "slider", props: { name: "hunger", label: "Hunger level", min: 0, max: 100, step: 5, defaultValue: 55 } },
    microwave: { type: "switch", props: { name: "microwave", label: "Microwave-only mode" } },
    submit_btn: {
      type: "button",
      props: { label: "Read my fridge", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=read` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "green" }, ui: { root: "page", elements } };
}

function resultPage(self: string, reading: Reading): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "plan", "confidence", "rule", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: reading.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: reading.badge, variant: "outline" } },
    plan: { type: "text", props: { content: reading.plan, align: "center" } },
    confidence: { type: "progress", props: { label: "Edibility confidence", value: reading.confidence, max: 100 } },
    rule: { type: "text", props: { content: reading.rule, size: "sm", align: "center" } },
    again_btn: {
      type: "button",
      props: { label: "Try another fridge", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, `Fridge Oracle verdict: ${reading.badge}. ${reading.rule}`),
  };

  return { version: "2.0", theme: { accent: reading.accent }, ui: { root: "page", elements } };
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
    const ingredients = cleanIngredients(inputs.ingredients);
    const hunger = clampNumber(inputs.hunger, 55);
    const microwave = asBool(inputs.microwave);
    const fid = ctx.action.user?.fid ?? 0;

    return resultPage(self, makeReading(ingredients, hunger, microwave, fid));
  },
  {
    openGraph: {
      title: "Fridge Oracle",
      description: "Turn suspicious fridge contents into one tiny meal plan.",
    },
  },
);

export default app;
