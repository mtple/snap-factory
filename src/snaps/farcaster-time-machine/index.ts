/**
 * farcaster-time-machine — peek at a public Farcaster cast from one week/month/year ago.
 *
 * Components: input, badge, progress, item_group, button, stack
 * Actions: submit, view_cast, view_profile, compose_cast
 * State: stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "farcaster-time-machine";
const NEYNAR_CASTS_URL = "https://api.neynar.com/v2/farcaster/feed/user/casts";
const NEYNAR_USERNAME_URL = "https://api.neynar.com/v2/farcaster/user/by_username";
const PER_PAGE = 100;
const MAX_PAGES = 6;

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type EraKey = "week" | "month" | "year";

type NeynarCast = {
  hash: string;
  text: string;
  timestamp: string;
  author?: { fid?: number; username?: string; display_name?: string };
};

type NeynarCastsResponse = {
  casts?: NeynarCast[];
  next?: { cursor?: string | null };
};

type NeynarUserResponse = {
  user?: { fid?: number; username?: string; display_name?: string };
};

type TargetProfile = {
  fid: number;
  username: string | null;
  source: "viewer" | "input";
};

type Era = {
  key: EraKey;
  label: string;
  days: number;
  accent: Accent;
};

type MemoryResult = {
  profile: TargetProfile;
  era: Era;
  targetDate: Date;
  cast: NeynarCast | null;
  scanned: number;
  source: "neynar" | "fallback";
  note: string;
};

const ERAS: Record<EraKey, Era> = {
  week: { key: "week", label: "One week ago", days: 7, accent: "teal" },
  month: { key: "month", label: "One month ago", days: 30, accent: "purple" },
  year: { key: "year", label: "One year ago", days: 365, accent: "blue" },
};

function cleanText(raw: unknown, fallback = "Cast text was empty.", max = 190): string {
  const clean = String(raw ?? "")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/\s+/g, " ")
    .trim();
  const value = clean || fallback;
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!Number.isFinite(d.getTime())) return "unknown date";
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function eraFromUrl(url: URL): Era {
  const key = url.searchParams.get("era");
  return key === "week" || key === "month" || key === "year" ? ERAS[key] : ERAS.week;
}

function targetDateFor(era: Era, now = new Date()): Date {
  return new Date(now.getTime() - era.days * 86_400_000);
}

function legacyFid(action: unknown): number | null {
  const fid = (action as { fid?: unknown })?.fid;
  const parsed = Number(fid);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function resolveUsername(apiKey: string, username: string): Promise<TargetProfile | null> {
  return withTimeout(3500, async (signal) => {
    const url = new URL(NEYNAR_USERNAME_URL);
    url.searchParams.set("username", username.replace(/^@/, ""));
    const res = await fetch(url.toString(), { headers: { Accept: "application/json", api_key: apiKey }, signal });
    if (!res.ok) return null;
    const data = (await res.json()) as NeynarUserResponse;
    const fid = Number(data.user?.fid);
    if (!Number.isSafeInteger(fid) || fid <= 0) return null;
    return { fid, username: data.user?.username ?? username.replace(/^@/, ""), source: "input" };
  });
}

async function resolveTarget(raw: unknown, viewerFid: number | null): Promise<{ profile: TargetProfile | null; error?: string }> {
  const input = String(raw ?? "").trim().replace(/^https?:\/\/warpcast\.com\//i, "");
  if (!input) {
    if (!viewerFid) return { profile: null, error: "Open in Farcaster for your own time machine, or enter a numeric FID." };
    return { profile: { fid: viewerFid, username: null, source: "viewer" } };
  }

  const numeric = input.match(/^#?(\d{1,10})$/);
  if (numeric) {
    const fid = Number(numeric[1]);
    if (Number.isSafeInteger(fid) && fid > 0) return { profile: { fid, username: null, source: "input" } };
  }

  const username = input.replace(/^@/, "").split(/[/?#]/)[0]?.trim() ?? "";
  if (/^[a-z0-9][a-z0-9._-]{0,30}$/i.test(username)) {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return { profile: null, error: "Username lookup needs API access. Try a numeric FID instead." };
    const profile = await resolveUsername(apiKey, username);
    if (profile) return { profile };
  }

  return { profile: null, error: "Enter a numeric FID or a simple @username." };
}

async function fetchNearestCast(profile: TargetProfile, era: Era): Promise<MemoryResult> {
  const apiKey = process.env.NEYNAR_API_KEY;
  const targetDate = targetDateFor(era);
  if (!apiKey) {
    return fallbackMemory(profile, era, targetDate, "API access is unavailable, so this is a deterministic placeholder receipt — no fake cast link.");
  }

  try {
    return await withTimeout(8000, async (signal) => {
      const collected: NeynarCast[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const url = new URL(NEYNAR_CASTS_URL);
        url.searchParams.set("fid", String(profile.fid));
        url.searchParams.set("limit", String(PER_PAGE));
        url.searchParams.set("include_replies", "false");
        if (cursor) url.searchParams.set("cursor", cursor);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json", api_key: apiKey }, signal });
        if (!res.ok) throw new Error(`Neynar ${res.status}`);
        const data = (await res.json()) as NeynarCastsResponse;
        const casts = (data.casts ?? []).filter((cast) => Number.isFinite(new Date(cast.timestamp).getTime()));
        collected.push(...casts);
        const oldest = casts[casts.length - 1];
        if (oldest && new Date(oldest.timestamp).getTime() <= targetDate.getTime()) break;
        cursor = data.next?.cursor ?? null;
        if (!cursor || casts.length === 0) break;
      }

      if (collected.length === 0) {
        return fallbackMemory(profile, era, targetDate, "No recent public casts were found. The time machine printed a blank ticket instead.");
      }

      const nearest = collected.reduce((best, cast) => {
        const bestGap = Math.abs(new Date(best.timestamp).getTime() - targetDate.getTime());
        const nextGap = Math.abs(new Date(cast.timestamp).getTime() - targetDate.getTime());
        return nextGap < bestGap ? cast : best;
      }, collected[0]!);
      const actualGap = daysBetween(new Date(nearest.timestamp), targetDate);
      const sourceProfile: TargetProfile = {
        ...profile,
        username: nearest.author?.username ?? profile.username,
      };
      return {
        profile: sourceProfile,
        era,
        targetDate,
        cast: nearest,
        scanned: collected.length,
        source: "neynar",
        note: `Nearest public cast was ${actualGap} day${actualGap === 1 ? "" : "s"} from the target date after scanning ${collected.length} casts.`,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "timeline lookup failed";
    return fallbackMemory(profile, era, targetDate, `${message}. Showing an honest fallback receipt with no cast link.`);
  }
}

function fallbackMemory(profile: TargetProfile, era: Era, targetDate: Date, note: string): MemoryResult {
  return { profile, era, targetDate, cast: null, scanned: 0, source: "fallback", note };
}

function shareButton(self: string, text = "Take your Farcaster timeline for a tiny spin in the Time Machine."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share snap", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text: text.slice(0, 280), embeds: [self] } } },
  };
}

function submitButton(self: string, era: Era): SnapElementInput {
  const labels: Record<EraKey, string> = { week: "1 week ago (wait)", month: "1 month ago (wait)", year: "1 year ago (wait)" };
  return {
    type: "button",
    props: { label: labels[era.key], variant: era.key === "week" ? "primary" : "secondary" },
    on: { press: { action: "submit", params: { target: `${self}?era=${era.key}` } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error ? ["title", "intro", "error", "target", "era_buttons", "share_btn"] : ["title", "intro", "target", "era_buttons", "share_btn"];
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "Farcaster Time Machine", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Enter a FID or @username, or leave blank for yourself. Pick an era and I’ll find the nearest public cast; lookup can take a few seconds.",
        size: "sm",
        align: "center",
      },
    },
    target: { type: "input", props: { name: "target", label: "Profile", placeholder: "FID or @username (optional)", maxLength: 48 } },
    week_btn: submitButton(self, ERAS.week),
    month_btn: submitButton(self, ERAS.month),
    year_btn: submitButton(self, ERAS.year),
    era_buttons: { type: "stack", props: { direction: "horizontal", gap: "sm", equalWidth: true }, children: ["week_btn", "month_btn", "year_btn"] },
    share_btn: shareButton(self),
  };
  if (error) elements.error = { type: "text", props: { content: cleanText(error, "Try another profile.", 180), size: "sm", align: "center" } };
  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, result: MemoryResult): SnapHandlerResult {
  const who = result.profile.username ? `@${result.profile.username}` : `FID ${result.profile.fid}`;
  const title = `${result.era.label}: ${who}`.slice(0, 80);
  const isReal = result.source === "neynar" && result.cast;
  const castDate = isReal ? formatDate(result.cast!.timestamp) : formatDate(result.targetDate);
  const preview = isReal
    ? `“${cleanText(result.cast!.text, "Tiny cast, big time portal.", 170)}”`
    : `Target date: ${formatDate(result.targetDate)}. No public cast link is shown because this result is a fallback.`;
  const recency = isReal ? Math.max(8, 100 - Math.min(92, daysBetween(new Date(result.cast!.timestamp), result.targetDate) * 6)) : 22;
  const shareText = isReal
    ? `${who} ${result.era.label.toLowerCase()}: ${cleanText(result.cast!.text, "a tiny Farcaster fossil", 180)}`
    : `Farcaster Time Machine printed a fallback ticket for ${who} around ${formatDate(result.targetDate)}.`;

  const children = isReal
    ? ["title", "badge", "preview", "meter", "details", "note", "actions"]
    : ["title", "badge", "preview", "meter", "note", "actions"];
  const actionChildren = isReal ? ["cast_btn", "profile_btn", "again_btn", "share_btn"] : ["profile_btn", "again_btn", "share_btn"];

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children },
    title: { type: "text", props: { content: title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: isReal ? "timeline fossil" : "fallback ticket", variant: "outline" } },
    preview: { type: "text", props: { content: preview, size: "sm", align: "center" } },
    meter: { type: "progress", props: { label: "Target-date closeness", value: recency, max: 100, color: result.era.accent } },
    detail_1: { type: "item", props: { title: "Target", description: formatDate(result.targetDate) } },
    detail_2: { type: "item", props: { title: "Cast date", description: castDate } },
    detail_3: { type: "item", props: { title: "Scanned", description: `${result.scanned} public casts` } },
    details: { type: "item_group", props: {}, children: ["detail_1", "detail_2", "detail_3"] },
    note: { type: "text", props: { content: cleanText(result.note, "Time machine returned safely.", 210), size: "sm", align: "center" } },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: isReal ? "secondary" : "primary" },
      on: { press: { action: "view_profile", params: { fid: result.profile.fid } } },
    },
    again_btn: {
      type: "button",
      props: { label: "New trip", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: actionChildren },
  };
  if (isReal) {
    elements.cast_btn = {
      type: "button",
      props: { label: "View cast", variant: "primary" },
      on: { press: { action: "view_cast", params: { hash: result.cast!.hash } } },
    };
  }
  return { version: "2.0", theme: { accent: result.era.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const era = eraFromUrl(url);
    const viewerFid = ctx.action.user?.fid ?? legacyFid(ctx.action);
    const resolved = await resolveTarget(ctx.action.inputs?.target, viewerFid);
    if (!resolved.profile) return startPage(self, resolved.error);

    const result = await fetchNearestCast(resolved.profile, era);
    return resultPage(self, result);
  },
  {
    openGraph: {
      title: "Farcaster Time Machine",
      description: "Pick a week, month, or year ago and jump to the nearest public Farcaster cast.",
    },
  },
);

export { eraFromUrl, targetDateFor, cleanText };
export default app;
