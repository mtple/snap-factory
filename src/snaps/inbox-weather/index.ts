/**
 * inbox-weather — a tiny productivity forecast for inbox storms.
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
const SNAP_NAME = "inbox-weather";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Pressure = "Breezy" | "Cloudy" | "Stormy" | "Meteor";
type Bar = { label: string; value: number };

type Forecast = {
  title: string;
  badge: string;
  accent: Accent;
  stormScore: number;
  summary: string;
  action: string;
  bars: Bar[];
  shareText: string;
};

const PRESSURES: Pressure[] = ["Breezy", "Cloudy", "Stormy", "Meteor"];
const PRESSURE_WEIGHT: Record<Pressure, number> = {
  Breezy: 8,
  Cloudy: 24,
  Stormy: 42,
  Meteor: 60,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cleanPressure(value: unknown): Pressure {
  return PRESSURES.includes(value as Pressure) ? (value as Pressure) : "Cloudy";
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildForecast(unread: number, pressure: Pressure, avoiding: boolean, fid: number): Forecast {
  const seed = hashText(`${unread}|${pressure}|${avoiding ? 1 : 0}|${fid || 0}`);
  const unreadHeat = Math.min(45, Math.round(unread / 4));
  const avoidanceHeat = avoiding ? 22 : 0;
  const stormScore = Math.max(4, Math.min(100, unreadHeat + PRESSURE_WEIGHT[pressure] + avoidanceHeat + (seed % 9)));

  const modes = [
    {
      title: "Inbox: light drizzle",
      badge: "Umbrella optional",
      accent: "teal" as Accent,
      summary: "The inbox is doing theater, not weather. Do not give it a press conference.",
      action: "Answer one easy message, archive five ghosts, then leave before it invents errands.",
    },
    {
      title: "Inbox: cloud goblin",
      badge: "Sort the clouds",
      accent: "blue" as Accent,
      summary: "Visibility is medium. The goblin is mostly made of unread newsletters and guilt vapor.",
      action: "Create a 12-minute reply window: urgent first, human second, everything else gets composted.",
    },
    {
      title: "Inbox: storm warning",
      badge: "Tiny bunker mode",
      accent: "amber" as Accent,
      summary: "Thunder detected. The inbox wants panic; offer it a checklist with a tiny hat.",
      action: "Search from your boss/client/friend, send the shortest honest reply, then batch archive the noise.",
    },
    {
      title: "Inbox: meteor protocol",
      badge: "Do not refresh",
      accent: "red" as Accent,
      summary: "A flaming rock of obligations is entering the atmosphere. Refreshing will not help the rock.",
      action: "Pick the avoided email, write a bad first sentence, send or schedule it within ten minutes.",
    },
  ];

  const mode = stormScore >= 82 ? modes[3] : stormScore >= 58 ? modes[2] : stormScore >= 30 ? modes[1] : modes[0];
  const reply = Math.max(1, Math.min(10, Math.round(stormScore / 11) + (avoiding ? 1 : 0)));
  const archive = Math.max(2, Math.min(10, Math.round((unread || 8) / 24) + (pressure === "Breezy" ? 2 : 0)));
  const focus = Math.max(1, Math.min(10, 11 - Math.round(stormScore / 12)));
  const shareText = `Inbox Weather says ${mode.title.replace("Inbox: ", "")} at ${stormScore}% pressure. Tiny protocol: ${mode.badge}.`;

  return {
    title: mode.title,
    badge: mode.badge,
    accent: mode.accent,
    stormScore,
    summary: mode.summary,
    action: mode.action,
    bars: [
      { label: "Focus", value: focus },
      { label: "Reply", value: reply },
      { label: "Archive", value: archive },
    ],
    shareText,
  };
}

function shareButton(self: string, text = "I checked my Inbox Weather. The goblin has notes.", label = "Share snap") {
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
      children: ["title", "intro", "unread", "pressure", "avoiding", "actions"],
    },
    title: { type: "text", props: { content: "Inbox Weather", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Forecast the storm in your unread pile and get one tiny protocol for surviving it.", size: "sm", align: "center" },
    },
    unread: { type: "slider", props: { name: "unread", label: "Unread count", min: 0, max: 200, step: 5, defaultValue: 35 } },
    pressure: {
      type: "toggle_group",
      props: { name: "pressure", label: "Deadline pressure", options: PRESSURES, orientation: "horizontal", variant: "outline" },
    },
    avoiding: { type: "switch", props: { name: "avoiding", label: "Avoiding one important email" } },
    forecast: {
      type: "button",
      props: { label: "Forecast inbox", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=forecast` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["forecast", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, forecast: Forecast): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "pressure", "chart", "summary", "next", "actions"],
    },
    title: { type: "text", props: { content: forecast.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: forecast.badge, variant: "outline" } },
    pressure: { type: "progress", props: { label: `Storm pressure: ${forecast.stormScore}%`, value: forecast.stormScore, max: 100, color: forecast.accent } },
    chart: { type: "bar_chart", props: { bars: forecast.bars, color: forecast.accent } },
    summary: { type: "text", props: { content: forecast.summary, align: "center", size: "sm" } },
    next: { type: "text", props: { content: `Tiny protocol: ${forecast.action}`, size: "sm" } },
    again: {
      type: "button",
      props: { label: "Recheck sky", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    post: {
      type: "button",
      props: { label: "Share forecast", variant: "primary" },
      on: { press: { action: "compose_cast", params: { text: forecast.shareText, embeds: [self] } } },
    },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "post"] },
  };

  return { version: "2.0", theme: { accent: forecast.accent }, ui: { root: "page", elements } };
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
    const unread = clampNumber(inputs.unread, 35, 0, 200);
    const pressure = cleanPressure(inputs.pressure);
    const avoiding = asBool(inputs.avoiding);
    const fid = ctx.action.user?.fid ?? 0;

    return resultPage(self, buildForecast(unread, pressure, avoiding, fid));
  },
  {
    openGraph: {
      title: "Inbox Weather",
      description: "Forecast your unread pile and get one tiny inbox survival protocol.",
    },
  },
);

export default app;
