/**
 * profile-weather — deterministic Farcaster weather from a user's FID.
 *
 * Components: icon, badge, progress, bar_chart, text, button, stack
 * Actions: submit, view_profile, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "profile-weather";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type ForecastKind = {
  title: string;
  badge: string;
  reading: string;
  accent: Accent;
  icon: string;
};
type Forecast = ForecastKind & {
  confidence: number;
  bars: { label: string; value: number; color: Accent }[];
};

const FORECASTS: ForecastKind[] = [
  {
    title: "Sunny With Replies",
    badge: "High signal",
    reading: "Clear timeline skies. A good day to ship the tiny thing and let people find it.",
    accent: "amber",
    icon: "zap",
  },
  {
    title: "Light Meme Showers",
    badge: "Playful front",
    reading: "Expect scattered jokes, one suspiciously good quote cast, and a reply that improves the room.",
    accent: "pink",
    icon: "message-circle",
  },
  {
    title: "Builder Fog Lifting",
    badge: "Ship window",
    reading: "The spec looks blurry at first, then suddenly the whole thing has a button and a URL.",
    accent: "blue",
    icon: "check",
  },
  {
    title: "Cozy Channel Drift",
    badge: "Gentle scroll",
    reading: "Low pressure, warm tabs, excellent conditions for finding one oddly perfect song.",
    accent: "green",
    icon: "heart",
  },
  {
    title: "Purple Wizard Static",
    badge: "Mystic band",
    reading: "The feed crackles. Do not over-explain the spell. Cast once, vanish politely.",
    accent: "purple",
    icon: "star",
  },
  {
    title: "Degen Wind Advisory",
    badge: "Hold your hat",
    reading: "Gusts of conviction from the west. Secure loose bags and read one extra reply before aping.",
    accent: "red",
    icon: "flame",
  },
];

function seeded(fid: number, salt: number): number {
  let value = (Math.max(0, Math.floor(fid || 0)) + salt) >>> 0;
  value += 0x6d2b79f5;
  let t = value;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

function score(fid: number, salt: number): number {
  return 18 + (seeded(fid, salt) % 83);
}

export function makeForecast(fid: number): Forecast {
  const safeFid = Math.max(0, Math.floor(fid || 0));
  const base = FORECASTS[safeFid % FORECASTS.length];
  const confidence = 58 + (seeded(safeFid, 404) % 40);
  const rawBars = [
    { label: "Signal", value: score(safeFid, 11) },
    { label: "Chaos", value: score(safeFid, 22) },
    { label: "Cozy", value: score(safeFid, 33) },
    { label: "Luck", value: score(safeFid, 44) },
  ];
  const peak = rawBars.reduce((best, bar, index) => (bar.value > rawBars[best].value ? index : best), 0);
  const colors: Accent[] = ["teal", "pink", "green", "amber"];

  return {
    ...base,
    confidence,
    bars: rawBars.map((bar, index) => ({
      ...bar,
      color: index === peak ? base.accent : colors[index],
    })),
  };
}

function shareButton(self: string, text = "I checked my Farcaster weather on @freeturtle ☁️") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

export function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["icon", "title", "intro", "check_btn", "share_btn"],
    },
    icon: { type: "icon", props: { name: "trending-up", size: "lg" } },
    title: { type: "text", props: { content: "Profile Weather", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Your FID has a tiny forecast. Tap once for today's timeline conditions.",
        size: "sm",
        align: "center",
      },
    },
    check_btn: {
      type: "button",
      props: { label: "Check my weather", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

export function resultPage(self: string, fid: number, forecast: Forecast): SnapHandlerResult {
  const shareText = `My Farcaster weather: ${forecast.title}. Check yours on @freeturtle ☁️`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["top", "title", "reading", "confidence", "chart", "actions", "share_btn"],
    },
    top: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: ["weather_icon", "badge"],
    },
    weather_icon: { type: "icon", props: { name: forecast.icon, size: "md" } },
    badge: { type: "badge", props: { label: forecast.badge, variant: "outline" } },
    title: { type: "text", props: { content: forecast.title, weight: "bold", align: "center" } },
    reading: { type: "text", props: { content: forecast.reading, size: "sm", align: "center" } },
    confidence: {
      type: "progress",
      props: { label: `Forecast confidence: ${forecast.confidence}%`, value: forecast.confidence, max: 100, color: forecast.accent },
    },
    chart: { type: "bar_chart", props: { bars: forecast.bars, color: forecast.accent } },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: "primary" },
      on: { press: { action: "view_profile", params: { fid } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Refresh", variant: "secondary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["profile_btn", "again_btn"] },
    share_btn: shareButton(self, shareText),
  };

  return { version: "1.0", theme: { accent: forecast.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  if (ctx.action.type === "get") return startPage(self);

  const fid = ctx.action.fid ?? 0;
  return resultPage(self, fid, makeForecast(fid));
});

export default app;
