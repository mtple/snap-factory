/**
 * airdrop-checker — mock Farcaster airdrop eligibility checker.
 *
 * Based on community rumors and speculation — clearly satirical.
 * Users answer 4 yes/no criteria questions and get a mock eligibility
 * score (0-100) with a tiered result. Not official, not financial advice.
 *
 * Built for @degencaso.
 *
 * Components: text, toggle_group, progress, badge, separator, button, stack
 * Actions: submit, compose_cast
 * Accent: amber
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "airdrop-checker";

function buildGetView(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            "title",
            "subtitle",
            "sep1",
            "q1",
            "q2",
            "q3",
            "q4",
            "check_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: {
            content: "Mock Airdrop Checker",
            weight: "bold",
            size: "md",
          },
        },
        subtitle: {
          type: "text",
          props: {
            content:
              "Based on community rumors — not official, not financial advice. Just vibes.",
            size: "sm",
          },
        },
        sep1: { type: "separator", props: {} },
        q1: {
          type: "toggle_group",
          props: {
            name: "early",
            label: "Early adopter (joined before 2024)?",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            defaultValue: "no",
          },
        },
        q2: {
          type: "toggle_group",
          props: {
            name: "active",
            label: "Made 100+ casts?",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            defaultValue: "no",
          },
        },
        q3: {
          type: "toggle_group",
          props: {
            name: "wallet",
            label: "Connected a Base wallet?",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            defaultValue: "no",
          },
        },
        q4: {
          type: "toggle_group",
          props: {
            name: "nft",
            label: "Own a Farcaster-native NFT?",
            options: [
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ],
            defaultValue: "no",
          },
        },
        check_btn: {
          type: "button",
          props: { label: "Check eligibility", variant: "primary" },
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
                text: "check your mock Farcaster airdrop eligibility on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return buildGetView(self);
  }

  // If the "Try again" button posted back, return the initial view
  const url = new URL(ctx.request.url);
  if (url.searchParams.get("v") === "get") {
    return buildGetView(self);
  }

  // POST — score the answers
  const inputs = ctx.action.inputs as Record<string, string>;
  let score = 0;
  if (inputs.early === "yes") score += 25;
  if (inputs.active === "yes") score += 25;
  if (inputs.wallet === "yes") score += 25;
  if (inputs.nft === "yes") score += 25;

  type Tier =
    | "Diamond tier"
    | "Gold tier"
    | "Silver tier"
    | "Bronze tier"
    | "Waitlist tier";

  let tier: Tier;
  let verdict: string;
  const addConfetti = score === 100;

  if (score === 100) {
    tier = "Diamond tier";
    verdict =
      "All boxes checked. If this were real, you'd be set. The rumors say this is the profile that qualifies. No promises though — it's all made up.";
  } else if (score === 75) {
    tier = "Gold tier";
    verdict =
      "Solid. You're missing one box — go back and figure out which. Or just accept 75% and hope the snapshot is generous.";
  } else if (score === 50) {
    tier = "Silver tier";
    verdict =
      "Half qualified. Most airdrop rumors include a small 'everyone gets something' tier. That tier is usually tiny. Keep building.";
  } else if (score === 25) {
    tier = "Bronze tier";
    verdict =
      "One box checked. Start casting more, connect a wallet, grab an NFT. You know what to do.";
  } else {
    tier = "Waitlist tier";
    verdict =
      "Nothing checked off yet. The good news: there's no confirmed airdrop anyway. This is all made up. You're free.";
  }

  const shareText = `I scored ${score}/100 on @freeturtle's mock Farcaster airdrop checker — ${tier}`;
  const resetUrl = `${self}?v=get`;

  const result: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "amber" },
    ...(addConfetti ? { effects: ["confetti"] as ["confetti"] } : {}),
    ui: {
      root: "result",
      elements: {
        result: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            "title",
            "score_bar",
            "tier_badge",
            "sep1",
            "verdict_text",
            "try_again_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: "Your Mock Eligibility", weight: "bold" },
        },
        score_bar: {
          type: "progress",
          props: {
            value: score,
            max: 100,
            label: `${score}/100 criteria matched`,
            color: "amber",
          },
        },
        tier_badge: {
          type: "badge",
          props: {
            label: tier,
            variant: score === 100 ? "default" : "outline",
          },
        },
        sep1: { type: "separator", props: {} },
        verdict_text: {
          type: "text",
          props: { content: verdict, size: "sm" },
        },
        try_again_btn: {
          type: "button",
          props: { label: "Try again", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: resetUrl },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share result", variant: "secondary" },
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
