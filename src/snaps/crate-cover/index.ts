/**
 * crate-cover — generate a tiny snap-native album sleeve.
 *
 * Components: input, toggle_group, cell_grid, badge, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "crate-cover";
const TORTOISE_URL = "https://farcaster.xyz/miniapps/0197c2c3-6650-349a-bc8f-9892abae9e4a/tortoise";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Style = "Dusty" | "Neon" | "Heavy" | "Soft";
type CoverCell = { row: number; col: number; color: Accent };

const STYLES: Style[] = ["Dusty", "Neon", "Heavy", "Soft"];

const STYLE_COPY: Record<Style, { badge: string; accent: Accent; description: string; colors: Accent[] }> = {
  Dusty: {
    badge: "Crate relic",
    accent: "amber",
    description: "Warm paper, tape hiss, and a bassline that knows a secret.",
    colors: ["amber", "gray", "purple", "green"],
  },
  Neon: {
    badge: "Night pressing",
    accent: "pink",
    description: "Chrome edges, glowing chorus, kick drum wearing sunglasses.",
    colors: ["pink", "blue", "purple", "teal"],
  },
  Heavy: {
    badge: "Wall of sound",
    accent: "red",
    description: "Big amps, black denim, and a snare that kicked the door open.",
    colors: ["red", "amber", "gray", "purple"],
  },
  Soft: {
    badge: "Window seat",
    accent: "teal",
    description: "Airy chords, close harmonies, and one cloud shaped like a bridge.",
    colors: ["teal", "green", "blue", "gray"],
  },
};

function hashText(input: string): number {
  let hash = 2166136261;
  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rand(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function asStyle(raw: unknown): Style {
  const value = String(raw ?? "Dusty");
  return STYLES.includes(value as Style) ? (value as Style) : "Dusty";
}

function cleanName(raw: unknown): string {
  const value = String(raw ?? "").trim().replace(/\s+/g, " ");
  return value.slice(0, 42) || "Untitled B-side";
}

function resetUrl(self: string): string {
  const url = new URL(self);
  url.searchParams.set("reset", "1");
  return url.toString();
}

function shareButton(self: string, text = "I made a tiny record sleeve on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function buildCoverCells(name: string, style: Style): CoverCell[] {
  const config = STYLE_COPY[style];
  const random = rand(hashText(`${style}:${name}`));
  const cells = new Map<string, CoverCell>();

  // Border/frame.
  for (let i = 0; i < 12; i++) {
    cells.set(`0:${i}`, { row: 0, col: i, color: config.colors[i % config.colors.length] });
    cells.set(`11:${i}`, { row: 11, col: i, color: config.colors[(i + 1) % config.colors.length] });
    cells.set(`${i}:0`, { row: i, col: 0, color: config.colors[(i + 2) % config.colors.length] });
    cells.set(`${i}:11`, { row: i, col: 11, color: config.colors[(i + 3) % config.colors.length] });
  }

  // Center motif varies by style.
  if (style === "Heavy") {
    for (let i = 0; i < 8; i++) {
      const row = 2 + i;
      cells.set(`${row}:${row}`, { row, col: row, color: "red" });
      cells.set(`${row}:${11 - row}`, { row, col: 11 - row, color: i % 2 ? "amber" : "purple" });
    }
  } else if (style === "Soft") {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const row = 6 + Math.round(Math.sin(angle) * (2 + random() * 2));
      const col = 6 + Math.round(Math.cos(angle) * (2 + random() * 2));
      cells.set(`${row}:${col}`, { row, col, color: config.colors[i % config.colors.length] });
    }
  } else if (style === "Neon") {
    for (let row = 2; row < 10; row++) {
      const col = 2 + ((row * 2 + Math.floor(random() * 3)) % 8);
      cells.set(`${row}:${col}`, { row, col, color: row % 2 ? "pink" : "blue" });
      cells.set(`${row}:${Math.min(10, col + 1)}`, { row, col: Math.min(10, col + 1), color: "teal" });
    }
  } else {
    for (let row = 2; row < 10; row += 2) {
      for (let col = 2; col < 10; col += 3) {
        if (random() > 0.2) cells.set(`${row}:${col}`, { row, col, color: config.colors[Math.floor(random() * config.colors.length)] });
      }
    }
  }

  while (cells.size < 52) {
    const row = 1 + Math.floor(random() * 10);
    const col = 1 + Math.floor(random() * 10);
    const color = config.colors[Math.floor(random() * config.colors.length)];
    cells.set(`${row}:${col}`, { row, col, color });
  }

  return [...cells.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "name", "style", "make", "share_btn"],
    },
    title: { type: "text", props: { content: "Crate Cover", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Name a record, choose a sleeve mood, and the wizard presses a tiny cover.", size: "sm", align: "center" },
    },
    name: { type: "input", props: { name: "name", label: "Record / artist name", placeholder: "Midnight Turtles", maxLength: 42 } },
    style: {
      type: "toggle_group",
      props: { name: "style", label: "Sleeve style", options: STYLES, orientation: "horizontal", variant: "outline" },
    },
    make: { type: "button", props: { label: "Press cover", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, name: string, style: Style): SnapHandlerResult {
  const config = STYLE_COPY[style];
  const cells = buildCoverCells(name, style);
  const shareText = `My ${style.toLowerCase()} sleeve is ${name}. Tiny record wizardry.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["cover", "badge", "title", "desc", "actions", "share_btn"],
    },
    cover: { type: "cell_grid", props: { cols: 12, rows: 12, rowHeight: 18, cells } },
    badge: { type: "badge", props: { label: config.badge, variant: "outline" } },
    title: { type: "text", props: { content: name, weight: "bold", align: "center" } },
    desc: { type: "text", props: { content: `${style} sleeve. ${config.description}`, size: "sm", align: "center" } },
    listen: { type: "button", props: { label: "Open Tortoise", variant: "primary" }, on: { press: { action: "open_url", params: { target: TORTOISE_URL } } } },
    again: { type: "button", props: { label: "Try again", variant: "secondary" }, on: { press: { action: "submit", params: { target: resetUrl(self) } } } },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["listen", "again"] },
    share_btn: shareButton(self, shareText),
  };

  return { version: "1.0", theme: { accent: config.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") return startPage(self);

  const name = cleanName(ctx.action.inputs?.name);
  const style = asStyle(ctx.action.inputs?.style);
  return resultPage(self, name, style);
});

export { buildCoverCells, resultPage, startPage };
export default app;
