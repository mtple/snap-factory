/**
 * soundcheck-bingo — tiny music bingo card for /tortoise.
 *
 * Components: toggle_group, switch, cell_grid, badge, text, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "soundcheck-bingo";
const SOUND_CHECK_BINGO_URL = "https://snap-factory.vercel.app/snaps/soundcheck-bingo";
const TORTOISE_MINIAPP_URL = "https://farcaster.xyz/miniapps/0197c2c3-6650-349a-bc8f-9892abae9e4a/tortoise";

type Elements = SnapHandlerResult["ui"]["elements"];
type Venue = "Basement" | "Rooftop" | "Club" | "Festival";
type Accent = "amber" | "blue" | "green" | "pink" | "purple" | "teal";

type BingoTile = {
  phrase: string;
  color: string;
};

type BingoResult = {
  title: string;
  badge: string;
  readout: string;
  accent: Accent;
  tiles: BingoTile[];
};

const VENUES: Venue[] = ["Basement", "Rooftop", "Club", "Festival"];

const PALETTE: Record<Venue, string[]> = {
  Basement: ["#7c2d12", "#a16207", "#f59e0b", "#111827", "#fbbf24"],
  Rooftop: ["#0f766e", "#14b8a6", "#67e8f9", "#1d4ed8", "#f0fdfa"],
  Club: ["#831843", "#db2777", "#a855f7", "#312e81", "#f9a8d4"],
  Festival: ["#166534", "#22c55e", "#f97316", "#fde047", "#dc2626"],
};

const PHRASES: Record<Venue, string[]> = {
  Basement: [
    "amp hum",
    "tiny stage",
    "floor tom",
    "borrowed mic",
    "foggy window",
    "tape hiss",
    "one lamp",
    "cheap lager",
    "cable nest",
    "loud friend",
  ],
  Rooftop: [
    "wind chorus",
    "skyline kick",
    "late sunset",
    "train below",
    "cool breeze",
    "golden snare",
    "open sky",
    "neighbors clap",
    "bird solo",
    "moon delay",
  ],
  Club: [
    "laser sweep",
    "sticky floor",
    "sub drop",
    "mirror ball",
    "smoke blast",
    "door stamp",
    "hands up",
    "bass face",
    "neon spill",
    "2am encore",
  ],
  Festival: [
    "dust cloud",
    "lost crew",
    "big chorus",
    "food truck",
    "flag wave",
    "sunburn riff",
    "main stage",
    "field chant",
    "rain threat",
    "giant screen",
  ],
};

function asVenue(raw: unknown): Venue {
  const value = String(raw ?? "Basement");
  return VENUES.includes(value as Venue) ? (value as Venue) : "Basement";
}

function asBoolean(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function hash(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function buildCard(venue: Venue, chaos: boolean, fid: number): BingoResult {
  const palette = PALETTE[venue];
  const phrases = PHRASES[venue];
  const seed = hash(`${venue}:${chaos ? "chaos" : "clean"}:${fid || 0}`);
  const tiles: BingoTile[] = [];

  for (let i = 0; i < 25; i += 1) {
    const phrase = phrases[(seed + i * 7 + (chaos ? i * i : i)) % phrases.length];
    const color = palette[(seed + i * 3 + (chaos ? 2 : 0)) % palette.length];
    tiles.push({ phrase, color });
  }

  const titles: Record<Venue, string> = {
    Basement: chaos ? "Basement goblin set" : "Basement golden hour",
    Rooftop: chaos ? "Rooftop wind machine" : "Rooftop shimmer set",
    Club: chaos ? "Club gremlin bingo" : "Club lights aligned",
    Festival: chaos ? "Festival side-quest card" : "Festival main-stage card",
  };

  const accents: Record<Venue, Accent> = {
    Basement: "amber",
    Rooftop: "teal",
    Club: "pink",
    Festival: "green",
  };

  const readout = chaos
    ? `Your ${venue.toLowerCase()} card is rowdy: mark a square whenever the set swerves.`
    : `Your ${venue.toLowerCase()} card is clean: mark a square when the moment lands.`;

  return {
    title: titles[venue],
    badge: chaos ? "Chaos mode" : "Clean board",
    readout,
    accent: accents[venue],
    tiles,
  };
}

function shareButton(self: string, text = "I made a Soundcheck Bingo card on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function resetUrl(self: string): string {
  const url = new URL(self);
  url.searchParams.set("reset", "1");
  return url.toString();
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "venue", "chaos", "make_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Soundcheck Bingo", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick a room, optionally summon chaos, then get a tiny color bingo card for the next set.",
        size: "sm",
        align: "center",
      },
    },
    venue: {
      type: "toggle_group",
      props: {
        name: "venue",
        label: "Venue vibe",
        options: VENUES,
        orientation: "horizontal",
        variant: "outline",
      },
    },
    chaos: { type: "switch", props: { name: "chaos", label: "Chaos mode" } },
    make_btn: {
      type: "button",
      props: { label: "Make my card", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, venue: Venue, chaos: boolean, result: BingoResult): SnapHandlerResult {
  const cells = result.tiles.map((tile, index) => ({
    row: Math.floor(index / 5),
    col: index % 5,
    color: tile.color,
  }));
  const highlights = result.tiles
    .filter((_, index) => [0, 6, 12, 18, 24].includes(index))
    .map((tile) => tile.phrase)
    .join(" · ");
  const shareText = `My ${venue.toLowerCase()} Soundcheck Bingo card: ${result.badge}.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["badge", "title", "card", "readout", "listen_btn", "again_btn", "share_btn"],
    },
    badge: { type: "badge", props: { label: result.badge, variant: "outline" } },
    title: { type: "text", props: { content: result.title, weight: "bold", align: "center" } },
    card: { type: "cell_grid", props: { cols: 5, rows: 5, rowHeight: 18, cells } },
    readout: {
      type: "text",
      props: { content: `${result.readout} Diagonal: ${highlights}.`, size: "sm", align: "center" },
    },
    listen_btn: {
      type: "button",
      props: { label: "Open Tortoise", variant: "primary" },
      on: { press: { action: "open_url", params: { target: TORTOISE_MINIAPP_URL } } },
    },
    again_btn: {
      type: "button",
      props: { label: chaos ? "Calm it down" : "Try chaos", variant: "secondary" },
      on: { press: { action: "submit", params: { target: resetUrl(self) } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return { version: "1.0", theme: { accent: result.accent }, ui: { root: "page", elements } };
}

const fallbackHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Soundcheck Bingo</title>
    <meta name="description" content="Make a tiny music bingo card for the next set.">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Snap Factory">
    <meta property="og:title" content="Soundcheck Bingo">
    <meta property="og:description" content="Make a tiny music bingo card for the next set.">
    <meta property="og:url" content="${SOUND_CHECK_BINGO_URL}">
    <meta property="og:image" content="${SOUND_CHECK_BINGO_URL}/~/og-image">
    <meta property="og:image:alt" content="Soundcheck Bingo">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Soundcheck Bingo">
    <meta name="twitter:description" content="Make a tiny music bingo card for the next set.">
    <meta name="twitter:image" content="${SOUND_CHECK_BINGO_URL}/~/og-image">
  </head>
  <body style="margin:0;font-family:system-ui,sans-serif;background:#042f2e;color:#f0fdfa;display:grid;min-height:100vh;place-items:center;text-align:center">
    <main>
      <h1>Soundcheck Bingo</h1>
      <p>Make a tiny music bingo card for the next set.</p>
      <p><a style="color:#5eead4" href="${SOUND_CHECK_BINGO_URL}">Open the snap</a></p>
    </main>
  </body>
</html>`;

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    if (url.searchParams.get("reset") === "1" || ctx.action.type === "get") {
      return startPage(self);
    }

    const venue = asVenue(ctx.action.inputs?.venue);
    const chaos = asBoolean(ctx.action.inputs?.chaos);
    const fid = Number(ctx.action.fid ?? 0);
    return resultPage(self, venue, chaos, buildCard(venue, chaos, fid));
  },
  { fallbackHtml },
);

export default app;
