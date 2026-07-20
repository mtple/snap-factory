/**
 * mini-app-sampler — choose one need, get one curated non-music mini app door.
 *
 * Components: toggle_group, item_group, item, badge, button, text, stack
 * Actions: submit, open_mini_app, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "mini-app-sampler";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type VibeKey = keyof typeof VIBES;

type Sample = {
  name: string;
  target: string;
  receipt: string;
  whyNow: string;
  tinyMission: string;
};

const VIBES = {
  focus: { label: "Focus", badge: "quiet lane", accent: "blue" as Accent },
  social: { label: "Social", badge: "people graph", accent: "teal" as Accent },
  shop: { label: "Shop", badge: "cart goblin", accent: "amber" as Accent },
  play: { label: "Play", badge: "tap break", accent: "purple" as Accent },
};

const SAMPLES: Record<VibeKey, Sample[]> = {
  focus: [
    {
      name: "Farcaster Snaps Dev",
      target: "https://farcaster.xyz/~/developers/snaps",
      receipt: "Best for turning one tiny idea into a working in-feed prototype.",
      whyNow: "Snaps chatter is up today, and builders are testing what the format can do.",
      tinyMission: "Open it, sketch one button, ship the smallest useful loop.",
    },
    {
      name: "OpenRank Explorer",
      target: "https://explorer.openrank.com",
      receipt: "Good for checking distribution signal before you chase a loud thread.",
      whyNow: "The feed keeps circling identity and trust; graph context helps.",
      tinyMission: "Look up one account or topic before posting your take.",
    },
  ],
  social: [
    {
      name: "Icebreaker",
      target: "https://icebreaker.xyz",
      receipt: "A people-map door for finding shared interests and warm intros.",
      whyNow: "Passport and identity talk is everywhere; this makes it practical.",
      tinyMission: "Find one person to follow up with instead of doom-scrolling.",
    },
    {
      name: "Kiosk",
      target: "https://kiosk.app",
      receipt: "Channel discovery without making you read the whole timeline first.",
      whyNow: "Farcaster energy is scattered across rooms; a doorway beats a dashboard.",
      tinyMission: "Join one room, lurk for two minutes, then post one useful thing.",
    },
  ],
  shop: [
    {
      name: "Zora",
      target: "https://zora.co",
      receipt: "A creator-commerce door for browsing collectible and coin activity.",
      whyNow: "Base/app chatter is loud; this keeps the shopping impulse creator-shaped.",
      tinyMission: "Browse one creator page before buying anything shiny.",
    },
    {
      name: "Base App",
      target: "https://base.app",
      receipt: "The blue front door for Base-native account and wallet activity.",
      whyNow: "Base is dominating the feed today, from identity to account abstraction.",
      tinyMission: "Check your profile or wallet state before following the hype smoke.",
    },
  ],
  play: [
    {
      name: "Starcaster",
      target: "https://starcaster.xyz",
      receipt: "A tiny ship-door game for people who want one clean tap loop.",
      whyNow: "The hull-breach snap got people curious about playable cards again.",
      tinyMission: "Open one hatch, blame the wizard if space wins.",
    },
    {
      name: "Perl",
      target: "https://perl.xyz",
      receipt: "Fast social play when the timeline needs a low-stakes side quest.",
      whyNow: "After heavy Base discourse, the feed deserves a snack-sized game.",
      tinyMission: "Take one playful detour, then come back less cursed.",
    },
  ],
};

function vibeInput(raw: unknown): VibeKey {
  const value = String(raw ?? "focus");
  return value in VIBES ? (value as VibeKey) : "focus";
}

function viewerSeed(ctx: Parameters<Parameters<typeof registerSnapHandler>[1]>[0]): number {
  const maybeFid = ctx.action.type === "post" ? ctx.action.user?.fid : ctx.action.user?.fid;
  const fallbackFid = ctx.action.type === "post" ? (ctx.action as { fid?: number }).fid : undefined;
  const fid = maybeFid ?? fallbackFid ?? 17;
  return Number.isFinite(fid) ? fid : 17;
}

function pickSample(vibe: VibeKey, seed: number): Sample {
  const options = SAMPLES[vibe];
  return options[Math.abs(seed + vibe.length) % options.length];
}

function shareButton(self: string, text = "Try Mini App Sampler") {
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
      children: ["title", "intro", "vibe", "sample", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Mini App Sampler", weight: "bold", align: "center" },
    },
    intro: {
      type: "text",
      props: {
        content: "Pick the kind of tiny Farcaster door you need. The wizard returns one non-music mini app, why now, and a tiny mission.",
        size: "sm",
        align: "center",
      },
    },
    vibe: {
      type: "toggle_group",
      props: {
        name: "vibe",
        label: "What do you need?",
        defaultValue: "focus",
        options: Object.entries(VIBES).map(([value, vibe]) => ({ label: vibe.label, value })),
      },
    },
    sample: {
      type: "button",
      props: { label: "Sample one app", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=sample` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, vibeKey: VibeKey, sample: Sample): SnapHandlerResult {
  const vibe = VIBES[vibeKey];
  const shareText = `Mini App Sampler gave me ${sample.name} for ${vibe.label.toLowerCase()} mode.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "receipt", "why", "mission", "buttons"],
    },
    title: {
      type: "text",
      props: { content: `${vibe.label} sample: ${sample.name}`, weight: "bold", align: "center" },
    },
    badge: { type: "badge", props: { label: vibe.badge, variant: "outline" } },
    receipt_item: { type: "item", props: { title: "Why this app", description: sample.receipt } },
    why_item: { type: "item", props: { title: "Why now", description: sample.whyNow } },
    mission_item: { type: "item", props: { title: "Tiny mission", description: sample.tinyMission } },
    receipt: { type: "item_group", props: {}, children: ["receipt_item"] },
    why: { type: "item_group", props: {}, children: ["why_item"] },
    mission: { type: "item_group", props: {}, children: ["mission_item"] },
    open: {
      type: "button",
      props: { label: `Open ${sample.name}`.slice(0, 30), variant: "primary" },
      on: { press: { action: "open_mini_app", params: { target: sample.target } } },
    },
    again: {
      type: "button",
      props: { label: "Resample", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["open", "again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: vibe.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") === "sample") {
      const vibe = vibeInput(ctx.action.inputs?.vibe);
      return resultPage(self, vibe, pickSample(vibe, viewerSeed(ctx)));
    }

    return startPage(self);
  },
  {
    openGraph: {
      title: "Mini App Sampler",
      description: "Pick a vibe and get one useful non-music Farcaster mini app door.",
    },
  },
);

export default app;
