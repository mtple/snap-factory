/**
 * daily-pulse — community energy tracker.
 *
 * Drag a slider to show how you're feeling today (0–100). See where
 * everyone else on Farcaster lands, via a live bar_chart. State resets
 * naturally each day through date-keyed Turso keys.
 *
 * GET:  Slider + today's community distribution + Submit.
 * POST: Record bucket, show updated chart with your zone highlighted.
 *
 * Components: text, slider, bar_chart, badge, separator, button, stack
 * Actions:    submit, compose_cast
 * State:      Turso KV (daily-pulse:YYYY-MM-DD:bucket-N)
 * Accent:     teal
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "daily-pulse";
const store = createTursoDataStore();

type Elements = Record<string, SnapElementInput>;

// ── Buckets ───────────────────────────────────────────────────────────────────

const BUCKETS = [
  { label: "Running on empty", min: 0, max: 19 },
  { label: "Moving slow", min: 20, max: 39 },
  { label: "Steady", min: 40, max: 59 },
  { label: "Cooking", min: 60, max: 79 },
  { label: "Full send", min: 80, max: 100 },
] as const;

function getBucketIndex(value: number): number {
  const idx = BUCKETS.findIndex((b) => value >= b.min && value <= b.max);
  return idx >= 0 ? idx : 2; // fallback: Steady
}

// ── Turso helpers ─────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function bucketStoreKey(bucketIdx: number): string {
  return `daily-pulse:${todayKey()}:bucket-${bucketIdx}`;
}

async function getCounts(): Promise<number[]> {
  const counts: number[] = [];
  for (let i = 0; i < BUCKETS.length; i++) {
    const val = await store.get(bucketStoreKey(i));
    counts.push(typeof val === "number" ? val : 0);
  }
  return counts;
}

// ── Bar chart builder ─────────────────────────────────────────────────────────

type AccentColor = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

function buildBars(
  counts: number[],
  highlightIdx?: number,
): Array<{ label: string; value: number; color?: AccentColor }> {
  return BUCKETS.map((b, i) => ({
    label: b.label,
    value: counts[i],
    ...(i === highlightIdx ? { color: "teal" as AccentColor } : {}),
  }));
}

// ── Page renderers ────────────────────────────────────────────────────────────

function renderFormPage(self: string, counts: number[]): SnapHandlerResult {
  const total = counts.reduce((a, b) => a + b, 0);
  const bars = buildBars(counts);

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "subtitle", "chart", "count_text", "sep", "energy_slider", "submit_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Daily Pulse", weight: "bold" },
    },
    subtitle: {
      type: "text",
      props: { content: "How's your energy today? Drag to set your level.", size: "sm" },
    },
    chart: {
      type: "bar_chart",
      props: { bars },
    },
    count_text: {
      type: "text",
      props: {
        content: total > 0
          ? `${total} check-in${total !== 1 ? "s" : ""} so far today`
          : "No check-ins yet — be the first.",
        size: "sm",
      },
    },
    sep: { type: "separator", props: {} },
    energy_slider: {
      type: "slider",
      props: {
        name: "energy",
        label: "Your energy level",
        min: 0,
        max: 100,
        step: 1,
        defaultValue: 50,
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Log my energy", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: self },
        },
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: "tracking daily energy on farcaster — where are you at today?",
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: { root: "page", elements },
  };
}

function renderResultPage(
  self: string,
  counts: number[],
  bucketIdx: number,
): SnapHandlerResult {
  const bucket = BUCKETS[bucketIdx];
  const total = counts.reduce((a, b) => a + b, 0);
  const pct = total > 0 ? Math.round((counts[bucketIdx] / total) * 100) : 100;
  const bars = buildBars(counts, bucketIdx);

  const shareText =
    `my energy today: "${bucket.label}" — ${pct}% of farcaster is in the same zone 🐢`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge_el", "chart", "count_text", "sep", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Today's energy breakdown", weight: "bold" },
    },
    badge_el: {
      type: "badge",
      props: { label: bucket.label, variant: "default", color: "teal" },
    },
    chart: {
      type: "bar_chart",
      props: { bars },
    },
    count_text: {
      type: "text",
      props: {
        content: `${total} check-in${total !== 1 ? "s" : ""} today — ${pct}% in your zone`,
        size: "sm",
      },
    },
    sep: { type: "separator", props: {} },
    share_btn: {
      type: "button",
      props: { label: "Share my pulse", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: shareText,
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    const counts = await getCounts();
    return renderFormPage(self, counts);
  }

  // POST — parse slider value and record
  const inputs = ctx.action.inputs ?? {};
  const rawEnergy = inputs["energy"];
  const energyValue =
    typeof rawEnergy === "number"
      ? Math.max(0, Math.min(100, Math.round(rawEnergy)))
      : 50;

  const bucketIdx = getBucketIndex(energyValue);

  // Increment bucket count
  const current = await store.get(bucketStoreKey(bucketIdx));
  const next = (typeof current === "number" ? current : 0) + 1;
  await store.set(bucketStoreKey(bucketIdx), next);

  const counts = await getCounts();
  return renderResultPage(self, counts, bucketIdx);
});

export default app;
