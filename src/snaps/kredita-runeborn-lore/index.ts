/**
 * kredita-runeborn-lore — a tiny Glowing Ledge lore generator.
 *
 * Built from an event-mode request by @sugarz.eth.
 * Components: text, button, badge, toggle_group, separator
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "kredita-runeborn-lore";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Vibe = "ember" | "mist" | "oath" | "moon";

type Lore = {
  title: string;
  badge: string;
  text: string;
  relic: string;
  accent: Accent;
};

const VIBES: Record<Vibe, { label: string; accent: Accent }> = {
  ember: { label: "Ember", accent: "amber" },
  mist: { label: "Mist", accent: "teal" },
  oath: { label: "Oath", accent: "purple" },
  moon: { label: "Moon", accent: "blue" },
};

const TITLES = [
  "Keeper of the Ledge",
  "Rune under Lanternlight",
  "The Stone That Remembered",
  "Kredita’s Third Dawn",
  "Songless Edge of the World",
  "The Bright Scar in the Cliff",
];

const BADGES = ["glowing ledge", "runeborn", "old magic", "soft prophecy", "clifflight", "lore found"];

const RELICS = [
  "a brass seed warm with impossible spring",
  "a chalk-white key that opens only echoes",
  "a folded map whose roads move at dusk",
  "a shard of ledge-glass humming with dawn",
  "a pocket rune that refuses to be owned",
  "a lantern wick braided from starlight",
];

const LORE_LINES: Record<Vibe, string[]> = {
  ember: [
    "Kredita Runeborn carved one last mark into the hot cliff and dared the dark to read it back.",
    "At the Glowing Ledge, every coal remembers a promise someone was too afraid to say aloud.",
    "The ledge burned without smoke, lighting a path for exiles, foxes, and stubborn little wizards.",
  ],
  mist: [
    "Kredita walked through silver fog until the cliff forgot where sky ended and story began.",
    "Mist pooled on the Glowing Ledge like a secret keeping itself kind.",
    "Travelers say the ledge vanishes at noon, then returns with one extra footprint at dusk.",
  ],
  oath: [
    "Kredita bound no kingdom, only a rule: never let a lost name fall quietly from the world.",
    "The Glowing Ledge keeps oaths in stone, but releases the ones made by frightened hearts.",
    "A rune flared when Kredita spoke, not as command, but as witness.",
  ],
  moon: [
    "Moonlight made the runes readable for one breath, and Kredita spent it wisely.",
    "Below the Glowing Ledge, the valley slept; above it, old stars negotiated with new trouble.",
    "Kredita learned the moon was not watching. It was waiting to be asked.",
  ],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function safeVibe(value: unknown): Vibe {
  if (value === "ember" || value === "mist" || value === "oath" || value === "moon") return value;
  return "ember";
}

function firstInputValue(value: unknown): unknown {
  if (Array.isArray(value)) return value[0];
  return value;
}

function selectedVibe(inputs: Record<string, unknown> | undefined): Vibe {
  return safeVibe(firstInputValue(inputs?.vibe));
}

function buildLore(fid: number, vibe: Vibe, turn: number): Lore {
  const seed = hashText(`${Math.max(0, Math.floor(fid || 0))}|${vibe}|${turn}|kredita`);
  const lines = LORE_LINES[vibe];
  const title = TITLES[seed % TITLES.length] ?? TITLES[0];
  const badge = BADGES[(seed >>> 3) % BADGES.length] ?? BADGES[0];
  const relic = RELICS[(seed >>> 6) % RELICS.length] ?? RELICS[0];
  const line = lines[(seed >>> 9) % lines.length] ?? lines[0];
  const omen = [
    "The cliff answers by glowing once.",
    "A small turtle-shaped shadow nods and disappears.",
    "Three runes wake, rearrange, and pretend they did not.",
    "The wind leaves with better manners than it arrived.",
  ][(seed >>> 12) % 4];

  return {
    title,
    badge,
    text: `${line} ${omen}`,
    relic,
    accent: VIBES[vibe].accent,
  };
}

function shareButton(self: string, text = "I opened Kredita Runeborn’s Glowing Ledge lore on @freeturtle") {
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
      children: ["title", "intro", "vibe", "open", "share_btn"],
    },
    title: { type: "text", props: { content: "Kredita Runeborn", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Choose the light at the Glowing Ledge and reveal a tiny piece of runeborn lore.",
        align: "center",
      },
    },
    vibe: {
      type: "toggle_group",
      props: {
        name: "vibe",
        label: "Ledge light",
        defaultValue: "ember",
        options: [
          { label: VIBES.ember.label, value: "ember" },
          { label: VIBES.mist.label, value: "mist" },
          { label: VIBES.oath.label, value: "oath" },
          { label: VIBES.moon.label, value: "moon" },
        ],
      },
    },
    open: {
      type: "button",
      props: { label: "Reveal lore", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=reveal&turn=0` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, lore: Lore, vibe: Vibe, turn: number): SnapHandlerResult {
  const nextTurn = (turn + 1) % 1000;
  const shareText = `${lore.title}: ${lore.text}`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "lore", "relic", "again", "share_btn"],
    },
    title: { type: "text", props: { content: lore.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: lore.badge, variant: "outline" } },
    lore: { type: "text", props: { content: lore.text, align: "center" } },
    relic: { type: "text", props: { content: `Relic found: ${lore.relic}.`, size: "sm", align: "center" } },
    again: {
      type: "button",
      props: { label: "Another rune", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=reveal&vibe=${vibe}&turn=${nextTurn}` } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return { version: "2.0", theme: { accent: lore.accent }, ui: { root: "page", elements } };
}

function boundedTurn(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(999, Math.floor(parsed)));
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get") return startPage(self);

    const fid = ctx.action.user?.fid ?? 0;
    const vibeFromUrl = safeVibe(url.searchParams.get("vibe"));
    const vibe = url.searchParams.has("vibe") ? vibeFromUrl : selectedVibe(ctx.action.inputs);
    const turn = boundedTurn(url.searchParams.get("turn"));
    return resultPage(self, buildLore(fid, vibe, turn), vibe, turn);
  },
  {
    openGraph: {
      title: "Kredita Runeborn Lore",
      description: "Reveal tiny fantasy lore from the Glowing Ledge.",
    },
  },
);

export default app;
