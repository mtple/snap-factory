/**
 * fc-confessions — pick your most relatable Farcaster confession.
 * See how the community split via a live bar chart.
 *
 * Components: text, toggle_group, button, bar_chart, badge, separator, stack
 * Accent: pink
 * State: Turso (persistent vote counts)
 * Actions: submit, compose_cast
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import { createTursoDataStore } from "@farcaster/snap-turso";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "fc-confessions";

const store = createTursoDataStore();

const CONFESSIONS = [
  "I cast more than I actually read",
  "I follow back just to keep my ratio",
  "I still don't fully understand warps",
  "I've never checked my analytics",
] as const;

type Confession = (typeof CONFESSIONS)[number];

const KEYS = CONFESSIONS.map((_, i) => `v${i}`) as [
  "v0",
  "v1",
  "v2",
  "v3",
];

async function getVotes(): Promise<number[]> {
  return Promise.all(
    KEYS.map(async (k) => {
      const v = await store.get(k);
      return typeof v === "number" ? v : 0;
    }),
  );
}

async function incrementVote(idx: number): Promise<number[]> {
  const current = await getVotes();
  const next = [...current];
  if (idx >= 0 && idx < next.length) {
    next[idx] = (next[idx] ?? 0) + 1;
    await store.set(KEYS[idx], next[idx]);
  }
  return next;
}

function renderVote(): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["title", "subtitle", "sep", "picker", "submit_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "Farcaster confessions 🫣",
            weight: "bold",
            align: "center",
          },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Pick the one that hits closest to home.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        picker: {
          type: "toggle_group",
          props: {
            name: "confession",
            label: "Your confession",
            options: [...CONFESSIONS],
            orientation: "vertical",
            variant: "outline",
            defaultValue: CONFESSIONS[0],
          },
        },
        submit_btn: {
          type: "button",
          props: { label: "Confess", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: "" }, // set dynamically below
            },
          },
        },
      } as never,
    },
  };
}

function renderResults(
  votes: number[],
  chosen: string,
  self: string,
): SnapHandlerResult {
  const total = votes.reduce((a, b) => a + b, 0);
  const chosenIdx = CONFESSIONS.indexOf(chosen as Confession);
  const chosenPct =
    total > 0 && chosenIdx >= 0
      ? Math.round(((votes[chosenIdx] ?? 0) / total) * 100)
      : 0;

  const bars = CONFESSIONS.map((c, i) => ({
    label: c.length > 30 ? c.slice(0, 28) + "…" : c,
    value: votes[i] ?? 0,
  }));

  const summaryText =
    chosenIdx >= 0 && total > 0
      ? `${chosenPct}% of people confessed the same thing.`
      : "You're not alone.";

  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            "title",
            "summary",
            "sep",
            "chart",
            "total_badge",
            "sep2",
            "share_btn",
            "again_btn",
          ],
        },
        title: {
          type: "text",
          props: {
            content: "We're all guilty 🫣",
            weight: "bold",
            align: "center",
          },
        },
        summary: {
          type: "text",
          props: {
            content: summaryText,
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        chart: {
          type: "bar_chart",
          props: {
            bars,
            color: "pink",
          },
        },
        total_badge: {
          type: "badge",
          props: {
            label: `${total} confession${total === 1 ? "" : "s"} so far`,
            variant: "outline",
            color: "pink",
          },
        },
        sep2: { type: "separator", props: {} },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "just confessed my farcaster sin 🫣",
                embeds: [self],
              },
            },
          },
        },
        again_btn: {
          type: "button",
          props: { label: "See current results", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?view=results` },
            },
          },
        },
      } as never,
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);
  const viewResults = reqUrl.searchParams.get("view") === "results";

  if (ctx.action.type === "get") {
    if (viewResults) {
      const votes = await getVotes();
      return renderResults(votes, "", self);
    }
    // Inject self URL into submit button target
    const snap = renderVote();
    const submitBtn = (snap.ui.elements as Record<string, { on?: { press?: { params?: { target?: string } } } }>)["submit_btn"];
    if (submitBtn?.on?.press?.params) {
      submitBtn.on.press.params.target = self;
    }
    return snap;
  }

  // POST — record the vote
  const inputs = (ctx.action as { inputs?: Record<string, unknown> }).inputs ?? {};
  const chosen = String(inputs["confession"] ?? CONFESSIONS[0]);

  const chosenIdx = CONFESSIONS.indexOf(chosen as Confession);
  const safeIdx = chosenIdx >= 0 ? chosenIdx : 0;

  const votes = await incrementVote(safeIdx);

  return renderResults(votes, chosen, self);
});

export default app;
