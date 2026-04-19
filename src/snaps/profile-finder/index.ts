/**
 * profile-finder — look up any Farcaster profile by FID.
 *
 * GET:  Number input for FID + "Find Profile" button.
 * POST (fid supplied):  Show the FID entered and a "View Profile" button
 *      that uses the view_profile action — tapping it opens the profile
 *      directly in the Farcaster client. Also a "Look up another" button
 *      to reset.
 * POST (no fid / look-up-another):  Return to the input screen.
 *
 * Components: input, text, button, badge, separator, stack
 * Actions:    submit, view_profile, compose_cast
 * State:      stateless
 * Accent:     blue (informational utility)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "profile-finder";

// ── Input screen ─────────────────────────────────────────────────────────────

function buildInputScreen(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "blue" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "subtitle", "fid_input", "find_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "FID Lookup", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Enter any Farcaster ID to jump straight to that profile.",
            size: "sm",
            align: "center",
          },
        },
        fid_input: {
          type: "input",
          props: {
            name: "fid",
            type: "number",
            label: "FID",
            placeholder: "e.g. 1",
            maxLength: 10,
          },
        },
        find_btn: {
          type: "button",
          props: { label: "Find Profile", variant: "primary" },
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
                text: "look up any farcaster profile by FID 🔍",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

// ── Result screen ─────────────────────────────────────────────────────────────

function buildResultScreen(fid: number, self: string): SnapHandlerResult {
  const fidStr = String(fid);

  return {
    version: "1.0",
    theme: { accent: "blue" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title",
            "fid_badge",
            "hint",
            "view_btn",
            "sep",
            "again_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: "Profile found", weight: "bold", align: "center" },
        },
        fid_badge: {
          type: "badge",
          props: { label: `FID ${fidStr}`, color: "blue" },
        },
        hint: {
          type: "text",
          props: {
            content: "Tap the button below to open this profile in Farcaster.",
            size: "sm",
            align: "center",
          },
        },
        view_btn: {
          type: "button",
          props: { label: "View Profile", variant: "primary", icon: "user" },
          on: {
            press: {
              action: "view_profile",
              params: { fid },
            },
          },
        },
        sep: {
          type: "separator",
          props: {},
        },
        again_btn: {
          type: "button",
          props: { label: "Look up another", variant: "secondary" },
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
                text: "look up any farcaster profile by FID 🔍",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return buildInputScreen(self);
  }

  // POST — check if a valid FID was supplied
  const rawFid = ctx.action.inputs?.fid;
  const fid = typeof rawFid === "number" ? Math.floor(rawFid) : parseInt(String(rawFid ?? ""), 10);

  if (!fid || fid <= 0 || !isFinite(fid)) {
    // No valid FID — return to input screen
    return buildInputScreen(self);
  }

  return buildResultScreen(fid, self);
});

export default app;
