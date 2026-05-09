/**
 * grass-protocol — playful Farcaster-native touch-grass prescription.
 *
 * Components: slider, toggle_group, switch, progress, bar_chart, badge, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "grass-protocol";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Weather = "Sunny" | "Cloudy" | "Rainy" | "Cursed";
type Bar = { label: string; value: number };

type Prescription = {
  title: string;
  badge: string;
  accent: Accent;
  score: number;
  prescription: string;
  bars: Bar[];
  shareText: string;
};

const WEATHER_OPTIONS: Weather[] = ["Sunny", "Cloudy", "Rainy", "Cursed"];
const WEATHER_WEIGHT: Record<Weather, number> = {
  Sunny: -12,
  Cloudy: 0,
  Rainy: 10,
  Cursed: 22,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cleanWeather(value: unknown): Weather {
  return WEATHER_OPTIONS.includes(value as Weather) ? (value as Weather) : "Cloudy";
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildPrescription(scroll: number, weather: Weather, argued: boolean, fid: number): Prescription {
  const seed = hashText(`grass-protocol:${scroll}:${weather}:${argued ? 1 : 0}:${fid || 0}`);
  const scrollHeat = Math.min(58, Math.round(scroll / 4));
  const argumentTax = argued ? 24 : 0;
  const score = Math.max(3, Math.min(100, scrollHeat + WEATHER_WEIGHT[weather] + argumentTax + (seed % 11)));
  const grass = Math.max(1, Math.min(10, 11 - Math.round(score / 11)));
  const timelineFog = Math.max(1, Math.min(10, Math.round(score / 10)));
  const replyStatic = Math.max(1, Math.min(10, Math.round((argumentTax + seed % 28) / 5)));
  const hydration = Math.max(2, Math.min(10, 10 - Math.round(scroll / 38) + (weather === "Sunny" ? 1 : 0)));

  const modes = [
    {
      limit: 25,
      title: "Grass optional",
      badge: "Mostly human",
      accent: "green" as Accent,
      line: "You may remain online, but only if you blink like a mammal and drink water before refreshing.",
    },
    {
      limit: 50,
      title: "Grass recommended",
      badge: "Pocket meadow",
      accent: "teal" as Accent,
      line: "Step outside for seven breaths. If outside is unavailable, stare at one non-rectangular object.",
    },
    {
      limit: 75,
      title: "Grass protocol active",
      badge: "Shoes required",
      accent: "amber" as Accent,
      line: "Take a ten-minute loop. Do not compose the perfect reply in your head; the squirrels are moderating.",
    },
    {
      limit: 101,
      title: "Emergency meadow",
      badge: "Phone in rice",
      accent: "red" as Accent,
      line: "Put the timeline down like a haunted toaster. Touch a plant, drink water, return after one full cloud.",
    },
  ];

  const mode = modes.find((entry) => score < entry.limit) ?? modes[3];
  const shareText = `Grass Protocol diagnosed me at ${score}% timeline fog. Prescription: ${mode.badge}. 🌱`;

  return {
    title: mode.title,
    badge: mode.badge,
    accent: mode.accent,
    score,
    prescription: mode.line,
    bars: [
      { label: "Fog", value: timelineFog },
      { label: "Replies", value: replyStatic },
      { label: "Water", value: hydration },
      { label: "Grass", value: grass },
    ],
    shareText,
  };
}

function shareButton(self: string, text = "I checked Grass Protocol. The timeline may need a tiny walk. 🌱", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "scroll", "weather", "argued", "actions"],
    },
    title: { type: "text", props: { content: "Grass Protocol", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Diagnose timeline fog and receive one tiny touch-grass prescription from the wizard clinic.", size: "sm", align: "center" },
    },
    scroll: { type: "slider", props: { name: "scroll", label: "Minutes scrolled today", min: 0, max: 240, step: 5, defaultValue: 45 } },
    weather: {
      type: "toggle_group",
      props: { name: "weather", label: "Outside status", options: WEATHER_OPTIONS, orientation: "horizontal", variant: "outline" },
    },
    argued: { type: "switch", props: { name: "argued", label: "Argued in replies" } },
    diagnose: {
      type: "button",
      props: { label: "Diagnose fog", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=diagnose` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["diagnose", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "green" }, ui: { root: "page", elements } };
}

function resultPage(self: string, prescription: Prescription): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "score", "chart", "rx", "actions"],
    },
    title: { type: "text", props: { content: prescription.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: prescription.badge, variant: "outline" } },
    score: { type: "progress", props: { label: `Timeline fog: ${prescription.score}%`, value: prescription.score, max: 100, color: prescription.accent } },
    chart: { type: "bar_chart", props: { bars: prescription.bars, color: prescription.accent } },
    rx: { type: "text", props: { content: prescription.prescription, size: "sm", align: "center" } },
    again: {
      type: "button",
      props: { label: "Recheck fog", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    post: {
      type: "button",
      props: { label: "Share diagnosis", variant: "primary" },
      on: { press: { action: "compose_cast", params: { text: prescription.shareText, embeds: [self] } } },
    },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "post"] },
  };

  return {
    version: "2.0",
    theme: { accent: prescription.accent },
    effects: prescription.score >= 75 ? ["confetti"] : undefined,
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

    const inputs = ctx.action.inputs ?? {};
    const scroll = clampNumber(inputs.scroll, 45, 0, 240);
    const weather = cleanWeather(inputs.weather);
    const argued = asBool(inputs.argued);
    const fid = ctx.action.user.fid;

    return resultPage(self, buildPrescription(scroll, weather, argued, fid));
  },
  {
    openGraph: {
      title: "Grass Protocol",
      description: "Diagnose timeline fog and get a tiny touch-grass prescription.",
    },
  },
);

export default app;
