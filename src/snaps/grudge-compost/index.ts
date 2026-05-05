/**
 * grudge-compost — turn a tiny annoyance into emotional mulch.
 *
 * Components: input, toggle_group, slider, switch, badge, progress, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "grudge-compost";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Speed = "slow" | "brisk" | "instant";

type Receipt = {
  title: string;
  badge: string;
  receipt: string;
  action: string;
  compostScore: number;
  accent: Accent;
};

const SPEED_LABELS: Record<Speed, string> = {
  slow: "Slow roast",
  brisk: "Brisk mulch",
  instant: "Instant vapor",
};

const ACTIONS: Record<Speed, readonly string[]> = {
  slow: [
    "Write one dramatic sentence, then delete the adjective doing the most.",
    "Give it a ten-minute window to be annoying. After that, it becomes compost.",
    "Tell one trusted person the boring version. No courtroom exhibits.",
  ],
  brisk: [
    "Take one useful lesson, name one boundary, then go drink water like a champion.",
    "Send the two-sentence version if needed. If not, let the notes app absorb it.",
    "Do one tiny reset: shoulders down, tabs closed, snack acquired.",
  ],
  instant: [
    "Say 'not my circus invoice' and perform a ceremonial app switch.",
    "Mutate it into a shrug. Three breaths. Release the goblin paperwork.",
    "Convert the whole thing into one eye roll and spend the saved energy elsewhere.",
  ],
};

function cleanAnnoyance(value: unknown): string {
  if (typeof value !== "string") return "a mysterious tiny inconvenience";
  return value.replace(/\s+/g, " ").trim().slice(0, 140) || "a mysterious tiny inconvenience";
}

function clampNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function normalizeSpeed(value: unknown): Speed {
  if (value === "slow" || value === "brisk" || value === "instant") return value;
  return "brisk";
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length] ?? items[0];
}

function makeReceipt(annoyance: string, speed: Speed, forgiveness: number, keepReceipt: boolean, fid: number): Receipt {
  const seed = annoyance.split("").reduce((sum, char) => sum + char.charCodeAt(0), fid || 29) + forgiveness * 3 + speed.length * 17 + (keepReceipt ? 41 : 0);
  const speedBonus = speed === "instant" ? 22 : speed === "brisk" ? 12 : 4;
  const receiptTax = keepReceipt ? -9 : 6;
  const compostScore = Math.max(7, Math.min(100, Math.round(forgiveness * 0.68 + speedBonus + receiptTax + (seed % 11))));

  const badge = compostScore > 82 ? "Fully mulched" : compostScore > 58 ? "Mostly soil" : compostScore > 34 ? "Still steaming" : "Petty bonsai";
  const title = compostScore > 82 ? "Grudge Compost Complete" : "Compost Receipt Filed";
  const accent: Accent = compostScore > 82 ? "green" : compostScore > 58 ? "teal" : compostScore > 34 ? "amber" : "purple";
  const verb = keepReceipt ? "archived with tiny footnotes" : "released without preserving exhibits";
  const receipt = `${SPEED_LABELS[speed]} processed: "${annoyance}". Forgiveness at ${forgiveness}%. Grudge ${verb}; usable soil recovered.`;

  return {
    title,
    badge,
    receipt,
    action: pick(ACTIONS[speed], seed),
    compostScore,
    accent,
  };
}

function shareButton(self: string, text = "I fed a tiny grudge to the compost goblin."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share compost", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "annoyance", "speed", "forgiveness", "receipt", "submit_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Grudge Compost\nDrop in one petty annoyance. The goblin returns usable emotional soil.", weight: "bold", align: "center" },
    },
    annoyance: {
      type: "input",
      props: { name: "annoyance", label: "Petty annoyance", placeholder: "someone said circle back", maxLength: 140 },
    },
    speed: {
      type: "toggle_group",
      props: {
        name: "speed",
        label: "Compost speed",
        defaultValue: "brisk",
        options: [
          { label: "Slow roast", value: "slow" },
          { label: "Brisk mulch", value: "brisk" },
          { label: "Instant vapor", value: "instant" },
        ],
      },
    },
    forgiveness: {
      type: "slider",
      props: { name: "forgiveness", label: "Forgiveness level", min: 0, max: 100, step: 5, defaultValue: 45 },
    },
    receipt: { type: "switch", props: { name: "keepReceipt", label: "Keep receipt" } },
    submit_btn: {
      type: "button",
      props: { label: "Compost it", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=compost` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "green" }, ui: { root: "page", elements } };
}

function resultPage(self: string, receipt: Receipt): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "body", "score", "action", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: receipt.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: receipt.badge, variant: "outline" } },
    body: { type: "text", props: { content: receipt.receipt, align: "center" } },
    score: { type: "progress", props: { label: "Compost score", value: receipt.compostScore, max: 100 } },
    action: { type: "text", props: { content: `Tiny next action: ${receipt.action}`, size: "sm", align: "center" } },
    again_btn: {
      type: "button",
      props: { label: "Compost another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, `Grudge Compost verdict: ${receipt.badge}. ${receipt.action}`),
  };

  return {
    version: "2.0",
    theme: { accent: receipt.accent },
    effects: receipt.compostScore > 82 ? ["confetti"] : undefined,
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

    const inputs = ctx.action.inputs ?? {};
    const annoyance = cleanAnnoyance(inputs.annoyance);
    const speed = normalizeSpeed(inputs.speed);
    const forgiveness = clampNumber(inputs.forgiveness, 45);
    const keepReceipt = asBool(inputs.keepReceipt);
    const fid = ctx.action.user.fid;

    return resultPage(self, makeReceipt(annoyance, speed, forgiveness, keepReceipt, fid));
  },
  {
    openGraph: {
      title: "Grudge Compost",
      description: "Turn one petty annoyance into usable emotional soil.",
    },
  },
);

export default app;
