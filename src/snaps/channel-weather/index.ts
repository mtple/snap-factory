/**
 * channel-weather — pick a Farcaster channel and get a tiny daily mood card.
 *
 * Components: toggle_group, progress, badge, text, button, stack
 * Actions: submit, view_cast, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "channel-weather";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type ChannelKey = keyof typeof CHANNELS;

type ChannelForecast = {
  label: string;
  path: string;
  accent: Accent;
  weather: string;
  badge: string;
  summary: string;
  source: string;
  castHash: string;
  signal: string;
  share: string;
  bars: { label: string; value: number; color?: Accent }[];
};

const CHANNELS = {
  snaps: {
    label: "/snaps",
    path: "/snaps",
    accent: "purple",
    weather: "Sleeper hit squall",
    badge: "snap curiosity rising",
    summary:
      "Forecast: sudden capability awe with a 70% chance of people realizing snaps can be tiny games, tools, and weird little ships.",
    source: "Signal cast: @farcaster on slept-on snap capabilities and a Starcaster hull breach.",
    castHash: "0x9b33f84f",
    signal: "Starcaster hull breach",
    share: "The /snaps weather says snap curiosity is rising.",
    bars: [
      { label: "Curiosity", value: 92, color: "purple" },
      { label: "Ship energy", value: 78, color: "teal" },
      { label: "Chaos", value: 51, color: "amber" },
    ],
  },
  base: {
    label: "/base",
    path: "/base",
    accent: "blue",
    weather: "B20 blue front",
    badge: "token standard weather",
    summary:
      "Forecast: bright Base skies, token-standard chatter, and a mild fog bank of first-launch questions around the new B20 lane.",
    source: "Signal cast: @road on Base B20 going live on mainnet.",
    castHash: "0x3beb2dc2",
    signal: "B20 mainnet launch",
    share: "The /base weather says a B20 blue front is moving through.",
    bars: [
      { label: "Base heat", value: 88, color: "blue" },
      { label: "Token fog", value: 67, color: "purple" },
      { label: "Builder wind", value: 73, color: "teal" },
    ],
  },
  farcaster: {
    label: "/farcaster",
    path: "/farcaster",
    accent: "teal",
    weather: "Release-note humidity",
    badge: "what-can-snaps-do haze",
    summary:
      "Forecast: warm curiosity, scattered feature teasers, and a steady breeze of people asking what the new tiny machines can do.",
    source: "Signal cast: @obringer.eth teasing what snaps can do next.",
    castHash: "0x7dab1d3b",
    signal: "Release notes soon",
    share: "The /farcaster weather says release-note humidity is in the air.",
    bars: [
      { label: "Questions", value: 81, color: "teal" },
      { label: "Teasers", value: 74, color: "purple" },
      { label: "Builder itch", value: 69, color: "amber" },
    ],
  },
} as const satisfies Record<string, ChannelForecast>;

function channelInput(raw: unknown): ChannelKey {
  const value = String(raw ?? "snaps");
  return value in CHANNELS ? (value as ChannelKey) : "snaps";
}

function shareButton(self: string, text = "Check today's tiny Farcaster channel weather.", label = "Share snap") {
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
      children: ["title", "intro", "channel", "actions"],
    },
    title: { type: "text", props: { content: "Channel Weather", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick a Farcaster channel. SnapWizard turns one fresh signal cast into a tiny mood forecast.",
        size: "sm",
        align: "center",
      },
    },
    channel: {
      type: "toggle_group",
      props: {
        name: "channel",
        label: "Choose a channel",
        defaultValue: "snaps",
        options: Object.entries(CHANNELS).map(([value, channel]) => ({ label: channel.label, value })),
      },
    },
    check_btn: {
      type: "button",
      props: { label: "Check weather", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=forecast` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["check_btn", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, channelKey: ChannelKey): SnapHandlerResult {
  const forecast = CHANNELS[channelKey];
  const shareText = `${forecast.path} forecast: ${forecast.weather}. ${forecast.signal} is the signal cast.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "chart", "summary", "source", "actions"],
    },
    title: {
      type: "text",
      props: { content: `${forecast.path} weather: ${forecast.weather}`, weight: "bold", align: "center" },
    },
    badge: { type: "badge", props: { label: forecast.badge, variant: "outline" } },
    chart: { type: "bar_chart", props: { bars: forecast.bars } },
    summary: { type: "text", props: { content: forecast.summary, size: "sm", align: "center" } },
    source: { type: "text", props: { content: forecast.source, size: "sm", align: "center" } },
    view_btn: {
      type: "button",
      props: { label: "View signal cast", variant: "primary" },
      on: { press: { action: "view_cast", params: { hash: forecast.castHash } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Try another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText.slice(0, 280), "Share forecast"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["view_btn", "again_btn", "share_btn"] },
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

    if (url.searchParams.get("action") === "forecast") {
      return resultPage(self, channelInput(ctx.action.inputs?.channel));
    }

    return startPage(self);
  },
  {
    openGraph: {
      title: "Channel Weather",
      description: "Pick /snaps, /base, or /farcaster and get a tiny mood forecast from one signal cast.",
    },
  },
);

export default app;
