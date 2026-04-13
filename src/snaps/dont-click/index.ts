/**
 * dont-click — a big, irresistible button you're not supposed to click.
 *
 * GET:  Full-width "Don't Click" button, nothing else.
 * POST: Confetti + "I told you not to click; you never listened 😄"
 *
 * Components: text, button, separator
 * Accent: red
 * State: none (stateless)
 * Actions: submit, compose_cast
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "dont-click";

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── GET: the forbidden button ───────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "red" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "lg", justify: "center" },
            children: ["warning", "big_btn", "sep", "share_btn"],
          },
          warning: {
            type: "text",
            props: {
              content: "Whatever you do, do NOT click the button below.",
              weight: "bold",
              align: "center",
            },
          },
          big_btn: {
            type: "button",
            props: { label: "Don't Click", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
              },
            },
          },
          sep: { type: "separator", props: {} },
          share_btn: {
            type: "button",
            props: { label: "Share", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "can you resist? @freeturtle dares you",
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

  // ── POST: they clicked it ───────────────────────────────────────────────
  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "red" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg", justify: "center" },
          children: ["oops", "sub", "sep", "share_btn"],
        },
        oops: {
          type: "text",
          props: {
            content: "I told you not to click; you never listened 😄",
            weight: "bold",
            align: "center",
          },
        },
        sub: {
          type: "text",
          props: {
            content: "Classic.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "I couldn't resist. @freeturtle warned me.",
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
