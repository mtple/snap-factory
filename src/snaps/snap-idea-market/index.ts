/**
 * snap-idea-market — vote on the next SnapWizard build category.
 *
 * Components: text, badge, toggle_group, bar_chart, separator, button
 * Actions: submit, compose_cast
 * State: Turso KV (snap-idea-market:YYYY-MM-DD:option-N)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "snap-idea-market";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

const OPTIONS = [
  {
    label: "Tiny Games",
    short: "games",
    color: "purple",
    pitch: "small playable loops with obvious win/loss states",
  },
  {
    label: "FID Tools",
    short: "FID tools",
    color: "teal",
    pitch: "profile-aware utilities with real Farcaster evidence",
  },
  {
    label: "Base Culture",
    short: "Base culture",
    color: "blue",
    pitch: "timely /base rituals, polls, and tiny onchain checklists",
  },
  {
    label: "Builder Utilities",
    short: "builder utilities",
    color: "amber",
    pitch: "useful launch, copy, review, and shipping helpers",
  },
  {
    label: "Social Polls",
    short: "social polls",
    color: "green",
    pitch: "quick crowd questions with live results and shareable receipts",
  },
] as const;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionKey(index: number): string {
  return `${SNAP_NAME}:${todayKey()}:option-${index}`;
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

function buildBars(counts: number[], highlight?: number) {
  return OPTIONS.map((option, index) => ({
    label: option.label,
    value: counts[index] ?? 0,
    ...(highlight === index ? { color: option.color as Accent } : {}),
  }));
}

function leaderIndex(counts: number[]): number {
  if (counts.every((count) => count === 0)) return 0;
  return counts.reduce((best, count, index) => (count > (counts[best] ?? 0) ? index : best), 0);
}

function shareButton(self: string, text: string, label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function shell(self: string, elements: Elements, accent: Accent = "purple", effects?: ["confetti"]): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent },
    ...(effects ? { effects } : {}),
    ui: { root: "page", elements },
  };
}

function startPage(self: string, counts: number[]): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const leader = OPTIONS[leaderIndex(counts)];
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "chart", "status", "picker", "buttons", "share_btn"],
    },
    title: { type: "text", props: { content: "Snap Idea Market", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Vote for the category SnapWizard should build next. The daily winner becomes signal for future queue ideas.",
        size: "sm",
        align: "center",
      },
    },
    chart: { type: "bar_chart", props: { bars: buildBars(counts) } },
    status: {
      type: "text",
      props: {
        content:
          total > 0
            ? `${total} vote${total === 1 ? "" : "s"} today. Current leader: ${leader.label}.`
            : "No votes yet today — open the market with the first bid.",
        size: "sm",
        align: "center",
      },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "category",
        label: "Build category",
        options: OPTIONS.map((option) => option.label),
        orientation: "vertical",
        variant: "outline",
      },
    },
    buttons: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", equalWidth: true },
      children: ["vote_btn", "view_btn"],
    },
    vote_btn: {
      type: "button",
      props: { label: "Vote category", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=vote` } } },
    },
    view_btn: {
      type: "button",
      props: { label: "View market", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?action=view` } } },
    },
    share_btn: shareButton(self, "Vote in the tiny SnapWizard idea market: what should get built next?"),
  };

  return shell(self, elements, total > 0 ? (leader.color as Accent) : "purple");
}

function resultPage(self: string, counts: number[], picked?: number): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const leader = leaderIndex(counts);
  const leaderOption = OPTIONS[leader];
  const pickedOption = typeof picked === "number" ? OPTIONS[picked] : undefined;
  const pickedVotes = typeof picked === "number" ? counts[picked] ?? 0 : 0;
  const pickedPct = total > 0 && pickedOption ? Math.round((pickedVotes / total) * 100) : 0;
  const summary = pickedOption
    ? `Your vote: ${pickedOption.label}. ${pickedPct}% picked it today. Leader: ${leaderOption.label}.`
    : total > 0
      ? `${total} vote${total === 1 ? "" : "s"} today. Leader: ${leaderOption.label}.`
      : "The market is empty so far. Vote from the start screen to set the first signal.";
  const shareText = pickedOption
    ? `I voted for ${pickedOption.short} in SnapWizard's idea market. Current leader: ${leaderOption.label}.`
    : `SnapWizard's idea market is open. Current leader: ${leaderOption.label}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "chart", "summary", "pitch", "sep", "buttons"],
    },
    title: { type: "text", props: { content: "Market results", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `Leader: ${leaderOption.label}`, color: leaderOption.color as Accent, variant: "outline" } },
    chart: { type: "bar_chart", props: { bars: buildBars(counts, picked) } },
    summary: { type: "text", props: { content: summary, size: "sm", align: "center" } },
    pitch: {
      type: "text",
      props: {
        content: `If this wins, expect ${leaderOption.pitch}.`,
        size: "sm",
        align: "center",
      },
    },
    sep: { type: "separator", props: {} },
    buttons: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", equalWidth: true },
      children: ["again_btn", "share_btn"],
    },
    again_btn: {
      type: "button",
      props: { label: "Vote again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=view` } } },
    },
    share_btn: shareButton(self, shareText, pickedOption ? "Share my vote" : "Share market"),
  };

  return shell(self, elements, leaderOption.color as Accent, pickedOption ? ["confetti"] : undefined);
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    if (ctx.action.type === "get") {
      return startPage(self, await getCounts());
    }

    const url = new URL(ctx.request.url);
    const action = url.searchParams.get("action");
    if (action === "view") {
      return startPage(self, await getCounts());
    }

    const picked = choiceIndex(ctx.action.inputs?.category);
    const current = await store.get(optionKey(picked));
    await store.set(optionKey(picked), (typeof current === "number" ? current : 0) + 1);
    return resultPage(self, await getCounts(), picked);
  },
  {
    openGraph: {
      title: "Snap Idea Market",
      description: "Vote on which SnapWizard category should get built next and see the live daily market.",
    },
  },
);

export default app;
