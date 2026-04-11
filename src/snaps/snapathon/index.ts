/**
 * snapathon — Snap Wizard free request announcement.
 *
 * Displays the snapathon offer: tag @freeturtle with your idea,
 * the wizard builds it, posts it in /snaps, and tags you back.
 * Two free requests per person. You keep the credit.
 *
 * GET: Show announcement card + "Make a request" compose_cast button.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "snapathon";

registerSnapHandler(app, async (ctx) => {
  const _self = snapUrl(ctx.request, SNAP_NAME);

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "body", "how", "sep", "cta"],
        },
        title: {
          type: "text",
          props: {
            content: "Free snap requests — Snap Wizard 🔮",
            weight: "bold",
          },
        },
        body: {
          type: "text",
          props: {
            content:
              "Tag @freeturtle and describe the snap you want. The wizard builds it, posts it in /snaps, and tags you back. Full credit goes to you — submit it to the snapathon.",
            size: "sm",
          },
        },
        how: {
          type: "text",
          props: {
            content: "Two free requests per person. Just describe it.",
            size: "sm",
          },
        },
        sep: {
          type: "separator",
          props: {},
        },
        cta: {
          type: "button",
          props: { label: "Make a snap request", variant: "primary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "@freeturtle ",
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
