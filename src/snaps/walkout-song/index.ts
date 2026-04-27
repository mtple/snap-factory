/**
 * walkout-song — generate a fictional walkout track for whatever today is throwing at you.
 *
 * Components: input, toggle_group, badge, progress, text, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "walkout-song";
const TORTOISE_MINIAPP_URL = "https://farcaster.xyz/miniapps/0197c2c3-6650-349a-bc8f-9892abae9e4a/tortoise";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Energy = "Gentle" | "Locked in" | "Chaotic" | "Victory";

type Walkout = {
  title: string;
  artist: string;
  badge: string;
  note: string;
  percent: number;
  accent: Accent;
};

const ENERGIES: Energy[] = ["Gentle", "Locked in", "Chaotic", "Victory"];
const WORDS = ["Moon", "Door", "Circuit", "Crown", "Signal", "Velvet", "Engine", "Lantern", "Static", "Bloom"];

const PROFILES: Record<Energy, Omit<Walkout, "title" | "artist" | "percent">[]> = {
  Gentle: [
    { badge: "Soft entrance", note: "A warm bassline, clean shoes, and no sudden movements. You glide in.", accent: "teal" },
    { badge: "Calm armor", note: "Fingerpicked courage with a tiny drum machine keeping watch at the door.", accent: "green" },
  ],
  "Locked in": [
    { badge: "Focus mode", note: "Four-on-the-floor discipline. Every notification gets politely benched.", accent: "blue" },
    { badge: "Tunnel vision", note: "A metronome in sunglasses. The chorus already has a checklist.", accent: "purple" },
  ],
  Chaotic: [
    { badge: "Goblin tempo", note: "Broken synths, loose cymbals, and a bridge that definitely ignored the map.", accent: "amber" },
    { badge: "Glitch parade", note: "The snare trips over a cable and somehow invents confidence.", accent: "pink" },
  ],
  Victory: [
    { badge: "Main character", note: "Big drums. Bigger doorway. The outro points directly at the scoreboard.", accent: "green" },
    { badge: "Champ walk", note: "A gold-plated hook for entering rooms like the credits just rolled.", accent: "amber" },
  ],
};

function asEnergy(raw: unknown): Energy {
  const value = String(raw ?? "Locked in");
  return ENERGIES.includes(value as Energy) ? (value as Energy) : "Locked in";
}

function cleanChallenge(raw: unknown): string {
  const value = String(raw ?? "today").replace(/\s+/g, " ").trim();
  return value.length > 0 ? value.slice(0, 72) : "today";
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function makeWalkout(challenge: string, energy: Energy, fid: number): Walkout {
  const seed = hashText(`${challenge}:${energy}:${fid || 0}`);
  const options = PROFILES[energy];
  const profile = options[seed % options.length];
  const noun = WORDS[Math.floor(seed / 7) % WORDS.length];
  const focus = titleCase(challenge).replace(/[^a-zA-Z0-9 '\-]/g, "") || "Today";
  const title = `${focus} ${noun}`.slice(0, 54);
  const artist = ["The Door Kicks", "Velvet Clutch", "DJ Tiny Omen", "Coach Chorus", "Signal Bloom"][
    Math.floor(seed / 13) % 5
  ];
  const base = energy === "Victory" ? 82 : energy === "Chaotic" ? 76 : energy === "Locked in" ? 88 : 68;
  const percent = Math.max(11, Math.min(99, base + (seed % 19) - 7));
  return { ...profile, title, artist, percent };
}

function resetUrl(self: string): string {
  const url = new URL(self);
  url.searchParams.set("reset", "1");
  return url.toString();
}

function shareButton(self: string, text = "I found my walkout song on @freeturtle") {
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
      children: ["title", "sub", "challenge", "energy", "make", "share_btn"],
    },
    title: { type: "text", props: { content: "Walkout Song", weight: "bold", align: "center" } },
    sub: {
      type: "text",
      props: { content: "Name what you're facing. Pick an energy. Get the song that plays as you enter.", size: "sm", align: "center" },
    },
    challenge: { type: "input", props: { name: "challenge", label: "What are you facing?", placeholder: "inbox, Monday, demo day...", maxLength: 72 } },
    energy: {
      type: "toggle_group",
      props: { name: "energy", label: "Walkout energy", options: ENERGIES, orientation: "horizontal", variant: "outline" },
    },
    make: {
      type: "button",
      props: { label: "Cue the track", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, challenge: string, energy: Energy, walkout: Walkout): SnapHandlerResult {
  const shareText = `My ${energy.toLowerCase()} walkout song for ${challenge}: “${walkout.title}” by ${walkout.artist}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["badge", "title", "artist", "note", "ready", "actions", "share_btn"],
    },
    badge: { type: "badge", props: { label: walkout.badge, variant: "outline" } },
    title: { type: "text", props: { content: `“${walkout.title}”`, weight: "bold", align: "center" } },
    artist: { type: "text", props: { content: `by ${walkout.artist} • ${energy} mode`, size: "sm", align: "center" } },
    note: { type: "text", props: { content: walkout.note, size: "sm", align: "center" } },
    ready: { type: "progress", props: { label: "Door-kick readiness", value: walkout.percent, max: 100 } },
    listen: {
      type: "button",
      props: { label: "Open Tortoise", variant: "primary" },
      on: { press: { action: "open_url", params: { target: TORTOISE_MINIAPP_URL } } },
    },
    again: {
      type: "button",
      props: { label: "Try again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: resetUrl(self) } } },
    },
    post: {
      type: "button",
      props: { label: "Post my song", variant: "secondary" },
      on: { press: { action: "compose_cast", params: { text: shareText, embeds: [self] } } },
    },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["listen", "again", "post"] },
    share_btn: shareButton(self, shareText),
  };

  return {
    version: "1.0",
    theme: { accent: walkout.accent },
    effects: walkout.percent >= 90 ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const challenge = cleanChallenge(ctx.action.inputs?.challenge);
  const energy = asEnergy(ctx.action.inputs?.energy);
  const walkout = makeWalkout(challenge, energy, ctx.action.fid ?? 0);
  return resultPage(self, challenge, energy, walkout);
});

export { asEnergy, cleanChallenge, makeWalkout, resetUrl };
export default app;
