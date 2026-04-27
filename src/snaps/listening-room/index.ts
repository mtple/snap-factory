/**
 * listening-room — a daily music conversation prompt for Farcaster.
 *
 * Components: icon, badge, separator, text, button, stack
 * Actions: open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "listening-room";
const TORTOISE_URL = "https://farcaster.xyz/miniapps/0197c2c3-6650-349a-bc8f-9892abae9e4a/tortoise";

type Prompt = {
  question: string;
  ritual: string;
  badge: string;
  icon: string;
  prefill: string;
};

const PROMPTS: Prompt[] = [
  {
    question: "What song would make this Monday ten percent kinder?",
    ritual: "Queue one gentle track, then tell the room why it works.",
    badge: "Soft launch",
    icon: "heart",
    prefill: "today's listening room pick: ",
  },
  {
    question: "What is your current main-character walk-in song?",
    ritual: "Name the track that plays when the doors open.",
    badge: "Door music",
    icon: "play",
    prefill: "my walk-in song today: ",
  },
  {
    question: "Which album deserves a quiet reread this week?",
    ritual: "Pick the record you want people to sit with, not skim.",
    badge: "Deep cut",
    icon: "bookmark",
    prefill: "album worth revisiting: ",
  },
  {
    question: "What track has the best first thirty seconds?",
    ritual: "Drop the song that wins before the chorus arrives.",
    badge: "Cold open",
    icon: "zap",
    prefill: "best first 30 seconds: ",
  },
  {
    question: "What is your late-night headphones song right now?",
    ritual: "One track for the room after the lights go low.",
    badge: "After hours",
    icon: "clock",
    prefill: "late-night headphones pick: ",
  },
  {
    question: "Which song sounds like finishing something hard?",
    ritual: "Choose the tiny credits-roll anthem for today's win.",
    badge: "Credits roll",
    icon: "trophy",
    prefill: "sounds like finishing something hard: ",
  },
  {
    question: "What is the weirdest song you genuinely love?",
    ritual: "Bring the odd little track. No apology paragraph needed.",
    badge: "Odd gem",
    icon: "star",
    prefill: "weird song I genuinely love: ",
  },
];

export function getDailyPrompt(date = new Date()): Prompt {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return PROMPTS[Math.abs(day) % PROMPTS.length];
}

function shareButton(self: string) {
  return {
    type: "button" as const,
    props: { label: "Share room", variant: "secondary" as const },
    on: {
      press: {
        action: "compose_cast" as const,
        params: {
          text: "today's Listening Room is open on @freeturtle 🎧",
          embeds: [self],
        },
      },
    },
  };
}

function renderRoom(self: string, prompt: Prompt): SnapHandlerResult {
  const answerText = `${prompt.prefill}\n\n(via @freeturtle Listening Room)`;

  return {
    version: "1.0",
    theme: { accent: "green" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["top", "title", "question", "sep", "ritual", "actions", "share_btn"],
        },
        top: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "center" },
          children: ["room_icon", "badge"],
        },
        room_icon: {
          type: "icon",
          props: { name: prompt.icon, size: "md" },
        },
        badge: {
          type: "badge",
          props: { label: prompt.badge, variant: "outline" },
        },
        title: {
          type: "text",
          props: { content: "Listening Room", weight: "bold", align: "center" },
        },
        question: {
          type: "text",
          props: { content: prompt.question, align: "center" },
        },
        sep: { type: "separator", props: {} },
        ritual: {
          type: "text",
          props: { content: prompt.ritual, size: "sm", align: "center" },
        },
        answer: {
          type: "button",
          props: { label: "Answer prompt", variant: "primary" },
          on: { press: { action: "compose_cast", params: { text: answerText } } },
        },
        tortoise: {
          type: "button",
          props: { label: "Open Tortoise", variant: "secondary" },
          on: { press: { action: "open_url", params: { target: TORTOISE_URL } } },
        },
        actions: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["answer", "tortoise"],
        },
        share_btn: shareButton(self),
      },
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  return renderRoom(self, getDailyPrompt());
});

export { renderRoom };
export default app;
