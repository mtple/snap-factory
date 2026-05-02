/**
 * farcaster-sign — your Farcaster zodiac based on your FID.
 *
 * Every FID belongs to a sign. Seven signs, each corresponding to a
 * distinct era of Farcaster history. Tap to reveal yours.
 *
 * GET:  Landing screen — "Reveal My Sign" submit button.
 * POST: Personalized result — sign name badge, era, trait, FID display.
 *       Share button pre-fills cast with sign + FID.
 *
 * Components: text, button, badge, item_group, item, separator, stack
 * Actions:    submit, compose_cast
 * Accent:     varies per sign (all 7 named colors used)
 * State:      stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "farcaster-sign";

type AccentColor = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

interface Sign {
  name: string;
  era: string;
  trait: string;
  flavor: string;
  color: AccentColor;
}

// ── Sign table ────────────────────────────────────────────────────────────────

function getSign(fid: number): Sign {
  if (fid <= 100) {
    return {
      name: "Genesis",
      era: "Before the name",
      trait: "Founder",
      flavor: "The protocol wasn't named yet. You were already here.",
      color: "amber",
    };
  }
  if (fid <= 1000) {
    return {
      name: "Pioneer",
      era: "The first wave",
      trait: "Early believer",
      flavor: "You believed before there was anything to prove.",
      color: "purple",
    };
  }
  if (fid <= 5000) {
    return {
      name: "Builder",
      era: "The infrastructure era",
      trait: "Technologist",
      flavor: "You came for the tech and stayed for the chaos.",
      color: "blue",
    };
  }
  if (fid <= 20000) {
    return {
      name: "Catalyst",
      era: "The growth era",
      trait: "Momentum carrier",
      flavor: "You showed up when things started getting real.",
      color: "teal",
    };
  }
  if (fid <= 100000) {
    return {
      name: "Surge",
      era: "The flood",
      trait: "Unstoppable",
      flavor: "You rode the wave at full speed.",
      color: "green",
    };
  }
  if (fid <= 500000) {
    return {
      name: "Citizen",
      era: "The city era",
      trait: "Community anchor",
      flavor: "You found your home here. Steady-state energy.",
      color: "pink",
    };
  }
  return {
    name: "Frontier",
    era: "The new world",
    trait: "Discoverer",
    flavor: "Still writing your chapter. The best ones do.",
    color: "red",
  };
}

// ── Views ─────────────────────────────────────────────────────────────────────

function buildLanding(self: string): SnapHandlerResult {
  const elements: Record<string, SnapElementInput> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "subtitle", "sep", "reveal_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Your Farcaster Sign", weight: "bold", align: "center" },
    },
    subtitle: {
      type: "text",
      props: {
        content: "Every FID belongs to a sign. Seven signs, seven eras. Tap to discover yours.",
        align: "center",
        size: "sm",
      },
    },
    sep: { type: "separator", props: {} },
    reveal_btn: {
      type: "button",
      props: { label: "Reveal My Sign", variant: "primary" },
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
            text: "what's your Farcaster sign? every FID has one 🔮",
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: { root: "page", elements },
  };
}

function buildResult(fid: number, self: string): SnapHandlerResult {
  const sign = getSign(fid);

  // Badge label: sign name + FID, max 30 chars
  // Worst case "Frontier #999999" = 16 chars — safe
  const badgeLabel = `${sign.name}  ·  #${fid}`;
  // Cap at 30 chars just in case
  const safeLabel = badgeLabel.length <= 30 ? badgeLabel : sign.name;

  const shareText = `I'm a ${sign.name} on Farcaster (FID #${fid}). what's your sign? 🔮`;

  const elements: Record<string, SnapElementInput> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["header", "sign_badge", "sep1", "details", "sep2", "share_btn", "again_btn"],
    },
    header: {
      type: "text",
      props: { content: "Your Farcaster Sign", weight: "bold", align: "center" },
    },
    sign_badge: {
      type: "badge",
      props: { label: safeLabel, variant: "default", color: sign.color },
    },
    sep1: { type: "separator", props: {} },
    details: {
      type: "item_group",
      props: {},
      children: ["era_item", "trait_item", "flavor_item"],
    },
    era_item: {
      type: "item",
      props: { title: "Era", description: sign.era },
    },
    trait_item: {
      type: "item",
      props: { title: "Trait", description: sign.trait },
    },
    flavor_item: {
      type: "item",
      props: { title: "Vibe", description: sign.flavor },
    },
    sep2: { type: "separator", props: {} },
    share_btn: {
      type: "button",
      props: { label: "Share your sign", variant: "primary" },
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
    again_btn: {
      type: "button",
      props: { label: "See signs", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: self },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: sign.color },
    effects: ["confetti"],
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return buildLanding(self);
  }

  // POST — fid is authenticated via JFS
  const fid = ctx.action.user?.fid ?? 0;

  // If someone taps "See signs" on the result page, they submit with no inputs
  // and we check a query param to distinguish. But actually we want to show their
  // result again — just re-show the result page if they have a valid FID,
  // or landing if FID is 0.
  if (fid <= 0) {
    return buildLanding(self);
  }

  return buildResult(fid, self);
});

export default app;
