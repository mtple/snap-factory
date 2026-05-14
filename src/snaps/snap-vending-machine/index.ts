/**
 * snap-vending-machine — vending machine for non-music SnapWizard snaps.
 *
 * Components: text, badge, toggle_group, progress, button, stack
 * Actions: submit, open_snap, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "snap-vending-machine";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Kind = "Game" | "Utility" | "Social" | "Weird";

type Recommendation = {
  slug: string;
  title: string;
  label: string;
  pitch: string;
  reason: string;
  accent: Accent;
};

const KINDS: Kind[] = ["Game", "Utility", "Social", "Weird"];

const SHELVES: Record<Kind, Recommendation[]> = {
  Game: [
    {
      slug: "bot-or-not",
      title: "Bot or Not",
      label: "Human? bot? chaos?",
      pitch: "Classify a suspicious timeline specimen before it classifies you.",
      reason: "High-signal nonsense, one tap, instant verdict.",
      accent: "gray",
    },
    {
      slug: "timeline-bingo",
      title: "Timeline Bingo",
      label: "Daily feed prophecy",
      pitch: "Deal a tiny 3x3 bingo card, then watch Farcaster prove the wizard right.",
      reason: "A game that makes scrolling feel suspiciously productive.",
      accent: "teal",
    },
    {
      slug: "movie-emoji",
      title: "Movie Emoji",
      label: "Tiny poster quiz",
      pitch: "Decode an emoji movie poster and collect a little cinema goblin fact.",
      reason: "Fast, friendly, and very hard to overthink.",
      accent: "amber",
    },
    {
      slug: "bug-squasher",
      title: "Bug Squasher",
      label: "Find the gremlin",
      pitch: "Tap one cell in a tiny production grid and reveal today’s hidden bug.",
      reason: "Builder therapy disguised as a mini game.",
      accent: "amber",
    },
  ],
  Utility: [
    {
      slug: "decision-dice",
      title: "Decision Dice",
      label: "Tiny next move",
      pitch: "Choose a realm, set the stakes, and roll a practical next step.",
      reason: "For when the brain committee is still in session.",
      accent: "blue",
    },
    {
      slug: "tab-tamer",
      title: "Tab Tamer",
      label: "Browser swamp rescue",
      pitch: "Enter the tab count and get a keep/close/do-now rescue plan.",
      reason: "A small spell against 47 open loops.",
      accent: "blue",
    },
    {
      slug: "reply-radar",
      title: "Reply Radar",
      label: "Thread safety check",
      pitch: "Paste a draft reply and get a pre-flight verdict before posting.",
      reason: "Because some replies should stay in the cauldron.",
      accent: "teal",
    },
    {
      slug: "palette-potion",
      title: "Palette Potion",
      label: "Brew colors",
      pitch: "Pick a mood and warmth to generate a snap-native color palette.",
      reason: "Useful, pretty, and lightly enchanted.",
      accent: "purple",
    },
  ],
  Social: [
    {
      slug: "cast-court",
      title: "Cast Court",
      label: "Etiquette jury",
      pitch: "Vote on a tiny timeline case and see the crowd verdict.",
      reason: "Farcaster loves a low-stakes trial.",
      accent: "purple",
    },
    {
      slug: "daily-cast",
      title: "Daily Cast",
      label: "Prompt dispenser",
      pitch: "Grab today’s conversation prompt and open compose with one tap.",
      reason: "A clean excuse to say something human.",
      accent: "teal",
    },
    {
      slug: "fid-passport",
      title: "FID Passport",
      label: "Stamp your account",
      pitch: "Get a playful FID region, role, motto, and customs warning.",
      reason: "Personalized Farcaster lore without asking for homework.",
      accent: "teal",
    },
    {
      slug: "tiny-bravery",
      title: "Tiny Bravery",
      label: "One brave move",
      pitch: "Pick one small brave thing for today and see the crowd split.",
      reason: "Soft social pressure, but make it wholesome.",
      accent: "green",
    },
  ],
  Weird: [
    {
      slug: "beautiful-thing",
      title: "Beautiful Thing",
      label: "Mystery reveal",
      pitch: "A single cryptic button reveals the most beautiful thing around.",
      reason: "Maximum joke density per tap.",
      accent: "gray",
    },
    {
      slug: "magic-mirror",
      title: "Magic Mirror",
      label: "The mirror knows",
      pitch: "Ask the wizard what the mirror sees. It is legally required to flatter you.",
      reason: "Tiny ego snack, no login ritual.",
      accent: "pink",
    },
    {
      slug: "fortune-cookie",
      title: "Fortune Cookie",
      label: "Crack a prophecy",
      pitch: "Open a daily fortune with lucky numbers and wizardly nonsense.",
      reason: "A low-commitment omen for the timeline.",
      accent: "purple",
    },
    {
      slug: "alchemy-lab",
      title: "Alchemy Lab",
      label: "Brew a compound",
      pitch: "Toggle four elements and produce one of sixteen strange compounds.",
      reason: "Science, if science wore a cape.",
      accent: "amber",
    },
  ],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeKind(value: unknown): Kind {
  const asString = String(value ?? "Game");
  return KINDS.includes(asString as Kind) ? (asString as Kind) : "Game";
}

function pickRecommendation(kind: Kind, fid: number, spin: number): Recommendation {
  const shelf = SHELVES[kind];
  const seed = hashText(`${SNAP_NAME}:${todayKey()}:${fid || "anon"}:${kind}:${spin}`);
  return shelf[seed % shelf.length] ?? shelf[0];
}

function shareButton(self: string, text = "I found the SnapWizard vending machine. Choose a craving, get a snap.", label = "Share machine"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderStart(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "intro", "picker", "vend_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Snap Vending Machine", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: "Certified snap snacks", variant: "outline" } },
    intro: {
      type: "text",
      props: {
        content: "Tell the machine what you are craving. It dispenses one proven SnapWizard snap and a tiny reason from the goblin behind the glass.",
        align: "center",
      },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "kind",
        label: "What do you want?",
        options: KINDS.map((kind) => ({ label: kind, value: kind })),
        orientation: "horizontal",
        variant: "outline",
        defaultValue: "Game",
      },
    },
    vend_btn: {
      type: "button",
      props: { label: "Vend a snap", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?vend=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function renderResult(self: string, target: string, kind: Kind, fid: number, spin: number): SnapHandlerResult {
  const rec = pickRecommendation(kind, fid, spin);
  const nextSpin = spin + 1;
  const shareText = `The SnapWizard vending machine gave me ${rec.title}. ${rec.label}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "pitch", "reason", "buttons", "share_btn"],
    },
    title: { type: "text", props: { content: rec.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: rec.label, variant: "outline" } },
    meter: { type: "progress", props: { label: `${kind} craving match`, value: 72 + ((fid + spin + rec.slug.length) % 24), max: 100 } },
    pitch: { type: "text", props: { content: rec.pitch, align: "center" } },
    reason: { type: "text", props: { content: rec.reason, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["open_btn", "reroll_btn", "reset_btn"] },
    open_btn: {
      type: "button",
      props: { label: "Open snap", variant: "primary" },
      on: { press: { action: "open_snap", params: { target } } },
    },
    reroll_btn: {
      type: "button",
      props: { label: "Reroll", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?vend=1&kind=${encodeURIComponent(kind)}&spin=${nextSpin}` } } },
    },
    reset_btn: {
      type: "button",
      props: { label: "New craving", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share pick"),
  };

  return { version: "2.0", theme: { accent: rec.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const fid = ctx.action.type === "get" ? (ctx.action.user?.fid ?? 0) : ctx.action.user.fid;

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderStart(self);
    }

    const kind = normalizeKind(url.searchParams.get("kind") ?? ctx.action.inputs?.kind);
    const spin = Number.parseInt(url.searchParams.get("spin") ?? "0", 10) || 0;
    const rec = pickRecommendation(kind, fid, spin);
    return renderResult(self, snapUrl(ctx.request, rec.slug), kind, fid, spin);
  },
  {
    openGraph: {
      title: "Snap Vending Machine",
      description: "Choose a craving and get a proven non-music SnapWizard snap from the goblin behind the glass.",
    },
  },
);

export default app;
