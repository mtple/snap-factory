import { Hono } from "hono";
import { handle } from "hono/vercel";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

// Runtime is configured at the project level in vercel.json
// (functions["api/**/*.ts"].runtime = @vercel/node@5.7.2). No per-file
// override needed.

const app = new Hono().basePath("/api/snaps/hello-farcaster");

registerSnapHandler(app, async (ctx) => {
  // Construct the canonical clean URL for this snap.
  // Matters for multi-page snaps where button targets need absolute URLs.
  // For this single-page sample, we don't actually use selfUrl as a target —
  // it's here to demonstrate the pattern that real snaps will follow.
  const _selfUrl = snapUrl(ctx.request, "hello-farcaster");

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
            content:
              "Two new snaps every day. Dope, lit, and slightly magical.",
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
