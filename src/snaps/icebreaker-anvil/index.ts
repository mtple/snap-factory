/**
 * icebreaker-anvil — forge three tiny Farcaster conversation starters.
 *
 * Components: input, toggle_group, slider, switch, progress, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "icebreaker-anvil";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Room = "Builders" | "Degens" | "Friends" | "Work";

type StarterResult = {
  title: string;
  badge: string;
  warmth: number;
  accent: Accent;
  starters: [string, string, string];
  note: string;
  confetti: boolean;
};

const ROOMS: Room[] = ["Builders", "Degens", "Friends", "Work"];
const FALLBACK_TOPICS = ["weekend plans", "weird ideas", "favorite tools", "tiny wins", "what to build next"];

const ROOM_BANK: Record<Room, { openers: string[]; angles: string[]; closers: string[]; notes: string[] }> = {
  Builders: {
    openers: ["What tiny version of", "Which annoying part of", "If you had one weekend to improve", "What would make"],
    angles: ["actually shippable", "less haunted by edge cases", "useful to five friends", "easier to explain in one cast"],
    closers: ["before Monday?", "without adding a dashboard?", "with only one button?", "if scope goblins were banned?"],
    notes: ["Builder room: make the ask specific and the answer easy to brag about.", "Good starter. It invites a useful reply without demanding a manifesto.", "The anvil approves: practical, small, and bait for thoughtful builders."],
  },
  Degens: {
    openers: ["What is the least responsible take on", "Which signal around", "If the group chat had to bet vibes on", "What would make you fade"],
    angles: ["before doing research", "while still sleeping tonight", "without summoning a risk goblin", "if the chart wore sunglasses"],
    closers: ["and why?", "with a straight face?", "by exactly 3% more?", "before the candle notices?"],
    notes: ["Degen room: spicy enough to answer, not so spicy it needs a lawyer.", "A little chaos is fine. The kind switch kept the table upright.", "This should get replies from people pretending they are being rational."],
  },
  Friends: {
    openers: ["What is your most unserious opinion about", "What tiny joy did", "If you could rename", "Which version of"],
    angles: ["deserve more snacks", "make the group chat softer", "quietly improve your day", "feel like a secret handshake"],
    closers: ["right now?", "and who would agree?", "without overthinking it?", "in three words?"],
    notes: ["Friend room: warm, replyable, and safe for people who hate homework.", "The best icebreakers feel like passing a note, not assigning an essay.", "Cozy spark detected. This should invite real answers, not just likes."],
  },
  Work: {
    openers: ["What is one polite constraint around", "Which meeting about", "What would make", "If you had to unblock"],
    angles: ["clearer by Friday", "less calendar-shaped", "easier for a new teammate", "survive the next status update"],
    closers: ["with no extra meeting?", "in one sentence?", "before lunch?", "without saying alignment?"],
    notes: ["Work room: professional enough for Slack, weird enough to get an actual answer.", "This starter respects everyone’s calendar, a rare and noble act.", "Meeting goblin contained. Question has agenda-safe sparkle."],
  },
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  return items[(seed + salt * 2654435761) % items.length] ?? items[0];
}

function cleanTopic(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function cleanRoom(raw: unknown): Room {
  const value = String(raw ?? "Builders");
  return ROOMS.includes(value as Room) ? (value as Room) : "Builders";
}

function cleanSpice(raw: unknown): number {
  const parsed = Number(raw ?? 45);
  if (!Number.isFinite(parsed)) return 45;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function isOn(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function fallbackTopic(fid: number): string {
  return pick(FALLBACK_TOPICS, hashText(`${SNAP_NAME}:fallback:${fid || 0}`), 1);
}

function question(topic: string, bank: (typeof ROOM_BANK)[Room], seed: number, salt: number, spicyTail: string): string {
  const opener = pick(bank.openers, seed, salt);
  const angle = pick(bank.angles, seed, salt + 1);
  const closer = pick(bank.closers, seed, salt + 2);
  return `${opener} ${topic} ${angle} ${closer}${spicyTail}`.replace(/\s+/g, " ").slice(0, 180);
}

function buildStarters(topicInput: string, room: Room, spice: number, kind: boolean, fid: number): StarterResult {
  const topic = topicInput || fallbackTopic(fid);
  const seed = hashText([SNAP_NAME, topic.toLowerCase(), room, spice, kind ? "kind" : "sharp", fid || 0].join("|"));
  const bank = ROOM_BANK[room];
  const warmth = Math.max(12, Math.min(99, 82 - Math.round(spice / 4) + (kind ? 16 : 0) + (seed % 15) - 7));
  const heatWord = spice >= 75 ? " with tiny sparks" : spice >= 45 ? "" : " gently";
  const spicyTail = spice >= 82 && !kind ? " Defend your answer." : spice >= 65 ? " Wrong answers welcome." : kind ? " No pressure." : "";
  const accent: Accent = warmth >= 78 ? "green" : spice >= 78 ? "amber" : room === "Work" ? "blue" : room === "Degens" ? "purple" : "teal";

  return {
    title: warmth >= 80 ? "Ice broken cleanly" : spice >= 75 ? "Question has sparks" : "Starter forged",
    badge: warmth >= 80 ? "Warm anvil" : spice >= 75 ? "Spicy but legal" : `${room} room`,
    warmth,
    accent,
    starters: [
      question(topic, bank, seed, 1, heatWord),
      question(topic, bank, seed, 4, spicyTail),
      question(topic, bank, seed, 7, kind ? " Be generous." : " Keep it interesting."),
    ],
    note: pick(bank.notes, seed, 11),
    confetti: warmth >= 92,
  };
}

function shareButton(self: string, text = "Icebreaker Anvil forged me three tiny conversation starters.", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "sub", "topic", "room", "spice", "kind", "buttons"] },
    title: { type: "text", props: { content: "Icebreaker Anvil", weight: "bold", align: "center" } },
    sub: { type: "text", props: { content: "Give the wizard a topic. Get three tiny questions that make a room answer.", size: "sm", align: "center" } },
    topic: { type: "input", props: { name: "topic", label: "Topic", placeholder: "snaps, coffee, AI agents, tiny wins", maxLength: 80 } },
    room: { type: "toggle_group", props: { name: "room", label: "Room", options: ROOMS.map((label) => ({ label, value: label })), defaultValue: "Builders" } },
    spice: { type: "slider", props: { name: "spice", label: "Spice", min: 0, max: 100, step: 5, defaultValue: 45 } },
    kind: { type: "switch", props: { name: "kind", label: "Make it kind", defaultValue: true } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["forge", "share_btn"] },
    forge: { type: "button", props: { label: "Forge questions", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?action=forge` } } } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, result: StarterResult): SnapHandlerResult {
  const shareText = `Icebreaker Anvil forged my room a ${result.warmth}% warm opener. Conversation unlocked.`;
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "meter", "q1", "q2", "q3", "buttons"] },
    title: { type: "text", props: { content: result.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: result.badge, variant: "outline" } },
    meter: { type: "progress", props: { label: "Room warmth", value: result.warmth, max: 100 } },
    q1: { type: "text", props: { content: `1. ${result.starters[0]}`, size: "sm" } },
    q2: { type: "text", props: { content: `2. ${result.starters[1]}`, size: "sm" } },
    q3: { type: "text", props: { content: `3. ${result.starters[2]}`, size: "sm" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: { type: "button", props: { label: "Forge again", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText, "Share starter"),
  };

  return {
    version: "2.0",
    theme: { accent: result.accent },
    ...(result.confetti ? { effects: ["confetti" as const] } : {}),
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const fid = ctx.action.type === "get" ? (ctx.action.user?.fid ?? 0) : ctx.action.user.fid;

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const result = buildStarters(cleanTopic(ctx.action.inputs?.topic), cleanRoom(ctx.action.inputs?.room), cleanSpice(ctx.action.inputs?.spice), isOn(ctx.action.inputs?.kind), fid);
    return resultPage(self, result);
  },
  {
    openGraph: {
      title: "Icebreaker Anvil",
      description: "Forge three tiny conversation starters for builders, friends, work, or degen rooms.",
    },
  },
);

export default app;
