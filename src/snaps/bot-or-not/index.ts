/**
 * bot-or-not — classify a suspicious Farcaster-style cast.
 *
 * Components: text, badge, toggle_group, separator, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "bot-or-not";

type Elements = Record<string, SnapElementInput>;
type Choice = "Human" | "Bot" | "Performance art";

type Specimen = {
  cast: string;
  answer: Choice;
  tell: string;
  share: string;
};

const SPECIMENS: Specimen[] = [
  {
    cast: "gm frens. shipping one small thing before coffee because the bugs can smell fear.",
    answer: "Human",
    tell: "Too specific, too tired, and exactly one bug away from a dramatic walk.",
    share: "I correctly detected a pre-coffee builder on Bot or Not.",
  },
  {
    cast: "This is insightful. Great thread. Value has been unlocked. Keep building ecosystem flywheel.",
    answer: "Bot",
    tell: "Maximum praise, minimum fingerprints. The flywheel has left the building.",
    share: "I spotted the engagement fog machine on Bot or Not.",
  },
  {
    cast: "I am pivoting my entire personality to become a calendar invite with knees.",
    answer: "Performance art",
    tell: "No model ships that sentence by accident. That is artisanal timeline theater.",
    share: "I found timeline performance art hiding in Bot or Not.",
  },
  {
    cast: "Need 3 beta testers for a thing that currently only works if you believe in it.",
    answer: "Human",
    tell: "A real builder would absolutely call faith a dependency.",
    share: "I passed the builder-smell test on Bot or Not.",
  },
  {
    cast: "Your post resonates strongly with community alignment and decentralized momentum.",
    answer: "Bot",
    tell: "No noun was harmed by specificity. Very bot-coded compliment sludge.",
    share: "I diagnosed compliment sludge on Bot or Not.",
  },
  {
    cast: "If this gets 10 likes I will replace my roadmap with a bowl of soup and call it agile.",
    answer: "Performance art",
    tell: "It has stakes, soup, and a methodology crime. That is posting as craft.",
    share: "I classified soup-based agile on Bot or Not.",
  },
];

const OPTIONS: Choice[] = ["Human", "Bot", "Performance art"];

function specimenIndex(value: string | null): number {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(SPECIMENS.length - 1, Math.trunc(parsed)));
}

function shareButton(self: string, text = "Bot or Not: classify the suspicious Farcaster cast."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share snap", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: { text, embeds: [self] },
      },
    },
  };
}

function renderStart(self: string, index: number): SnapHandlerResult {
  const specimen = SPECIMENS[index] ?? SPECIMENS[0];
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "cast", "picker", "submit_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Bot or Not", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `Specimen ${index + 1}/${SPECIMENS.length}`, variant: "outline" } },
    cast: {
      type: "text",
      props: { content: `“${specimen.cast}”`, align: "center" },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "choice",
        label: "Who posted this?",
        options: OPTIONS,
        orientation: "vertical",
        variant: "outline",
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Make the call", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?specimen=${index}` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "gray" }, ui: { root: "page", elements } };
}

function normalizeChoice(value: unknown): Choice {
  return OPTIONS.includes(value as Choice) ? (value as Choice) : "Human";
}

function renderResult(self: string, index: number, choice: Choice): SnapHandlerResult {
  const specimen = SPECIMENS[index] ?? SPECIMENS[0];
  const correct = choice === specimen.answer;
  const nextIndex = (index + 1) % SPECIMENS.length;
  const resultLine = correct ? `Correct: ${specimen.answer}.` : `Nope: ${specimen.answer}. You picked ${choice}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "verdict", "tell", "sep", "next_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Verdict delivered", weight: "bold", align: "center" } },
    verdict: { type: "badge", props: { label: correct ? "Correct" : "Timeline tricked you", variant: "outline" } },
    tell: {
      type: "text",
      props: { content: `${resultLine} ${specimen.tell}`, align: "center" },
    },
    sep: { type: "separator", props: {} },
    next_btn: {
      type: "button",
      props: { label: "Next specimen", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1&specimen=${nextIndex}` } } },
    },
    share_btn: shareButton(self, correct ? specimen.share : "Bot or Not fooled me. Your turn."),
  };

  return {
    version: "1.0",
    theme: { accent: correct ? "green" : "amber" },
    effects: correct ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const index = specimenIndex(url.searchParams.get("specimen"));

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return renderStart(self, index);
  }

  return renderResult(self, index, normalizeChoice(ctx.action.inputs?.choice));
});

export default app;
