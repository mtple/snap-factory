/**
 * movie-emoji — guess the movie from emoji clues.
 *
 * Components: toggle_group, badge, text, separator, button, stack
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
  options: string[];
  fact: string;
};

const CLUES: Clue[] = [
  {
    emojis: "🦈🌊🚤",
    answer: "Jaws",
    options: ["Jaws", "Cast Away", "The Meg", "Life of Pi"],
    fact: "The shark barely worked, so suspense did the heavy lifting.",
  },
  {
    emojis: "🧙‍♂️💍🌋",
    answer: "The Lord of the Rings",
    options: ["The Lord of the Rings", "Willow", "Dune", "The Hobbit"],
    fact: "One tiny ring caused an absolutely unreasonable amount of walking.",
  },
  {
    emojis: "🚢🧊💔",
    answer: "Titanic",
    options: ["Titanic", "Poseidon", "Waterworld", "Pearl Harbor"],
    fact: "A door debate has outlived half the internet.",
  },
  {
    emojis: "🦖🏝️🚙",
    answer: "Jurassic Park",
    options: ["Jurassic Park", "King Kong", "The Lost World", "Godzilla"],
    fact: "The T. rex entrance remains a perfect bad-idea alarm bell.",
  },
  {
    emojis: "👽🚲🌕",
    answer: "E.T.",
    options: ["E.T.", "Close Encounters", "Wall-E", "Interstellar"],
    fact: "The bike silhouette did more for moon branding than NASA merch.",
  },
  {
    emojis: "🥊🐅🏆",
    answer: "Rocky",
    options: ["Rocky", "Creed", "Raging Bull", "Million Dollar Baby"],
    fact: "The stairs turned cardio into cinema.",
  },
];

function clueFor(fid: number): Clue {
  return CLUES[Math.abs(fid || 0) % CLUES.length] ?? CLUES[0];
}

function shareButton(self: string, text = "I found a tiny movie-emoji quiz on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function answerOptions(clue: Clue) {
  return clue.options.map((option) => ({ label: option, value: option }));
}

function startPage(self: string, clue = CLUES[0]): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sub", "clue", "guess", "submit", "share_btn"],
    },
    title: { type: "text", props: { content: "Movie Emoji", weight: "bold", align: "center" } },
    sub: { type: "text", props: { content: "Decode the tiny emoji poster. One guess, no overthinking.", size: "sm", align: "center" } },
    clue: { type: "text", props: { content: clue.emojis, size: "lg", weight: "bold", align: "center" } },
    guess: {
      type: "toggle_group",
      props: { name: "guess", label: "Your guess", defaultValue: clue.options[0], options: answerOptions(clue) },
    },
    submit: { type: "button", props: { label: "Lock guess", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, clue: Clue, guess: string): SnapHandlerResult {
  const correct = guess === clue.answer;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "answer", "fact", "again", "share_btn"],
    },
    title: { type: "text", props: { content: clue.emojis, size: "lg", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: correct ? "Correct" : "Plot twist", variant: "outline" } },
    answer: { type: "text", props: { content: correct ? `Yep — ${clue.answer}.` : `It was ${clue.answer}. You picked ${guess || "nothing"}.`, align: "center" } },
    fact: { type: "text", props: { content: clue.fact, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "New clue", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, correct ? `I solved ${clue.emojis} on Movie Emoji.` : `Movie Emoji stumped me with ${clue.emojis}.`),
  };

  return { version: "1.0", theme: { accent: correct ? "green" : "amber" }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const clue = clueFor(ctx.action.fid ?? 0);
  const guess = String(ctx.action.inputs?.guess ?? "");
  return resultPage(self, clue, guess);
});

export default app;
