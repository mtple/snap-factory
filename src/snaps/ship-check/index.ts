/**
 * ship-check — daily Farcaster builder poll.
 *
 * GET: Show today's shipping modes with live counts and a picker.
 * POST: Record one daily vote in Turso and show the crowd split.
 *
 * Components: text, badge, toggle_group, bar_chart, separator, button
 * Actions: submit, compose_cast
 * State: Turso KV (ship-check:YYYY-MM-DD:option-N)
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "ship-check";

type Elements = Record<string, SnapElementInput>;
type AccentColor = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

const OPTIONS = [
  { label: "Code", share: "code", color: "blue" },
  { label: "Writing", share: "writing", color: "purple" },
  { label: "Design", share: "design", color: "pink" },
  { label: "Ops", share: "ops", color: "amber" },
  { label: "Tiny win", share: "a tiny win", color: "green" },
] as const;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionKey(index: number): string {
  return `ship-check:${todayKey()}:option-${index}`;
}

async function getCounts(): Promise<number[]> {
  const values = await Promise.all(OPTIONS.map((_, index) => store.get(optionKey(index))));
  return values.map((value) => (typeof value === "number" ? value : 0));
}

function findChoiceIndex(value: unknown): number {
  if (typeof value !== "string") return 4;
  const index = OPTIONS.findIndex((option) => option.label === value);
  return index >= 0 ? index : 4;
}

function buildBars(counts: number[], highlightIndex?: number) {
  return OPTIONS.map((option, index) => ({
    label: option.label,
    value: counts[index] ?? 0,
    ...(highlightIndex === index ? { color: option.color as AccentColor } : {}),
  }));
}

function shareButton(self: string, text: string, label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text,
          embeds: [self],
        },
      },
    },
  };
}

function renderForm(self: string, counts: number[]): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "subtitle", "chart", "count", "picker", "submit_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Ship Check", weight: "bold", align: "center" },
    },
    subtitle: {
      type: "text",
      props: {
        content: "What are you shipping today? Pick a lane and see where Farcaster is working.",
        size: "sm",
        align: "center",
      },
    },
    chart: {
      type: "bar_chart",
      props: { bars: buildBars(counts) },
    },
    count: {
      type: "text",
      props: {
        content: total > 0 ? `${total} builder${total === 1 ? "" : "s"} checked in today` : "No check-ins yet — claim first ship.",
        size: "sm",
      },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "ship",
        label: "Today's ship mode",
        options: OPTIONS.map((option) => option.label),
        orientation: "vertical",
        variant: "outline",
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Log my ship", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: self },
        },
      },
    },
    share_btn: shareButton(self, "daily ship check: what are you building today? 🛠️"),
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: { root: "page", elements },
  };
}

function renderResult(self: string, counts: number[], choiceIndex: number): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const option = OPTIONS[choiceIndex] ?? OPTIONS[4];
  const same = counts[choiceIndex] ?? 0;
  const pct = total > 0 ? Math.round((same / total) * 100) : 100;
  const shareText = `my ship mode today: ${option.share}. ${pct}% of farcaster is in the same lane 🛠️`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "chart", "total", "sep", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "You're on the board", weight: "bold", align: "center" },
    },
    badge: {
      type: "badge",
      props: { label: option.label, color: option.color as AccentColor, variant: "outline" },
    },
    chart: {
      type: "bar_chart",
      props: { bars: buildBars(counts, choiceIndex) },
    },
    total: {
      type: "text",
      props: {
        content: `${total} check-in${total === 1 ? "" : "s"} today — ${pct}% picked ${option.label}. New board tomorrow.`,
        size: "sm",
      },
    },
    sep: { type: "separator", props: {} },
    share_btn: shareButton(self, shareText, "Share my ship"),
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    effects: ["confetti"],
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return renderForm(self, await getCounts());
  }

  const choiceIndex = findChoiceIndex(ctx.action.inputs?.ship);
  const current = await store.get(optionKey(choiceIndex));
  await store.set(optionKey(choiceIndex), (typeof current === "number" ? current : 0) + 1);

  return renderResult(self, await getCounts(), choiceIndex);
});

export default app;
