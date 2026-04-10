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

// options must be plain strings per the toggle_group spec.
// Turso keys are derived from the label.
const VIBE_OPTIONS = ["Locked in", "Vibing", "Chaotic", "Couch mode"] as const;
type VibeLabel = (typeof VIBE_OPTIONS)[number];

function vibeKey(label: string): string {
  return `vibe-check:${label.toLowerCase().replace(/\s+/g, "-")}`;
}

async function getVibeCounts(): Promise<Record<VibeLabel, number>> {
  const counts = {} as Record<VibeLabel, number>;
  for (const label of VIBE_OPTIONS) {
    const val = await store.get(vibeKey(label));
    counts[label] = typeof val === "number" ? val : 0;
  }
  return counts;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── Initial render ──────────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const counts = await getVibeCounts();
    const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
    const bars = VIBE_OPTIONS.map((label) => ({ label, value: counts[label] }));

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "chart", "total_text", "sep", "vibe_picker", "vote_btn"],
          },
          title: {
            type: "text",
            props: { content: "Vibe check", weight: "bold" },
          },
          chart: {
            type: "bar_chart",
            props: { bars },
          },
          total_text: {
            type: "text",
            props: {
              content: total > 0
                ? `${total} check-in${total !== 1 ? "s" : ""} so far — what's yours?`
                : "No check-ins yet — be the first.",
              size: "sm",
            },
          },
          sep: {
            type: "separator",
            props: {},
          },
          vibe_picker: {
            type: "toggle_group",
            props: {
              name: "vibe",
              label: "Pick one",
              options: [...VIBE_OPTIONS],
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
  const validPick = VIBE_OPTIONS.find((v) => v === picked);

  if (validPick) {
    const current = await store.get(vibeKey(validPick));
    const next = (typeof current === "number" ? current : 0) + 1;
    await store.set(vibeKey(validPick), next);
  }

  const counts = await getVibeCounts();
  const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);

  const bars = VIBE_OPTIONS.map((label) => ({
    label,
    value: counts[label],
    ...(label === validPick ? { color: "purple" as const } : {}),
  }));

  const pct =
    total > 0 && validPick
      ? Math.round((counts[validPick] / total) * 100)
      : 0;

  const shareText = validPick
    ? `just did the vibe check on farcaster — ${pct}% of us are in "${validPick}" mode right now 🐢`
    : "just did the vibe check on farcaster 🐢";

  const resultTitle = validPick
    ? `You picked: ${validPick}`
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
