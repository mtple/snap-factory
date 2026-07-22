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
      name: "Farcaster",
      path: "/farcaster",
      channelId: "farcaster",
      badge: "protocol weather",
      why: "Good room for release-note humidity, client questions, and the tiny details behind what the network can do next.",
      mission: "Find one product detail you can explain in a single cast.",
      accent: "teal",
    },
    {
      name: "Base",
      path: "/base",
      channelId: "base",
      badge: "blue signal desk",
      why: "Base chatter mixes wallets, identity, consumer apps, infra, and enough experiments to reward a careful skim.",
      mission: "Read one useful builder thread and skip one suspicious all-caps leaderboard.",
      accent: "blue",
    },
    {
      name: "Ethereum",
      path: "/ethereum",
      channelId: "ethereum",
      badge: "settlement library",
      why: "A deeper lane for L1 lore, scaling debates, research links, and the occasional excellent explainer hiding under jargon.",
      mission: "Bring back one claim that changed how you think about the stack.",
      accent: "purple",
    },
    {
      name: "AI",
      path: "/ai",
      channelId: "ai",
      badge: "model weather",
      why: "Fast-moving notes on agents, models, evals, workflow hacks, and what is actually useful after the demo dust settles.",
      mission: "Save one practical trick, not one breathless benchmark screenshot.",
      accent: "green",
    },
    {
      name: "Science",
      path: "/science",
      channelId: "science",
      badge: "curiosity lab",
      why: "A calmer room for facts, papers, weird discoveries, and smart people arguing with more citations than vibes.",
      mission: "Find one thing worth explaining to a friend at dinner.",
      accent: "amber",
    },
    {
      name: "Books",
      path: "/books",
      channelId: "books",
      badge: "margin notes",
      why: "Book talk is useful when the main timeline gets too realtime; people bring slower thoughts and better receipts.",
      mission: "Collect one recommendation and the reason someone cared enough to mention it.",
      accent: "pink",
    },
  ],
  build: [
    {
      name: "Snaps",
      path: "/snaps",
      channelId: "snaps",
      badge: "tiny app bench",
      why: "People are testing what in-feed apps can do: games, tools, cards, and very opinionated buttons.",
      mission: "Try one new card, then steal only the interaction lesson.",
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
    {
      name: "Design",
      path: "/design",
      channelId: "design",
      badge: "taste forge",
      why: "Good for interface critique, visual systems, product taste, and the details builders forget until users squint.",
      mission: "Steal one layout or wording lesson and apply it to a thing you are making.",
      accent: "pink",
    },
    {
      name: "Founders",
      path: "/founders",
      channelId: "founders",
      badge: "operator table",
      why: "A lane for distribution, pricing, hiring, pivots, and the unglamorous parts of making something survive contact with customers.",
      mission: "Look for one hard-won lesson, not one victory lap.",
      accent: "amber",
    },
    {
      name: "Open Source",
      path: "/opensource",
      channelId: "opensource",
      badge: "public workbench",
      why: "Issue threads, release notes, maintainers, and small tools with surprisingly large impact tend to surface here.",
      mission: "Find one repo or maintainer worth following before you ask for anything.",
      accent: "green",
    },
    {
      name: "Mini Apps",
      path: "/miniapps",
      channelId: "miniapps",
      badge: "app storefront",
      why: "A builder-heavy stop for richer Farcaster apps, distribution experiments, and what people actually open twice.",
      mission: "Try one app and write down the exact moment it became useful or confusing.",
      accent: "teal",
    },
  ],
  laugh: [
    {
      name: "Memes",
      path: "/memes",
      channelId: "memes",
      badge: "low-stakes goblin",
      why: "When serious discourse becomes soup, this is the decompression chamber for strange pictures and fast jokes.",
      mission: "Laugh once, do not start a trial, return hydrated.",
      accent: "pink",
    },
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
      name: "Art",
      path: "/art",
      channelId: "art",
      badge: "visual detour",
      why: "Art channels can reset the brain: less discourse velocity, more odd images, experiments, and people making things because they have to.",
      mission: "Find one image you would stop scrolling for even without the caption.",
      accent: "red",
    },
    {
      name: "Food",
      path: "/food",
      channelId: "food",
      badge: "snack parliament",
      why: "A reliable place for low-stakes opinions, beautiful meals, tiny rituals, and arguments that mostly end in hunger.",
      mission: "Steal one dinner idea or one extremely unnecessary condiment opinion.",
      accent: "amber",
    },
    {
      name: "Gaming",
      path: "/gaming",
      channelId: "gaming",
      badge: "side quest desk",
      why: "Game talk brings clips, tiny strategies, nostalgia, and people taking imaginary economies very seriously in a useful way.",
      mission: "Find one mechanic people love enough to explain without being asked.",
      accent: "green",
    },
    {
      name: "Photography",
      path: "/photography",
      channelId: "photography",
      badge: "light trap",
      why: "Good for a visual reset: street shots, process notes, travel fragments, and people noticing ordinary things harder than usual.",
      mission: "Pick one photo and name the detail that made it work.",
      accent: "gray",
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
      why: "High-velocity chain chatter, identity debates, airdrop weather, experiments, and links that deserve exactly one eyebrow raise.",
      mission: "Open one link only after checking whether it has a real domain and a real point.",
      accent: "blue",
    },
    {
      name: "Crypto",
      path: "/crypto",
      channelId: "crypto",
      badge: "ticker fog",
      why: "The broad-market room: memes, macro takes, incentives, cope, clever analysis, and a thousand charts pretending to be destiny.",
      mission: "Find one useful frame and mute one chart that is just astrology with candles.",
      accent: "red",
    },
    {
      name: "NFTs",
      path: "/nfts",
      channelId: "nfts",
      badge: "jpeg bazaar",
      why: "Collection news, culture fragments, collector psychology, and the strange overlap between taste, scarcity, and group chats.",
      mission: "Notice one actual community behavior behind the floor-price fog.",
      accent: "purple",
    },
    {
      name: "Trading",
      path: "/trading",
      channelId: "trading",
      badge: "risk goblin",
      why: "For chart energy, thesis scraps, risk appetite, and people compressing uncertainty into arrows because humans are adorable.",
      mission: "Before believing anything, ask what would make the poster wrong.",
      accent: "green",
    },
    {
      name: "Airdrops",
      path: "/airdrops",
      channelId: "airdrops",
      badge: "quest swarm",
      why: "A chaotic map of incentives, checkers, eligibility rumors, and people turning admin chores into a sport.",
      mission: "Do not connect a wallet from a random link. Find the official source first.",
      accent: "amber",
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
  const vibeButton = (vibe: Vibe): SnapElementInput => ({
    type: "button",
    props: { label: VIBES[vibe].label, variant: vibe === "learn" ? "primary" : "secondary" },
    on: { press: { action: "submit", params: { target: `${self}?action=hop&vibe=${vibe}` } } },
  });

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "vibe_prompt", "vibe_buttons", "share_btn"],
    },
    title: { type: "text", props: { content: "Channel Hop", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Choose your mood, then hop to one of 24 curated Farcaster channels with a tiny mission.",
        size: "sm",
        align: "center",
      },
    },
    vibe_prompt: {
      type: "text",
      props: { content: "Pick a vibe: Learn, Build, Laugh, or Chaos.", size: "sm", weight: "bold", align: "center" },
    },
    learn_btn: vibeButton("learn"),
    build_btn: vibeButton("build"),
    laugh_btn: vibeButton("laugh"),
    spam_btn: { ...vibeButton("spam"), props: { label: "Chaos", variant: "secondary" } },
    vibe_buttons: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm" },
      children: ["learn_btn", "build_btn", "laugh_btn", "spam_btn"],
    },
    share_btn: shareButton(self),
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
      description: "Pick learn, build, laugh, or chaos and get one pick from 24 curated Farcaster channels plus a tiny mission.",
    },
  },
);

export default app;
