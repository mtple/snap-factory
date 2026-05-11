/**
 * cast-time-capsule — seal a tiny cast-sized note for future-you.
 *
 * Components: input, toggle_group, switch, progress, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "cast-time-capsule";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Reopen = "Tomorrow" | "Next week" | "Next month" | "Someday";

type Capsule = {
  note: string;
  reopen: Reopen;
  dare: boolean;
  sealCode: string;
  pressure: number;
  badge: string;
  receipt: string;
  dareLine: string;
  accent: Accent;
};

const REOPEN_OPTIONS: Reopen[] = ["Tomorrow", "Next week", "Next month", "Someday"];
const FALLBACK_NOTES = ["ship the tiny thing", "reply with courage", "drink water", "close one tab", "trust the bit"];

const RECEIPTS: Record<Reopen, string[]> = {
  Tomorrow: [
    "Filed in the overnight drawer. Future-you gets one business goblin to help.",
    "Sealed until tomorrow, when the note will pretend it was always obvious.",
    "The capsule is sitting by the door with shoes on. Very punctual.",
  ],
  "Next week": [
    "Archived in the seven-day fog bank. Expect mild clarity and one suspicious spreadsheet.",
    "Sealed for next week. The note has packed snacks and a tiny agenda.",
    "Future-you will find this exactly when the thread has become folklore.",
  ],
  "Next month": [
    "Buried under a lunar filing cabinet. The seal smells faintly like momentum.",
    "Stored for next month, where all urgent things become either wisdom or clutter.",
    "The capsule has entered calendar orbit. Do not tap the glass.",
  ],
  Someday: [
    "Launched into the vague horizon. Someday-you has been notified spiritually.",
    "Sealed for the mythical later. A wizard stamped it with plausible optimism.",
    "Filed in the archive of future lore, between ambition and snacks.",
  ],
};

const DARES: Record<Reopen, string[]> = {
  Tomorrow: ["Tiny dare: do the first two minutes before opening the timeline.", "Tiny dare: send one sincere check-in before noon."],
  "Next week": ["Tiny dare: delete one stale obligation and keep the good part.", "Tiny dare: ship the ugly first draft on purpose."],
  "Next month": ["Tiny dare: reread this and remove one recurring annoyance.", "Tiny dare: make one plan smaller, then actually do it."],
  Someday: ["Tiny dare: thank past-you for trying. Corny but legally binding.", "Tiny dare: turn this note into a story, not a TODO."],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanNote(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function cleanReopen(raw: unknown): Reopen {
  const value = String(raw ?? "Next week");
  return REOPEN_OPTIONS.includes(value as Reopen) ? (value as Reopen) : "Next week";
}

function isOn(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function pick<T>(items: T[], seed: number, salt: number): T {
  return items[(seed + salt * 2654435761) % items.length];
}

function sealCode(seed: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = seed || 1;
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    value = Math.imul(value ^ (i + 17), 1103515245) >>> 0;
    code += alphabet[value % alphabet.length];
  }
  return code;
}

function buildCapsule(noteInput: string, reopen: Reopen, dare: boolean, fid: number): Capsule {
  const seedNote = noteInput || pick(FALLBACK_NOTES, hashText(`${fid}:fallback`), 1);
  const seed = hashText([SNAP_NAME, seedNote, reopen, dare ? "dare" : "plain", fid || 0].join("|"));
  const pressureBase = reopen === "Tomorrow" ? 78 : reopen === "Next week" ? 62 : reopen === "Next month" ? 44 : 27;
  const pressure = Math.max(9, Math.min(99, pressureBase + (seed % 17) - 8 + (dare ? 7 : 0)));
  const badge = pressure >= 75 ? "Urgent little comet" : pressure >= 50 ? "Respectable future ping" : "Slow-blooming lore";
  const accent: Accent = pressure >= 75 ? "amber" : reopen === "Someday" ? "purple" : "teal";
  const receipt = pick(RECEIPTS[reopen], seed, 2);
  const dareLine = dare ? pick(DARES[reopen], seed, 3) : "No dare included. Future-you receives only the note and a tiny dramatic nod.";

  return { note: seedNote, reopen, dare, sealCode: sealCode(seed), pressure, badge, receipt, dareLine, accent };
}

function shareButton(self: string, text = "I sealed a tiny Cast Time Capsule for future-me. 🕰️", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "sub", "note", "reopen", "dare", "buttons"] },
    title: { type: "text", props: { content: "Cast Time Capsule", weight: "bold", align: "center" } },
    sub: { type: "text", props: { content: "Write a tiny note to future-you. The wizard seals it with fake paperwork and real momentum.", size: "sm", align: "center" } },
    note: { type: "input", props: { name: "note", label: "Note to future-you", placeholder: "remember the thing you meant", maxLength: 120 } },
    reopen: { type: "toggle_group", props: { name: "reopen", label: "Reopen when?", options: REOPEN_OPTIONS.map((label) => ({ label, value: label })), defaultValue: "Next week" } },
    dare: { type: "switch", props: { name: "dare", label: "Add a tiny dare" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["seal", "share_btn"] },
    seal: { type: "button", props: { label: "Seal capsule", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?seal=1` } } } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, capsule: Capsule): SnapHandlerResult {
  const shareText = `I sealed a Cast Time Capsule for ${capsule.reopen.toLowerCase()}. Seal ${capsule.sealCode}; future-me has paperwork.`;
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "meter", "note", "receipt", "dare", "buttons"] },
    title: { type: "text", props: { content: `Sealed: ${capsule.sealCode}`, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: capsule.badge, variant: "outline" } },
    meter: { type: "progress", props: { label: `${capsule.reopen} pressure`, value: capsule.pressure, max: 100 } },
    note: { type: "text", props: { content: `Inside: “${capsule.note}”`, align: "center" } },
    receipt: { type: "text", props: { content: capsule.receipt, size: "sm", align: "center" } },
    dare: { type: "text", props: { content: capsule.dareLine, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: { type: "button", props: { label: "Seal another", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText, "Share capsule"),
  };

  return {
    version: "2.0",
    theme: { accent: capsule.accent },
    ...(capsule.dare || capsule.pressure >= 85 ? { effects: ["confetti" as const] } : {}),
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

    return resultPage(self, buildCapsule(cleanNote(ctx.action.inputs?.note), cleanReopen(ctx.action.inputs?.reopen), isOn(ctx.action.inputs?.dare), fid));
  },
  {
    openGraph: {
      title: "Cast Time Capsule",
      description: "Seal a tiny note to future-you with a wizard receipt, a reopen date, and optional dare.",
    },
  },
);

export default app;
