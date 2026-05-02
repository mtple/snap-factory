/**
 * tiny-quest — turn a vague day into one tiny next move.
 *
 * Components: toggle_group, slider, switch, progress, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "tiny-quest";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Quest = {
  title: string;
  badge: string;
  move: string;
  why: string;
  readiness: number;
  accent: Accent;
};

const focusMoves = [
  "Write the ugly first sentence. Stop after 2 minutes if you want.",
  "Close every tab except the one that moves this forward.",
  "Make a three-bullet plan: now, next, not today.",
];

const messageMoves = [
  "Send the smallest honest reply: one sentence, no essay.",
  "Draft the message in notes first, then remove 30% of the words.",
  "Ask the one clarifying question that would unblock the thread.",
];

const choreMoves = [
  "Clear one visible surface. No organizing mythology allowed.",
  "Set a 5-minute timer and do the loudest annoying chore first.",
  "Put ten things back where they belong. Count out loud like a goblin.",
];

const bodyMoves = [
  "Drink water, step outside, and look at something farther than your phone.",
  "Do one reset lap: stand up, stretch, breathe, return with lower drama.",
  "Eat the easiest real food available. Victory can be a sandwich.",
];

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function numberInput(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function stringInput(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function buildQuest(area: string, energy: number, chaos: boolean, fid: number): Quest {
  const pools: Record<string, { title: string; badge: string; moves: string[]; accent: Accent }> = {
    focus: { title: "Focus Quest", badge: "Deep-ish work", moves: focusMoves, accent: "blue" },
    message: { title: "Reply Quest", badge: "Inbox goblin", moves: messageMoves, accent: "purple" },
    chore: { title: "Chore Quest", badge: "Tiny reset", moves: choreMoves, accent: "green" },
    body: { title: "Human Quest", badge: "Body check", moves: bodyMoves, accent: "teal" },
  };
  const picked = pools[area] ?? pools.focus;
  const index = Math.abs((fid || 0) + energy + (chaos ? 7 : 0)) % picked.moves.length;
  const low = energy < 35;
  const high = energy > 74;
  const move = picked.moves[index];
  const readiness = chaos ? Math.max(12, Math.min(92, energy - 8)) : Math.max(18, Math.min(98, energy + 10));

  return {
    title: picked.title,
    badge: high ? "Send it" : low ? "Low-power mode" : picked.badge,
    move: chaos ? `${move} Then delete one unnecessary step.` : move,
    why: low
      ? "Designed for minimum battery: make contact with the task, not a heroic comeback."
      : high
        ? "You have enough charge. Use it before your brain opens a side quest."
        : "Small enough to start, specific enough to count. That is the whole trick.",
    readiness,
    accent: picked.accent,
  };
}

function shareButton(self: string, text = "Tiny Quest gave me one next move") {
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
      children: ["title", "sub", "area", "energy", "chaos", "go", "share_btn"],
    },
    title: { type: "text", props: { content: "Tiny Quest", weight: "bold", align: "center" } },
    sub: {
      type: "text",
      props: { content: "Pick the stuck zone. Get one tiny next move. No lore dump.", size: "sm", align: "center" },
    },
    area: {
      type: "toggle_group",
      props: {
        name: "area",
        label: "What needs a nudge?",
        defaultValue: "focus",
        options: [
          { label: "Focus", value: "focus" },
          { label: "Message", value: "message" },
          { label: "Chore", value: "chore" },
          { label: "Body", value: "body" },
        ],
      },
    },
    energy: { type: "slider", props: { name: "energy", label: "Current battery", min: 0, max: 100, step: 5, defaultValue: 50 } },
    chaos: { type: "switch", props: { name: "chaos", label: "Too many side quests" } },
    go: { type: "button", props: { label: "Give me a quest", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, quest: Quest): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "move", "ready", "why", "again", "share_btn"],
    },
    title: { type: "text", props: { content: quest.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: quest.badge, variant: "outline" } },
    move: { type: "text", props: { content: quest.move, align: "center" } },
    ready: { type: "progress", props: { label: "Startability", value: quest.readiness, max: 100 } },
    why: { type: "text", props: { content: quest.why, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "Reroll quest", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, `Tiny Quest assigned me: ${quest.move}`),
  };

  return { version: "1.0", theme: { accent: quest.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const inputs = ctx.action.inputs ?? {};
  const area = stringInput(inputs.area, "focus");
  const energy = numberInput(inputs.energy, 50);
  const chaos = asBool(inputs.chaos);

  return resultPage(self, buildQuest(area, energy, chaos, ctx.action.user?.fid ?? 0));
});

export default app;
