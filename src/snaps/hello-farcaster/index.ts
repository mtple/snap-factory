/**
 * hello-farcaster — the sample snap that every new snap copies from.
 *
 * Pattern:
 *   - Each snap is a self-contained Hono sub-app at src/snaps/<name>/index.ts
 *   - The default export is a bare Hono instance (NOT handle(app) from
 *     hono/vercel — the parent src/index.ts mounts these directly)
 *   - registerSnapHandler attaches GET and POST handlers at the sub-app's
 *     "/" path. The parent mounts this sub-app at /snaps/<name>, so the
 *     final URL is /snaps/<name>
 *   - Use snapUrl(ctx.request, "<name>") from ../../_lib/base-url.js for
 *     any absolute URL needed inside the snap (multi-page navigation,
 *     submit targets, etc.)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

registerSnapHandler(app, async (ctx) => {
  // Construct the canonical clean URL for this snap. Single-page sample
  // doesn't actually navigate, but the import + call demonstrates the
  // pattern every multi-page snap will follow.
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

export default app;
