/**
 * alchemy-lab — Combine the four classical elements to brew a compound.
 *
 * GET:   4 switch toggles (Fire, Water, Earth, Air) + Brew button.
 * POST:  Map the 16 possible switch combinations to a unique compound.
 *        Show compound name, badge, and a one-line description.
 *        Confetti fires for the "ultimate" combo (all four elements).
 *
 * Components: switch, badge, text, button, separator, stack
 * Actions:    submit, compose_cast
 * State:      stateless
 * Accent:     varies by result (amber default, red/teal/green/purple)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "alchemy-lab";

// Each compound keyed by a 4-bit bitmask string: "fire_water_earth_air"
// Bit order: fire (8), water (4), earth (2), air (1)
type Compound = {
  name: string;
  description: string;
  accent: "red" | "teal" | "green" | "amber" | "purple" | "blue" | "pink" | "gray";
  confetti?: boolean;
};

const COMPOUNDS: Record<number, Compound> = {
  0:  { name: "Void",      description: "Nothing. Pure potential. The wizard waits.",           accent: "gray" },
  1:  { name: "Wind",      description: "Air in motion. Invisible and unstoppable.",             accent: "blue" },
  2:  { name: "Stone",     description: "Solid earth, unchanged since the age of mountains.",    accent: "gray" },
  3:  { name: "Dust",      description: "What stone becomes when wind has its way.",             accent: "amber" },
  4:  { name: "Rain",      description: "Water falling freely from a patient sky.",              accent: "teal" },
  5:  { name: "Storm",     description: "Wind and water in furious agreement.",                  accent: "blue" },
  6:  { name: "Mud",       description: "Earth and water, inseparable and inconvenient.",        accent: "green" },
  7:  { name: "Life",      description: "Water, earth, and air converge. Something stirs.",      accent: "green" },
  8:  { name: "Flame",     description: "Fire alone. Pure heat and light.",                      accent: "red" },
  9:  { name: "Lightning", description: "Fire and air — a flash, a crack, then silence.",       accent: "amber" },
  10: { name: "Lava",      description: "Fire meets earth. The mountain decides to move.",       accent: "red" },
  11: { name: "Volcano",   description: "Fire, earth, and air in violent union. Run.",           accent: "red" },
  12: { name: "Steam",     description: "Fire and water cancel out into something softer.",      accent: "teal" },
  13: { name: "Thunderstorm", description: "Fire, water, and air — nature at its loudest.",     accent: "purple" },
  14: { name: "Swamp",     description: "Fire, water, and earth. Murky, alive, and ancient.",   accent: "green" },
  15: { name: "Cosmos",    description: "All four elements. The wizard smiles. This is everything.", accent: "purple", confetti: true },
};

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── Picker screen (GET, or POST with no inputs mapped) ────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "amber" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "sub", "fire_sw", "water_sw", "earth_sw", "air_sw", "sep", "brew_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: { content: "Alchemy Lab", weight: "bold", align: "center" },
          },
          sub: {
            type: "text",
            props: { content: "Toggle elements, then brew your compound.", size: "sm", align: "center" },
          },
          fire_sw: {
            type: "switch",
            props: { name: "fire", label: "🔥 Fire", defaultValue: false },
          },
          water_sw: {
            type: "switch",
            props: { name: "water", label: "💧 Water", defaultValue: false },
          },
          earth_sw: {
            type: "switch",
            props: { name: "earth", label: "🪨 Earth", defaultValue: false },
          },
          air_sw: {
            type: "switch",
            props: { name: "air", label: "🌬 Air", defaultValue: false },
          },
          sep: {
            type: "separator",
            props: {},
          },
          brew_btn: {
            type: "button",
            props: { label: "Brew it", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
              },
            },
          },
          share_btn: {
            type: "button",
            props: { label: "Share", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "combine fire, water, earth, and air to brew something ✨",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── POST: compute compound ────────────────────────────────────────────
  const inputs = ctx.action.inputs as Record<string, boolean | undefined>;
  const fireBit  = inputs.fire  ? 8 : 0;
  const waterBit = inputs.water ? 4 : 0;
  const earthBit = inputs.earth ? 2 : 0;
  const airBit   = inputs.air   ? 1 : 0;
  const bitmask  = fireBit | waterBit | earthBit | airBit;

  const compound = COMPOUNDS[bitmask];

  // Build a concise "recipe" label (e.g. "Fire + Water") for sharing
  const activeElements: string[] = [];
  if (inputs.fire)  activeElements.push("Fire");
  if (inputs.water) activeElements.push("Water");
  if (inputs.earth) activeElements.push("Earth");
  if (inputs.air)   activeElements.push("Air");
  const recipe = activeElements.length > 0 ? activeElements.join(" + ") : "Nothing";

  const shareText = `brewed ${compound.name} in the alchemy lab 🧪`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: compound.accent },
    effects: compound.confetti ? ["confetti"] : undefined,
    ui: {
      root: "result_page",
      elements: {
        result_page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["recipe_badge", "compound_name", "compound_desc", "sep", "try_again_btn", "share_btn"],
        },
        recipe_badge: {
          type: "badge",
          props: { label: recipe.slice(0, 30), variant: "outline" },
        },
        compound_name: {
          type: "text",
          props: { content: compound.name, weight: "bold", size: "md", align: "center" },
        },
        compound_desc: {
          type: "text",
          props: { content: compound.description, size: "sm", align: "center" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        try_again_btn: {
          type: "button",
          props: { label: "Try another combo", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: shareText,
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
