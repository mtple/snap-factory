/**
 * degen-quest — The wizard's crypto quest
 *
 * A new L2 just launched. Token is up 7,000% in 2 hours. Devs are anon.
 * Audits are "pending". Pick your move — get a personalized outcome based
 * on your choice and your FID.
 *
 * Two-page, stateless. 4 choices × 3 FID variants = 12 unique outcomes.
 *
 * Components: toggle_group, badge, text, separator, button, stack
 * Actions:    submit, compose_cast
 * Accent:     amber
 * State:      stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP = "degen-quest";

// ── Outcome data ──────────────────────────────────────────────────────────────

type Outcome = {
  badge: string;        // ≤30 chars
  badgeColor: "green" | "red" | "amber" | "gray";
  result: string;       // ≤320 chars
  moral: string;        // ≤100 chars
};

const OUTCOMES: Record<string, [Outcome, Outcome, Outcome]> = {
  ape: [
    {
      badge: "+47,000% (missed rest)",
      badgeColor: "amber",
      result:
        "You got in at 7000%. You sold at 54000% because it felt greedy. It went to 2,000,000% an hour later. You are currently fine. Technically.",
      moral: "Being right and being rich are different things.",
    },
    {
      badge: "Still holding",
      badgeColor: "amber",
      result:
        "You got in at 7000%. It hit 7200%, then reversed hard. The chart looks like a cliff. You are not selling. This is fine. Everything is fine.",
      moral: "Diamond hands are just denial with good branding.",
    },
    {
      badge: "Exit liquidity",
      badgeColor: "red",
      result:
        "You were the last buy before the dev wallet sold everything. You now hold 400 million of an unnamed token. They have a Discord. It is quiet.",
      moral: "Someone always has to be the exit liquidity.",
    },
  ],
  research: [
    {
      badge: "Right, too late",
      badgeColor: "amber",
      result:
        "Your 40-page research doc was impeccable. By the time you finished, the token was at -94%. The thread got 4 likes and a pity recast.",
      moral: "The market moves faster than the truth.",
    },
    {
      badge: "Correct thesis, zero bag",
      badgeColor: "amber",
      result:
        "You correctly identified the ponzi in your research. That was day 3. The ponzi ran for 11 more days after you published. Then it crashed.",
      moral: "Being right early is just being wrong in a different direction.",
    },
    {
      badge: "Found the receipts",
      badgeColor: "red",
      result:
        "The whitepaper was AI-generated. You found it, posted a 12-point breakdown, and got 3 likes. The token 10x'd anyway.",
      moral: "Fundamentals are vibes in a different font.",
    },
  ],
  ct: [
    {
      badge: "Rugged (classic)",
      badgeColor: "red",
      result:
        "You asked 5 CT accounts for alpha. All said buy. You bought. None of them did. The chart now has a new shape: the tombstone.",
      moral: "Free CT alpha is the opposite of alpha.",
    },
    {
      badge: "Rugged (surprised)",
      badgeColor: "red",
      result:
        "The influencer said \"this is the one.\" You got in. He got out. The chart records exactly when he sold. You can see it.",
      moral: "Paid alpha is slightly worse than free alpha.",
    },
    {
      badge: "Alpha aged out",
      badgeColor: "red",
      result:
        "By the time the CT thread arrived, the window was closed. You saved it for next time. There is no next time like that one.",
      moral: "Alpha shared is alpha expired.",
    },
  ],
  grass: [
    {
      badge: "Undefeated",
      badgeColor: "green",
      result:
        "You went for a walk. It was 68 degrees. You saw a dog. The token is at zero now. You don't know that. You are having a good day.",
      moral: "The outside world is a permanent bull market.",
    },
    {
      badge: "Two steps outside",
      badgeColor: "green",
      result:
        "You touched grass. Got a coffee. Came back and checked charts for 12 minutes. Then went back outside. Net positive.",
      moral: "Progress is mostly direction.",
    },
    {
      badge: "Peak performance",
      badgeColor: "green",
      result:
        "You never checked the token. You ate a meal with humans. You slept 8 hours. You woke up calm. You are the wealthiest person in this snap.",
      moral: "Touch grass more. Miss fewer rallies. Live better.",
    },
  ],
};

// ── Page builders ─────────────────────────────────────────────────────────────

type Elements = Record<string, SnapElementInput>;

function buildQuestPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "sub", "sep1", "move", "sep2", "submit_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "The wizard's quest", weight: "bold" },
    },
    sub: {
      type: "text",
      props: {
        content:
          "A new L2 launched. Token is up 7,000% in 2 hours. Devs are anon. Audits are \"pending\". What's your move?",
        size: "sm",
      },
    },
    sep1: { type: "separator", props: {} },
    move: {
      type: "toggle_group",
      props: {
        label: "Pick your approach",
        options: [
          { label: "Ape in immediately", value: "ape" },
          { label: "Research for 3 days", value: "research" },
          { label: "Ask CT for alpha", value: "ct" },
          { label: "Touch grass", value: "grass" },
        ],
        orientation: "vertical",
        variant: "outline",
        selectMode: "single",
      },
    },
    sep2: { type: "separator", props: {} },
    submit_btn: {
      type: "button",
      props: { label: "Make your move", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: {
      type: "button",
      props: { label: "Share snap", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: "the wizard's degen quest — what's your move? 🔮",
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: { root: "page", elements },
  };
}

function buildResultPage(self: string, outcome: Outcome): SnapHandlerResult {
  const shareText = `I played the wizard's degen quest and got: "${outcome.badge}" 🔮`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: [
        "result_badge",
        "sep1",
        "result_text",
        "sep2",
        "moral_label",
        "moral_text",
        "sep3",
        "retry_btn",
        "share_btn",
      ],
    },
    result_badge: {
      type: "badge",
      props: { label: outcome.badge, variant: "default", color: outcome.badgeColor },
    },
    sep1: { type: "separator", props: {} },
    result_text: {
      type: "text",
      props: { content: outcome.result, size: "sm" },
    },
    sep2: { type: "separator", props: {} },
    moral_label: {
      type: "text",
      props: { content: "The wizard's moral", weight: "bold", size: "sm" },
    },
    moral_text: {
      type: "text",
      props: { content: outcome.moral, size: "sm" },
    },
    sep3: { type: "separator", props: {} },
    retry_btn: {
      type: "button",
      props: { label: "Try again", variant: "primary" },
      on: {
        press: { action: "submit", params: { target: `${self}?reset=1` } },
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share my result", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: { text: shareText, embeds: [self] },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP);

  // Initial render
  if (ctx.action.type === "get") {
    return buildQuestPage(self);
  }

  // Retry button sends ?reset=1
  const url = new URL(ctx.request.url);
  if (url.searchParams.get("reset") === "1") {
    return buildQuestPage(self);
  }

  // Resolve the selected choice (default to "ape" if nothing selected)
  const choiceRaw = ctx.action.inputs?.move as string | undefined;
  const validChoices = ["ape", "research", "ct", "grass"] as const;
  const choice: (typeof validChoices)[number] = validChoices.includes(
    choiceRaw as (typeof validChoices)[number],
  )
    ? (choiceRaw as (typeof validChoices)[number])
    : "ape";

  // FID-based variant (0, 1, or 2) — makes the snap replayable with others
  const fid = ctx.action.fid ?? 0;
  const variant = fid % 3 as 0 | 1 | 2;

  const outcome = OUTCOMES[choice][variant];
  return buildResultPage(self, outcome);
});

export default app;
