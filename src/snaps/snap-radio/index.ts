/**
 * snap-radio — Snap Wizard hit station.
 *
 * Components: icon, badge, progress, item_group, item, text, button, stack
 * Actions: submit, open_url, view_cast, compose_cast
 * State: stateless, station selected by query param
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "snap-radio";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Station = {
  slug: string;
  title: string;
  badge: string;
  description: string;
  score: number;
  stats: string;
  castHash: string;
  accent: Accent;
  icon: string;
};

const STATIONS: Station[] = [
  {
    slug: "album-oracle",
    title: "Album Oracle",
    badge: "#1 hit",
    description: "Music aura oracle: set tempo and mood, get a fictional record with liner notes.",
    score: 269,
    stats: "84 likes · 3 recasts · 1 reply",
    castHash: "0x122a4f440839bf42f565951222946094fa15a602",
    accent: "pink",
    icon: "play",
  },
  {
    slug: "profile-constellation",
    title: "Profile Constellation",
    badge: "Star map",
    description: "A personalized FID constellation, drawn snap-native and ready to share.",
    score: 88,
    stats: "27 likes · 1 recast · 1 reply",
    castHash: "0x72caaf03f43b2c8153112d1be65b4e71e3517da9",
    accent: "purple",
    icon: "star",
  },
  {
    slug: "walkout-song",
    title: "Walkout Song",
    badge: "Entrance music",
    description: "Name what you are facing, pick an energy, receive a fictional anthem.",
    score: 86,
    stats: "27 likes · 1 recast",
    castHash: "0x549554faceedd412a60b5baf725af3c07c915e30",
    accent: "blue",
    icon: "zap",
  },
  {
    slug: "polite-no",
    title: "Polite No",
    badge: "Useful spell",
    description: "Flip a few switches and get a clean little decline you can actually use.",
    score: 80,
    stats: "26 likes · 1 reply",
    castHash: "0x50630cddfe3cebc41edcbc90f79faf3caa9dc1a9",
    accent: "purple",
    icon: "check",
  },
  {
    slug: "hooksmith",
    title: "Hooksmith",
    badge: "Cast forge",
    description: "Turn a rough idea into three cast-ready hooks with one clean prompt.",
    score: 79,
    stats: "23 likes · 2 recasts",
    castHash: "0xc4d87d8879ca6f479d18031c8898f0c5ab6df936",
    accent: "amber",
    icon: "flame",
  },
];

function clampIndex(value: string | null): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  if (!Number.isFinite(parsed)) return 0;
  return ((parsed % STATIONS.length) + STATIONS.length) % STATIONS.length;
}

function shareButton(self: string, station?: Station) {
  const text = station
    ? `Now tuning Snap Radio: ${station.title} on @freeturtle 📻`
    : "Snap Radio is playing the tiny hits on @freeturtle 📻";
  return {
    type: "button" as const,
    props: { label: "Share station", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function stationUrl(request: Request, slug: string): string {
  return snapUrl(request, slug);
}

export function renderStation(request: Request, self: string, index: number): SnapHandlerResult {
  const station = STATIONS[index];
  const next = (index + 1) % STATIONS.length;
  const progress = Math.round(((index + 1) / STATIONS.length) * 100);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "desc", "signal", "open_btn", "next_btn", "share_btn"],
    },
    title: { type: "text", props: { content: `Snap Radio: ${station.title}`, weight: "bold", align: "center" } },
    desc: { type: "text", props: { content: station.description, size: "sm", align: "center" } },
    signal: {
      type: "text",
      props: { content: `Station ${index + 1}/5 · score ${station.score} · ${station.stats}`, size: "sm", align: "center" },
    },
    open_btn: {
      type: "button",
      props: { label: "Open this snap", variant: "primary" },
      on: { press: { action: "open_url", params: { target: stationUrl(request, station.slug) } } },
    },
    next_btn: {
      type: "button",
      props: { label: "Next station", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?i=${next}` } } },
    },
    share_btn: shareButton(self, station),
  };

  return { version: "1.0", theme: { accent: station.accent }, ui: { root: "page", elements } };
}

const SNAP_RADIO_URL = "https://snap-factory.vercel.app/snaps/snap-radio";

const snapRadioFallbackHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Snap Radio</title>
    <meta name="description" content="Five tiny hits, one wizard dial.">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Snap Factory">
    <meta property="og:title" content="Snap Radio">
    <meta property="og:description" content="Five tiny hits, one wizard dial.">
    <meta property="og:url" content="${SNAP_RADIO_URL}">
    <meta property="og:image" content="${SNAP_RADIO_URL}/~/og-image">
    <meta property="og:image:alt" content="Snap Radio">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Snap Radio">
    <meta name="twitter:description" content="Five tiny hits, one wizard dial.">
    <meta name="twitter:image" content="${SNAP_RADIO_URL}/~/og-image">
  </head>
  <body style="margin:0;font-family:system-ui,sans-serif;background:#111827;color:#f9fafb;display:grid;min-height:100vh;place-items:center;text-align:center">
    <main>
      <h1>Snap Radio</h1>
      <p>Five tiny hits, one wizard dial.</p>
      <p><a style="color:#f9a8d4" href="${SNAP_RADIO_URL}">Open the snap</a></p>
    </main>
  </body>
</html>`;

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const index = clampIndex(url.searchParams.get("i"));
    return renderStation(ctx.request, self, index);
  },
  { fallbackHtml: snapRadioFallbackHtml },
);

export default app;
