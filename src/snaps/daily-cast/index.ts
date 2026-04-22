/**
 * daily-cast — A fresh question every day. Answer it in a cast.
 *
 * Shows a daily rotating prompt with a matching icon. Tap "I'll answer this"
 * to submit (increments the daily Turso counter, then shows compose_cast).
 * Encourages real conversation instead of passive voting.
 *
 * Components: text, icon, button, badge, separator, stack
 * Actions:    submit, compose_cast
 * State:      Turso KV (daily response counter)
 * Theme:      teal
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "daily-cast";

interface Prompt {
  text: string;
  icon: string;
  castPrefix: string;
}

const PROMPTS: Prompt[] = [
  { text: "What's the most interesting thing you've learned this week?", icon: "star", castPrefix: "this week I learned:" },
  { text: "Drop one underrated account everyone on Farcaster should follow.", icon: "users", castPrefix: "underrated follow:" },
  { text: "What snap do you wish existed on Farcaster?", icon: "zap", castPrefix: "the snap I wish existed:" },
  { text: "What are you building right now? One sentence.", icon: "trending-up", castPrefix: "currently building:" },
  { text: "What's a hot take you'd actually defend?", icon: "flame", castPrefix: "hot take:" },
  { text: "What's the last thing that genuinely made you laugh?", icon: "heart", castPrefix: "made me laugh:" },
  { text: "What's a tool in your stack that's criminally underrated?", icon: "bookmark", castPrefix: "underrated tool:" },
  { text: "What did you learn the hard way this year?", icon: "info", castPrefix: "learned the hard way:" },
  { text: "Drop your current song on repeat.", icon: "play", castPrefix: "on repeat rn:" },
  { text: "What's a Farcaster moment that actually stuck with you?", icon: "message-circle", castPrefix: "farcaster moment that hit:" },
  { text: "Who on Farcaster should way more people know about?", icon: "user", castPrefix: "follow this person:" },
  { text: "What's something you changed your mind about recently?", icon: "refresh-cw", castPrefix: "changed my mind on:" },
  { text: "What's your most unpopular opinion about crypto?", icon: "alert-triangle", castPrefix: "unpopular opinion:" },
  { text: "What's the best advice you've gotten this year?", icon: "star", castPrefix: "best advice I got:" },
  { text: "What are you most excited to see built on Base?", icon: "zap", castPrefix: "most excited to see built:" },
  { text: "What's one habit that changed how you work?", icon: "check", castPrefix: "habit that changed things:" },
  { text: "What made today interesting?", icon: "heart", castPrefix: "today was interesting because:" },
  { text: "What project are you rooting for right now?", icon: "trophy", castPrefix: "rooting for:" },
  { text: "What should Farcaster be talking about more?", icon: "message-circle", castPrefix: "we should talk more about:" },
  { text: "What's something you were wrong about for a long time?", icon: "refresh-cw", castPrefix: "I was wrong about:" },
  { text: "Who's a builder or creator inspiring you lately?", icon: "users", castPrefix: "inspiring builder rn:" },
  { text: "What would you tell yourself from two years ago?", icon: "clock", castPrefix: "to me 2 years ago:" },
  { text: "What song defines your energy right now?", icon: "play", castPrefix: "song that defines my energy rn:" },
  { text: "What's a project you saw recently that genuinely impressed you?", icon: "trending-up", castPrefix: "this impressed me:" },
  { text: "What's the best thing you've shipped or built this month?", icon: "trophy", castPrefix: "shipped this month:" },
  { text: "What simple thing has made a big difference for you?", icon: "star", castPrefix: "simple thing, big impact:" },
  { text: "Where do you think crypto culture is headed?", icon: "flame", castPrefix: "crypto culture is heading:" },
  { text: "Who in web3 deserves more recognition right now?", icon: "star", castPrefix: "deserves more recognition:" },
  { text: "What's the most interesting thing you've read this week?", icon: "bookmark", castPrefix: "worth reading:" },
  { text: "What are you genuinely optimistic about?", icon: "heart", castPrefix: "genuinely optimistic about:" },
];

function getTodayPrompt(): Prompt {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return PROMPTS[dayOfYear % PROMPTS.length];
}

function getTodayKey(): string {
  return `daily-cast:count:${new Date().toISOString().slice(0, 10)}`;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const prompt = getTodayPrompt();

  // ── POST: user committed to answering — increment count, show compose page ──
  if (ctx.action.type === "post") {
    const key = getTodayKey();
    const current = Number(await store.get(key) ?? 0);
    await store.set(key, current + 1);
    const newCount = current + 1;

    const countLine = newCount === 1
      ? "You're the first one today. 🐢"
      : `You and ${newCount - 1} other${newCount - 1 !== 1 ? "s" : ""} are answering today.`;

    const composePrefill = `${prompt.castPrefix}\n\n(via @freeturtle daily cast)`;

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "teal" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["header", "count_text", "sep", "prompt_reminder", "spacer_text", "sep2", "write_btn", "share_btn"],
          },
          header: {
            type: "text",
            props: { content: "Now write your answer", weight: "bold", align: "center" },
          },
          count_text: {
            type: "text",
            props: { content: countLine, size: "sm", align: "center" },
          },
          sep: { type: "separator", props: {} },
          prompt_reminder: {
            type: "text",
            props: { content: prompt.text, size: "sm", align: "center" },
          },
          spacer_text: {
            type: "text",
            props: { content: "Tap below — the composer opens with your prompt pre-filled.", size: "sm", align: "center" },
          },
          sep2: { type: "separator", props: {} },
          write_btn: {
            type: "button",
            props: { label: "Write my answer", variant: "primary" },
            on: {
              press: {
                action: "compose_cast",
                params: { text: composePrefill },
              },
            },
          },
          share_btn: {
            type: "button",
            props: { label: "Share this prompt", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "today's question from @freeturtle:",
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

  // ── GET: show today's prompt ──────────────────────────────────────────────
  const key = getTodayKey();
  const count = Number(await store.get(key) ?? 0);

  const countText =
    count === 0
      ? "Be the first to answer today."
      : count === 1
      ? "1 person answering today."
      : `${count} people answering today.`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["header", "sep1", "icon_wrap", "prompt_text", "sep2", "count_badge", "answer_btn", "share_btn"],
        },
        header: {
          type: "text",
          props: { content: "The Daily Cast", weight: "bold", align: "center" },
        },
        sep1: { type: "separator", props: {} },
        icon_wrap: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "center" },
          children: ["prompt_icon"],
        },
        prompt_icon: {
          type: "icon",
          props: { name: prompt.icon, size: "md", color: "teal" },
        },
        prompt_text: {
          type: "text",
          props: { content: prompt.text, weight: "bold", align: "center" },
        },
        sep2: { type: "separator", props: {} },
        count_badge: {
          type: "badge",
          props: { label: countText, variant: "outline" },
        },
        answer_btn: {
          type: "button",
          props: { label: "I'll answer this", variant: "primary" },
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
                text: "today's question from @freeturtle:",
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
