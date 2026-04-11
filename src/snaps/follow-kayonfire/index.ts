/**
 * follow-kayonfire — a snap that lets users follow @KayOnfire on X.
 * Built for @kayonfire's request during the Snapathon event.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const app = new Hono();

registerSnapHandler(app, async (_ctx) => {
  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "blue" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["header", "handle", "desc", "followBtn"],
        },
        header: {
          type: "text",
          props: { content: "Follow on X", weight: "bold", align: "center" },
        },
        handle: {
          type: "badge",
          props: { label: "@KayOnfire", variant: "default", color: "blue" },
        },
        desc: {
          type: "text",
          props: {
            content: "Tap below to follow @KayOnfire on X and keep up with what's good.",
            size: "sm",
            align: "center",
          },
        },
        followBtn: {
          type: "button",
          props: { label: "Follow @KayOnfire on X", variant: "primary", icon: "external-link" },
          on: {
            press: {
              action: "open_url",
              params: { target: "https://x.com/kayonfire" },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
