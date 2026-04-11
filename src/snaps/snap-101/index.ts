/**
 * snap-101 — a self-demonstrating tutorial that explains what snaps are
 * by being one.
 *
 * Page 1 (GET): "What's a snap?" — user reads, then taps to continue.
 * Page 2 (?page=1): "You just used one" — confetti, explanation, share CTA.
 *
 * Navigation rides on a query param (?page=N), no persistent state needed.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "snap-101";

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // Determine current page from query param (POST requests carry it in the URL)
  let page = 0;
  if (ctx.action.type === "post") {
    const url = new URL(ctx.request.url);
    const p = url.searchParams.get("page");
    if (p !== null) {
      const parsed = parseInt(p, 10);
      if (!isNaN(parsed)) page = parsed;
    }
  }

  if (page === 0) {
    // Page 1: Explain what a snap is — then show them by having them tap
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "blue" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["badge", "title", "body", "btn"],
          },
          badge: {
            type: "badge",
            props: { label: "Snap 101", variant: "outline" },
          },
          title: {
            type: "text",
            props: {
              content: "What's a snap?",
              weight: "bold",
            },
          },
          body: {
            type: "text",
            props: {
              content:
                "You're looking at one right now.\n\nA snap is an interactive card that lives inside a Farcaster cast. No link, no redirect — just tap and something happens.\n\nPress the button below to see it in action.",
              size: "sm",
            },
          },
          btn: {
            type: "button",
            props: { label: "Show me →", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: `${self}?page=1` },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // Page 2: They tapped — now show them they just used a snap
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
          children: ["badge", "title", "body", "examples", "btn_row"],
        },
        badge: {
          type: "badge",
          props: { label: "You got it", variant: "default" },
        },
        title: {
          type: "text",
          props: {
            content: "You just used a snap.",
            weight: "bold",
          },
        },
        body: {
          type: "text",
          props: {
            content:
              "You tapped a button, the snap responded. That's the whole idea — interactive experiences that live in a cast. Snaps can be anything:",
            size: "sm",
          },
        },
        examples: {
          type: "item_group",
          props: {},
          children: ["ex_polls", "ex_games", "ex_tools"],
        },
        ex_polls: {
          type: "item",
          props: {
            title: "Polls & votes",
            description: "Pick an option, see live results from everyone",
          },
        },
        ex_games: {
          type: "item",
          props: {
            title: "Games",
            description: "Rock paper scissors, trivia, beat sequencers",
          },
        },
        ex_tools: {
          type: "item",
          props: {
            title: "Tools & art",
            description: "Calculators, pixel canvases, collaborative lists",
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["btn_share"],
        },
        btn_share: {
          type: "button",
          props: { label: "Share this snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "just learned what snaps are using a snap 🐢",
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
