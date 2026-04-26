/**
 * profile-constellation — turn a Farcaster FID into a tiny star map.
 *
 * Components: icon, text, badge, button, stack
 * Actions: submit, view_profile, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "profile-constellation";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type CellColor = Accent;
type Cell = { row: number; col: number; color: CellColor };

type Constellation = {
  title: string;
  sign: string;
  omen: string;
  field: string;
  stars: number;
  accent: Accent;
  cells: Cell[];
};

const SIGNS = [
  {
    name: "The Builder",
    omen: "You turn loose ideas into things people can tap.",
    field: "Shipping lane",
    accent: "blue" as const,
  },
  {
    name: "The Curator",
    omen: "You notice the good stuff early and point others toward it.",
    field: "Signal garden",
    accent: "teal" as const,
  },
  {
    name: "The Jester",
    omen: "Your replies bend the timeline toward chaos, in a healthy way.",
    field: "Meme belt",
    accent: "pink" as const,
  },
  {
    name: "The Patron",
    omen: "You keep the room warm: likes, tips, replies, repeat.",
    field: "Community orbit",
    accent: "green" as const,
  },
  {
    name: "The Oracle",
    omen: "You read the cast before the cast knows what it means.",
    field: "Deep scroll",
    accent: "purple" as const,
  },
  {
    name: "The Firefly",
    omen: "Short bursts, bright trails, impossible to fully predict.",
    field: "Night channel",
    accent: "amber" as const,
  },
];

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCells(fid: number, accent: Accent): Cell[] {
  const rand = mulberry32((fid || 1) * 2654435761);
  const cells = new Map<string, Cell>();
  const starCount = 9 + ((fid || 0) % 7);
  const colors: CellColor[] = [accent, "gray", "blue", "purple", "amber"];

  // A gentle diagonal thread makes each random field feel like a constellation.
  const startRow = Math.floor(rand() * 4) + 1;
  for (let i = 0; i < 6; i++) {
    const row = Math.max(0, Math.min(9, startRow + Math.floor(i * 1.25)));
    const col = Math.max(0, Math.min(17, 2 + i * 3 + Math.floor(rand() * 2)));
    cells.set(`${row}:${col}`, { row, col, color: i % 2 === 0 ? accent : "gray" });
  }

  while (cells.size < starCount) {
    const row = Math.floor(rand() * 10);
    const col = Math.floor(rand() * 18);
    const color = colors[Math.floor(rand() * colors.length)];
    cells.set(`${row}:${col}`, { row, col, color });
  }

  return [...cells.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

function makeConstellation(fid: number): Constellation {
  const safeFid = Math.max(0, Math.floor(fid || 0));
  const signIndex = safeFid % SIGNS.length;
  const sign = SIGNS[signIndex];
  const cells = buildCells(safeFid, sign.accent);
  const titleBits = ["North", "Hidden", "Tiny", "Bright", "Wild", "Lucky"];
  const title = `${titleBits[Math.floor(safeFid / 7) % titleBits.length]} ${sign.name}`;

  return {
    title,
    sign: sign.name,
    omen: sign.omen,
    field: sign.field,
    stars: cells.length,
    accent: sign.accent,
    cells,
  };
}

function shareButton(self: string, text = "I mapped my Farcaster constellation on @freeturtle ✨") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: {
      press: {
        action: "compose_cast" as const,
        params: { text, embeds: [self] },
      },
    },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["icon", "title", "intro", "map_btn", "share_btn"],
    },
    icon: {
      type: "icon",
      props: { name: "star", size: "lg" },
    },
    title: {
      type: "text",
      props: { content: "Profile Constellation", weight: "bold", align: "center" },
    },
    intro: {
      type: "text",
      props: {
        content: "Your FID is a little sky chart. Tap once and the wizard draws the stars.",
        size: "sm",
        align: "center",
      },
    },
    map_btn: {
      type: "button",
      props: { label: "Map my stars", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function skyText(cells: Cell[]): string {
  const rows = Array.from({ length: 5 }, () => Array.from({ length: 12 }, () => "·"));
  for (const cell of cells) {
    const row = Math.min(4, Math.floor(cell.row / 2));
    const col = Math.min(11, Math.floor(cell.col / 1.5));
    rows[row][col] = cell.color === "gray" ? "✦" : "★";
  }
  return rows.map((row) => row.join(" ")).join("\n");
}

function resultPage(self: string, fid: number, map: Constellation): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "sky", "badge", "sign", "field", "profile_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: map.title, weight: "bold", align: "center" },
    },
    sky: {
      type: "text",
      props: { content: skyText(map.cells), align: "center" },
    },
    badge: {
      type: "badge",
      props: { label: `${map.stars} stars`, variant: "outline" },
    },
    sign: {
      type: "text",
      props: { content: `${map.sign}: ${map.omen}`, size: "sm" },
    },
    field: {
      type: "text",
      props: { content: `${map.field} · FID ${fid || "unknown"}`, size: "sm" },
    },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: "primary" },
      on: { press: { action: "view_profile", params: { fid } } },
    },
    share_btn: shareButton(self, `My Farcaster constellation is ${map.title}. Yours? ✨`),
  };

  return { version: "1.0", theme: { accent: map.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const fid = ctx.action.fid ?? 0;
  return resultPage(self, fid, makeConstellation(fid));
});

export default app;
