/**
 * tab-tamer — a tiny productivity utility for closing the browser swamp.
 *
 * Components: input, slider, switch, progress, bar_chart, badge, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "tab-tamer";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Bar = { label: string; value: number };

type TamingPlan = {
  title: string;
  badge: string;
  accent: Accent;
  score: number;
  plan: string;
  bars: Bar[];
  shareText: string;
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cleanTask(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return raw.replace(/\s+/g, " ").trim().slice(0, 52) || "the browser swamp";
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildPlan(task: string, tabs: number, minutes: number, deadline: boolean, fid: number): TamingPlan {
  const seed = hashText(`${task}|${tabs}|${minutes}|${deadline ? 1 : 0}|${fid || 0}`);
  const pressure = Math.min(40, Math.round(tabs * 0.7)) + (deadline ? 18 : 0);
  const room = Math.min(35, Math.round(minutes * 0.55));
  const score = Math.max(7, Math.min(100, 58 + room - pressure + (seed % 13)));
  const keep = Math.max(1, Math.min(8, Math.round(Math.sqrt(tabs || 1)) + (deadline ? 1 : 0)));
  const doNow = deadline ? Math.max(1, Math.min(4, Math.ceil(minutes / 18))) : Math.max(1, Math.min(3, Math.ceil(minutes / 25)));
  const close = Math.max(0, tabs - keep - doNow);

  const modes = [
    { title: "Gentle tab compost", badge: "Soft reset", accent: "green" as Accent, opener: "Close anything opened for guilt, not action." },
    { title: "Focus goblin treaty", badge: "Goblin managed", accent: "purple" as Accent, opener: "Give the chaos one tiny job and a short leash." },
    { title: "Browser exorcism", badge: "Tabs banished", accent: "amber" as Accent, opener: "No mercy for duplicate docs, stale carts, or maybe-laters." },
  ];
  const mode = deadline ? modes[2] : (modes[seed % modes.length] ?? modes[0]);
  const plan = [
    `1. Keep ${keep} tabs: only what helps ${task}.`,
    `2. Close ${close} tabs. ${mode.opener}`,
    `3. Work ${minutes} min, then write the next action in one sentence.`,
  ].join("\n");
  const shareText = `Tab Tamer gave me ${score}% focus for ${task}.\nKeep ${keep}, close ${close}, do ${doNow} now.`;

  return {
    title: mode.title,
    badge: mode.badge,
    accent: score >= 72 ? "teal" : mode.accent,
    score,
    plan,
    bars: [
      { label: "Keep", value: keep },
      { label: "Close", value: Math.max(1, close) },
      { label: "Do now", value: doNow },
    ],
    shareText,
  };
}

function shareButton(self: string, text = "I found a tiny Tab Tamer on @freeturtle") {
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
      children: ["title", "intro", "task", "tabs", "minutes", "deadline", "actions"],
    },
    title: { type: "text", props: { content: "Tab Tamer", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Turn browser chaos into a tiny close/keep/do-now plan.", size: "sm", align: "center" },
    },
    task: {
      type: "input",
      props: { name: "task", label: "What are the tabs about?", placeholder: "Launch notes, taxes, rabbit hole…", maxLength: 80 },
    },
    tabs: { type: "slider", props: { name: "tabs", label: "Open tabs", min: 0, max: 50, step: 1, defaultValue: 18 } },
    minutes: { type: "slider", props: { name: "minutes", label: "Focus minutes", min: 5, max: 60, step: 5, defaultValue: 25 } },
    deadline: { type: "switch", props: { name: "deadline", label: "Deadline is today" } },
    tame: {
      type: "button",
      props: { label: "Tame my tabs", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=tame` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["tame", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, plan: TamingPlan): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "focus", "chart", "plan", "buttons", "share_btn"],
    },
    title: { type: "text", props: { content: plan.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: plan.badge, variant: "outline" } },
    focus: { type: "progress", props: { label: `Focus odds: ${plan.score}%`, value: plan.score, max: 100, color: plan.accent } },
    chart: { type: "bar_chart", props: { bars: plan.bars, color: plan.accent } },
    plan: { type: "text", props: { content: plan.plan, size: "sm" } },
    again: {
      type: "button",
      props: { label: "Try again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    post: {
      type: "button",
      props: { label: "Share plan", variant: "primary" },
      on: { press: { action: "compose_cast", params: { text: plan.shareText, embeds: [self] } } },
    },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "post"] },
    share_btn: shareButton(self, plan.shareText),
  };

  return { version: "2.0", theme: { accent: plan.accent }, ui: { root: "page", elements } };
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
    const task = cleanTask(inputs.task);
    const tabs = clampNumber(inputs.tabs, 18, 0, 50);
    const minutes = clampNumber(inputs.minutes, 25, 5, 60);
    const deadline = asBool(inputs.deadline);
    const fid = ctx.action.user?.fid ?? 0;

    return resultPage(self, buildPlan(task, tabs, minutes, deadline, fid));
  },
  {
    openGraph: {
      title: "Tab Tamer",
      description: "A tiny productivity snap that turns browser chaos into a close/keep/do-now plan.",
    },
  },
);

export default app;
