/**
 * yt-discover — YouTube discovery snap for web3/Farcaster topics.
 *
 * Page 1: Pick a topic (toggle_group)
 * Page 2+: Browse latest YouTube videos for that topic — thumbnail, title,
 *           channel name, and nav buttons. Tap Watch to open in YouTube.
 *
 * Components: text, image, button, badge, toggle_group, separator, stack
 * Accent: red (YouTube red)
 * State: stateless — re-fetches YouTube API on each nav
 * Actions: submit, open_url, compose_cast
 * Requires: YOUTUBE_API_KEY env var
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "yt-discover";

const TOPICS = [
  { label: "Farcaster", query: "farcaster protocol social" },
  { label: "Base", query: "base network ethereum L2" },
  { label: "Web3 gaming", query: "web3 gaming onchain" },
  { label: "Crypto news", query: "crypto news this week" },
] as const;

type TopicLabel = (typeof TOPICS)[number]["label"];

interface YTVideo {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  watchUrl: string;
}

async function fetchVideos(query: string): Promise<{ videos: YTVideo[]; error?: string }> {
  const key = process.env.YOUTUBE_API_KEY ?? "";
  if (!key) return { videos: [], error: "YOUTUBE_API_KEY not configured" };

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "6");
  url.searchParams.set("order", "date");
  url.searchParams.set("type", "video");
  url.searchParams.set("key", key);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (e) {
    return { videos: [], error: `Network error: ${String(e)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { videos: [], error: `YouTube API ${res.status}: ${body.slice(0, 120)}` };
  }
  const data = (await res.json()) as {
    items?: {
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails: { high?: { url: string }; default?: { url: string } };
      };
    }[];
  };

  const videos = (data.items ?? []).map((item) => {
    const videoId = item.id.videoId;
    return {
      id: videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails.high?.url ??
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  });
  return { videos };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function renderPicker(): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["title", "subtitle", "sep", "topic_picker", "search_btn"],
        },
        title: {
          type: "text",
          props: { content: "YouTube Discover 📺", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: { content: "Browse the latest web3 videos.", size: "sm", align: "center" },
        },
        sep: { type: "separator", props: {} },
        topic_picker: {
          type: "toggle_group",
          props: {
            name: "topic",
            label: "Pick a topic",
            options: TOPICS.map((t) => t.label),
            orientation: "vertical",
            variant: "outline",
            defaultValue: "Farcaster",
          },
        },
        search_btn: {
          type: "button",
          props: { label: "Browse videos →", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: "" } }, // set dynamically
          },
        },
      } as never,
    },
  };
}

function renderVideo(
  video: YTVideo,
  idx: number,
  total: number,
  topic: string,
  self: string,
): SnapHandlerResult {
  const prevUrl = `${self}?t=${encodeURIComponent(topic)}&i=${idx - 1}`;
  const nextUrl = `${self}?t=${encodeURIComponent(topic)}&i=${idx + 1}`;
  const backUrl = self;

  const children = [
    "nav_badge",
    "thumbnail",
    "title_text",
    "channel_text",
    "sep",
    "watch_btn",
    "sep2",
    "nav_row",
    "share_btn",
  ];

  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children,
        },
        nav_badge: {
          type: "badge",
          props: {
            label: `${idx + 1} of ${total} · ${topic}`,
            variant: "outline",
            color: "red",
          },
        },
        thumbnail: {
          type: "image",
          props: {
            src: video.thumbnail,
            aspectRatio: "16:9",
            alt: video.title,
          },
        },
        title_text: {
          type: "text",
          props: {
            content: truncate(video.title, 160),
            weight: "bold",
          },
        },
        channel_text: {
          type: "text",
          props: {
            content: `${truncate(video.channel, 60)} · ${formatDate(video.publishedAt)}`,
            size: "sm",
          },
        },
        sep: { type: "separator", props: {} },
        watch_btn: {
          type: "button",
          props: { label: "Watch on YouTube", variant: "primary" },
          on: { press: { action: "open_url", params: { target: video.watchUrl } } },
        },
        sep2: { type: "separator", props: {} },
        nav_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "between" },
          children: [
            ...(idx > 0 ? ["prev_btn"] : ["back_btn"]),
            ...(idx < total - 1 ? ["next_btn"] : ["back_btn2"]),
          ],
        },
        prev_btn: {
          type: "button",
          props: { label: "← Prev", variant: "secondary" },
          on: { press: { action: "submit", params: { target: prevUrl } } },
        },
        next_btn: {
          type: "button",
          props: { label: "Next →", variant: "secondary" },
          on: { press: { action: "submit", params: { target: nextUrl } } },
        },
        back_btn: {
          type: "button",
          props: { label: "← Topics", variant: "secondary" },
          on: { press: { action: "submit", params: { target: backUrl } } },
        },
        back_btn2: {
          type: "button",
          props: { label: "← Topics", variant: "secondary" },
          on: { press: { action: "submit", params: { target: backUrl } } },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `browsing ${topic} videos on YouTube via snap 📺`,
                embeds: [self],
              },
            },
          },
        },
      } as never,
    },
  };
}

function renderError(message: string, self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["title", "msg", "sep", "back_btn"],
        },
        title: {
          type: "text",
          props: { content: "YouTube Discover 📺", weight: "bold", align: "center" },
        },
        msg: {
          type: "text",
          props: { content: message, size: "sm", align: "center" },
        },
        sep: { type: "separator", props: {} },
        back_btn: {
          type: "button",
          props: { label: "← Try again", variant: "secondary" },
          on: { press: { action: "submit", params: { target: self } } },
        },
      } as never,
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);

  const topicParam = reqUrl.searchParams.get("t") ?? "";
  const idxParam = parseInt(reqUrl.searchParams.get("i") ?? "0", 10);

  // If we have a topic param (navigation between videos), fetch and show
  if (topicParam) {
    const topicDef = TOPICS.find((t) => t.label === topicParam);
    const query = topicDef?.query ?? topicParam;
    const { videos, error } = await fetchVideos(query);
    if (!videos.length) {
      return renderError(error ?? "No videos found. Try a different topic.", self);
    }
    const idx = Math.max(0, Math.min(idxParam, videos.length - 1));
    const video = videos[idx];
    if (!video) return renderError("Couldn't load this video.", self);
    return renderVideo(video, idx, videos.length, topicParam, self);
  }

  // GET with no params: show topic picker
  if (ctx.action.type === "get") {
    const snap = renderPicker();
    const btn = (snap.ui.elements as Record<string, { on?: { press?: { params?: { target?: string } } } }>)["search_btn"];
    if (btn?.on?.press?.params) btn.on.press.params.target = self;
    return snap;
  }

  // POST from topic picker
  const inputs = (ctx.action as { inputs?: Record<string, unknown> }).inputs ?? {};
  const chosenLabel = String(inputs["topic"] ?? "Farcaster") as TopicLabel;
  const topicDef = TOPICS.find((t) => t.label === chosenLabel) ?? TOPICS[0];

  const { videos, error } = await fetchVideos(topicDef.query);
  if (!videos.length) {
    return renderError(error ?? "No videos found right now. Try again shortly.", self);
  }

  const video = videos[0];
  if (!video) return renderError("Couldn't load videos.", self);
  return renderVideo(video, 0, videos.length, chosenLabel, self);
});

export default app;
