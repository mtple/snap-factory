/**
 * fortune-cookie — break open a daily fortune cookie.
 *
 * GET:  Cookie intro screen with "Break Cookie" button.
 * POST: Daily fortune + lucky numbers, derived from FID + date. Stateless.
 *
 * Components: text, button, badge, separator, item_group, item
 * Accent: purple (mystical vibes)
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "fortune-cookie";

// ── Fortune list ─────────────────────────────────────────────────────────────

const FORTUNES = [
  "Good things are coming. You just can't see them yet.",
  "The move you've been hesitating on is the right one.",
  "Someone in your circle is rooting for you harder than you know.",
  "Rest is not the opposite of progress.",
  "Your best idea this week hasn't arrived yet.",
  "A simple yes will open more doors than a perfect plan.",
  "The answer you're looking for is already in your hands.",
  "Something small you did recently mattered more than you think.",
  "Your curiosity will take you somewhere unexpected. Go.",
  "The person you're becoming is worth the discomfort.",
  "Trust the instinct you keep second-guessing.",
  "Today is a good day to begin something.",
  "The path forward is clearer than you're giving it credit for.",
  "A conversation you've been avoiding will go better than you expect.",
  "You don't need more information. You need to move.",
  "The thing that feels like an obstacle is actually the way.",
  "Boldness today will look like wisdom in hindsight.",
  "What you're building matters more than how fast.",
  "The right people are paying closer attention than you realize.",
  "Sometimes the best next move is a longer pause.",
  "You have already done the hardest part.",
  "The version of you from a year ago would be impressed.",
  "Say the thing you've been thinking about saying.",
  "Let the idea breathe before you kill it.",
  "Small moves compound. Keep going.",
  "The unexpected detour is part of the route.",
  "Clarity comes after you start, not before.",
  "The timing that feels off is actually perfect.",
  "One person believing in you is enough to begin.",
  "You're further along than you think.",
];

// ── Deterministic helpers ────────────────────────────────────────────────────

function seedHash(fid: number, dateStr: string): number {
  const str = `${fid}:${dateStr}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getLuckyNumbers(fid: number, dateStr: string): [number, number, number] {
  let s = seedHash(fid, dateStr);
  const nums: number[] = [];
  while (nums.length < 3) {
    s = ((Math.imul(1664525, s) + 1013904223) >>> 0);
    const n = (s % 49) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  nums.sort((a, b) => a - b);
  return [nums[0], nums[1], nums[2]];
}

// ── Snap handler ──────────────────────────────────────────────────────────────

function buildInitialPage(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "sub", "sep", "break_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "Fortune Cookie", weight: "bold", align: "center" },
        },
        sub: {
          type: "text",
          props: {
            content: "Your daily fortune is waiting. Break it open.",
            align: "center",
            size: "sm",
          },
        },
        sep: { type: "separator", props: {} },
        break_btn: {
          type: "button",
          props: { label: "Break Cookie", variant: "primary" },
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
                text: "get your daily fortune on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

function buildResultPage(self: string, fortune: string, luckyStr: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "purple" },
    effects: ["confetti"],
    ui: {
      root: "result",
      elements: {
        result: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["badge", "fortune_text", "sep", "lucky", "share_btn"],
        },
        badge: {
          type: "badge",
          props: { label: "Today's Fortune", variant: "default" },
        },
        fortune_text: {
          type: "text",
          props: { content: fortune, align: "center", weight: "bold" },
        },
        sep: { type: "separator", props: {} },
        lucky: {
          type: "text",
          props: { content: luckyStr, align: "center", size: "sm" },
        },
        share_btn: {
          type: "button",
          props: { label: "Share my fortune", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `"${fortune}" — my fortune today on @freeturtle`,
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
    return buildInitialPage(self);
  }

  // ── Fortune screen ────────────────────────────────────────────────────────
  const fid = ctx.action.user?.fid ?? 0;
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const h = seedHash(fid, today);
  const fortune = FORTUNES[h % FORTUNES.length];
  const [n1, n2, n3] = getLuckyNumbers(fid, today);
  const luckyStr = `Lucky numbers: ${n1} · ${n2} · ${n3}`;

  return buildResultPage(self, fortune, luckyStr);
});

export default app;
