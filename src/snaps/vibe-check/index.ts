/**
 * vibe-check — community vibe poll with live bar chart results.
 *
 * GET:  Show toggle_group with 4 vibe options + submit button.
 * POST: Record the vote in Turso KV, show bar_chart with the full
 *       community breakdown + a compose_cast share button.
 *
 * New components: toggle_group, bar_chart
 * New actions:    compose_cast
 * State:          Turso KV (persistent vote counts across sessions)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "vibe-check";

const VIBES = [
  { label: "Locked in", value: "locked-in", key: "vibe-check:locked-in" },
  { label: "Vibing", value: "vibing", key: "vibe-check:vibing" },
  { label: "Chaotic", value: "chaotic", key: "vibe-check:chaotic" },
  { label: "Couch mode", value: "couch-mode", key: "vibe-check:couch-mode" },
] as const;

type VibeValue = (typeof VIBES)[number]["value"];

async function getVibeCounts(): Promise<Record<VibeValue, number>> {
  const counts = {} as Record<VibeValue, number>;
  for (const vibe of VIBES) {
    const val = await store.get(vibe.key);
    counts[vibe.value] = typeof val === "number" ? val : 0;
  }
  return counts;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── Initial render ──────────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "subtitle", "vibe_picker", "vote_btn"],
          },
          title: {
            type: "text",
            props: { content: "Vibe check", weight: "bold" },
          },
          subtitle: {
            type: "text",
            props: {
              content: "What's your energy right now? See how Farcaster feels.",
              size: "sm",
            },
          },
          vibe_picker: {
            type: "toggle_group",
            props: {
              id: "vibe",
              label: "Pick one",
              options: VIBES.map((v) => ({ label: v.label, value: v.value })),
              orientation: "vertical",
              variant: "default",
            },
          },
          vote_btn: {
            type: "button",
            props: { label: "Check the vibe", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── POST: record vote + show results ────────────────────────────────────
  const picked = ctx.action.inputs?.vibe as string | undefined;
  const validVibe = VIBES.find((v) => v.value === picked);

  if (validVibe) {
    const current = await store.get(validVibe.key);
    const next = (typeof current === "number" ? current : 0) + 1;
    await store.set(validVibe.key, next);
  }

  const counts = await getVibeCounts();
  const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);

  const bars = VIBES.map((vibe) => ({
    label: vibe.label,
    value: counts[vibe.value],
    ...(vibe.value === picked ? { color: "purple" as const } : {}),
  }));

  const pickedLabel = validVibe?.label ?? "a vibe";
  const pct =
    total > 0
      ? Math.round(((counts[validVibe?.value ?? "vibing"] ?? 0) / total) * 100)
      : 0;

  const shareText = validVibe
    ? `just did the vibe check on farcaster — ${pct}% of us are in "${pickedLabel}" mode right now 🐢`
    : "just did the vibe check on farcaster 🐢";

  const resultTitle = validVibe
    ? `You picked: ${pickedLabel}`
    : "Current vibes on Farcaster";

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "chart", "total_text", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: resultTitle, weight: "bold" },
        },
        chart: {
          type: "bar_chart",
          props: { bars },
        },
        total_text: {
          type: "text",
          props: {
            content: `${total} total check-in${total !== 1 ? "s" : ""}`,
            size: "sm",
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share your vibe", variant: "secondary" },
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
  return response;
});

export default app;
