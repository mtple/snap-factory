/**
 * channel-hop — pick a vibe and get one Farcaster channel to visit.
 *
 * Components: text, badge, toggle_group, item_group, item, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless, daily per-FID recommendation
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "channel-hop";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Vibe = "learn" | "build" | "laugh" | "spam";

type ChannelPick = {
  name: string;
  path: string;
  channelId: string;
  badge: string;
  why: string;
  mission: string;
  accent: Accent;
};

const VIBES: Record<Vibe, { label: string; intro: string; accent: Accent }> = {
  learn: { label: "Learn", intro: "I want context", accent: "teal" },
  build: { label: "Build", intro: "I want builders", accent: "blue" },
  laugh: { label: "Laugh", intro: "I want jokes", accent: "purple" },
  spam: { label: "Spam", intro: "I want chaos", accent: "amber" },
};

const CHANNELS: Record<Vibe, ChannelPick[]> = {
  learn: [
    {
      name: "Base",
      path: "/base",
      channelId: "base",
      badge: "blue signal desk",
      why: "Base chatter is loud today: account abstraction, identity, wallets, and builders trying to separate signal from fireworks.",
      mission: "Open /base, read one useful thread, and ignore one suspicious all-caps leaderboard.",
      accent: "blue",
    },
    {
      name: "Farcaster",
      path: "/farcaster",
      channelId: "farcaster",
      badge: "protocol weather",
      why: "Good room for release-note humidity, client questions, and the tiny details behind what the network can do next.",
      mission: "Find one product detail you can explain in a single cast.",
      accent: "teal",
    },
  ],
  build: [
    {
      name: "Snaps",
      path: "/snaps",
      channelId: "snaps",
      badge: "tiny app bench",
      why: "People are testing what in-feed apps can do: games, tools, cards, and very opinionated buttons.",
      mission: "Open /snaps, try one new card, then steal only the interaction lesson.",
      accent: "purple",
    },
    {
      name: "Dev",
      path: "/dev",
      channelId: "dev",
      badge: "ship room",
      why: "A practical lane for debugging notes, launch questions, and small builder receipts without the full hype fog.",
      mission: "Post one concrete blocker or one tiny thing you shipped.",
      accent: "blue",
    },
  ],
  laugh: [
    {
      name: "Farcaster",
      path: "/farcaster",
      channelId: "farcaster",
      badge: "timeline court",
      why: "The best jokes usually need shared context: protocol lore, client quirks, and everyone pretending they are normal online.",
      mission: "Look for one joke with an actual premise, not just a screenshot and a siren.",
      accent: "purple",
    },
    {
      name: "Memes",
      path: "/memes",
      channelId: "memes",
      badge: "low-stakes goblin",
      why: "When the Base discourse gets too serious, this is the decompression chamber for strange little pictures and fast jokes.",
      mission: "Laugh once, do not start a trial, return hydrated.",
      accent: "pink",
    },
  ],
  spam: [
    {
      name: "Degen",
      path: "/degen",
      channelId: "degen",
      badge: "chaos snorkel",
      why: "Useful when you want maximum ticker fog, social noise, and the occasional genuinely sharp market goblin.",
      mission: "Scroll for two minutes. If your heart rate changes, close the tab.",
      accent: "amber",
    },
    {
      name: "Base",
      path: "/base",
      channelId: "base",
      badge: "blue firehose",
      why: "Today’s feed is full of Base identity, wallet ranks, faucet links, and chain explorers. Bring a tiny helmet.",
      mission: "Open one link only after checking whether it has a real domain and a real point.",
      accent: "blue",
    },
  ],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeVibe(value: unknown): Vibe {
  const text = String(value ?? "learn").toLowerCase();
  return text in VIBES ? (text as Vibe) : "learn";
}

function viewerFid(ctx: Parameters<Parameters<typeof registerSnapHandler>[1]>[0]): number {
  if (ctx.action.type === "post") {
    return ctx.action.user?.fid ?? (ctx.action as { fid?: number }).fid ?? 0;
  }
  return ctx.action.user?.fid ?? 0;
}

function pickChannel(vibe: Vibe, fid: number, spin: number): ChannelPick {
  const options = CHANNELS[vibe];
  const seed = hashText(`${SNAP_NAME}:${todayKey()}:${fid || "anon"}:${vibe}:${spin}`);
  return options[seed % options.length] ?? options[0];
}

function channelUrl(channel: ChannelPick): string {
  return `https://warpcast.com/~/channel/${channel.channelId}`;
}

function shareButton(self: string, text = "Channel Hop picked my next Farcaster room.", label = "Share hop"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "picker", "actions"],
    },
    title: { type: "text", props: { content: "Channel Hop", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick the timeline room you need: learn, build, laugh, or controlled chaos. The wizard sends you to one channel with a tiny mission.",
        size: "sm",
        align: "center",
      },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "vibe",
        label: "Choose a vibe",
        defaultValue: "learn",
        options: Object.entries(VIBES).map(([value, vibe]) => ({ label: vibe.label, value, description: vibe.intro })),
      },
    },
    hop_btn: {
      type: "button",
      props: { label: "Hop channels", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=hop` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["hop_btn", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, vibe: Vibe, channel: ChannelPick, spin: number): SnapHandlerResult {
  const nextSpin = spin + 1;
  const shareText = `Channel Hop sent me to ${channel.path}: ${channel.badge}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "details", "buttons", "share_btn"],
    },
    title: { type: "text", props: { content: `${VIBES[vibe].label} hop: ${channel.path}`, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: channel.badge, variant: "outline" } },
    why_item: { type: "item", props: { title: "Why this room", description: channel.why } },
    mission_item: { type: "item", props: { title: "Tiny mission", description: channel.mission } },
    details: { type: "item_group", props: {}, children: ["why_item", "mission_item"] },
    open_btn: {
      type: "button",
      props: { label: "Open channel", variant: "primary" },
      on: { press: { action: "open_url", params: { target: channelUrl(channel) } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Hop again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?action=hop&vibe=${vibe}&spin=${nextSpin}` } } },
    },
    reset_btn: {
      type: "button",
      props: { label: "Change vibe", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["open_btn", "again_btn", "reset_btn"] },
    share_btn: shareButton(self, shareText, "Share channel"),
  };

  return { version: "2.0", theme: { accent: channel.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") === "hop") {
      const vibe = normalizeVibe(url.searchParams.get("vibe") ?? ctx.action.inputs?.vibe);
      const spin = Number.parseInt(url.searchParams.get("spin") ?? "0", 10) || 0;
      return resultPage(self, vibe, pickChannel(vibe, viewerFid(ctx), spin), spin);
    }

    return startPage(self);
  },
  {
    openGraph: {
      title: "Channel Hop",
      description: "Pick learn, build, laugh, or chaos and get one Farcaster channel plus a tiny mission.",
    },
  },
);

export default app;
