/**
 * miniapp-mood — "MiniApp Mood"
 *
 * Pick a mood + pacing, get 3 curated Farcaster Mini App recommendations
 * with one-tap open buttons. Curated pool of public web apps, not a live
 * API lookup.
 *
 * Components: toggle_group, text, button, item, item_group, separator, badge, stack
 * Actions: submit, open_url, compose_cast
 * Accent: teal
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "miniapp-mood";

type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Elements = SnapHandlerResult["ui"]["elements"];
type Mood = keyof typeof MOODS;
type Pacing = keyof typeof PACINGS;

const MOODS = {
  chill:   { label: "Chill",    glyph: "🛋️", tagline: "lean back and lurk" },
  builder: { label: "Builder",  glyph: "🛠️", tagline: "ship something tiny" },
  social:  { label: "Social",   glyph: "💬", tagline: "find your people" },
  explore: { label: "Explore",  glyph: "🧭", tagline: "wander the open graph" },
  collect: { label: "Collect",  glyph: "🪙", tagline: "stack, mint, keep" },
  weird:   { label: "Weird",    glyph: "🌀", tagline: "fall down a rabbit hole" },
} as const;

const PACINGS = {
  quick:    { label: "Quick browse", desc: "3 short picks", accent: "teal" as Accent,    confetti: false },
  deep:     { label: "Deep dive",    desc: "1 featured pick with notes", accent: "blue" as Accent, confetti: false },
  surprise: { label: "Surprise me",  desc: "a random 3",  accent: "purple" as Accent,  confetti: true },
} as const;

interface MiniApp {
  id: string;
  name: string;
  tagline: string;
  url: string;
  mood: Mood[];
  why: string;
  emoji: string;
}

const POOL: MiniApp[] = [
  {
    id: "baseapp", name: "Base App", tagline: "the blue-square home base for /base",
    url: "https://baseapp.base.eth", mood: ["chill", "social", "explore"],
    why: "All your /base content, minting, and onchain social in one square.",
    emoji: "🟦",
  },
  {
    id: "paragraph", name: "Paragraph", tagline: "long-form writing + posts",
    url: "https://paragraph.xyz", mood: ["builder", "weird"],
    why: "Publish essays, mint posts, build an audience for the long stuff.",
    emoji: "📝",
  },
  {
    id: "zora", name: "Zora", tagline: "mint anything into a coin",
    url: "https://zora.co", mood: ["collect", "builder"],
    why: "Turn a thought, an image, or a moment into a tradable coin in seconds.",
    emoji: "🪙",
  },
  {
    id: "highlight", name: "Highlight", tagline: "live moments on /base",
    url: "https://highlight.xyz", mood: ["chill", "explore", "social"],
    why: "Drop in on live rooms, watch drops, and chat with builders in real time.",
    emoji: "✨",
  },
  {
    id: "exclave", name: "Exclave", tagline: "Farcaster-native group chat",
    url: "https://exclave.so", mood: ["social", "chill"],
    why: "Slower, deeper conversations outside the cast firehose.",
    emoji: "💬",
  },
  {
    id: "gmfarcaster", name: "gmFarcaster", tagline: "the daily gm ritual",
    url: "https://gmfarcaster.com", mood: ["chill", "social"],
    why: "Say gm, see who showed up, and keep the ritual honest.",
    emoji: "🌅",
  },
  {
    id: "searchcaster", name: "Searchcaster", tagline: "search the whole graph",
    url: "https://searchcaster.xyz", mood: ["explore", "weird", "builder"],
    why: "Find any cast, profile, or thread across the entire Farcaster graph.",
    emoji: "🔎",
  },
  {
    id: "lens-search", name: "Farcaster Id", tagline: "FID + profile lookup",
    url: "https://farcaster.id", mood: ["builder", "explore"],
    why: "Resolve a username, link a FID, peek at profile metadata in two clicks.",
    emoji: "🆔",
  },
  {
    id: "wallete", name: "wallete", tagline: "tiny wallet diagnostics",
    url: "https://wallete.xyz", mood: ["builder", "collect"],
    why: "Snapshot, sweep, or just peek at what your wallet has been up to.",
    emoji: "👛",
  },
  {
    id: "hamst", name: "hamst.art", tagline: "ham radio for the timeline",
    url: "https://hamst.art", mood: ["weird", "social", "collect"],
    why: "Tune in to ham signals from the timeline — the fun, weird side of Farcaster.",
    emoji: "🐹",
  },
];

function moodInput(raw: unknown): Mood {
  const value = String(raw ?? "explore");
  return value in MOODS ? (value as Mood) : "explore";
}

function pacingInput(raw: unknown): Pacing {
  const value = String(raw ?? "quick");
  return value in PACINGS ? (value as Pacing) : "quick";
}

function hashParts(parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const str = String(part);
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

function pickMatches(mood: Mood, count: number, fid: number, surprise: boolean): MiniApp[] {
  if (surprise) {
    const seed = hashParts(["surprise", mood, fid || 0]);
    const ordered = [...POOL].sort((a, b) => (hashParts([seed, a.id]) - hashParts([seed, b.id])));
    return ordered.slice(0, count);
  }
  // Score each app by mood match + a touch of FID noise so order varies.
  const seed = hashParts([mood, fid || 0]);
  const scored = POOL.map((app, idx) => {
    const moodFit = app.mood.includes(mood) ? 100 : 0;
    const jitter = (hashParts([seed, app.id, idx]) % 25);
    return { app, score: moodFit + jitter };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.app);
}

function shareButton(self: string, text: string) {
  return {
    type: "button" as const,
    props: { label: "Share picks", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const childSet = ["title", "intro", "mood", "pacing", "actions"];
  if (error) childSet.splice(2, 0, "error");

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: childSet },
    title: { type: "text", props: { content: "MiniApp Mood", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick a mood. Get 3 Farcaster Mini Apps worth opening right now.",
        size: "sm",
        align: "center",
      },
    },
    mood: {
      type: "toggle_group",
      props: {
        name: "mood",
        label: "Mood",
        defaultValue: "explore",
        options: Object.entries(MOODS).map(([value, config]) => ({
          label: `${config.glyph} ${config.label}`,
          value,
        })),
      },
    },
    pacing: {
      type: "toggle_group",
      props: {
        name: "pacing",
        label: "Pacing",
        defaultValue: "quick",
        options: Object.entries(PACINGS).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    brew: {
      type: "button",
      props: { label: "Recommend Mini Apps", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=pick` } } },
    },
    share_btn: shareButton(self, "Picking my next MiniApp with the snap wizard ⚒️"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["brew", "share_btn"] },
  };
  if (error) elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, mood: Mood, pacing: Pacing, picks: MiniApp[], fid: number): SnapHandlerResult {
  const moodInfo = MOODS[mood];
  const pacingInfo = PACINGS[pacing];
  const isDeep = pacing === "deep";
  const isSurprise = pacing === "surprise";

  const items: string[] = [];
  if (!isDeep) {
    items.push("title", "badge", "pacing_note", "list", "actions");
  } else {
    items.push("title", "badge", "pacing_note", "spotlight", "actions");
  }

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: items },
    title: { type: "text", props: { content: `${moodInfo.glyph} ${moodInfo.label} picks`, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: pacingInfo.desc, variant: "outline" } },
    pacing_note: { type: "text", props: { content: moodInfo.tagline, size: "sm", align: "center" } },
  };

  if (isDeep) {
    const pick = picks[0]!;
    elements["spotlight_title"] = { type: "text", props: { content: `${pick.emoji} ${pick.name}`, weight: "bold", align: "center" } };
    elements["spotlight_tagline"] = { type: "text", props: { content: pick.tagline, size: "sm", align: "center" } };
    elements["spotlight_why"] = { type: "text", props: { content: pick.why, size: "sm", align: "center" } };
    elements["open_spot"] = {
      type: "button",
      props: { label: `Open ${pick.name}`, variant: "primary" },
      on: { press: { action: "open_url", params: { target: pick.url } } },
    };
    elements["spotlight"] = { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["spotlight_title", "spotlight_tagline", "spotlight_why", "open_spot"] };
  } else {
    const listChildren: string[] = [];
    picks.forEach((p, i) => {
      const idxKey = `p${i}`;
      elements[`item_${idxKey}`] = { type: "item", props: { title: `${p.emoji} ${p.name}`, description: p.why } };
      elements[`btn_${idxKey}`] = {
        type: "button",
        props: { label: `Open ${p.name}`, variant: "primary" },
        on: { press: { action: "open_url", params: { target: p.url } } },
      };
      listChildren.push(`item_${idxKey}`, `btn_${idxKey}`);
    });
    elements["list"] = { type: "stack", props: { direction: "vertical", gap: "sm" }, children: listChildren };
  }

  const shareText = `MiniApp Mood (${moodInfo.label.toLowerCase()}): ${picks.map((p) => `${p.emoji} ${p.name}`).join(", ")}.`.slice(0, 280);
  elements["again"] = {
    type: "button",
    props: { label: "Try another mood", variant: "secondary" },
    on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
  };
  elements["share_btn"] = shareButton(self, shareText);
  elements["actions"] = { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] };

  return {
    version: "2.0",
    ...(pacingInfo.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: pacingInfo.accent },
    ui: { root: "page", elements },
  };
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
    if (action !== "pick") {
      return startPage(self);
    }

    const mood: Mood = moodInput(ctx.action.inputs?.mood);
    const pacing: Pacing = pacingInput(ctx.action.inputs?.pacing);
    const isDeep = pacing === "deep";
    const isSurprise = pacing === "surprise";
    const count = isDeep ? 1 : 3;
    const picks = pickMatches(mood, count, ctx.action.user.fid, isSurprise);
    if (picks.length === 0) {
      return startPage(self, "No matches — try a different mood.");
    }
    return resultPage(self, mood, pacing, picks, ctx.action.user.fid);
  },
  {
    openGraph: {
      title: "MiniApp Mood",
      description: "Pick a mood, get 3 curated Farcaster Mini App recommendations.",
    },
  }
);

export { pickMatches, moodInput, pacingInput, POOL };
export default app;
