/**
 * movie-emoji — guess the movie from emoji clues.
 *
 * Components: input, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "movie-emoji";

type Elements = SnapHandlerResult["ui"]["elements"];

type Clue = {
  emojis: string;
  answer: string;
  fact: string;
};

const CLUES: Clue[] = [
  {
    emojis: "🦈🌊🚤",
    answer: "Jaws",
    fact: "The shark barely worked, so suspense did the heavy lifting.",
  },
  {
    emojis: "🧙‍♂️💍🌋",
    answer: "The Lord of the Rings",
    fact: "One tiny ring caused an absolutely unreasonable amount of walking.",
  },
  {
    emojis: "🚢🧊💔",
    answer: "Titanic",
    fact: "A door debate has outlived half the internet.",
  },
  {
    emojis: "🦖🏝️🚙",
    answer: "Jurassic Park",
    fact: "The T. rex entrance remains a perfect bad-idea alarm bell.",
  },
  {
    emojis: "👽🚲🌕",
    answer: "E.T.",
    fact: "The bike silhouette did more for moon branding than NASA merch.",
  },
  {
    emojis: "🥊🐅🏆",
    answer: "Rocky",
    fact: "The stairs turned cardio into cinema.",
  },
];

function clueIndex(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(CLUES.length - 1, Math.trunc(parsed)));
}

function clueFor(index: number): Clue {
  return CLUES[index] ?? CLUES[0];
}

function normalizeGuess(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isCorrectGuess(guess: string, answer: string): boolean {
  const cleanGuess = normalizeGuess(guess);
  const cleanAnswer = normalizeGuess(answer);
  return cleanGuess.length > 0 && (cleanGuess === cleanAnswer || cleanAnswer.includes(cleanGuess) || cleanGuess.includes(cleanAnswer));
}

function shareButton(self: string, text = "I found a tiny movie-emoji quiz on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, clue = CLUES[0], index = 0): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sub", "clue", "guess", "submit", "share_btn"],
    },
    title: { type: "text", props: { content: "Movie Emoji", weight: "bold", align: "center" } },
    sub: { type: "text", props: { content: "Decode the tiny emoji poster. Type your movie guess below.", size: "sm", align: "center" } },
    clue: { type: "text", props: { content: clue.emojis, size: "lg", weight: "bold", align: "center" } },
    guess: {
      type: "input",
      props: { name: "guess", label: "Your guess", placeholder: "Type the movie title", maxLength: 80 },
    },
    submit: { type: "button", props: { label: "Lock guess", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?clue=${index}` } } } },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, clue: Clue, index: number, guess: string): SnapHandlerResult {
  const correct = isCorrectGuess(guess, clue.answer);
  const nextIndex = (index + 1) % CLUES.length;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "answer", "fact", "again", "share_btn"],
    },
    title: { type: "text", props: { content: clue.emojis, size: "lg", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: correct ? "Correct" : "Plot twist", variant: "outline" } },
    answer: { type: "text", props: { content: correct ? `Yep — ${clue.answer}.` : `It was ${clue.answer}. You typed ${guess || "nothing"}.`, align: "center" } },
    fact: { type: "text", props: { content: clue.fact, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "New clue", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1&clue=${nextIndex}` } } } },
    share_btn: shareButton(self, correct ? `I solved ${clue.emojis} on Movie Emoji.` : `Movie Emoji stumped me with ${clue.emojis}.`),
  };

  return { version: "1.0", theme: { accent: correct ? "green" : "amber" }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const index = clueIndex(url.searchParams.get("clue"));
  const clue = clueFor(index);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self, clue, index);
  }

  const guess = String(ctx.action.inputs?.guess ?? "");
  return resultPage(self, clue, index, guess);
});

export default app;
