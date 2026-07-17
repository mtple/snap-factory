/**
 * profile-signal-scan — LLM-backed read of recent public Farcaster casts.
 *
 * Components: input, progress, badge, item_group, item, button, stack
 * Actions: submit, view_profile, compose_cast
 * State: stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "profile-signal-scan";

const NEYNAR_CASTS_URL = "https://api.neynar.com/v2/farcaster/feed/user/casts";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3.5-flash-02-23";
const MAX_CASTS = 15;

type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Elements = SnapHandlerResult["ui"]["elements"];

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

type ScanReading = {
  label: string;
  summary: string;
  evidence: [string, string, string];
  nextCast: string;
  confidence: number;
  accent: Accent;
  source: "llm" | "fallback";
};

type CastBundle = {
  fid: number;
  username: string | null;
  casts: NeynarCast[];
};

function cleanText(raw: string, max = 220): string {
  const clean = raw.replace(/https?:\/\/\S+/gi, "[link]").replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function clampText(raw: unknown, fallback: string, max = 300): string {
  const clean = String(raw ?? "").replace(/\s+/g, " ").trim();
  const value = clean || fallback;
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function parseTargetFid(raw: unknown, viewerFid: number): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return viewerFid;
  const match = text.match(/\d{1,10}/);
  if (!match) return null;
  const fid = Number(match[0]);
  if (!Number.isSafeInteger(fid) || fid <= 0) return null;
  return fid;
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

async function fetchRecentCasts(fid: number): Promise<CastBundle> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) throw new Error("Neynar API key is not configured yet.");

  return withTimeout(7000, async (signal) => {
    const url = new URL(NEYNAR_CASTS_URL);
    url.searchParams.set("fid", String(fid));
    url.searchParams.set("limit", String(MAX_CASTS));
    url.searchParams.set("include_replies", "false");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", api_key: apiKey, "x-api-key": apiKey },
      signal,
    });
    if (!res.ok) throw new Error(`Neynar returned ${res.status}.`);

    const data = (await res.json()) as NeynarCastsResponse;
    const casts = (data.casts ?? [])
      .filter((cast) => cleanText(cast.text, 500).length > 0)
      .slice(0, MAX_CASTS);
    const firstAuthor = casts[0]?.author;
    return { fid, username: firstAuthor?.username ?? firstAuthor?.display_name ?? null, casts };
  });
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fallbackReading(bundle: CastBundle): ScanReading {
  const joined = bundle.casts.map((cast) => cast.text).join(" \n ");
  const lower = joined.toLowerCase();
  const castCount = bundle.casts.length;
  const questionCount = (joined.match(/\?/g) ?? []).length;
  const linkCount = (joined.match(/https?:\/\//gi) ?? []).length;
  const mentionCount = (joined.match(/@\w+/g) ?? []).length;
  const exclaimCount = (joined.match(/!/g) ?? []).length;
  const builderWords = (lower.match(/\b(build|ship|app|snap|base|deploy|launch|code|product)\b/g) ?? []).length;
  const socialWords = (lower.match(/\b(we|people|community|reply|friend|farcaster|channel|cast)\b/g) ?? []).length;

  let label = "Signal curator";
  let accent: Accent = "teal";
  let summary = "Your recent casts read like a filter for useful public signal: compact observations, links, and community context.";
  if (builderWords >= Math.max(2, socialWords)) {
    label = "Builder radar";
    accent = "blue";
    summary = "Your recent casts cluster around building, shipping, and product context — less diary, more workshop window.";
  } else if (questionCount >= 3 || socialWords >= 5) {
    label = "Conversation magnet";
    accent = "purple";
    summary = "Your pattern is social: questions, replies, and shared context that invite the room to add the missing piece.";
  } else if (linkCount >= 3) {
    label = "Link cartographer";
    accent = "green";
    summary = "You map the timeline with links and references, then add just enough framing for people to follow the trail.";
  } else if (exclaimCount >= 3) {
    label = "High-energy beacon";
    accent = "amber";
    summary = "Your recent casts lean energetic and reactive — short sparks designed to make the feed look twice.";
  }

  const first = cleanText(bundle.casts[0]?.text ?? "Recent public cast available.", 120);
  const second = cleanText(bundle.casts[1]?.text ?? bundle.casts[0]?.text ?? "Not many casts to inspect yet.", 120);
  const thirdSignal = `Signals counted: ${castCount} casts · ${questionCount} questions · ${linkCount} links · ${mentionCount} mentions.`;
  const confidence = Math.max(54, Math.min(88, 58 + Math.round(castCount * 1.6) + Math.min(12, builderWords + socialWords + linkCount + questionCount)));
  const prompts = [
    "Ask one concrete question only this audience can answer.",
    "Share the smallest thing you learned and the next test you will run.",
    "Post the observation first, then put the hot take in the second sentence.",
    "Turn the best link into a one-line map: why it matters, who should click.",
  ];
  const nextCast = prompts[hashString(joined || String(bundle.fid)) % prompts.length]!;

  return { label, summary, evidence: [first, second, thirdSignal], nextCast, confidence, accent, source: "fallback" };
}

function normalizeLlmReading(raw: unknown, fallback: ScanReading): ScanReading {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const evidenceRaw = Array.isArray(obj.evidence) ? obj.evidence : [];
  const evidence = [0, 1, 2].map((idx) => clampText(evidenceRaw[idx], fallback.evidence[idx], 150)) as [string, string, string];
  const accentRaw = String(obj.accent ?? fallback.accent);
  const accent = ["gray", "blue", "red", "amber", "green", "teal", "purple", "pink"].includes(accentRaw)
    ? (accentRaw as Accent)
    : fallback.accent;
  const confidence = Math.max(45, Math.min(96, Math.round(Number(obj.confidence ?? fallback.confidence)) || fallback.confidence));
  return {
    label: clampText(obj.label, fallback.label, 30),
    summary: clampText(obj.summary, fallback.summary, 280),
    evidence,
    nextCast: clampText(obj.nextCast, fallback.nextCast, 180),
    confidence,
    accent,
    source: "llm",
  };
}

async function llmReading(bundle: CastBundle, fallback: ScanReading): Promise<ScanReading> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallback;
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const casts = bundle.casts
    .map((cast, idx) => `${idx + 1}. ${cleanText(cast.text, 240)}`)
    .join("\n");

  try {
    const payload = await withTimeout(6500, async (signal) => {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://snap-factory.vercel.app",
          "X-Title": "SnapWizard Profile Signal Scan",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          temperature: 0.35,
          max_tokens: 360,
          messages: [
            {
              role: "system",
              content:
                "You analyze public Farcaster casts. Return only compact JSON with keys: label (<=30 chars), summary (<=260 chars), evidence (array of exactly 3 bullets <=135 chars each, quote or cite actual cast patterns), nextCast (<=160 chars), confidence (45-96), accent (one of gray, blue, red, amber, green, teal, purple, pink). Be playful but grounded; do not claim private knowledge.",
            },
            {
              role: "user",
              content: `FID ${bundle.fid}${bundle.username ? ` (@${bundle.username})` : ""}. Recent public casts:\n${casts}`,
            },
          ],
        }),
        signal,
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
      return res.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
    });
    const content = payload.choices?.[0]?.message?.content ?? "";
    return normalizeLlmReading(JSON.parse(content), fallback);
  } catch {
    return fallback;
  }
}

function shareButton(self: string, text = "Scan your recent Farcaster cast patterns with Profile Signal Scan.", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text: text.slice(0, 280), embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error ? ["title", "intro", "error", "fid", "actions"] : ["title", "intro", "fid", "actions"];
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "Profile Signal Scan", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Scan recent public casts for real patterns, evidence, and one useful next-cast prompt. Leave FID blank to scan yourself.",
        size: "sm",
        align: "center",
      },
    },
    fid: {
      type: "input",
      props: { name: "fid", label: "Optional FID", placeholder: "e.g. 2856987", maxLength: 20 },
    },
    scan_btn: {
      type: "button",
      props: { label: "Scan profile", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=scan` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["scan_btn", "share_btn"] },
  };
  if (error) elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function errorPage(self: string, message: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "msg", "actions"] },
    title: { type: "text", props: { content: "Scan paused", weight: "bold", align: "center" } },
    msg: { type: "text", props: { content: clampText(message, "Could not scan this profile yet."), size: "sm", align: "center" } },
    again_btn: {
      type: "button",
      props: { label: "Try again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again_btn", "share_btn"] },
  };
  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, bundle: CastBundle, reading: ScanReading): SnapHandlerResult {
  const who = bundle.username ? `@${bundle.username}` : `FID ${bundle.fid}`;
  const title = `${who}: ${reading.label}`.slice(0, 80);
  const sourceNote = reading.source === "llm" ? "LLM read of public casts" : "Heuristic fallback read";
  const shareText = `${who} scans as ${reading.label}: ${reading.summary}`.slice(0, 260);

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "summary", "meter", "evidence", "next", "actions"],
    },
    title: { type: "text", props: { content: title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: reading.label.slice(0, 30), variant: "outline" } },
    summary: { type: "text", props: { content: reading.summary, size: "sm", align: "center" } },
    meter: { type: "progress", props: { label: `${sourceNote}: ${reading.confidence}%`, value: reading.confidence, max: 100, color: reading.accent } },
    ev1: { type: "item", props: { title: "Evidence 1", description: reading.evidence[0] } },
    ev2: { type: "item", props: { title: "Evidence 2", description: reading.evidence[1] } },
    ev3: { type: "item", props: { title: "Evidence 3", description: reading.evidence[2] } },
    evidence: { type: "item_group", props: {}, children: ["ev1", "ev2", "ev3"] },
    next: { type: "text", props: { content: `Next cast prompt: ${reading.nextCast}`, size: "sm", align: "center" } },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: "primary" },
      on: { press: { action: "view_profile", params: { fid: bundle.fid } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Scan again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share result"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["profile_btn", "again_btn", "share_btn"] },
  };
  return { version: "2.0", theme: { accent: reading.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") !== "scan") return startPage(self);

    const viewerFid = ctx.action.user.fid;
    const targetFid = parseTargetFid(ctx.action.inputs?.fid, viewerFid);
    if (!targetFid) return startPage(self, "Enter a numeric FID, or leave it blank to scan yourself.");

    try {
      const bundle = await fetchRecentCasts(targetFid);
      if (bundle.casts.length === 0) {
        return errorPage(self, `No recent public non-reply casts found for FID ${targetFid}. Try another profile.`);
      }
      const fallback = fallbackReading(bundle);
      const reading = await llmReading(bundle, fallback);
      return resultPage(self, bundle, reading);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not scan this profile yet.";
      return errorPage(self, `${message} The snap still works once API access is available.`);
    }
  },
  {
    openGraph: {
      title: "Profile Signal Scan",
      description: "Scan recent public Farcaster casts for real patterns, evidence, and one useful next-cast prompt.",
    },
  },
);

export default app;
