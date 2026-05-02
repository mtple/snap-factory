/**
 * trending-cast — "Your Most Trending Cast"
 *
 * Finds the user's most popular Farcaster cast by score
 * (likes × 3 + recasts × 5 + replies × 2) and surfaces it.
 *
 * GET:  Welcome screen with "Find My Best Cast" button
 * POST: Fetch up to 150 of the user's casts from Neynar, score each one,
 *       display the top cast with stats.
 *
 * Components: text, button, separator, badge, stack
 * Actions: submit, view_cast, compose_cast
 * Accent: teal
 * Event mode snap — built for @kenjiquest
 *
 * Requires NEYNAR_API_KEY in Vercel env.
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "trending-cast";

// ── Neynar types ──────────────────────────────────────────────────────────────

type NeynarReactions = {
  likes_count: number;
  recasts_count: number;
};

type NeynarReplies = {
  count: number;
};

type NeynarCast = {
  hash: string;
  text: string;
  timestamp: string;
  reactions: NeynarReactions;
  replies: NeynarReplies;
};

type NeynarCastsResponse = {
  casts: NeynarCast[];
  next?: { cursor?: string };
};

// ── Scoring ───────────────────────────────────────────────────────────────────

function score(cast: NeynarCast): number {
  return cast.reactions.likes_count * 3 +
    cast.reactions.recasts_count * 5 +
    cast.replies.count * 2;
}

// ── Neynar fetch ──────────────────────────────────────────────────────────────

async function fetchUserCasts(apiKey: string, fid: number): Promise<NeynarCast[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const url =
      `https://api.neynar.com/v2/farcaster/feed/user/casts` +
      `?fid=${fid}&limit=150&include_replies=false`;

    const res = await fetch(url, {
      headers: { Accept: "application/json", api_key: apiKey },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Neynar ${res.status}`);
    const data = (await res.json()) as NeynarCastsResponse;
    return data.casts ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// ── Screens ───────────────────────────────────────────────────────────────────

function renderWelcome(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg" },
          children: ["title", "subtitle", "sep", "find_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "🏆 Your Most Trending Cast",
            weight: "bold",
            align: "center",
          },
        },
        subtitle: {
          type: "text",
          props: {
            content:
              "We'll dig through your recent casts and surface the one that hit hardest — scored by likes, recasts, and replies.",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        find_btn: {
          type: "button",
          props: { label: "Find my best cast", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=result` },
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
                text: "find your most trending Farcaster cast on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

function renderResult(
  self: string,
  cast: NeynarCast,
): SnapHandlerResult {
  const s = score(cast);
  const rawText = (cast.text ?? "").trim();
  const displayText =
    rawText.length > 200 ? rawText.slice(0, 197) + "…" : rawText || "(no text)";

  const elements: Record<string, SnapElementInput> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: [
        "title",
        "cast_text",
        "sep",
        "stats_row",
        "sep2",
        "view_btn",
        "retry_btn",
        "share_btn",
      ],
    },
    title: {
      type: "text",
      props: {
        content: "🏆 Your most trending cast",
        weight: "bold",
        align: "center",
      },
    },
    cast_text: {
      type: "text",
      props: { content: displayText, size: "sm" },
    },
    sep: { type: "separator", props: {} },
    stats_row: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: ["likes_badge", "recasts_badge", "replies_badge", "score_badge"],
    },
    likes_badge: {
      type: "badge",
      props: {
        label: `❤️ ${cast.reactions.likes_count}`,
        variant: "default",
        color: "red",
      },
    },
    recasts_badge: {
      type: "badge",
      props: {
        label: `🔁 ${cast.reactions.recasts_count}`,
        variant: "default",
        color: "green",
      },
    },
    replies_badge: {
      type: "badge",
      props: {
        label: `💬 ${cast.replies.count}`,
        variant: "default",
        color: "blue",
      },
    },
    score_badge: {
      type: "badge",
      props: {
        label: `Score: ${s}`,
        variant: "outline",
        color: "teal",
      },
    },
    sep2: { type: "separator", props: {} },
    view_btn: {
      type: "button",
      props: { label: "View original cast", variant: "primary" },
      on: {
        press: {
          action: "view_cast",
          params: { hash: cast.hash },
        },
      },
    },
    retry_btn: {
      type: "button",
      props: { label: "Check again", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: `${self}?page=result` },
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
            text: `just found my most trending cast using @freeturtle — score ${s}. what's yours?`,
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    effects: ["confetti"],
    ui: { root: "page", elements },
  };
}

function renderError(self: string, message: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "gray" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "msg", "retry_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "Couldn't find your casts", weight: "bold", align: "center" },
        },
        msg: {
          type: "text",
          props: { content: message, align: "center" },
        },
        retry_btn: {
          type: "button",
          props: { label: "Try again", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=result` },
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
                text: "find your most trending Farcaster cast on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const page = url.searchParams.get("page");

  if (ctx.action.type === "get") {
    return renderWelcome(self);
  }

  // POST → result page
  if (page === "result") {
    const apiKey = process.env.NEYNAR_API_KEY;

    if (!apiKey) {
      return renderError(
        self,
        "The snap isn't fully configured yet. Check back soon.",
      );
    }

    const fid = ctx.action.user.fid;
    let casts: NeynarCast[];

    try {
      casts = await fetchUserCasts(apiKey, fid);
    } catch {
      return renderError(
        self,
        "Farcaster feed timed out. Give it another try.",
      );
    }

    if (casts.length === 0) {
      return renderError(
        self,
        "No casts found for your account. Cast something first, then come back!",
      );
    }

    // Find highest-scoring cast
    const best = casts.reduce((top, c) => (score(c) > score(top) ? c : top), casts[0]);

    return renderResult(self, best);
  }

  // Fallback
  return renderWelcome(self);
});

export default app;
