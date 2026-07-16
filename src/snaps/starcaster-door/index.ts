/**
 * starcaster-door — hull-breach mini game: tap one ship door and survive or meet the void.
 *
 * Components: text, badge, cell_grid, progress, button, stack
 * Actions: submit, compose_cast
 * State: stateless, per-FID daily door selection
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "starcaster-door";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type DoorCell = { row: number; col: number; color: Accent; content: string; value: string };

const DOORS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
const SAFE_LINES = [
  "Pressure seal holds. You slip through with your helmet only lightly haunted.",
  "Good hatch. The corridor smells like ozone, snacks, and excellent instincts.",
  "You found the maintenance crawlspace. Starcaster lives to cast again.",
  "Clean choice. The void knocks politely and you decline the meeting.",
];
const VOID_LINES = [
  "Wrong hatch. The void gives you a tiny onboarding packet.",
  "Hull breach confirmed. Your last thought is: at least the UI was clear.",
  "That door was decorative in the worst possible way: space was behind it.",
  "You opened directly into premium vacuum. Five stars, would not repeat.",
];

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

function safeDoorFor(fid: number, date = todayKey()): number {
  return hashText(`starcaster-door:${fid || "anon"}:${date}`) % DOORS.length;
}

function cleanDoor(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  const byLabel = DOORS.indexOf(text.toUpperCase());
  if (byLabel >= 0) return byLabel;
  const numeric = Number(text);
  return Number.isInteger(numeric) && numeric >= 0 && numeric < DOORS.length ? numeric : null;
}

function doorCells(reveal?: { picked: number | null; safe: number }): DoorCell[] {
  return DOORS.map((label, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const picked = reveal?.picked === index;
    const safe = reveal?.safe === index;
    const color: Accent = reveal
      ? safe
        ? "green"
        : picked
          ? "red"
          : (index + row) % 2 === 0
            ? "gray"
            : "blue"
      : (index + row) % 3 === 0
        ? "purple"
        : (index + col) % 2 === 0
          ? "blue"
          : "gray";
    const content = reveal ? (safe ? "SAFE" : picked ? "VOID" : label) : label;
    return { row, col, color, content, value: label };
  });
}

function shareButton(self: string, text = "I tried Starcaster Door: nine hatches, one safe route, very opinionated vacuum. 🚪") {
  return {
    type: "button" as const,
    props: { label: "Share run", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "hint", "grid", "share_btn"],
    },
    title: { type: "text", props: { content: "Starcaster Door", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Hull breach. Nine doors. One route keeps pressure. Tap a labeled hatch to choose your escape.", size: "sm", align: "center" },
    },
    hint: { type: "badge", props: { label: "Daily per FID", variant: "outline" } },
    grid: {
      type: "cell_grid",
      props: { name: "door", cols: 3, rows: 3, rowHeight: 46, cellAspectRatio: "square", cells: doorCells() },
      on: { press: { action: "submit", params: { target: `${self}?action=choose` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, fid: number, picked: number | null): SnapHandlerResult {
  const safe = safeDoorFor(fid);
  const survived = picked === safe;
  const label = picked === null ? "no hatch" : DOORS[picked];
  const seed = hashText(`${fid}:${picked ?? "none"}:${safe}:${todayKey()}`);
  const line = survived ? SAFE_LINES[seed % SAFE_LINES.length] : VOID_LINES[seed % VOID_LINES.length];
  const pressure = survived ? 100 : picked === null ? 12 : 24 + ((Math.abs((picked ?? 0) - safe) * 11) % 30);
  const status = survived
    ? `Survived through ${label}. Safe door: ${DOORS[safe]}.`
    : `You picked ${label}. Safe door was ${DOORS[safe]}.`;
  const shareText = survived
    ? `I survived Starcaster Door through hatch ${label}. The void can wait.`
    : `I picked ${label} in Starcaster Door and got gently introduced to space.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "pressure", "result", "again", "share_btn"],
    },
    title: { type: "text", props: { content: survived ? "Pressure restored" : "Airlock incident", weight: "bold", align: "center" } },
    pressure: { type: "progress", props: { label: survived ? "Survived pressure" : "Cabin pressure", value: pressure, max: 100 } },
    result: { type: "text", props: { content: `${status}\n${line}`, size: "sm", align: "center" } },
    again: {
      type: "button",
      props: { label: "Run again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return {
    version: "2.0",
    theme: { accent: survived ? "green" : "red" },
    effects: survived ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const fid = ctx.action.user.fid;
    const picked = cleanDoor(ctx.action.inputs?.door ?? ctx.action.inputs?.cell ?? ctx.action.inputs?.grid_tap);
    return resultPage(self, fid, picked);
  },
  {
    openGraph: {
      title: "Starcaster Door",
      description: "Hull breach mini game: tap one hatch, dodge the void, and see if Starcaster survives.",
    },
  },
);

export default app;
