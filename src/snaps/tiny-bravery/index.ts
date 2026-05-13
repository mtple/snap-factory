/**
 * tiny-bravery — daily tiny-brave-move social poll.
 *
 * Components: text, badge, toggle_group, bar_chart, button, stack
 * Actions: submit, compose_cast
 * State: Turso KV (tiny-bravery:YYYY-MM-DD:move-N)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "tiny-bravery";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Move = {
  label: string;
  share: string;
  encouragement: string;
  color: Accent;
};

const MOVES: readonly Move[] = [
  {
    label: "Ship ugly",
    share: "shipping ugly on purpose",
    encouragement: "Excellent. The goblin draft gets sunlight before it learns manners.",
    color: "amber",
  },
  {
    label: "Ask directly",
    share: "asking directly instead of hinting",
    encouragement: "Direct ask detected. May the inbox answer in complete sentences.",
    color: "blue",
  },
  {
    label: "Reply honestly",
    share: "replying honestly without writing a novella",
    encouragement: "Truth, but bite-sized. The timeline appreciates a clean little lantern.",
    color: "purple",
  },
  {
    label: "Log off early",
    share: "logging off before the timeline turns into soup",
    encouragement: "Power move. Touching grass before the app touches back is advanced magic.",
    color: "green",
  },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionKey(date: string, index: number): string {
  return `${SNAP_NAME}:${date}:move-${index}`;
}

async function getCounts(date: string): Promise<number[]> {
  const values = await Promise.all(MOVES.map((_, index) => store.get(optionKey(date, index))));
  return values.map((value) => (typeof value === "number" ? value : 0));
}

function moveIndex(value: unknown): number {
  if (typeof value !== "string") return 0;
  const index = MOVES.findIndex((move) => move.label === value);
  return index >= 0 ? index : 0;
}

function bars(counts: number[], highlightIndex?: number) {
  return MOVES.map((move, index) => ({
    label: move.label,
    value: counts[index] ?? 0,
    ...(highlightIndex === index ? { color: move.color } : {}),
  }));
}

function shareButton(self: string, text = "Tiny Bravery: pick one small brave move for today.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function totalVotes(counts: number[]): number {
  return counts.reduce((sum, count) => sum + count, 0);
}

function renderForm(self: string, counts: number[]): SnapHandlerResult {
  const total = totalVotes(counts);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "prompt", "chart", "picker", "vote_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Tiny Bravery", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `${total} brave vote${total === 1 ? "" : "s"} today`, variant: "outline" } },
    prompt: {
      type: "text",
      props: { content: "Pick one tiny brave move for the next 24 hours. Nothing heroic. Just one clean goblin step.", size: "sm", align: "center" },
    },
    chart: { type: "bar_chart", props: { bars: bars(counts) } },
    picker: {
      type: "toggle_group",
      props: {
        name: "move",
        label: "Today I will…",
        options: MOVES.map((move) => move.label),
        orientation: "vertical",
        variant: "outline",
        defaultValue: "Ship ugly",
      },
    },
    vote_btn: {
      type: "button",
      props: { label: "Choose my move", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?vote=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "green" }, ui: { root: "page", elements } };
}

function renderResult(self: string, counts: number[], selected: number): SnapHandlerResult {
  const move = MOVES[selected] ?? MOVES[0];
  const total = totalVotes(counts);
  const same = counts[selected] ?? 0;
  const pct = total > 0 ? Math.round((same / total) * 100) : 100;
  const shareText = `Today I am ${move.share}. ${pct}% picked it on Tiny Bravery.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "chart", "encouragement", "detail", "share_btn"],
    },
    title: { type: "text", props: { content: "Bravery logged", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: move.label, color: move.color, variant: "outline" } },
    chart: { type: "bar_chart", props: { bars: bars(counts, selected) } },
    encouragement: { type: "text", props: { content: move.encouragement, align: "center" } },
    detail: { type: "text", props: { content: `${pct}% chose this tiny dare today. Report back to the goblin committee after one brave click.`, size: "sm", align: "center" } },
    share_btn: shareButton(self, shareText, "Share my move"),
  };

  return { version: "2.0", theme: { accent: move.color }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const date = todayKey();

    if (ctx.action.type === "get") {
      return renderForm(self, await getCounts(date));
    }

    const selected = moveIndex(ctx.action.inputs?.move);
    const key = optionKey(date, selected);
    const current = await store.get(key);
    await store.set(key, (typeof current === "number" ? current : 0) + 1);

    return renderResult(self, await getCounts(date), selected);
  },
  {
    openGraph: {
      title: "Tiny Bravery",
      description: "Pick one small brave move for today and see what Farcaster chose.",
    },
  },
);

export default app;
