/**
 * token-type — What Base token are you?
 *
 * Three quick questions about how you move, vibe, and think.
 * Answers score points toward ETH, USDC, or DEGEN.
 * Result page shows your token match + a view_token button so you can
 * actually look it up in your wallet.
 *
 * Components: toggle_group (×3), badge, text, button, separator, stack
 * Actions:    submit, view_token, compose_cast
 * State:      stateless
 * Accent:     blue (ETH) | teal (USDC) | purple (DEGEN)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "token-type";

// ── Token definitions ─────────────────────────────────────────────────────────

type TokenKey = "eth" | "usdc" | "degen";

interface TokenDef {
  name: string;
  tagline: string;
  description: string;
  caip19: string;
  accent: "blue" | "teal" | "purple";
  shareText: string;
}

const TOKENS: Record<TokenKey, TokenDef> = {
  eth: {
    name: "ETH",
    tagline: "The foundation.",
    description:
      "You move with conviction. You don't need hype — you are the signal. ETH is your element: patient, unstoppable, and here before the rest.",
    caip19: "eip155:8453/slip44:60",
    accent: "blue",
    shareText: "apparently I'm ETH. the foundation 🔷",
  },
  usdc: {
    name: "USDC",
    tagline: "Steady and reliable.",
    description:
      "You're the one people trust. Calm in chaos, consistent across cycles. USDC doesn't chase the pump — it outlasts it. That's you.",
    caip19: "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    accent: "teal",
    shareText: "apparently I'm USDC. steady wins 💎",
  },
  degen: {
    name: "DEGEN",
    tagline: "Community is everything.",
    description:
      "You're native to this culture. You tip, you meme, you show up in the replies. DEGEN was built for people like you — on Farcaster, for Farcaster.",
    caip19: "eip155:8453/erc20:0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
    accent: "purple",
    shareText: "apparently I'm DEGEN. makes sense 🎩",
  },
};

// ── Scoring ───────────────────────────────────────────────────────────────────

// Q1: "How do you move in a market?"
// Options → token scores
const Q1_MAP: Record<string, Partial<Record<TokenKey, number>>> = {
  "Long game": { eth: 2 },
  "Read the room": { usdc: 2 },
  "Go where it's fun": { degen: 2 },
};

// Q2: "Your Farcaster move?"
// Options → token scores
const Q2_MAP: Record<string, Partial<Record<TokenKey, number>>> = {
  "Build something": { eth: 2, usdc: 1 },
  "Tip and engage": { degen: 2 },
  "Stack and wait": { usdc: 2 },
};

// Q3: "What matters most in crypto?"
// Options → token scores
const Q3_MAP: Record<string, Partial<Record<TokenKey, number>>> = {
  "Sound money": { eth: 2, usdc: 1 },
  "Community alpha": { degen: 2 },
  "Stability first": { usdc: 2 },
};

function pickToken(q1: string, q2: string, q3: string, fid: number): TokenKey {
  const scores: Record<TokenKey, number> = { eth: 0, usdc: 0, degen: 0 };

  for (const [tok, pts] of Object.entries(Q1_MAP[q1] ?? {})) {
    scores[tok as TokenKey] += pts ?? 0;
  }
  for (const [tok, pts] of Object.entries(Q2_MAP[q2] ?? {})) {
    scores[tok as TokenKey] += pts ?? 0;
  }
  for (const [tok, pts] of Object.entries(Q3_MAP[q3] ?? {})) {
    scores[tok as TokenKey] += pts ?? 0;
  }

  const max = Math.max(...Object.values(scores));
  const tied = (Object.keys(scores) as TokenKey[]).filter(
    (k) => scores[k] === max,
  );

  // Break ties deterministically by FID
  return tied[fid % tied.length];
}

// ── Snap handler ──────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── GET: question screen ───────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: [
              "title",
              "sub",
              "q1",
              "q2",
              "q3",
              "sep",
              "find_btn",
              "share_btn",
            ],
          },
          title: {
            type: "text",
            props: {
              content: "What Base token are you?",
              weight: "bold",
              align: "center",
            },
          },
          sub: {
            type: "text",
            props: {
              content: "Three questions. One honest answer.",
              size: "sm",
              align: "center",
            },
          },
          q1: {
            type: "toggle_group",
            props: {
              name: "q1",
              label: "How do you move in a market?",
              options: ["Long game", "Read the room", "Go where it's fun"],
              orientation: "horizontal",
              variant: "outline",
            },
          },
          q2: {
            type: "toggle_group",
            props: {
              name: "q2",
              label: "Your Farcaster move?",
              options: ["Build something", "Tip and engage", "Stack and wait"],
              orientation: "horizontal",
              variant: "outline",
            },
          },
          q3: {
            type: "toggle_group",
            props: {
              name: "q3",
              label: "What matters most in crypto?",
              options: ["Sound money", "Community alpha", "Stability first"],
              orientation: "horizontal",
              variant: "outline",
            },
          },
          sep: {
            type: "separator",
            props: {},
          },
          find_btn: {
            type: "button",
            props: { label: "Find my token", variant: "primary" },
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
                  text: "what Base token are you? quick quiz 🔷",
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

  // ── POST: result screen ────────────────────────────────────────────────
  const inputs = ctx.action.inputs as Record<string, string | undefined>;
  const q1 = inputs.q1 ?? "Long game";
  const q2 = inputs.q2 ?? "Build something";
  const q3 = inputs.q3 ?? "Sound money";
  const fid = ctx.action.fid;

  const tokenKey = pickToken(q1, q2, q3, fid);
  const token = TOKENS[tokenKey];

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: token.accent },
    ui: {
      root: "result_page",
      elements: {
        result_page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "token_badge",
            "token_name",
            "tagline",
            "token_desc",
            "sep",
            "view_btn",
            "retry_btn",
            "share_btn",
          ],
        },
        token_badge: {
          type: "badge",
          props: { label: "You are", variant: "outline" },
        },
        token_name: {
          type: "text",
          props: {
            content: token.name,
            weight: "bold",
            align: "center",
          },
        },
        tagline: {
          type: "text",
          props: {
            content: token.tagline,
            size: "sm",
            align: "center",
          },
        },
        token_desc: {
          type: "text",
          props: {
            content: token.description,
            size: "sm",
            align: "center",
          },
        },
        sep: {
          type: "separator",
          props: {},
        },
        view_btn: {
          type: "button",
          props: { label: `View ${token.name}`, variant: "primary" },
          on: {
            press: {
              action: "view_token",
              params: { token: token.caip19 },
            },
          },
        },
        retry_btn: {
          type: "button",
          props: { label: "Try again", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share result", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: token.shareText,
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
// Mon Apr 20 10:12:19 EDT 2026
