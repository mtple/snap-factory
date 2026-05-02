/**
 * magic-mirror — ask the magic mirror what it sees. it always tells the truth.
 *
 * GET:  Cryptic intro — "ask and it shall reveal."
 * POST: The reveal — it sees you. It always sees you.
 *       view_profile button opens the user's own Farcaster profile.
 *
 * Components: stack, text, button, separator, badge
 * Accent: pink (fairytale)
 * Actions: submit, view_profile, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "magic-mirror";

function buildIntroPage(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "sub", "sep", "ask_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "🪞 The Magic Mirror",
            weight: "bold",
            align: "center",
          },
        },
        sub: {
          type: "text",
          props: {
            content: "Mirror, mirror on the wall...\nAsk it anything. It always knows.",
            align: "center",
            size: "sm",
          },
        },
        sep: { type: "separator", props: {} },
        ask_btn: {
          type: "button",
          props: { label: "What do you see?", variant: "primary" },
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
                text: "the magic mirror on @freeturtle always tells the truth 🪞",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

function buildRevealPage(self: string, fid: number): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["badge", "reveal", "sub", "sep", "profile_btn", "share_btn"],
        },
        badge: {
          type: "badge",
          props: { label: "The mirror has spoken", variant: "default" },
        },
        reveal: {
          type: "text",
          props: {
            content: "It sees you.",
            weight: "bold",
            align: "center",
          },
        },
        sub: {
          type: "text",
          props: {
            content: "It has always seen you.\nOnly you.",
            align: "center",
            size: "sm",
          },
        },
        sep: { type: "separator", props: {} },
        profile_btn: {
          type: "button",
          props: { label: "Look in the mirror", variant: "primary" },
          on: {
            press: {
              action: "view_profile",
              params: { fid },
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
                text: "the magic mirror told me the truth. it always does 🪞",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return buildIntroPage(self);
  }

  const fid = ctx.action.user?.fid ?? 0;
  return buildRevealPage(self, fid);
});

export default app;
