/**
 * creature-summoner — configure 4 trait switches, get a wizard-summoned creature.
 *
 * GET:  4 switch components (Era, Size, Element, Realm) + Summon button.
 * POST: Show the summoned creature name, traits badge, and description.
 *       16 creatures — one per combination of the 4 binary traits.
 *       Try Again returns to the initial form.
 *
 * New components: switch (×4), badge
 * Accent color: gray (unused so far)
 * Actions: submit
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "creature-summoner";

// ── Creature table ──────────────────────────────────────────────────────────
// Key: 4-digit binary string — modern(0/1) colossal(0/1) frost(0/1) sea(0/1)

interface Creature {
  name: string;
  description: string;
}

const CREATURES: Record<string, Creature> = {
  "0000": {
    name: "Embercrick",
    description: "A flame salamander older than memory. Survived the first volcano.",
  },
  "0001": {
    name: "Magmite",
    description: "A coral ember sprite near deep thermal vents since the Cambrian.",
  },
  "0010": {
    name: "Frostmote",
    description: "A wandering speck of the original ice age. Never quite melted.",
  },
  "0011": {
    name: "Glacette",
    description: "A microscopic ice jellyfish that predates every ocean current.",
  },
  "0100": {
    name: "Pyrethon",
    description: "A mountain-spanning fire serpent, asleep since the first age.",
  },
  "0101": {
    name: "Magmara",
    description: "A leviathan whose body is slowly-cooling magma.",
  },
  "0110": {
    name: "Glacidon",
    description: "A continent-spanning ice titan from the first winter.",
  },
  "0111": {
    name: "Kryon",
    description: "The original polar ice, now sentient and very tired.",
  },
  "1000": {
    name: "Sparklet",
    description: "A 2026 fire sprite. Very online. Posts hot takes.",
  },
  "1001": {
    name: "Flamito",
    description: "A tiny flame squid. Glows at 1000 lumens. Mostly harmless.",
  },
  "1010": {
    name: "Chillux",
    description: "A frost dust bunny that lives in your freezer.",
  },
  "1011": {
    name: "Frostbit",
    description: "A small ice crab somehow trending on Farcaster right now.",
  },
  "1100": {
    name: "Infernus",
    description: "A megafire elemental powered by modern climate chaos.",
  },
  "1101": {
    name: "Boilron",
    description: "A massive steam beast born of the warming ocean.",
  },
  "1110": {
    name: "Glacius",
    description: "The last glacier, now sentient. Not happy about things.",
  },
  "1111": {
    name: "Deepfrost",
    description: "A colossal ice titan forming in the new polar vortex. Currently plotting.",
  },
};

// ── Initial form ─────────────────────────────────────────────────────────────

function buildInitialView(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "gray" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "subtitle", "era", "size", "element", "realm", "summon_btn"],
        },
        title: {
          type: "text",
          props: { content: "Summon a Creature", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Set the four traits. The wizard summons what you configure.",
            size: "sm",
            align: "center",
          },
        },
        era: {
          type: "switch",
          props: { name: "modern", label: "Era: Ancient (off) / Modern (on)", defaultChecked: false },
        },
        size: {
          type: "switch",
          props: { name: "colossal", label: "Size: Tiny (off) / Colossal (on)", defaultChecked: false },
        },
        element: {
          type: "switch",
          props: { name: "frost", label: "Element: Fire (off) / Frost (on)", defaultChecked: false },
        },
        realm: {
          type: "switch",
          props: { name: "sea", label: "Realm: Land (off) / Sea (on)", defaultChecked: false },
        },
        summon_btn: {
          type: "button",
          props: { label: "Summon", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
      },
    },
  };
}

// ── Snap handler ──────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return buildInitialView(self);
  }

  // POST — read switch values (undefined when "Try Again" is tapped from result page)
  const inputs = ctx.action.inputs as Record<string, unknown>;
  if (inputs["modern"] === undefined) {
    // No inputs means Try Again was tapped — show initial form
    return buildInitialView(self);
  }

  const modern = inputs["modern"] === true;
  const colossal = inputs["colossal"] === true;
  const frost = inputs["frost"] === true;
  const sea = inputs["sea"] === true;

  const key = `${modern ? 1 : 0}${colossal ? 1 : 0}${frost ? 1 : 0}${sea ? 1 : 0}`;
  const creature = CREATURES[key] ?? {
    name: "Voidmoth",
    description: "An error in the summoning ritual. The wizard is confused.",
  };

  // Build trait label — max 30 chars for badge
  // Worst case: "Ancient, Colossal, Frost, Land" = 30 chars exactly
  const traits = [
    modern ? "Modern" : "Ancient",
    colossal ? "Colossal" : "Tiny",
    frost ? "Frost" : "Fire",
    sea ? "Sea" : "Land",
  ].join(", ");

  return {
    version: "1.0",
    theme: { accent: "gray" },
    effects: ["confetti"],
    ui: {
      root: "result",
      elements: {
        result: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["header", "creature_name", "traits_badge", "sep", "creature_desc", "again_btn"],
        },
        header: {
          type: "text",
          props: { content: "The wizard has spoken", weight: "bold", align: "center" },
        },
        creature_name: {
          type: "text",
          props: { content: creature.name, weight: "bold", align: "center" },
        },
        traits_badge: {
          type: "badge",
          props: { label: traits, variant: "outline" },
        },
        sep: { type: "separator", props: {} },
        creature_desc: {
          type: "text",
          props: { content: creature.description, align: "center", size: "sm" },
        },
        again_btn: {
          type: "button",
          props: { label: "Try Again", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
      },
    },
  };
});

export default app;
