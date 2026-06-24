/**
 * first-block-birthday — "First Block Birthday"
 *
 * Tap once. The snap auto-resolves the authed viewer's first Farcaster
 * cast via Neynar, computes how long ago it shipped, and stamps a
 * personalized "first block" badge with view_profile + share buttons.
 *
 * GET:  Welcome screen with a "Show my first cast" button
 * POST: Fetch up to 300 of the user's oldest casts (3 pages), pick the
 *       oldest, derive days-since, render the result. Falls back to a
 *       friendly empty state if Neynar can't find any casts.
 *
 * Components: text, button, badge, separator, progress, item, item_group, stack
 * Actions: submit, view_profile, view_cast, compose_cast
 * Accent: teal
 * Requires: NEYNAR_API_KEY in Vercel env (same as trending-cast; verified working in prod).
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "first-block-birthday";

type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Elements = SnapHandlerResult["ui"]["elements"];

// ── Neynar types ──────────────────────────────────────────────────────────────

type NeynarCast = {
  hash: string;
  text: string;
  timestamp: string;
  author: { fid: number; username?: string; display_name?: string };
};

type NeynarCastsResponse = {
  casts?: NeynarCast[];
  next?: { cursor?: string | null };
};

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const NEYNAR_BASE = "https://api.neynar.com/v2/farcaster/feed/user/casts";
const NEYNAR_USER_BASE = "https://api.neynar.com/v2/farcaster/user/bulk";
const PAGES = 3;
const PER_PAGE = 100;

async function fetchOldestCast(apiKey: string, fid: number): Promise<{ oldest: NeynarCast; walked: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const collected: NeynarCast[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < PAGES; page++) {
      const url = new URL(NEYNAR_BASE);
      url.searchParams.set("fid", String(fid));
      url.searchParams.set("limit", String(PER_PAGE));
      url.searchParams.set("include_replies", "false");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json", api_key: apiKey },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Neynar ${res.status}`);
      const data = (await res.json()) as NeynarCastsResponse;
      const casts = data.casts ?? [];
      if (casts.length === 0) break;
      collected.push(...casts);
      const nextCursor = data.next?.cursor ?? null;
      if (!nextCursor) break;
      cursor = nextCursor;
    }

    if (collected.length === 0) return null;
    // Neynar returns newest-first; the oldest is the last item in the collected list.
    const oldest = collected[collected.length - 1]!;
    return { oldest, walked: collected.length };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchUsername(apiKey: string, fid: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const url = new URL(NEYNAR_USER_BASE);
    url.searchParams.set("fids", String(fid));
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", api_key: apiKey },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ username?: string; display_name?: string }> };
    const user = data.users?.[0];
    return user?.username ?? user?.display_name ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const NUMBER_WORDS = [
  "genesis", "fresh", "early", "seasoned", "veteran", "elder", "original", "ancient", "fossil",
];
const CONFETTI_THRESHOLDS = [100, 365, 1000, 2000];

function daysSince(isoTimestamp: string): number {
  const then = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(then)) return 0;
  const now = Date.now();
  return Math.max(0, Math.round((now - then) / (1000 * 60 * 60 * 24)));
}

function ageLabel(days: number): { label: string; emoji: string; accent: Accent; tier: string } {
  let label: string;
  let emoji: string;
  let accent: Accent;
  let tier: string;

  if (days < 30) {
    label = "fresh from the oven";
    emoji = "🍼";
    accent = "green";
    tier = "fresh";
  } else if (days < 180) {
    label = "settling in";
    emoji = "🌱";
    accent = "teal";
    tier = "early";
  } else if (days < 730) {
    label = "seasoned";
    emoji = "🪴";
    accent = "blue";
    tier = "seasoned";
  } else if (days < 1825) {
    label = "veteran";
    emoji = "🛡️";
    accent = "purple";
    tier = "veteran";
  } else {
    label = "elder of the graph";
    emoji = "🪨";
    accent = "amber";
    tier = "elder";
  }

  return { label, emoji, accent, tier };
}

function castPreview(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function formatRelativeDate(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return "unknown date";
  return d.toISOString().slice(0, 10);
}

// ── UI ────────────────────────────────────────────────────────────────────────

function shareButton(self: string, text: string) {
  return {
    type: "button" as const,
    props: { label: "Share my first block", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function viewProfileButton(fid: number) {
  return {
    type: "button" as const,
    props: { label: "View my profile", variant: "primary" as const },
    on: { press: { action: "view_profile" as const, params: { fid } } },
  };
}

function viewCastButton(castHash: string) {
  return {
    type: "button" as const,
    props: { label: "View first cast", variant: "secondary" as const },
    on: { press: { action: "view_cast" as const, params: { hash: castHash } } },
  };
}

function renderError(self: string, message: string): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "msg", "share_btn"] },
        title: { type: "text", props: { content: "🪨 First Block Birthday", weight: "bold", align: "center" } },
        msg: { type: "text", props: { content: message, size: "sm", align: "center" } },
        share_btn: shareButton(self, "Found my first Farcaster cast with the snap wizard 🪨"),
      },
    },
  };
}

function renderWelcome(self: string, error?: string): SnapHandlerResult {
  const childSet = ["title", "intro", "actions"];
  if (error) childSet.splice(2, 0, "error_msg");

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: childSet },
    title: { type: "text", props: { content: "🪨 First Block Birthday", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Tap once. We'll dig out your very first Farcaster cast and stamp a tiny birthday receipt.",
        size: "sm",
        align: "center",
      },
    },
    find_btn: {
      type: "button",
      props: { label: "Show my first cast", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=find` } } },
    },
    share_btn: shareButton(self, "Found my first Farcaster cast with the snap wizard 🪨"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["find_btn", "share_btn"] },
  };
  if (error) {
    elements.error_msg = { type: "text", props: { content: error, size: "sm", align: "center" } };
  }
  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function renderResult(
  self: string,
  fid: number,
  cast: NeynarCast,
  walked: number,
  username: string | null
): SnapHandlerResult {
  const days = daysSince(cast.timestamp);
  const age = ageLabel(days);
  const confetti = CONFETTI_THRESHOLDS.includes(days);
  const preview = castPreview(cast.text, 140);
  const date = formatRelativeDate(cast.timestamp);
  const who = username ? `@${username}` : `FID ${fid}`;
  const yearsAgo = (days / 365).toFixed(1);

  const shareText = `${age.emoji} ${days.toLocaleString()} days on Farcaster. My first cast: "${preview}" (${date}).`.slice(0, 280);

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "who", "meter", "preview", "items", "actions"],
    },
    title: { type: "text", props: { content: `${age.emoji} ${days.toLocaleString()} days on Farcaster`, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `${age.label} · ${age.tier}`, variant: "outline" } },
    who: { type: "text", props: { content: `For ${who} (FID ${fid})`, size: "sm", align: "center" } },
    meter: { type: "progress", props: { label: `Tenure: ${yearsAgo} years`, value: Math.min(days, 365 * 6), max: 365 * 6, color: age.accent } },
    preview: { type: "text", props: { content: `First cast, ${date}: "${preview}"`, size: "sm", align: "center" } },
    detail_1: { type: "item", props: { title: "Tenure", description: `${days.toLocaleString()} days (${yearsAgo} years)` } },
    detail_2: { type: "item", props: { title: "Tier", description: age.label } },
    detail_3: { type: "item", props: { title: "Walked back", description: `${walked.toLocaleString()} cast${walked === 1 ? "" : "s"} scanned to find this` } },
    items: { type: "item_group", props: {}, children: ["detail_1", "detail_2", "detail_3"] },
    profile_btn: viewProfileButton(fid),
    cast_btn: viewCastButton(cast.hash),
    again: {
      type: "button",
      props: { label: "Start over", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["profile_btn", "cast_btn"] },
    actions2: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return {
    version: "2.0",
    ...(confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: age.accent },
    ui: { root: "page", elements },
  };
}

function renderEmpty(self: string, fid: number): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "msg", "actions"] },
    title: { type: "text", props: { content: "🪨 First Block Birthday", weight: "bold", align: "center" } },
    msg: {
      type: "text",
      props: {
        content: `No casts found for FID ${fid}. Either the timeline is empty, or Neynar couldn't reach the graph right now.`,
        size: "sm",
        align: "center",
      },
    },
    profile_btn: viewProfileButton(fid),
    again: {
      type: "button",
      props: { label: "Try again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?action=find` } } },
    },
    share_btn: shareButton(self, "Found my first Farcaster cast with the snap wizard 🪨"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["profile_btn", "again", "share_btn"] },
  };
  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderWelcome(self);
    }

    const action = url.searchParams.get("action");
    if (action !== "find") {
      return renderWelcome(self);
    }

    const fid = ctx.action.user.fid;
    if (!fid) {
      return renderError(self, "Open this snap from inside Farcaster so we know who you are.");
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return renderError(self, "NEYNAR_API_KEY is missing in the snap factory env. Ask Matt to add it.");
    }

    let result: Awaited<ReturnType<typeof fetchOldestCast>> = null;
    let username: string | null = null;
    try {
      [result, username] = await Promise.all([
        fetchOldestCast(apiKey, fid),
        fetchUsername(apiKey, fid),
      ]);
    } catch (err) {
      return renderError(self, `Couldn't reach Neynar: ${(err as Error).message}`);
    }

    if (!result) {
      return renderEmpty(self, fid);
    }
    return renderResult(self, fid, result.oldest, result.walked, username);
  },
  {
    openGraph: {
      title: "First Block Birthday",
      description: "Tap once. We dig out your very first Farcaster cast and stamp a tiny birthday receipt.",
    },
  }
);

export { fetchOldestCast, daysSince, ageLabel };
export default app;
