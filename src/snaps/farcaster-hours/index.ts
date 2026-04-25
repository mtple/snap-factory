/**
 * farcaster-hours — When does Farcaster wake up?
 *
 * GET:  Slider (0-23 = midnight to 11pm). Tap Submit to log your local hour.
 * POST: Store the vote (once per FID), show a bar chart of 6 four-hour
 *       buckets revealing when the community is online.
 *
 * This is a persistent community survey — data accumulates over time.
 * No daily reset; the chart reflects all-time submissions.
 *
 * Components: slider, bar_chart, badge, text, button, separator
 * Actions:    submit, compose_cast
 * State:      Turso KV (per-hour tallies + per-FID dedup)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP = "farcaster-hours";

// Six 4-hour buckets. Labels must be ≤40 chars.
const BUCKETS = [
  { label: "12am – 4am", hours: [0, 1, 2, 3] },
  { label: "4am – 8am",  hours: [4, 5, 6, 7] },
  { label: "8am – 12pm", hours: [8, 9, 10, 11] },
  { label: "12pm – 4pm", hours: [12, 13, 14, 15] },
  { label: "4pm – 8pm",  hours: [16, 17, 18, 19] },
  { label: "8pm – 12am", hours: [20, 21, 22, 23] },
];

const COLORS = ["gray", "blue", "green", "teal", "teal", "blue"] as const;

function hourKey(h: number) {
  return `${SNAP}:h:${h}`;
}

function fidKey(fid: number) {
  return `${SNAP}:fid:${fid}`;
}

async function loadBucketCounts(): Promise<number[]> {
  const allHours = await Promise.all(
    Array.from({ length: 24 }, (_, i) => store.get(hourKey(i))),
  );
  return BUCKETS.map((b) =>
    b.hours.reduce((sum, h) => {
      const v = allHours[h];
      return sum + (typeof v === "number" ? v : 0);
    }, 0),
  );
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP);

  // ── GET: show the hour picker ─────────────────────────────────────────
  if (ctx.action.type === "get") {
    const result: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "teal" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "sub", "slider", "submit_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "When does Farcaster wake up?",
              weight: "bold",
            },
          },
          sub: {
            type: "text",
            props: {
              content:
                "Slide to your current local hour. Everyone's answers map the community's day.",
              size: "sm",
            },
          },
          slider: {
            type: "slider",
            props: {
              name: "hour",
              label: "Your current hour (0 = midnight, 23 = 11pm)",
              min: 0,
              max: 23,
              step: 1,
              defaultValue: 12,
            },
          },
          submit_btn: {
            type: "button",
            props: { label: "Submit my hour", variant: "primary" },
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
                  text: "when does farcaster wake up? help map the community's hours 🐢",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return result;
  }

  // ── POST: record vote + show chart ────────────────────────────────────
  const fid = ctx.action.fid;
  const rawHour = ctx.action.inputs?.hour;
  const hour = typeof rawHour === "number"
    ? Math.min(23, Math.max(0, Math.round(rawHour)))
    : 12;

  // Dedup: only count the first submission per FID.
  const alreadyVoted = await store.get(fidKey(fid));

  if (!alreadyVoted) {
    const current = await store.get(hourKey(hour));
    await store.set(hourKey(hour), (typeof current === "number" ? current : 0) + 1);
    await store.set(fidKey(fid), hour);
  }

  // Load counts for all 6 buckets.
  const counts = await loadBucketCounts();
  const total = counts.reduce((a, b) => a + b, 0);

  // Find peak bucket.
  const peakIdx = counts.reduce(
    (best, v, i) => (v > counts[best] ? i : best),
    0,
  );

  const bars = BUCKETS.map((b, i) => ({
    label: b.label,
    value: counts[i],
    color: (i === peakIdx && counts[peakIdx] > 0 ? "teal" : "gray") as
      | "teal"
      | "gray",
  }));

  const peakLabel = BUCKETS[peakIdx].label;
  const statusText = alreadyVoted
    ? "You already submitted — here's the community map so far:"
    : `Logged! ${total} Farcasterer${total === 1 ? "" : "s"} have checked in.`;

  const shareText =
    `farcaster is most active ${peakLabel} — help the wizard map the community ⏱️`;

  const result: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title",
            "status",
            "chart",
            "sep",
            "peak_badge",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: {
            content: "When Farcaster Is Online",
            weight: "bold",
          },
        },
        status: {
          type: "text",
          props: { content: statusText, size: "sm" },
        },
        chart: {
          type: "bar_chart",
          props: { bars, color: "teal" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        peak_badge: {
          type: "badge",
          props: {
            label: total > 0 ? `Peak: ${peakLabel}` : "Waiting for data...",
            variant: "default",
            color: "teal",
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
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
      },
    },
  };
  return result;
});

export default app;
