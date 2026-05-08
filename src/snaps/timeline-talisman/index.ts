/**
 * timeline-talisman — personalized Farcaster-native timeline charm.
 *
 * Components: text, badge, progress, cell_grid, button, stack
 * Actions: submit, view_profile, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "timeline-talisman";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Cell = { row: number; col: number; color: Accent; content: string };

type Talisman = {
  name: string;
  badge: string;
  reading: string;
  charm: string;
  accent: Accent;
};

const TALISMANS: Talisman[] = [
  {
    name: "Reply Lantern",
    badge: "Gentle signal",
    reading: "Carry this when the timeline gets loud. It turns one messy thread into a useful reply and a clean exit.",
    charm: "✦",
    accent: "teal",
  },
  {
    name: "Draft Goblin Bell",
    badge: "Ship gremlin",
    reading: "Ring once before over-editing. If the idea still wiggles, cast the small version and let the room improve it.",
    charm: "◆",
    accent: "amber",
  },
  {
    name: "Mute Fern",
    badge: "Peace ward",
    reading: "A tiny plant for resisting bait. Water it with one deep breath and the urge to quote-cast trouble passes.",
    charm: "●",
    accent: "green",
  },
  {
    name: "Builder Moon",
    badge: "Focus phase",
    reading: "Good for turning fog into a URL. The spell is one tab closed, one tiny test run, one sentence less explanation.",
    charm: "◐",
    accent: "blue",
  },
  {
    name: "Meme Compass",
    badge: "North by joke",
    reading: "Points toward the reply that makes everyone slightly kinder and 14% less serious. Follow it, then vanish.",
    charm: "◇",
    accent: "pink",
  },
  {
    name: "Wizard Receipt",
    badge: "Proof of aura",
    reading: "For days when you need official paperwork for a vibe. Stamp acquired. The timeline must respect the bit.",
    charm: "✹",
    accent: "purple",
  },
];

const RING_COLORS: Accent[] = ["purple", "teal", "blue", "green", "amber", "pink"];

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

function chooseTalisman(fid: number): { talisman: Talisman; ward: number; cells: Cell[] } {
  const seed = hashText(`timeline-talisman:${fid || "anon"}:${todayKey()}`);
  const talisman = TALISMANS[seed % TALISMANS.length];
  const ward = 42 + (seed % 57);
  const cells: Cell[] = [];

  for (let index = 0; index < 9; index += 1) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const diagonal = row === col || row + col === 2;
    const center = index === 4;
    const color = center ? talisman.accent : diagonal ? RING_COLORS[(seed + index) % RING_COLORS.length] : "gray";
    const content = center ? talisman.charm : diagonal ? "·" : "";
    cells.push({ row, col, color, content });
  }

  return { talisman, ward, cells };
}

function shareButton(self: string, text = "I forged a Timeline Talisman with @freeturtle. Tiny protection for the feed. ✨", label = "Share charm"): SnapElementInput {
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
      children: ["title", "intro", "badge", "forge_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Timeline Talisman", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Forge a tiny personalized charm for surviving today's Farcaster weather. Deterministic by FID, refreshed daily.",
        size: "sm",
        align: "center",
      },
    },
    badge: { type: "badge", props: { label: "Daily per FID", variant: "outline" } },
    forge_btn: {
      type: "button",
      props: { label: "Forge talisman", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?forge=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function renderResult(self: string, fid: number): SnapHandlerResult {
  const { talisman, ward, cells } = chooseTalisman(fid);
  const shareText = `My Timeline Talisman today is ${talisman.name}: ${talisman.badge}. Forge yours. ✨`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "ward", "reading", "actions", "share_btn"],
    },
    title: { type: "text", props: { content: talisman.name, weight: "bold", align: "center" } },
    grid: { type: "cell_grid", props: { cols: 3, rows: 3, rowHeight: 38, cellAspectRatio: "square", cells } },
    badge: { type: "badge", props: { label: talisman.badge, variant: "outline" } },
    ward: { type: "progress", props: { label: `Timeline ward: ${ward}%`, value: ward, max: 100, color: talisman.accent } },
    reading: { type: "text", props: { content: talisman.reading, size: "sm", align: "center" } },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: "primary" },
      on: { press: { action: "view_profile", params: { fid } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Forge again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    actions: { type: "stack", props: { direction: "horizontal" }, children: ["profile_btn", "again_btn"] },
    share_btn: shareButton(self, shareText, "Share talisman"),
  };

  return { version: "2.0", theme: { accent: talisman.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderStart(self);
    }

    return renderResult(self, ctx.action.user.fid);
  },
  {
    openGraph: {
      title: "Timeline Talisman",
      description: "Forge a tiny personalized charm for surviving today's Farcaster timeline.",
    },
  },
);

export default app;
