/**
 * loud-links — community YouTube link pool.
 *
 * Drop a YouTube link into the shared pool. Hit "Random link" to get
 * one back from everything people have added. Play it loud.
 *
 * GET:  Input field for a YouTube URL + two submit buttons.
 * POST ?action=add:    Validate URL, store in Turso, show confirmation.
 * POST ?action=random: Pick a random URL from the pool, show it.
 *
 * Components: text, input, button, separator
 * Accent: red
 * State: Turso KV (persistent URL list)
 * Actions: submit, open_url
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "loud-links";
const URLS_KEY = "loud-links:urls";
const MAX_URLS = 500;

async function getUrls(): Promise<string[]> {
  const val = await store.get(URLS_KEY);
  return Array.isArray(val) ? (val as string[]) : [];
}

function isYouTubeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.hostname === "youtube.com" ||
      u.hostname === "www.youtube.com" ||
      u.hostname === "m.youtube.com" ||
      u.hostname === "youtu.be" ||
      u.hostname === "music.youtube.com"
    );
  } catch {
    return false;
  }
}

function normalize(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

// ── Views ─────────────────────────────────────────────────────────────────────

function homeView(addTarget: string, randomTarget: string, count: number): SnapHandlerResult {
  const countLine =
    count === 0
      ? "No links yet. Be the first."
      : `${count} link${count === 1 ? "" : "s"} in the pool`;

  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "sub", "url_input", "add_btn", "sep", "random_btn", "count_text"],
        },
        title: {
          type: "text",
          props: { content: "Loud Links 🔊", weight: "bold", align: "center" },
        },
        sub: {
          type: "text",
          props: {
            content: "Drop a YouTube link. Get a random one back.",
            size: "sm",
            align: "center",
          },
        },
        url_input: {
          type: "input",
          props: {
            name: "url",
            type: "text",
            label: "YouTube URL",
            placeholder: "https://youtu.be/...",
            maxLength: 280,
          },
        },
        add_btn: {
          type: "button",
          props: { label: "Add link", variant: "primary" },
          on: { press: { action: "submit", params: { target: addTarget } } },
        },
        sep: { type: "separator", props: {} },
        random_btn: {
          type: "button",
          props: { label: "Random link 🎲", variant: "secondary" },
          on: { press: { action: "submit", params: { target: randomTarget } } },
        },
        count_text: {
          type: "text",
          props: { content: countLine, size: "sm", align: "center" },
        },
      },
    },
  };
}

function confirmView(
  addTarget: string,
  randomTarget: string,
  count: number,
  duplicate = false,
): SnapHandlerResult {
  const msg = duplicate
    ? "Already in the pool — good taste tho."
    : `Added. Pool now has ${count} link${count === 1 ? "" : "s"}.`;

  return {
    version: "1.0",
    theme: { accent: "red" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["ok_title", "ok_msg", "sep", "random_btn", "back_btn"],
        },
        ok_title: {
          type: "text",
          props: { content: "Link added 🔊", weight: "bold", align: "center" },
        },
        ok_msg: {
          type: "text",
          props: { content: msg, size: "sm", align: "center" },
        },
        sep: { type: "separator", props: {} },
        random_btn: {
          type: "button",
          props: { label: "Random link 🎲", variant: "primary" },
          on: { press: { action: "submit", params: { target: randomTarget } } },
        },
        back_btn: {
          type: "button",
          props: { label: "Add another", variant: "secondary" },
          on: { press: { action: "submit", params: { target: addTarget } } },
        },
      },
    },
  };
}

function errorView(addTarget: string, msg: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["err_title", "err_msg", "sep", "back_btn"],
        },
        err_title: {
          type: "text",
          props: { content: "Hmm 🤔", weight: "bold", align: "center" },
        },
        err_msg: {
          type: "text",
          props: { content: msg, size: "sm", align: "center" },
        },
        sep: { type: "separator", props: {} },
        back_btn: {
          type: "button",
          props: { label: "Try again", variant: "secondary" },
          on: { press: { action: "submit", params: { target: addTarget } } },
        },
      },
    },
  };
}

function randomView(
  addTarget: string,
  randomTarget: string,
  randomUrl: string,
  count: number,
): SnapHandlerResult {
  const displayUrl =
    randomUrl.length > 60 ? randomUrl.slice(0, 57) + "..." : randomUrl;
  const poolText = `From a pool of ${count} link${count === 1 ? "" : "s"}`;

  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["rand_title", "url_text", "pool_text", "open_btn", "sep", "row"],
        },
        rand_title: {
          type: "text",
          props: { content: "Here's one 🎲", weight: "bold", align: "center" },
        },
        url_text: {
          type: "text",
          props: { content: displayUrl, size: "sm", align: "center" },
        },
        pool_text: {
          type: "text",
          props: { content: poolText, size: "sm", align: "center" },
        },
        open_btn: {
          type: "button",
          props: { label: "Open video 🔊", variant: "primary", icon: "play" },
          on: { press: { action: "open_url", params: { target: randomUrl } } },
        },
        sep: { type: "separator", props: {} },
        row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["another_btn", "add_btn"],
        },
        another_btn: {
          type: "button",
          props: { label: "Another 🎲", variant: "secondary" },
          on: { press: { action: "submit", params: { target: randomTarget } } },
        },
        add_btn: {
          type: "button",
          props: { label: "Add a link", variant: "secondary" },
          on: { press: { action: "submit", params: { target: addTarget } } },
        },
      },
    },
  };
}

function emptyView(addTarget: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["empty_title", "empty_msg", "sep", "add_btn"],
        },
        empty_title: {
          type: "text",
          props: { content: "Pool's empty 🫙", weight: "bold", align: "center" },
        },
        empty_msg: {
          type: "text",
          props: {
            content: "No links yet. Drop the first one.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        add_btn: {
          type: "button",
          props: { label: "Add a link", variant: "primary" },
          on: { press: { action: "submit", params: { target: addTarget } } },
        },
      },
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const base = snapUrl(ctx.request, SNAP_NAME);
  const addTarget = base + "?action=add";
  const randomTarget = base + "?action=random";

  const reqUrl = new URL(ctx.request.url);
  const actionParam = reqUrl.searchParams.get("action");

  // GET: initial render
  if (ctx.action.type === "get") {
    const urls = await getUrls();
    return homeView(addTarget, randomTarget, urls.length);
  }

  // POST ?action=random (or no action = treat as random)
  if (actionParam !== "add") {
    const urls = await getUrls();
    if (urls.length === 0) return emptyView(addTarget);
    const picked = urls[Math.floor(Math.random() * urls.length)];
    return randomView(addTarget, randomTarget, picked, urls.length);
  }

  // POST ?action=add
  const rawUrl = ctx.action.inputs?.url as string | undefined;
  const trimmed = (rawUrl ?? "").trim();

  if (!trimmed) {
    return errorView(addTarget, "Paste a YouTube link first.");
  }

  const normalized = normalize(trimmed);

  if (!isYouTubeUrl(normalized)) {
    return errorView(addTarget, "That doesn't look like a YouTube link.");
  }

  const urls = await getUrls();
  const isDuplicate = urls.includes(normalized);

  if (!isDuplicate) {
    const updated = [...urls, normalized].slice(-MAX_URLS);
    await store.set(URLS_KEY, updated);
    return confirmView(addTarget, randomTarget, updated.length);
  }

  return confirmView(addTarget, randomTarget, urls.length, true);
});

export default app;
