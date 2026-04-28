/**
 * setlist-spell — conjure a fictional five-song setlist for the room.
 *
 * Components: toggle_group, slider, switch, badge, bar_chart, text, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "setlist-spell";
const TORTOISE_URL = "https://farcaster.xyz/miniapps/0197c2c3-6650-349a-bc8f-9892abae9e4a/tortoise";

const VENUES = ["Basement", "Club", "Festival", "Moon"] as const;
type Venue = (typeof VENUES)[number];
type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Setlist = {
  badge: string;
  intro: string;
  songs: string[];
  energy: number[];
  accent: Accent;
};

const OPENERS = ["Doorway Static", "Velvet Check", "First Light Soundcheck", "Tiny Engine", "Lantern Feedback"];
const MIDDLES = ["No Skip Potion", "Soft Chaos Parade", "Borrowed Bassline", "The Crowd Knows", "Green Room Ghost"];
const CLOSERS = ["Exit Through the Chorus", "Last Train Reverb", "Hands Up Weather", "Encore for Nobody", "Moonroof Finale"];

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function asVenue(raw: unknown): Venue {
  const value = String(raw ?? "Club");
  return VENUES.includes(value as Venue) ? (value as Venue) : "Club";
}

function asChaos(raw: unknown): number {
  const value = typeof raw === "number" ? raw : Number(raw ?? 50);
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asEncore(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function pick(list: string[], seed: number, offset: number): string {
  return list[Math.floor(seed / offset) % list.length];
}

function buildSetlist(venue: Venue, chaos: number, encore: boolean, fid: number): Setlist {
  const seed = hashText(`${venue}:${chaos}:${encore}:${fid || 0}`);
  const wild = chaos >= 70;
  const intimate = venue === "Basement" || venue === "Club";
  const accent: Accent = venue === "Moon" ? "purple" : wild ? "pink" : intimate ? "green" : "amber";
  const badge = encore ? "Encore prepared" : wild ? "No curfew" : "Tight five";
  const opener = pick(OPENERS, seed, 7);
  const middleA = pick(MIDDLES, seed, 13);
  const middleB = pick([...MIDDLES].reverse(), seed, 19);
  const closer = pick(CLOSERS, seed, 29);
  const encoreSong = encore ? pick(CLOSERS, seed, 37) : "House Lights Benediction";
  const venueWord = venue === "Moon" ? "lunar" : venue.toLowerCase();
  const songs = [
    opener,
    `${middleA} (${venueWord} mix)`,
    wild ? "Drummer Ignores the Map" : middleB,
    closer,
    encoreSong === closer ? "One More Tiny Miracle" : encoreSong,
  ];
  const base = venue === "Basement" ? 38 : venue === "Club" ? 52 : venue === "Festival" ? 68 : 60;
  const energy = [
    Math.min(100, base + 5 + (seed % 9)),
    Math.min(100, base + 14 + Math.round(chaos / 10)),
    Math.min(100, base + 4 + Math.round(chaos / 2)),
    Math.min(100, base + 24 + (wild ? 8 : 0)),
    Math.min(100, base + (encore ? 32 : 12) + (seed % 11)),
  ];
  const intro = `${venue} spell at ${chaos}% chaos. ${encore ? "The encore is hidden in the smoke." : "No encore, just a clean exit."}`;
  return { badge, intro, songs, energy, accent };
}

function resetUrl(self: string): string {
  const url = new URL(self);
  url.searchParams.set("reset", "1");
  return url.toString();
}

function shareButton(self: string, text = "I conjured a Setlist Spell on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sub", "venue", "chaos", "encore", "cast_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Setlist Spell", weight: "bold", align: "center" } },
    sub: {
      type: "text",
      props: { content: "Pick the room, set the chaos, and let the wizard book your five-song arc.", size: "sm", align: "center" },
    },
    venue: {
      type: "toggle_group",
      props: { name: "venue", label: "Room size", options: VENUES, orientation: "horizontal", variant: "outline" },
    },
    chaos: { type: "slider", props: { name: "chaos", label: "Chaos level", min: 0, max: 100, step: 5, defaultValue: 45 } },
    encore: { type: "switch", props: { name: "encore", label: "Hide an encore" } },
    cast_btn: {
      type: "button",
      props: { label: "Cast the spell", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };
  return { version: "1.0", theme: { accent: "green" }, ui: { root: "page", elements } };
}

function resultPage(self: string, venue: Venue, chaos: number, encore: boolean, setlist: Setlist): SnapHandlerResult {
  const bars = setlist.energy.map((value, index) => ({
    label: `Song ${index + 1}`,
    value,
    color: (index === 4 && encore ? "pink" : setlist.accent) as Accent,
  }));
  const songText = setlist.songs.map((song, index) => `${index + 1}. ${song}`).join("\n");
  const shareText = `My ${venue.toLowerCase()} setlist spell: “${setlist.songs[0]}” into “${setlist.songs[3]}”.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["badge", "title", "intro", "songs", "chart", "actions", "share_btn"],
    },
    badge: { type: "badge", props: { label: setlist.badge, variant: "outline" } },
    title: { type: "text", props: { content: "Tonight's imaginary set", weight: "bold", align: "center" } },
    intro: { type: "text", props: { content: setlist.intro, size: "sm", align: "center" } },
    songs: { type: "text", props: { content: songText, size: "sm" } },
    chart: { type: "bar_chart", props: { bars, color: setlist.accent } },
    tortoise: {
      type: "button",
      props: { label: "Open Tortoise", variant: "primary" },
      on: { press: { action: "open_url", params: { target: TORTOISE_URL } } },
    },
    remix: {
      type: "button",
      props: { label: "Remix", variant: "secondary" },
      on: { press: { action: "submit", params: { target: resetUrl(self) } } },
    },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["tortoise", "remix"] },
    share_btn: shareButton(self, shareText),
  };
  return {
    version: "1.0",
    theme: { accent: setlist.accent },
    effects: chaos >= 90 || encore ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }
  const venue = asVenue(ctx.action.inputs?.venue);
  const chaos = asChaos(ctx.action.inputs?.chaos);
  const encore = asEncore(ctx.action.inputs?.encore);
  const setlist = buildSetlist(venue, chaos, encore, ctx.action.fid ?? 0);
  return resultPage(self, venue, chaos, encore, setlist);
});

export { asChaos, asEncore, asVenue, buildSetlist, resetUrl };
export default app;
