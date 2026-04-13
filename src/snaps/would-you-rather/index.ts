/**
 * would-you-rather — daily dilemma snap with live vote results.
 *
 * GET:  Show today's Would You Rather dilemma via toggle_group + vote button.
 * POST: Record vote in Turso KV, show bar_chart with community breakdown.
 *
 * Scenario cycles daily (day-of-year mod number of scenarios).
 * Each has two options (≤30 chars) for toggle_group compatibility.
 *
 * Components: toggle_group, bar_chart, text, button
 * Actions:    submit, compose_cast
 * State:      Turso KV (persistent vote counts, keyed by scenario + option)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "would-you-rather";

// Each scenario: a short question + two options (both ≤30 chars)
const SCENARIOS = [
  {
    question: "No social media, ever... or no streaming music, ever?",
    a: "No social media ever",
    b: "No streaming music ever",
  },
  {
    question: "Always 10 minutes late... or always 20 minutes early?",
    a: "Always 10 minutes late",
    b: "Always 20 minutes early",
  },
  {
    question: "Rich but completely anonymous... or famous but always broke?",
    a: "Rich but anonymous",
    b: "Famous but always broke",
  },
  {
    question: "Only speak in movie quotes... or only communicate in emojis?",
    a: "Only movie quotes",
    b: "Only emojis forever",
  },
  {
    question: "Know the exact day you die... or never know but live longer?",
    a: "Know the day you die",
    b: "Never know, live longer",
  },
  {
    question: "Unlimited money, no close friends... or amazing friends, no money?",
    a: "Unlimited $, no friends",
    b: "Great friends, no money",
  },
  {
    question: "Restart your life at 10 knowing everything... or fast-forward to age 60?",
    a: "Restart at 10",
    b: "Skip ahead to 60",
  },
] as const;

type ScenarioIndex = number;

function getScenarioIndex(): ScenarioIndex {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return dayOfYear % SCENARIOS.length;
}

function voteKey(idx: ScenarioIndex, option: "a" | "b"): string {
  return `wyr:${idx}:${option}`;
}

async function getVotes(idx: ScenarioIndex): Promise<{ a: number; b: number }> {
  const [va, vb] = await Promise.all([
    store.get(voteKey(idx, "a")),
    store.get(voteKey(idx, "b")),
  ]);
  return {
    a: typeof va === "number" ? va : 0,
    b: typeof vb === "number" ? vb : 0,
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const idx = getScenarioIndex();
  const scenario = SCENARIOS[idx];

  // ── GET: show today's dilemma ──────────────────────────────────────────
  if (ctx.action.type === "get") {
    const votes = await getVotes(idx);
    const total = votes.a + votes.b;

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "green" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["label", "question", "picker", "vote_btn", "share_btn"],
          },
          label: {
            type: "text",
            props: {
              content: "Would you rather...",
              weight: "bold",
              align: "center",
            },
          },
          question: {
            type: "text",
            props: {
              content: scenario.question,
              size: "sm",
              align: "center",
            },
          },
          picker: {
            type: "toggle_group",
            props: {
              name: "choice",
              label: total > 0
                ? `${total} vote${total !== 1 ? "s" : ""} so far — what's yours?`
                : "Cast the first vote",
              options: [scenario.a, scenario.b],
              orientation: "vertical",
              variant: "outline",
            },
          },
          vote_btn: {
            type: "button",
            props: { label: "Vote", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
              },
            },
          },
          share_btn: {
            type: "button",
            props: { label: "Share snap", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "today's would you rather is a tough one 👀 tap to vote",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── POST: record vote + show results ──────────────────────────────────
  const picked = ctx.action.inputs?.choice as string | undefined;
  let userChoice: "a" | "b" | null = null;

  if (picked === scenario.a) {
    userChoice = "a";
    const cur = await store.get(voteKey(idx, "a"));
    await store.set(voteKey(idx, "a"), (typeof cur === "number" ? cur : 0) + 1);
  } else if (picked === scenario.b) {
    userChoice = "b";
    const cur = await store.get(voteKey(idx, "b"));
    await store.set(voteKey(idx, "b"), (typeof cur === "number" ? cur : 0) + 1);
  }

  const votes = await getVotes(idx);
  const total = votes.a + votes.b;

  const bars = [
    {
      label: scenario.a,
      value: votes.a,
      ...(userChoice === "a" ? { color: "green" as const } : {}),
    },
    {
      label: scenario.b,
      value: votes.b,
      ...(userChoice === "b" ? { color: "green" as const } : {}),
    },
  ];

  const pct =
    total > 0 && userChoice !== null
      ? Math.round((votes[userChoice] / total) * 100)
      : 0;

  const shareText =
    userChoice !== null
      ? `${pct}% of farcaster agrees with me on today's would you rather 👀`
      : "today's would you rather is a tough one 👀 tap to vote";

  const titleText =
    userChoice !== null
      ? `You picked: ${userChoice === "a" ? scenario.a : scenario.b}`
      : "Results";

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "green" },
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
          props: { content: titleText, weight: "bold" },
        },
        chart: {
          type: "bar_chart",
          props: { bars },
        },
        total_text: {
          type: "text",
          props: {
            content: `${total} vote${total !== 1 ? "s" : ""} — new dilemma tomorrow`,
            size: "sm",
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
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
