/**
 * dylsteck-articles — RSS feed gallery for dylansteck.com
 *
 * Built for @dylsteck.eth — browse all articles from Dylan Steck's blog
 * one at a time, with prev/next navigation and a direct open link.
 *
 * GET/POST: fetch RSS, parse articles, display current article at ?index=N
 * Navigation via submit targeting self?index=N (index passed in URL)
 *
 * No persistent state needed — all state lives in the URL.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "dylsteck-articles";
const RSS_URL = "https://www.dylansteck.com/rss";

interface Article {
  title: string;
  link: string;
  excerpt: string;
}

/** Strip HTML tags and decode common entities for plain-text display. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchArticles(): Promise<Article[]> {
  const res = await fetch(RSS_URL, {
    headers: { "User-Agent": "FarcasterSnapBot/1.0" },
  });
  const xml = await res.text();

  const articles: Article[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    // Title (plain or CDATA)
    const titleM = itemXml.match(
      /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([^<]*)<\/title>/,
    );
    const title = (titleM?.[1] ?? titleM?.[2] ?? "").trim();

    // Link
    const linkM = itemXml.match(/<link>([^<]*)<\/link>/);
    const link = (linkM?.[1] ?? "").trim();

    // Prefer content:encoded for excerpt, fall back to description
    const contentM = itemXml.match(
      /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/,
    );
    const descM = itemXml.match(
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([^<]*)<\/description>/,
    );
    const raw = contentM?.[1] ?? descM?.[1] ?? descM?.[2] ?? "";
    const stripped = stripHtml(raw);
    const excerpt =
      stripped.length > 250 ? stripped.slice(0, 247) + "…" : stripped;

    if (title && link) {
      articles.push({ title, link, excerpt });
    }
  }

  return articles;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // Index lives in the URL query string — works for both GET and POST.
  const url = new URL(ctx.request.url);
  const rawIdx = parseInt(url.searchParams.get("index") ?? "0", 10);

  // Fetch articles — errors return a simple fallback screen.
  let articles: Article[] = [];
  try {
    articles = await fetchArticles();
  } catch {
    const errResp: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "blue" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "err"],
          },
          title: {
            type: "text",
            props: { content: "Dylan Steck's Blog", weight: "bold" },
          },
          err: {
            type: "text",
            props: {
              content: "Couldn't load articles right now. Try again soon.",
              size: "sm",
            },
          },
        },
      },
    };
    return errResp;
  }

  if (articles.length === 0) {
    const emptyResp: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "blue" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "empty"],
          },
          title: {
            type: "text",
            props: { content: "Dylan Steck's Blog", weight: "bold" },
          },
          empty: {
            type: "text",
            props: { content: "No articles found.", size: "sm" },
          },
        },
      },
    };
    return emptyResp;
  }

  const idx = Math.max(
    0,
    Math.min(articles.length - 1, isNaN(rawIdx) ? 0 : rawIdx),
  );
  const article = articles[idx];
  const total = articles.length;
  const hasPrev = idx > 0;
  const hasNext = idx < total - 1;

  const counterText = `${idx + 1} of ${total} — dylansteck.com`;
  // Truncate title at 100 chars for clean display
  const titleDisplay =
    article.title.length > 100
      ? article.title.slice(0, 97) + "…"
      : article.title;
  // Excerpt stays within the 320-char text content limit
  const excerptDisplay =
    article.excerpt.length > 260
      ? article.excerpt.slice(0, 257) + "…"
      : article.excerpt;

  // Build nav buttons conditionally
  const navElements: Record<string, unknown> = {};
  const navChildren: string[] = [];

  if (hasPrev) {
    navChildren.push("prevBtn");
    navElements["prevBtn"] = {
      type: "button",
      props: { label: "← Previous", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: `${self}?index=${idx - 1}` },
        },
      },
    };
  }
  if (hasNext) {
    navChildren.push("nextBtn");
    navElements["nextBtn"] = {
      type: "button",
      props: { label: "Next →", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: `${self}?index=${idx + 1}` },
        },
      },
    };
  }

  const hasNav = navChildren.length > 0;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "blue" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "counter",
            "titleEl",
            "excerptEl",
            ...(hasNav ? ["navRow"] : []),
            "openBtn",
            "shareBtn",
          ],
        },
        counter: {
          type: "text",
          props: { content: counterText, size: "sm" },
        },
        titleEl: {
          type: "text",
          props: { content: titleDisplay, weight: "bold" },
        },
        excerptEl: {
          type: "text",
          props: { content: excerptDisplay, size: "sm" },
        },
        ...(hasNav
          ? {
              navRow: {
                type: "stack",
                props: { direction: "horizontal", gap: "sm" },
                children: navChildren,
              },
              ...navElements,
            }
          : {}),
        openBtn: {
          type: "button",
          props: {
            label: "Open article",
            variant: "primary",
            icon: "external-link",
          },
          on: {
            press: {
              action: "open_url",
              params: { target: article.link },
            },
          },
        },
        shareBtn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "browsing @dylsteck.eth's blog as a Farcaster snap",
                embeds: [self],
              },
            },
          },
        },
      } as SnapHandlerResult["ui"]["elements"],
    },
  };

  return response;
});

export default app;
