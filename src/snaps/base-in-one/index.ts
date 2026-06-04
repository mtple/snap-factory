/**
 * base-in-one — daily /base sentence poll.
 *
 * Components: text, badge, toggle_group, bar_chart, separator, button
 * Actions: submit, compose_cast
 * State: Turso KV (base-in-one:YYYY-MM-DD:option-N)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "base-in-one";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

const OPTIONS = [
  { label: "Builder playground", share: "a builder playground", color: "blue" },
  { label: "Daily onchain lane", share: "the daily onchain lane", color: "teal" },
  { label: "Quest board", share: "a giant quest board", color: "amber" },
  { label: "Token rumor mill", share: "a token rumor mill", color: "purple" },
  { label: "Blue app store", share: "a blue app store", color: "green" },
] as const;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionKey(index: number): string {
  return `base-in-one:${todayKey()}:option-${index}`;
}

async function getCounts(): Promise<number[]> {
  const values = await Promise.all(OPTIONS.map((_, index) => store.get(optionKey(index))));
  return values.map((value) => (typeof value === "number" ? value : 0));
}

function choiceIndex(value: unknown): number {
  if (typeof value !== "string") return 0;
  const found = OPTIONS.findIndex((option) => option.label === value);
  return found >= 0 ? found : 0;
}

function bars(counts: number[], highlight?: number) {
  return OPTIONS.map((option, index) => ({
    label: option.label,
    value: counts[index] ?? 0,
    ...(highlight === index ? { color: option.color as Accent } : {}),
  }));
}

function shareButton(self: string, text: string, label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function shell(self: string, elements: Elements, accent: Accent = "blue", effects?: ["confetti"]): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent },
    ...(effects ? { effects } : {}),
    ui: { root: "page", elements },
  };
}

function startPage(self: string, counts: number[]): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "chart", "count", "picker", "submit_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Base in One", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "If you had to describe Base in one sentence today, which tiny prophecy wins?",
        size: "sm",
        align: "center",
      },
    },
    chart: { type: "bar_chart", props: { bars: bars(counts) } },
    count: {
      type: "text",
      props: {
        content: total > 0 ? `${total} sentence${total === 1 ? "" : "s"} cast into the blue jar today.` : "No votes yet — write the first label on the jar.",
        size: "sm",
        align: "center",
      },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "sentence",
        label: "Describe Base as",
        options: OPTIONS.map((option) => option.label),
        orientation: "vertical",
        variant: "outline",
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Lock my sentence", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=vote` } } },
    },
    share_btn: shareButton(self, "Tiny /base sentence poll: what is Base today?"),
  };

  return shell(self, elements, "blue");
}

function resultPage(self: string, counts: number[], picked: number): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const option = OPTIONS[picked] ?? OPTIONS[0];
  const same = counts[picked] ?? 0;
  const pct = total > 0 ? Math.round((same / total) * 100) : 100;
  const shareText = `I described Base as ${option.share}. ${pct}% picked the same tiny sentence today.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "chart", "summary", "sep", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "The blue jar heard you", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: option.label, color: option.color as Accent, variant: "outline" } },
    chart: { type: "bar_chart", props: { bars: bars(counts, picked) } },
    summary: {
      type: "text",
      props: {
        content: `${pct}% chose ${option.label}. ${total} vote${total === 1 ? "" : "s"} today; tomorrow the jar resets.`,
        size: "sm",
        align: "center",
      },
    },
    sep: { type: "separator", props: {} },
    again_btn: {
      type: "button",
      props: { label: "View today's poll", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=view` } } },
    },
    share_btn: shareButton(self, shareText, "Share my sentence"),
  };

  return shell(self, elements, option.color as Accent, ["confetti"]);
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    if (ctx.action.type === "get") {
      return startPage(self, await getCounts());
    }

    const url = new URL(ctx.request.url);
    if (url.searchParams.get("action") === "view") {
      return startPage(self, await getCounts());
    }

    const picked = choiceIndex(ctx.action.inputs?.sentence);
    const current = await store.get(optionKey(picked));
    await store.set(optionKey(picked), (typeof current === "number" ? current : 0) + 1);
    return resultPage(self, await getCounts(), picked);
  },
  {
    openGraph: {
      title: "Base in One",
      description: "Pick one tiny sentence for what Base feels like today, then see the daily crowd split.",
    },
  },
);

export default app;
