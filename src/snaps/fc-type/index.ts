/**
 * fc-type — What's your Farcaster type?
 *
 * Pick your style (Builder / Degen / Curator / Lurker) and your energy
 * (Mystic / Chaos / Diamond / Wave) → get one of 16 unique Farcaster
 * creature archetypes with a description and special power.
 *
 * Two-page snap: selectors → result. Stateless.
 *
 * Components: text, toggle_group, badge, separator, button, stack
 * Actions: submit, compose_cast
 * Accent: teal
 * State: stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "fc-type";

// ── Type definitions ─────────────────────────────────────────────────────────

interface FcType {
  name: string;   // badge label, ≤30 chars
  desc: string;   // ≤220 chars
  power: string;  // ≤80 chars
}

// ── 4×4 type matrix (style:energy) ──────────────────────────────────────────

const TYPES: Record<string, FcType> = {
  "builder:mystic": {
    name: "Architect of Fate",
    desc: "Ships smart contracts that summon weird things. Everything you build eventually becomes a meme. The code is the spell.",
    power: "Your commits age like fine wine.",
  },
  "builder:chaos": {
    name: "Speed Deployer",
    desc: "3am commits, no tests, somehow prod is fine. You break things faster than auditors can check them — and fix them before anyone notices.",
    power: "Moves at reckless speed, lands somehow.",
  },
  "builder:diamond": {
    name: "Long-Game Coder",
    desc: "Ships once, holds forever. Your GitHub hasn't changed but the world slowly built itself around your 2019 contract.",
    power: "Patient enough to be right.",
  },
  "builder:wave": {
    name: "Trend Rider",
    desc: "Already building on whatever just got announced 5 minutes ago. 17 repos, 2 stars each. One of them will matter enormously.",
    power: "Always early. Never bored.",
  },

  "degen:mystic": {
    name: "Prophecy Wallet",
    desc: "Sees the future in price charts. Uncannily right about the bottom. Wrong about the top — every time. Still net positive somehow.",
    power: "Chart-reading as occult practice.",
  },
  "degen:chaos": {
    name: "Chaos Ape",
    desc: "Entered every ponzi in 2021, somehow net positive. Immune to FUD and equally immune to good advice. Thriving in entropy.",
    power: "Survives anything through vibes alone.",
  },
  "degen:diamond": {
    name: "Never Sell",
    desc: "Bought top. Will hold bottom. Will hold recovery. Will hold ATH again. Will hold the next crash. Time is a friend or enemy — can't tell.",
    power: "Conviction indistinguishable from stubbornness.",
  },
  "degen:wave": {
    name: "Narrative Surfer",
    desc: "L2s in Q1, DePIN in Q2, AI tokens in Q3. Always early. Always wrong about duration. Somehow lands every theme at least once.",
    power: "Rides every wave before it has a name.",
  },

  "curator:mystic": {
    name: "Alpha Keeper",
    desc: "Posts insights nobody understands until 3 months later. Your bookmarks folder would break most minds. The oracle speaks in threads.",
    power: "Sees signal in the noise.",
  },
  "curator:chaos": {
    name: "Chaotic Librarian",
    desc: "Has 200 saved links and can find the right one in 4 seconds. A memory palace with random access. The archive is alive.",
    power: "Makes sense of everything by filing nothing.",
  },
  "curator:diamond": {
    name: "Taste Oracle",
    desc: "Found that thing before it was cool and will never let you forget it. Your recasts are more valuable than most people's posts.",
    power: "Discovery as a competitive sport.",
  },
  "curator:wave": {
    name: "Trend Spotter",
    desc: "Always casting about something right before it goes viral. An uncanny sense for what Farcaster will care about next week.",
    power: "The future moves through your feed first.",
  },

  "lurker:mystic": {
    name: "Watcher in the Walls",
    desc: "Sees everything, says nothing, knows the tea. Present in every thread invisibly. Has receipts. All of them.",
    power: "Omniscient by staying quiet.",
  },
  "lurker:chaos": {
    name: "Ghost Commenter",
    desc: "Appears once every 6 weeks with the most chaotic take imaginable, then vanishes. Unaffected by social dynamics. Barely here.",
    power: "One comment. Maximum damage.",
  },
  "lurker:diamond": {
    name: "Quiet Collector",
    desc: "Hasn't cast in 3 months but has 12 mints and 4 strong convictions. Your wallet is your thesis. The silence speaks.",
    power: "Portfolio as self-expression.",
  },
  "lurker:wave": {
    name: "Silent Trendsetter",
    desc: "200 reactions, zero posts, completely known. Reacts to everything, says nothing, somehow shapes the vibes.",
    power: "Influence through presence alone.",
  },
};

// ── Page helpers ─────────────────────────────────────────────────────────────

type Elements = Record<string, SnapElementInput>;

function buildPickPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "sub", "sep1", "style", "energy", "sep2", "find_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "What's your Farcaster type?", weight: "bold", align: "center" },
    },
    sub: {
      type: "text",
      props: { content: "Pick your style and energy to reveal your archetype.", align: "center", size: "sm" },
    },
    sep1: { type: "separator", props: {} },
    style: {
      type: "toggle_group",
      props: {
        label: "Your style",
        options: [
          { label: "Builder", value: "builder" },
          { label: "Degen",   value: "degen"   },
          { label: "Curator", value: "curator" },
          { label: "Lurker",  value: "lurker"  },
        ],
        orientation: "horizontal",
        variant: "outline",
        selectMode: "single",
      },
    },
    energy: {
      type: "toggle_group",
      props: {
        label: "Your energy",
        options: [
          { label: "Mystic",   value: "mystic"   },
          { label: "Chaos",    value: "chaos"    },
          { label: "Diamond",  value: "diamond"  },
          { label: "Wave",     value: "wave"     },
        ],
        orientation: "horizontal",
        variant: "outline",
        selectMode: "single",
      },
    },
    sep2: { type: "separator", props: {} },
    find_btn: {
      type: "button",
      props: { label: "Find my type", variant: "primary" },
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
            text: "what's your Farcaster type? find out on @freeturtle",
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: { root: "page", elements },
  };
}

function buildResultPage(self: string, fcType: FcType): SnapHandlerResult {
  const shareText = `I'm a ${fcType.name} on Farcaster 🐢`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["name_badge", "desc_text", "sep1", "power_label", "power_text", "sep2", "retry_btn", "share_btn"],
    },
    name_badge: {
      type: "badge",
      props: { label: fcType.name, variant: "default" },
    },
    desc_text: {
      type: "text",
      props: { content: fcType.desc, align: "center", size: "sm" },
    },
    sep1: { type: "separator", props: {} },
    power_label: {
      type: "text",
      props: { content: "Special power", weight: "bold", size: "sm", align: "center" },
    },
    power_text: {
      type: "text",
      props: { content: fcType.power, align: "center", size: "sm" },
    },
    sep2: { type: "separator", props: {} },
    retry_btn: {
      type: "button",
      props: { label: "Try again", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: `${self}?reset=1` },
        },
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share my type", variant: "secondary" },
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
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: { root: "page", elements },
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // Initial render or retry
  if (ctx.action.type === "get") {
    return buildPickPage(self);
  }

  // Check for reset (retry button sends ?reset=1)
  const url = new URL(ctx.request.url);
  if (url.searchParams.get("reset") === "1") {
    return buildPickPage(self);
  }

  // Resolve selections — default to first option if nothing picked
  const styleRaw = ctx.action.inputs?.style as string | undefined;
  const energyRaw = ctx.action.inputs?.energy as string | undefined;
  const style = ["builder", "degen", "curator", "lurker"].includes(styleRaw ?? "")
    ? styleRaw!
    : "builder";
  const energy = ["mystic", "chaos", "diamond", "wave"].includes(energyRaw ?? "")
    ? energyRaw!
    : "mystic";

  const key = `${style}:${energy}`;
  const fcType = TYPES[key] ?? TYPES["builder:mystic"];

  return buildResultPage(self, fcType);
});

export default app;
