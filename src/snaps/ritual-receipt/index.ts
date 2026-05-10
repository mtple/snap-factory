/**
 * ritual-receipt — playful personal productivity receipt printer.
 *
 * Components: text, input, slider, toggle_group, badge, progress, separator, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "ritual-receipt";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Mode = "Gentle" | "Dramatic" | "Goblin";

type Receipt = {
  title: string;
  badge: string;
  cleaned: string;
  toll: string;
  nextMove: string;
  minutes: number;
  confidence: number;
  accent: Accent;
  share: string;
};

const MODES: Mode[] = ["Gentle", "Dramatic", "Goblin"];

const NEXT_MOVES: Record<Mode, readonly string[]> = {
  Gentle: [
    "Open the thing, name the next two minutes, and stop before it becomes a personality test.",
    "Make the first visible dent. A polite dent still counts.",
    "Send future-you one breadcrumb: file, tab, sentence, or tiny checklist item.",
  ],
  Dramatic: [
    "Announce the villain, set a ten-minute timer, and duel only the first paragraph.",
    "Cut one requirement with a ceremonial butter knife. The kingdom will survive.",
    "Do the opening move like cameras are rolling and the soundtrack is mostly sighing.",
  ],
  Goblin: [
    "Do the ugliest useful version. No polish goblins allowed near the controls.",
    "Bribe yourself with water, a stretch, and one forbidden checkbox.",
    "Start in the wrong order on purpose. Chaos may invoice you later.",
  ],
};

const TOLLS: Record<Mode, readonly string[]> = {
  Gentle: ["one deep breath", "one tab closed", "three sips of water"],
  Dramatic: ["one heroic sigh", "a tiny cape flourish", "one overbuilt excuse"],
  Goblin: ["two crumbs", "a suspicious sticker", "one pocket lint tribute"],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanTask(value: unknown): string {
  if (typeof value !== "string") return "the dodged task";
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 88) : "the dodged task";
}

function cleanEffort(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? "5"), 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(10, Math.max(1, parsed));
}

function cleanMode(value: unknown): Mode {
  return MODES.includes(value as Mode) ? (value as Mode) : "Gentle";
}

function receiptFor(task: string, effort: number, mode: Mode, fid: number): Receipt {
  const seed = hashText(`${task}:${effort}:${mode}:${fid || "anon"}`);
  const nextMove = NEXT_MOVES[mode][seed % NEXT_MOVES[mode].length] ?? NEXT_MOVES[mode][0];
  const toll = TOLLS[mode][seed % TOLLS[mode].length] ?? TOLLS[mode][0];
  const minutes = Math.max(2, Math.min(25, 3 + effort * 2 + (seed % 5) - (mode === "Goblin" ? 2 : 0)));
  const confidence = Math.min(97, 48 + effort * 5 + (mode === "Dramatic" ? 7 : mode === "Goblin" ? 3 : 0) + (seed % 8));
  const accent: Accent = mode === "Gentle" ? "teal" : mode === "Dramatic" ? "purple" : "amber";
  const badge = mode === "Gentle" ? "Soft launch approved" : mode === "Dramatic" ? "Quest formally declared" : "Goblin permit issued";

  return {
    title: `${mode} ritual receipt`,
    badge,
    cleaned: `RECEIPT: “${task}” has been reduced from vague dread to one payable action.`,
    toll: `Toll collected: ${toll}. Effort filed at ${effort}/10.`,
    nextMove,
    minutes,
    confidence,
    accent,
    share: `I printed a ${mode.toLowerCase()} ritual receipt for “${task}.” Tiny next move paid in full. 🧾`,
  };
}

function shareButton(self: string, text = "Print a tiny ritual receipt for the task you keep dodging. 🧾", label = "Share receipt"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderForm(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "task", "effort", "mode", "print_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Ritual Receipt", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Feed the printer one task you keep dodging. It returns a tiny official next move.",
        size: "sm",
        align: "center",
      },
    },
    task: {
      type: "input",
      props: { name: "task", label: "Dodged task", placeholder: "reply, invoice, laundry, scary email...", maxLength: 110 },
    },
    effort: { type: "slider", props: { name: "effort", label: "Effort available", min: 1, max: 10, step: 1, defaultValue: 5 } },
    mode: {
      type: "toggle_group",
      props: {
        name: "mode",
        label: "Printer mode",
        options: MODES.map((label) => ({ label, value: label })),
        defaultValue: "Gentle",
        variant: "outline",
      },
    },
    print_btn: {
      type: "button",
      props: { label: "Print receipt", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=print` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function renderResult(self: string, receipt: Receipt): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "cleaned", "confidence", "details", "buttons"],
    },
    title: { type: "text", props: { content: receipt.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: receipt.badge, variant: "outline" } },
    cleaned: { type: "text", props: { content: receipt.cleaned, size: "sm", align: "center" } },
    confidence: { type: "progress", props: { label: "Printer confidence", value: receipt.confidence, max: 100 } },
    details: {
      type: "text",
      props: { content: `${receipt.toll}\nETA: ${receipt.minutes} minutes.\nNext move: ${receipt.nextMove}`, size: "sm", align: "center" },
    },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm", equalWidth: true }, children: ["again_btn", "share_btn"] },
    again_btn: {
      type: "button",
      props: { label: "Print another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, receipt.share, "Share ritual"),
  };

  return { version: "2.0", theme: { accent: receipt.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderForm(self);
    }

    const task = cleanTask(ctx.action.inputs?.task);
    const effort = cleanEffort(ctx.action.inputs?.effort);
    const mode = cleanMode(ctx.action.inputs?.mode);
    const fid = ctx.action.user.fid;
    return renderResult(self, receiptFor(task, effort, mode, fid));
  },
  {
    openGraph: {
      title: "Ritual Receipt",
      description: "Print one tiny official next move for the task you keep dodging.",
    },
  },
);

export default app;
