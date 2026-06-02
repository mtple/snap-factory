/**
 * wallet-weather — playful Base wallet forecast from tiny inputs.
 *
 * Components: input, toggle_group, slider, switch, progress, bar_chart, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "wallet-weather";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Forecast = {
  title: string;
  badge: string;
  reading: string;
  nextMove: string;
  confidence: number;
  accent: Accent;
  bars: Array<{ label: string; value: number }>;
};

const MOODS = {
  calm: {
    label: "Calm",
    title: "Clear Base Skies",
    badge: "Steady hands",
    action: "Write down the one onchain thing you actually meant to do, then ignore every bonus quest.",
    accent: "teal" as const,
  },
  curious: {
    label: "Curious",
    title: "Partly Curious",
    badge: "Research breeze",
    action: "Open one source you trust. If the claim needs three screenshots, let it cool overnight.",
    accent: "blue" as const,
  },
  fomo: {
    label: "FOMO",
    title: "FOMO Front Moving In",
    badge: "Helmet advised",
    action: "Set a tiny max spend before clicking anything shiny. Future-you deserves a receipt.",
    accent: "amber" as const,
  },
  suspicious: {
    label: "Suspicious",
    title: "Scam Fog Advisory",
    badge: "Do not ape yet",
    action: "Verify the URL from two places, then close the tab that made your shoulders rise.",
    accent: "purple" as const,
  },
};

function shareButton(self: string, text = "Check your Wallet Weather") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function numberInput(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function stringInput(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 80) : fallback;
}

function moodInput(value: unknown): keyof typeof MOODS {
  return typeof value === "string" && value in MOODS ? (value as keyof typeof MOODS) : "curious";
}

function hashNote(note: string, fid: number): number {
  let hash = fid || 17;
  for (const char of note) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash;
}

function buildForecast(note: string, moodKey: keyof typeof MOODS, nerves: number, rumorFog: boolean, fid: number): Forecast {
  const mood = MOODS[moodKey];
  const seed = hashNote(note, fid);
  const fog = rumorFog ? 18 : 0;
  const volatility = Math.min(100, Math.max(5, Math.round(nerves * 0.72 + fog + (seed % 15))));
  const clarity = Math.max(8, Math.min(96, 100 - Math.round(volatility * 0.62) + (moodKey === "calm" ? 12 : 0)));
  const patience = Math.max(10, Math.min(95, 72 - Math.round(nerves * 0.34) + (moodKey === "suspicious" ? 20 : 0)));
  const confidence = Math.max(22, Math.min(96, Math.round((clarity + patience + (100 - volatility)) / 3)));

  const cloud = rumorFog ? " Airdrop-rumor fog is reducing visibility to one verified link." : " Visibility is decent; the timeline is only lightly haunted.";
  const habit = note.length > 18 ? `${note.slice(0, 18)}…` : note;
  const reading = `${mood.title} around “${habit}.” Gas-fee nerves at ${nerves}/100.${cloud}`;

  return {
    title: volatility > 78 ? "Wallet Thunderwatch" : confidence > 70 ? mood.title : "Mixed Wallet Weather",
    badge: volatility > 78 ? "Caution drizzle" : mood.badge,
    reading,
    nextMove: mood.action,
    confidence,
    accent: volatility > 78 ? "amber" : mood.accent,
    bars: [
      { label: "Clarity", value: clarity },
      { label: "FOMO gusts", value: volatility },
      { label: "Patience", value: patience },
    ],
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "note", "mood", "nerves", "fog", "go", "share_btn"],
    },
    title: {
      type: "text",
      props: {
        content: "Wallet Weather\nTiny forecast for Base-wallet nerves. Not financial advice; more like an umbrella.",
        weight: "bold",
        align: "center",
      },
    },
    note: { type: "input", props: { name: "note", label: "Wallet habit or worry", placeholder: "checking airdrop rumors", maxLength: 80 } },
    mood: {
      type: "toggle_group",
      props: {
        name: "mood",
        label: "Current mode",
        defaultValue: "curious",
        options: Object.entries(MOODS).map(([value, mood]) => ({ label: mood.label, value })),
      },
    },
    nerves: { type: "slider", props: { name: "nerves", label: "Gas-fee nerves", min: 0, max: 100, step: 5, defaultValue: 45 } },
    fog: { type: "switch", props: { name: "fog", label: "Airdrop-rumor fog active" } },
    go: { type: "button", props: { label: "Read forecast", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, forecast: Forecast): SnapHandlerResult {
  const shareText = `My Wallet Weather: ${forecast.title}. ${forecast.badge}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "reading", "confidence", "chart", "move", "actions"],
    },
    title: { type: "text", props: { content: forecast.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: forecast.badge, variant: "outline" } },
    reading: { type: "text", props: { content: forecast.reading, size: "sm", align: "center" } },
    confidence: { type: "progress", props: { label: `Forecast confidence: ${forecast.confidence}%`, value: forecast.confidence, max: 100, color: forecast.accent } },
    chart: { type: "bar_chart", props: { bars: forecast.bars, color: forecast.accent } },
    move: { type: "text", props: { content: `Tiny safe next move: ${forecast.nextMove}`, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "Check again", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: forecast.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const inputs = ctx.action.inputs ?? {};
  const note = stringInput(inputs.note, "checking the wallet weather");
  const mood = moodInput(inputs.mood);
  const nerves = numberInput(inputs.nerves, 45);
  const fog = asBool(inputs.fog);
  const fid = ctx.action.user.fid;

  return resultPage(self, buildForecast(note, mood, nerves, fog, fid));
}, {
  openGraph: {
    title: "Wallet Weather",
    description: "A tiny Base wallet forecast for gas-fee nerves, airdrop fog, and safer next clicks.",
  },
});

export default app;
