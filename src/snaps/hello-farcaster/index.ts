/**
 * hello-farcaster — the first snap. Sample / smoke test.
 *
 * Stateless. Returns a single page with a title, a body, and a button that
 * opens tortoise.studio. No POST handling needed because the only action is
 * `open_url` which the client handles directly.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const app = new Hono();

registerSnapHandler(app, async (_ctx) => {
  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "body", "cta"],
        },
        title: {
          type: "text",
          props: { content: "snap factory", weight: "bold" },
        },
        body: {
          type: "text",
          props: {
            content: "built by freeturtle. two new snaps every day.",
            size: "sm",
          },
        },
        cta: {
          type: "button",
          props: { label: "what is this?", variant: "secondary" },
          on: {
            press: {
              action: "open_url",
              params: { target: "https://tortoise.studio" },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
