/**
 * thread-compass — "Thread Compass"
 *
 * Paste a draft cast or thread topic, get a "what kind of thread is this"
 * reading (hot/cold/reply-bait/serendipity) plus a survival tip.
 * Deterministic from text analysis, no API.
 *
 * Components: input, toggle_group, text, badge, item, item_group, separator, button, stack
 * Actions: submit, compose_cast
 * Accent: purple
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "thread-compass";

type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Elements = SnapHandlerResult["ui"]["elements"];
type Reading = "hot" | "cold" | "bait" | "serendipity" | "lore" | "rant";

const READING_META: Record<Reading, { label: string; emoji: string; accent: Accent; blurb: string }> = {
  hot:          { label: "Hot thread",       emoji: "🔥", accent: "red",    blurb: "energy is rising, replies are incoming" },
  cold:         { label: "Cold thread",      emoji: "❄️", accent: "blue",   blurb: "a quiet observation, low engagement expected" },
  bait:         { label: "Reply bait",       emoji: "🪤", accent: "amber",  blurb: "a leading question, the timeline will answer" },
  serendipity:  { label: "Serendipity pit",  emoji: "🌿", accent: "green",  blurb: "an open thread with low energy — perfect to wander" },
  lore:         { label: "Lore drop",        emoji: "📜", accent: "purple", blurb: "context-rich, the right reply will be rewarded" },
  rant:         { label: "Tiny rant",        emoji: "🌀", accent: "pink",   blurb: "takes are flying, stay cool or you'll feed it" },
};

const TIPS: Record<Reading, string[]> = {
  hot:         [
    "Reply early with a counter-take, not a recap.",
    "Pin a clarifying follow-up so the room doesn't fill with crosstalk.",
  ],
  cold:        [
    "Quote the funniest adjacent post in your reply to seed engagement.",
    "Add a small observation that wasn't already implied.",
  ],
  bait:        [
    "Answer in good faith, with one concrete example, then drop it.",
    "If you don't want replies, edit out the question mark.",
  ],
  serendipity: [
    "Reply to the most specific detail, not the headline.",
    "Thread a side question — the author loves tangents.",
  ],
  lore:        [
    "Acknowledge what's new and what came before, in one line each.",
    "Cite one source the room can dig into next.",
  ],
  rant:        [
    "Either boost the signal with a meme or wait 30 min before replying.",
    "Steer toward the fix, not the dunk.",
  ],
};

function cleanTopic(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function hashParts(parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const str = String(part);
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

interface Analysis {
  reading: Reading;
  confidence: number;
  signals: string[];
  urlHint: string | null;
  tipIndex: number;
}

function analyzeText(text: string, fid: number): Analysis {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasQuestion = /\?/.test(text);
  const hasExclaim = /!/.test(text);
  const hasLink = /https?:\/\//i.test(text);
  const hasFarcasterUser = /@\w/i.test(text);
  const hasAllCaps = /\b[A-Z]{3,}\b/.test(text);
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
  const strongOpinionWords = (lower.match(/\b(always|never|trash|best|worst|garbage|elite|dead|over|hate|love|sick)\b/g) ?? []).length;
  const loreWords = (lower.match(/\b(origin|first|history|why|because|started|when|in 20\d\d)\b/g) ?? []).length;
  const ragebait = (lower.match(/\b(unpopular opinion|hot take|controversial|change my mind)\b/gi) ?? []).length;

  // Signal-by-signal scoring.
  const scores: Record<Reading, number> = {
    hot: 0, cold: 0, bait: 0, serendipity: 0, lore: 0, rant: 0,
  };
  const signals: string[] = [];

  if (hasExclaim) {
    scores.hot += 2;
    scores.rant += 1;
    signals.push("exclamation present");
  }
  if (hasAllCaps) {
    scores.hot += 1;
    scores.rant += 2;
    signals.push("all-caps words");
  }
  if (strongOpinionWords >= 1) {
    scores.hot += 1;
    scores.rant += 2;
    signals.push(`strong-opinion words (${strongOpinionWords})`);
  }
  if (ragebait > 0) {
    scores.bait += 3;
    scores.rant += 1;
    signals.push("ragebait phrasing");
  }
  if (hasQuestion) {
    scores.bait += 2;
    scores.serendipity += 1;
    signals.push("question mark");
  }
  if (loreWords >= 1) {
    scores.lore += 3;
    signals.push(`lore words (${loreWords})`);
  }
  if (hasFarcasterUser) {
    scores.hot += 1;
    scores.lore += 1;
    signals.push("mentions a Farcaster handle");
  }
  if (hasLink) {
    scores.lore += 1;
    signals.push("link in draft");
  }
  if (hasEmoji) {
    scores.hot += 1;
    scores.serendipity += 1;
    signals.push("emoji present");
  }
  if (wordCount < 12) {
    scores.cold += 2;
    scores.bait += 1;
    signals.push("very short");
  } else if (wordCount < 30) {
    scores.cold += 1;
    scores.serendipity += 1;
    signals.push("short read");
  } else if (wordCount < 90) {
    scores.lore += 1;
    scores.serendipity += 1;
    signals.push("medium length");
  } else {
    scores.lore += 2;
    signals.push("long-form draft");
  }
  if (!hasQuestion && !hasExclaim && strongOpinionWords === 0) {
    scores.cold += 1;
    scores.serendipity += 1;
    signals.push("neutral tone");
  }

  // Sort, pick top.
  const order = (Object.entries(scores) as Array<[Reading, number]>)
    .sort((a, b) => b[1] - a[1] || (hashParts([fid, a[0]]) - hashParts([fid, b[0]])));
  const top = order[0]!;
  const reading: Reading = top[0];
  const topScore = top[1];

  const total = order.reduce((sum, [, s]) => sum + s, 0) || 1;
  const confidence = Math.max(45, Math.min(96, Math.round((topScore / total) * 100) + (topScore >= 4 ? 6 : 0)));

  // URL hint
  const urlMatch = text.match(/https?:\/\/\S+/i);
  const urlHint = urlMatch ? urlMatch[0].slice(0, 60) : null;

  const tipIndex = hashParts([fid, reading, text.slice(0, 32)]) % TIPS[reading].length;

  return { reading, confidence, signals: signals.slice(0, 5), urlHint, tipIndex };
}

function shareButton(self: string, text: string) {
  return {
    type: "button" as const,
    props: { label: "Share reading", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const childSet = ["title", "intro", "topic", "actions"];
  if (error) childSet.splice(2, 0, "error");

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: childSet },
    title: { type: "text", props: { content: "🧭 Thread Compass", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Paste a thread topic, draft, or URL. Get a reading on what kind of thread it is — and how to survive it.",
        size: "sm",
        align: "center",
      },
    },
    topic: {
      type: "input",
      props: {
        name: "topic",
        label: "Draft or topic",
        placeholder: "paste a draft or just a vibe…",
        maxLength: 280,
      },
    },
    read: {
      type: "button",
      props: { label: "Read the thread", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=read` } } },
    },
    share_btn: shareButton(self, "Reading the timeline with Thread Compass 🧭"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["read", "share_btn"] },
  };
  if (error) elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, topic: string, analysis: Analysis): SnapHandlerResult {
  const meta = READING_META[analysis.reading];
  const tip = TIPS[analysis.reading][analysis.tipIndex]!;
  const confetti = analysis.confidence >= 84;
  const shareText = `${meta.emoji} ${meta.label} — ${meta.blurb}.`.slice(0, 240);

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "blurb", "meter", "signals", "url_note", "actions"],
    },
    title: { type: "text", props: { content: `${meta.emoji} ${meta.label}`, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: meta.label, variant: "outline" } },
    blurb: { type: "text", props: { content: meta.blurb, size: "sm", align: "center" } },
    meter: { type: "progress", props: { label: `Confidence: ${analysis.confidence}%`, value: analysis.confidence, max: 100, color: meta.accent } },
    sig_1: { type: "item", props: { title: "Signals", description: analysis.signals.length > 0 ? analysis.signals.join(" · ") : "no clear signals" } },
    sig_2: { type: "item", props: { title: "Survival tip", description: tip } },
    sig_3: { type: "item", props: { title: "Best reply", description: pickReplyStyle(analysis.reading) } },
    signals: { type: "item_group", props: {}, children: ["sig_1", "sig_2", "sig_3"] },
    url_note: {
      type: "text",
      props: { content: analysis.urlHint ? `🔗 Detected: ${analysis.urlHint}` : "", size: "sm", align: "center" },
    },
    again: {
      type: "button",
      props: { label: "Read another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return {
    version: "2.0",
    ...(confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: meta.accent },
    ui: { root: "page", elements },
  };
}

function pickReplyStyle(reading: Reading): string {
  switch (reading) {
    case "hot":         return "Counter-take in 280 chars or less.";
    case "cold":        return "Quote the funniest adjacent post.";
    case "bait":        return "Answer with a concrete example.";
    case "serendipity": return "Reply to the most specific detail.";
    case "lore":        return "Acknowledge what's new and what came before.";
    case "rant":        return "Steer toward the fix, not the dunk.";
  }
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const action = url.searchParams.get("action");
    if (action !== "read") {
      return startPage(self);
    }

    const topic = cleanTopic(ctx.action.inputs?.topic);
    if (!topic) {
      return startPage(self, "Paste a draft, topic, or URL to read.");
    }
    const analysis = analyzeText(topic, ctx.action.user.fid);
    return resultPage(self, topic, analysis);
  },
  {
    openGraph: {
      title: "Thread Compass",
      description: "Paste a thread draft or topic. Get a reading on what kind of thread it is.",
    },
  }
);

export { analyzeText, cleanTopic };
export default app;
