/**
 * cooked-check — crypto market vibes diagnostic.
 *
 * Three sliders (Fear/Greed, FOMO level, Diamond hands confidence) → personalized
 * reading of how cooked the market is, with progress bar + badge + custom message.
 *
 * Two-page snap: sliders → result.
 * Stateless — all logic is pure math from inputs.
 *
 * Components: text, slider, progress, badge, item_group, item, separator, button
 * Actions: submit, compose_cast
 * Accent: amber
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "cooked-check";

type Elements = Record<string, SnapElementInput>;

// ── Reading thresholds ────────────────────────────────────────────────────

interface Reading {
  badge: string;       // ≤30 chars
  label: string;       // ≤60 chars (progress label)
  message: string;     // ≤320 chars
}

function getReading(score: number): Reading {
  if (score >= 80) {
    return {
      badge: "FULLY COOKED",
      label: "Market cooked-ness",
      message:
        "You're in full degen mode. Every wick looks like an entry. You've explained 'it's just a dip' three times today. The wizard sees all. Touch grass.",
    };
  }
  if (score >= 60) {
    return {
      badge: "MEDIUM RARE",
      label: "Market cooked-ness",
      message:
        "Spicy in there. Your FOMO is doing push-ups and your hands aren't exactly diamond. Manageable — but keep the exit plan close.",
    };
  }
  if (score >= 40) {
    return {
      badge: "MILD HEAT",
      label: "Market cooked-ness",
      message:
        "Vibing. You've got some skin in the game but you're not losing sleep. The market is doing its thing and you're watching from a reasonable distance.",
    };
  }
  if (score >= 20) {
    return {
      badge: "DIAMOND CERTIFIED",
      label: "Market cooked-ness",
      message:
        "Unflappable. Greed is noise, FOMO is for others. You've been here before and you'll be here again. Patience is the play.",
    };
  }
  return {
    badge: "CRYOGENICALLY FROZEN",
    label: "Market cooked-ness",
    message:
      "Either enlightened or completely checked out. No fear. No greed. No FOMO. The wizard cannot tell the difference and frankly neither can you.",
  };
}

// ── Page 1: sliders ───────────────────────────────────────────────────────

function renderForm(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "subtitle", "sep", "fear_greed", "fomo", "diamond", "check_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Market Cooked-ness Check", weight: "bold" },
    },
    subtitle: {
      type: "text",
      props: { content: "How are you feeling about the market right now?", size: "sm" },
    },
    sep: { type: "separator", props: {} },
    fear_greed: {
      type: "slider",
      props: {
        name: "fear_greed",
        label: "Fear ← → Greed",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 50,
      },
    },
    fomo: {
      type: "slider",
      props: {
        name: "fomo",
        label: "FOMO level",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 30,
      },
    },
    diamond: {
      type: "slider",
      props: {
        name: "diamond",
        label: "Diamond hands confidence",
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 60,
      },
    },
    check_btn: {
      type: "button",
      props: { label: "Check my vibes", variant: "primary" },
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
            text: "how cooked is the market rn? a @freeturtle diagnostic",
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

// ── Page 2: result ────────────────────────────────────────────────────────

function renderResult(
  fearGreed: number,
  fomo: number,
  diamond: number,
  self: string,
): SnapHandlerResult {
  // Score: more greed + more fomo + less diamond hands = more cooked
  const cooked = Math.round((fearGreed + fomo + (100 - diamond)) / 3);
  const reading = getReading(cooked);

  const shareText = `my market cooked-ness score: ${cooked}/100 (${reading.badge}) — @freeturtle's diagnostic`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "sep", "cooked_bar", "badge_el", "reading_group", "sep2", "retry_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Your Vibes Reading", weight: "bold" },
    },
    sep: { type: "separator", props: {} },
    cooked_bar: {
      type: "progress",
      props: {
        value: cooked,
        max: 100,
        label: reading.label,
        color: cooked >= 60 ? "red" : cooked >= 40 ? "amber" : "green",
      },
    },
    badge_el: {
      type: "badge",
      props: {
        label: reading.badge,
        variant: "default",
        color: cooked >= 60 ? "red" : cooked >= 40 ? "amber" : "green",
      },
    },
    sep_reading: { type: "separator", props: {} },
    reading_item: {
      type: "item",
      props: {
        title: `Score: ${cooked} / 100`,
        description: reading.message.slice(0, 160),
      },
    },
    reading_group: {
      type: "item_group",
      props: {},
      children: ["sep_reading", "reading_item"],
    },
    sep2: { type: "separator", props: {} },
    retry_btn: {
      type: "button",
      props: { label: "Check again", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: self },
        },
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share my reading", variant: "secondary" },
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
    theme: { accent: "amber" },
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return renderForm(self);
  }

  // POST — parse slider values
  const inputs = ctx.action.inputs ?? {};

  const fearGreed = typeof inputs["fear_greed"] === "number"
    ? Math.max(0, Math.min(100, Math.round(inputs["fear_greed"])))
    : 50;
  const fomo = typeof inputs["fomo"] === "number"
    ? Math.max(0, Math.min(100, Math.round(inputs["fomo"])))
    : 30;
  const diamond = typeof inputs["diamond"] === "number"
    ? Math.max(0, Math.min(100, Math.round(inputs["diamond"])))
    : 60;

  // If "Check again" was tapped (retry), inputs will be absent — show form
  if (inputs["fear_greed"] === undefined && inputs["fomo"] === undefined) {
    return renderForm(self);
  }

  return renderResult(fearGreed, fomo, diamond, self);
});

export default app;
