/**
 * myers-briggs-cast-type — LLM-backed playful cast personality typing.
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
const SNAP_NAME = "myers-briggs-cast-type";

const NEYNAR_CASTS_URL = "https://api.neynar.com/v2/farcaster/feed/user/casts";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3.5-flash-02-23";
const MAX_CASTS = 18;

type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Elements = SnapHandlerResult["ui"]["elements"];
type AxisCode = "I" | "E" | "N" | "S" | "T" | "F" | "J" | "P";

type NeynarCast = {
  hash: string;
  text: string;
  timestamp: string;
  author?: { fid?: number; username?: string; display_name?: string };
};

type NeynarCastsResponse = {
  casts?: NeynarCast[];
};

type CastBundle = {
  fid: number;
  username: string | null;
  casts: NeynarCast[];
};

type CastTypeReading = {
  typeCode: string;
  typeName: string;
  summary: string;
  axes: [string, string, string, string];
  evidence: [string, string, string];
  nextCast: string;
  confidence: number;
  accent: Accent;
  source: "llm" | "fallback";
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

function parseTargetFid(raw: unknown, viewerFid?: number): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return Number.isSafeInteger(viewerFid) && viewerFid! > 0 ? viewerFid! : null;
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

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function makeTypeName(typeCode: string): string {
  const names: Record<string, string> = {
    ENTJ: "Roadmap Commander",
    ENTP: "Reply Goblin Inventor",
    ENFJ: "Timeline Camp Counselor",
    ENFP: "Spark Thread Starter",
    ESTJ: "Ship Room Foreman",
    ESTP: "Chaos Button Tester",
    ESFJ: "Community Host",
    ESFP: "Feed Firework",
    INTJ: "Quiet Systems Wizard",
    INTP: "Protocol Cave Detective",
    INFJ: "Pattern Lantern",
    INFP: "Lore Garden Keeper",
    ISTJ: "Receipt Archivist",
    ISTP: "Bug Wrench Hermit",
    ISFJ: "Signal Steward",
    ISFP: "Soft Launch Poet",
  };
  return names[typeCode] ?? "Cast Pattern Creature";
}

function fallbackReading(bundle: CastBundle): CastTypeReading {
  const joined = bundle.casts.map((cast) => cast.text).join(" \n ");
  const lower = joined.toLowerCase();
  const castCount = bundle.casts.length;
  const questionCount = countMatches(joined, /\?/g);
  const linkCount = countMatches(joined, /https?:\/\//gi);
  const mentionCount = countMatches(joined, /@\w+/g);
  const exclaimCount = countMatches(joined, /!/g);
  const builderWords = countMatches(lower, /\b(build|ship|app|snap|base|deploy|launch|code|product|protocol)\b/g);
  const socialWords = countMatches(lower, /\b(we|people|community|reply|friend|farcaster|channel|cast|gm|team)\b/g);
  const concreteWords = countMatches(lower, /\b(today|now|this|because|here|before|after|done|fix|check)\b/g);
  const playfulWords = countMatches(lower, /\b(lol|haha|weird|fun|wild|vibe|tiny|wizard|goblin|meme)\b/g);

  const first: AxisCode = socialWords + mentionCount + questionCount > Math.max(3, castCount) ? "E" : "I";
  const second: AxisCode = builderWords + playfulWords >= concreteWords + linkCount ? "N" : "S";
  const third: AxisCode = builderWords + linkCount + concreteWords >= socialWords + playfulWords ? "T" : "F";
  const fourth: AxisCode = concreteWords + builderWords > questionCount + playfulWords + exclaimCount ? "J" : "P";
  const typeCode = `${first}${second}${third}${fourth}`;
  const summary = `${makeTypeName(typeCode)}: your public casts lean ${first === "E" ? "outward and conversational" : "selective and signal-dense"}, with ${third === "T" ? "practical receipts" : "community feeling"} driving the read.`;
  const axes: [string, string, string, string] = [
    `${first}: ${first === "E" ? "conversation-first" : "signal-first"} (${socialWords} social terms, ${mentionCount} mentions)`,
    `${second}: ${second === "N" ? "patterns and possibilities" : "specifics and links"} (${builderWords} builder terms, ${linkCount} links)`,
    `${third}: ${third === "T" ? "receipts over vibes" : "people over proof"} (${concreteWords} concrete cues)`,
    `${fourth}: ${fourth === "J" ? "decisive ship energy" : "open-ended riff energy"} (${questionCount} questions)`,
  ];
  const evidence: [string, string, string] = [
    cleanText(bundle.casts[0]?.text ?? "Recent public cast available.", 135),
    cleanText(bundle.casts[1]?.text ?? bundle.casts[0]?.text ?? "Not many casts to inspect yet.", 135),
    `Signals counted: ${castCount} casts · ${questionCount} questions · ${linkCount} links · ${builderWords} builder words.`,
  ];
  const prompts = [
    "Post one tiny receipt, then ask the room what you missed.",
    "Turn the strongest pattern into a one-sentence build note.",
    "Ask a concrete question with two possible answers.",
    "Share the observation first; save the joke for the last line.",
  ];
  const confidence = Math.max(52, Math.min(90, 56 + Math.round(castCount * 1.4) + Math.min(12, builderWords + socialWords + linkCount)));
  const accent: Accent = first === "E" ? "purple" : third === "T" ? "teal" : "green";
  const nextCast = prompts[(bundle.fid + typeCode.charCodeAt(0) + typeCode.charCodeAt(3)) % prompts.length]!;

  return { typeCode, typeName: makeTypeName(typeCode), summary, axes, evidence, nextCast, confidence, accent, source: "fallback" };
}

function normalizeType(raw: unknown, fallback: CastTypeReading): string {
  const code = String(raw ?? fallback.typeCode).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  if (!/^[EI][NS][TF][JP]$/.test(code)) return fallback.typeCode;
  return code;
}

function normalizeStringArray(raw: unknown, fallback: [string, string, string] | [string, string, string, string], max: number) {
  const arr = Array.isArray(raw) ? raw : [];
  return fallback.map((value, idx) => clampText(arr[idx], value, max));
}

function normalizeLlmReading(raw: unknown, fallback: CastTypeReading): CastTypeReading {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const typeCode = normalizeType(obj.typeCode, fallback);
  const accentRaw = String(obj.accent ?? fallback.accent);
  const accent = ["gray", "blue", "red", "amber", "green", "teal", "purple", "pink"].includes(accentRaw)
    ? (accentRaw as Accent)
    : fallback.accent;
  const confidence = Math.max(45, Math.min(96, Math.round(Number(obj.confidence ?? fallback.confidence)) || fallback.confidence));
  return {
    typeCode,
    typeName: clampText(obj.typeName, makeTypeName(typeCode), 30),
    summary: clampText(obj.summary, fallback.summary, 280),
    axes: normalizeStringArray(obj.axes, fallback.axes, 135) as [string, string, string, string],
    evidence: normalizeStringArray(obj.evidence, fallback.evidence, 135) as [string, string, string],
    nextCast: clampText(obj.nextCast, fallback.nextCast, 170),
    confidence,
    accent,
    source: "llm",
  };
}

async function llmReading(bundle: CastBundle, fallback: CastTypeReading): Promise<CastTypeReading> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallback;
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const casts = bundle.casts.map((cast, idx) => `${idx + 1}. ${cleanText(cast.text, 240)}`).join("\n");

  try {
    const payload = await withTimeout(7000, async (signal) => {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://snap-factory.vercel.app",
          "X-Title": "SnapWizard Myers-Briggs Cast Type",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          temperature: 0.28,
          max_tokens: 430,
          messages: [
            {
              role: "system",
              content:
                "You analyze public Farcaster casts and assign a playful MBTI-style type. Return only compact JSON: typeCode (valid 4 letters matching [EI][NS][TF][JP]), typeName (<=30 chars), summary (<=260 chars), axes (exactly 4 strings <=125 chars explaining E/I, N/S, T/F, J/P using observed cast evidence), evidence (exactly 3 strings <=125 chars citing public cast patterns or short quotes), nextCast (<=155 chars), confidence (45-96), accent (gray, blue, red, amber, green, teal, purple, pink). Be playful, grounded, and low-stakes. Do not claim private psychology.",
            },
            {
              role: "user",
              content: `FID ${bundle.fid}${bundle.username ? ` (@${bundle.username})` : ""}. Recent public non-reply casts:\n${casts}`,
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

function shareButton(self: string, text = "Find your playful Farcaster cast type from recent public casts.", label = "Share snap") {
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
    title: { type: "text", props: { content: "Myers-Briggs Cast Type", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Tap once, then give it 5–10 seconds while the wizard reads recent public casts. Results replace this card when done.",
        size: "sm",
        align: "center",
      },
    },
    fid: { type: "input", props: { name: "fid", label: "Optional FID", placeholder: "e.g. 3", maxLength: 20 } },
    analyze_btn: {
      type: "button",
      props: { label: "Type my casts (wait)", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=analyze` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["analyze_btn", "share_btn"] },
  };
  if (error) elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function errorPage(self: string, message: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "msg", "actions"] },
    title: { type: "text", props: { content: "Type machine paused", weight: "bold", align: "center" } },
    msg: { type: "text", props: { content: clampText(message, "Could not type this profile yet."), size: "sm", align: "center" } },
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

function resultPage(self: string, bundle: CastBundle, reading: CastTypeReading): SnapHandlerResult {
  const who = bundle.username ? `@${bundle.username}` : `FID ${bundle.fid}`;
  const title = `${who}: ${reading.typeCode}`.slice(0, 80);
  const typeLine = `${reading.typeName} · ${reading.typeCode}`;
  const sourceNote = reading.source === "llm" ? "LLM read of public casts" : "Heuristic cast read";
  const shareText = `${who} is ${reading.typeCode}, ${reading.typeName}: ${reading.summary}`.slice(0, 260);

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "type_badge", "summary", "meter", "axes", "evidence", "actions"],
    },
    title: { type: "text", props: { content: title, weight: "bold", align: "center" } },
    type_badge: { type: "badge", props: { label: typeLine.slice(0, 30), variant: "outline" } },
    summary: { type: "text", props: { content: reading.summary, size: "sm", align: "center" } },
    meter: { type: "progress", props: { label: `${sourceNote}: ${reading.confidence}%`, value: reading.confidence, max: 100, color: reading.accent } },
    axis1: { type: "item", props: { title: "E/I", description: reading.axes[0] } },
    axis2: { type: "item", props: { title: "N/S", description: reading.axes[1] } },
    axis3: { type: "item", props: { title: "T/F", description: reading.axes[2] } },
    axis4: { type: "item", props: { title: "J/P", description: reading.axes[3] } },
    axes: { type: "item_group", props: {}, children: ["axis1", "axis2", "axis3", "axis4"] },
    ev1: { type: "item", props: { title: "Evidence 1", description: reading.evidence[0] } },
    ev2: { type: "item", props: { title: "Evidence 2", description: reading.evidence[1] } },
    ev3: { type: "item", props: { title: "Evidence 3", description: reading.evidence[2] } },
    ev4: { type: "item", props: { title: "Next cast", description: reading.nextCast } },
    evidence: { type: "item_group", props: {}, children: ["ev1", "ev2", "ev3", "ev4"] },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: "primary" },
      on: { press: { action: "view_profile", params: { fid: bundle.fid } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Type again", variant: "secondary" },
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

    if (url.searchParams.get("action") !== "analyze") return startPage(self);

    const viewerFid = ctx.action.user?.fid ?? (ctx.action as { fid?: number }).fid;
    const targetFid = parseTargetFid(ctx.action.inputs?.fid, viewerFid);
    if (!targetFid) return startPage(self, "Enter a numeric FID. Farcaster did not attach your viewer FID to this press.");

    try {
      const bundle = await fetchRecentCasts(targetFid);
      if (bundle.casts.length === 0) {
        return errorPage(self, `No recent public non-reply casts found for FID ${targetFid}. Try another profile.`);
      }
      const fallback = fallbackReading(bundle);
      const reading = await llmReading(bundle, fallback);
      return resultPage(self, bundle, reading);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not type this profile yet.";
      return errorPage(self, `${message} The snap works once API access is available.`);
    }
  },
  {
    openGraph: {
      title: "Myers-Briggs Cast Type",
      description: "A playful 4-letter read of recent public Farcaster casts, with receipts and a next-cast prompt.",
    },
  },
);

export default app;
