/**
 * random-fc-pic — Random Farcaster image discovery snap
 *
 * Shows a random image from recent Farcaster casts, with attribution
 * back to the original poster. Shuffle to see another one.
 * Built for @kenjiquest.
 *
 * GET:  Welcome screen with Shuffle button
 * POST: Fetch Neynar global feed, filter for image embeds, pick random,
 *       display image + poster username + "View cast" link
 *
 * Components: text, button, image, separator
 * Actions: submit, view_cast, compose_cast
 * Accent: blue
 *
 * Requires NEYNAR_API_KEY in Vercel env for live feed. Falls back to
 * a graceful error screen with retry if the key is absent.
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "random-fc-pic";

// ── Neynar types ──────────────────────────────────────────────────────────

type NeynarEmbed = {
  url?: string;
  metadata?: {
    content_type?: string;
    image?: { width_px?: number; height_px?: number };
  };
};

type NeynarCast = {
  hash: string;
  author: { username: string; display_name?: string; fid: number };
  text: string;
  embeds: NeynarEmbed[];
  timestamp: string;
};

type NeynarFeedResponse = {
  casts: NeynarCast[];
};

// ── Helpers ───────────────────────────────────────────────────────────────

function isImageEmbed(embed: NeynarEmbed): boolean {
  if (!embed.url) return false;
  // Explicit image content type from metadata
  if (embed.metadata?.content_type?.startsWith("image/")) return true;
  // Metadata has image dimensions
  if (embed.metadata?.image) return true;
  // URL looks like a direct image
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(embed.url)) return true;
  return false;
}

function getImageUrl(cast: NeynarCast): string | null {
  for (const embed of cast.embeds ?? []) {
    if (isImageEmbed(embed) && embed.url) return embed.url;
  }
  return null;
}

async function fetchImageCasts(apiKey: string): Promise<NeynarCast[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      "https://api.neynar.com/v2/farcaster/feed/global?with_recasts=false&with_replies=false&limit=100",
      {
        headers: { Accept: "application/json", api_key: apiKey },
        signal: controller.signal,
      },
    );
    if (!res.ok) throw new Error(`Neynar ${res.status}`);
    const data = (await res.json()) as NeynarFeedResponse;
    return (data.casts ?? []).filter((c) => c.embeds?.some(isImageEmbed));
  } finally {
    clearTimeout(timer);
  }
}

// ── Shared share button ────────────────────────────────────────────────────

function shareBtn(self: string): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text: "random image roulette on @freeturtle 👀 tap shuffle and see what you find",
          embeds: [self],
        },
      },
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── GET: welcome screen ───────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "blue" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "lg", justify: "center" },
            children: ["title", "subtitle", "shuffle_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Random Image of the Day",
              weight: "bold",
              align: "center",
            },
          },
          subtitle: {
            type: "text",
            props: {
              content:
                "A random image from recent Farcaster casts. Tap Shuffle, discover something new.",
              align: "center",
            },
          },
          shuffle_btn: {
            type: "button",
            props: { label: "Shuffle", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: self } } },
          },
          share_btn: shareBtn(self),
        },
      },
    };
    return response;
  }

  // ── POST: fetch and display a random image ────────────────────────────
  const apiKey = process.env.NEYNAR_API_KEY;

  // No API key configured
  if (!apiKey) {
    return {
      version: "1.0",
      theme: { accent: "gray" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md", justify: "center" },
            children: ["title", "msg", "shuffle_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Not configured yet",
              weight: "bold",
              align: "center",
            },
          },
          msg: {
            type: "text",
            props: {
              content:
                "Live image feed needs a Farcaster API key in the server config. Coming soon.",
              align: "center",
            },
          },
          shuffle_btn: {
            type: "button",
            props: { label: "Try again", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: self } } },
          },
          share_btn: shareBtn(self),
        },
      },
    };
  }

  // Fetch the feed
  let casts: NeynarCast[];
  try {
    casts = await fetchImageCasts(apiKey);
  } catch {
    return {
      version: "1.0",
      theme: { accent: "gray" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md", justify: "center" },
            children: ["title", "msg", "shuffle_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Couldn't fetch images",
              weight: "bold",
              align: "center",
            },
          },
          msg: {
            type: "text",
            props: {
              content:
                "Farcaster feed is being slow. Give it another shuffle.",
              align: "center",
            },
          },
          shuffle_btn: {
            type: "button",
            props: { label: "Shuffle", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: self } } },
          },
          share_btn: shareBtn(self),
        },
      },
    };
  }

  if (casts.length === 0) {
    return {
      version: "1.0",
      theme: { accent: "gray" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md", justify: "center" },
            children: ["title", "msg", "shuffle_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "No images right now",
              weight: "bold",
              align: "center",
            },
          },
          msg: {
            type: "text",
            props: {
              content:
                "Nothing image-heavy in the recent feed. Shuffle and try again.",
              align: "center",
            },
          },
          shuffle_btn: {
            type: "button",
            props: { label: "Shuffle", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: self } } },
          },
          share_btn: shareBtn(self),
        },
      },
    };
  }

  // Pick a random image cast
  const cast = casts[Math.floor(Math.random() * casts.length)];
  const imageUrl = getImageUrl(cast);

  if (!imageUrl) {
    // Shouldn't happen since we filtered, but be safe
    return {
      version: "1.0",
      theme: { accent: "blue" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md", justify: "center" },
            children: ["title", "msg", "shuffle_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: { content: "Image unavailable", weight: "bold", align: "center" },
          },
          msg: {
            type: "text",
            props: {
              content: "That one didn't load. Try another.",
              align: "center",
            },
          },
          shuffle_btn: {
            type: "button",
            props: { label: "Shuffle", variant: "primary", icon: "refresh-cw" },
            on: { press: { action: "submit", params: { target: self } } },
          },
          share_btn: shareBtn(self),
        },
      },
    };
  }

  // Render the image card
  const posterHandle = `@${cast.author.username}`;
  const castText = (cast.text ?? "").trim();
  const truncText =
    castText.length > 120 ? castText.slice(0, 117) + "..." : castText;

  const pageChildren: string[] = ["title", "cast_img"];
  if (truncText) pageChildren.push("cast_text");
  pageChildren.push("by_text", "sep", "view_btn", "shuffle_btn", "share_btn");

  const elements: Record<string, SnapElementInput> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: pageChildren,
    },
    title: {
      type: "text",
      props: { content: "Random Image", weight: "bold", align: "center" },
    },
    cast_img: {
      type: "image",
      props: { src: imageUrl, aspectRatio: "4:3" },
    },
    by_text: {
      type: "text",
      props: { content: `Posted by ${posterHandle}`, size: "sm" },
    },
    sep: { type: "separator", props: {} },
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
    shuffle_btn: {
      type: "button",
      props: { label: "Shuffle", variant: "secondary", icon: "refresh-cw" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareBtn(self),
  };

  if (truncText) {
    elements["cast_text"] = {
      type: "text",
      props: { content: truncText, size: "sm" },
    };
  }

  return {
    version: "1.0",
    theme: { accent: "blue" },
    ui: { root: "page", elements },
  };
});

export default app;
