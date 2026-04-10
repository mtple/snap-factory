import { Hono } from "hono";
import { handle } from "hono/vercel";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

export const config = {
  runtime: "nodejs",
};

const app = new Hono().basePath("/api/snaps/hello-farcaster");

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
          props: { content: "Snap Wizard", weight: "bold" },
        },
        body: {
          type: "text",
          props: {
            content: "Two new snaps every day. Tap below to see what's new.",
            size: "sm",
          },
        },
        cta: {
          type: "button",
          props: { label: "Visit Tortoise", variant: "primary" },
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

export default handle(app);
