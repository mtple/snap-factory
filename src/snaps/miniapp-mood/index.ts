/**
 * miniapp-mood — pick a mood and get three non-music Farcaster Mini App recs.
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
const SNAP_NAME = "miniapp-mood";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type MoodKey = keyof typeof MOODS;

type MiniAppRec = {
  name: string;
  note: string;
  url: string;
  why: string;
};

const MOODS = {
  build: { label: "Build", badge: "ship mode", accent: "purple" as const },
  play: { label: "Play", badge: "tiny chaos", accent: "amber" as const },
  trade: { label: "Trade", badge: "base brain", accent: "blue" as const },
  social: { label: "Social", badge: "identity lane", accent: "teal" as const },
};

const RECS: Record<MoodKey, MiniAppRec[]> = {
  build: [
    {
      name: "Farcaster Snap Builder",
      note: "Describe a snap and prototype in the composer.",
      url: "https://farcaster.xyz/~/developers/snaps",
      why: "Good for turning the current snap-builder buzz into a real test.",
    },
    {
      name: "OpenRank Explorer",
      note: "Look up social graph signal before you ship.",
      url: "https://explorer.openrank.com",
      why: "Useful when the timeline says identity and distribution matter.",
    },
    {
      name: "OpenCAP Gateway",
      note: "Top up inference and experiment with AI rails.",
      url: "https://gateway.opencap.ai",
      why: "Fresh feed energy around inference tooling, minus the hype fog.",
    },
  ],
  play: [
    {
      name: "Starcaster",
      note: "A tiny ship run for snap-curious explorers.",
      url: "https://starcaster.xyz",
      why: "Fits the hull-breach snap chatter without cloning the cast.",
    },
    {
      name: "Perl",
      note: "Fast social games and prediction-ish fun.",
      url: "https://perl.xyz",
      why: "Good when you want low-stakes taps instead of another dashboard.",
    },
    {
      name: "Hamcaster",
      note: "A weird little rewards/playground corner.",
      url: "https://ham.fun",
      why: "For the part of Farcaster that prefers goblins with points.",
    },
  ],
  trade: [
    {
      name: "Clanker",
      note: "Explore tokens people are launching from casts.",
      url: "https://clanker.world",
      why: "Base and token chatter is loud; this keeps it discoverable.",
    },
    {
      name: "Zora",
      note: "Browse creator coins and collectibles onchain.",
      url: "https://zora.co",
      why: "A cleaner lane for token curiosity than random airdrop smoke.",
    },
    {
      name: "Base App",
      note: "Open the blue door for Base-native activity.",
      url: "https://base.app",
      why: "The feed is very Base today; this is the practical front door.",
    },
  ],
  social: [
    {
      name: "Icebreaker",
      note: "Map people, interests, and intros around Farcaster.",
      url: "https://icebreaker.xyz",
      why: "Identity/passport energy wants a people graph, not a spreadsheet.",
    },
    {
      name: "Kiosk",
      note: "Find channels, communities, and things worth joining.",
      url: "https://kiosk.app",
      why: "Best for turning vague timeline curiosity into a room.",
    },
    {
      name: "Farcaster Mini Apps",
      note: "Browse more tiny apps from inside Farcaster.",
      url: "https://farcaster.xyz/~/mini-apps",
      why: "When the mood is simply: show me the little machines.",
    },
  ],
};

function moodInput(raw: unknown): MoodKey {
  const value = String(raw ?? "build");
  return value in MOODS ? (value as MoodKey) : "build";
}

function shareButton(self: string, text = "Try Mini App Mood") {
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
      children: ["title", "intro", "mood", "go", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Mini App Mood", weight: "bold", align: "center" },
    },
    intro: {
      type: "text",
      props: {
        content: "Pick what you want from Farcaster right now. The wizard returns three tiny app doors worth opening.",
        size: "sm",
        align: "center",
      },
    },
    mood: {
      type: "toggle_group",
      props: {
        name: "mood",
        label: "What kind of app do you want?",
        defaultValue: "build",
        options: Object.entries(MOODS).map(([value, mood]) => ({ label: mood.label, value })),
      },
    },
    go: {
      type: "button",
      props: { label: "Find apps", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=recommend` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, moodKey: MoodKey): SnapHandlerResult {
  const mood = MOODS[moodKey];
  const recs = RECS[moodKey];
  const shareText = `Mini App Mood handed me three ${mood.label.toLowerCase()}-mode Farcaster app doors.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "recs", "app_buttons", "actions"],
    },
    title: {
      type: "text",
      props: { content: `${mood.label} mode: three doors`, weight: "bold", align: "center" },
    },
    badge: { type: "badge", props: { label: mood.badge, variant: "outline" } },
    rec_0: { type: "item", props: { title: recs[0].name, description: recs[0].note } },
    rec_1: { type: "item", props: { title: recs[1].name, description: recs[1].note } },
    rec_2: { type: "item", props: { title: recs[2].name, description: recs[2].note } },
    recs: { type: "item_group", props: {}, children: ["rec_0", "rec_1", "rec_2"] },
    open_0: {
      type: "button",
      props: { label: recs[0].name.slice(0, 30), variant: "primary" },
      on: { press: { action: "open_mini_app", params: { target: recs[0].url } } },
    },
    open_1: {
      type: "button",
      props: { label: recs[1].name.slice(0, 30), variant: "secondary" },
      on: { press: { action: "open_mini_app", params: { target: recs[1].url } } },
    },
    open_2: {
      type: "button",
      props: { label: recs[2].name.slice(0, 30), variant: "secondary" },
      on: { press: { action: "open_mini_app", params: { target: recs[2].url } } },
    },
    app_buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["open_0", "open_1", "open_2"] },
    again: {
      type: "button",
      props: { label: "Try another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: mood.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") === "recommend") {
      return resultPage(self, moodInput(ctx.action.inputs?.mood));
    }

    return startPage(self);
  },
);

export default app;
