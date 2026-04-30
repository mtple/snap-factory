/**
 * skip-or-save — daily music behavior poll for Tortoise listeners.
 *
 * Components: toggle_group, bar_chart, badge, separator, text, button, stack
 * Actions: submit, open_url, compose_cast
 * State: Turso KV (daily vote counts)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "skip-or-save";
const TORTOISE_URL = "https://farcaster.xyz/miniapps/0197c2c3-6650-349a-bc8f-9892abae9e4a/tortoise";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type PollOption = {
  value: string;
  label: string;
  short: string;
  badge: string;
  reaction: string;
  color: Accent;
};

const OPTIONS: PollOption[] = [
  {
    value: "skip_intro",
    label: "Skip intro",
    short: "Skip",
    badge: "Fast hook",
    reaction: "Respectfully impatient. The chorus has five seconds to report for duty.",
    color: "amber",
  },
  {
    value: "save_first",
    label: "Save first",
    short: "Save",
    badge: "Crate goblin",
    reaction: "You know within one riff. Library first, questions during track two.",
    color: "green",
  },
  {
    value: "lyrics_deep",
    label: "Lyrics deep dive",
    short: "Lyrics",
    badge: "Liner notes",
    reaction: "You are in the lyric cave with a tiny lantern and zero apologies.",
    color: "purple",
  },
  {
    value: "album_run",
    label: "Let album run",
    short: "Album",
    badge: "No skips",
    reaction: "Sequencing believer. You let the record make its whole argument.",
    color: "teal",
  },
];

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function voteKey(day: string, value: string): string {
  return `${SNAP_NAME}:${day}:${value}`;
}

function optionFor(raw: unknown): PollOption | null {
  const value = String(raw ?? "");
  return OPTIONS.find((option) => option.value === value || option.label === value) ?? null;
}

async function getVotes(day: string): Promise<Record<string, number>> {
  const entries = await Promise.all(
    OPTIONS.map(async (option) => {
      const stored = await store.get(voteKey(day, option.value));
      return [option.value, typeof stored === "number" ? stored : 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function recordVote(day: string, option: PollOption): Promise<void> {
  const key = voteKey(day, option.value);
  const current = await store.get(key);
  await store.set(key, (typeof current === "number" ? current : 0) + 1);
}

function shareButton(self: string, text = "Skip or Save is taking today's listening temperature 🎧") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function openTortoiseButton() {
  return {
    type: "button" as const,
    props: { label: "Open Tortoise", variant: "secondary" as const },
    on: { press: { action: "open_url" as const, params: { target: TORTOISE_URL } } },
  };
}

function startPage(self: string, total: number): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "picker", "vote", "actions", "share_btn"],
    },
    title: { type: "text", props: { content: "Skip or Save?", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Daily music etiquette check. Pick the listening habit that feels most like you today.",
        size: "sm",
        align: "center",
      },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: "choice",
        label: total > 0 ? `${total} votes in the room` : "Cast the first vote",
        defaultValue: OPTIONS[3].value,
        options: OPTIONS.map((option) => ({ label: option.label, value: option.value })),
        orientation: "vertical",
        variant: "outline",
      },
    },
    vote: {
      type: "button",
      props: { label: "Vote", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    tortoise: openTortoiseButton(),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["tortoise"] },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, day: string, votes: Record<string, number>, picked: PollOption | null): SnapHandlerResult {
  const total = OPTIONS.reduce((sum, option) => sum + (votes[option.value] ?? 0), 0);
  const pickedVotes = picked ? votes[picked.value] ?? 0 : 0;
  const pct = total > 0 && picked ? Math.round((pickedVotes / total) * 100) : 0;
  const bars = OPTIONS.map((option) => ({
    label: option.short,
    value: votes[option.value] ?? 0,
    color: option.value === picked?.value ? option.color : ("gray" as const),
  }));
  const shareText = picked
    ? `${pct}% of today's room picked ${picked.label}. Skip or Save? 🎧`
    : "Skip or Save is taking today's listening temperature 🎧";

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "chart", "reaction", "meta", "actions", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: picked ? `You chose: ${picked.label}` : "Room results", weight: "bold", align: "center" },
    },
    badge: { type: "badge", props: { label: picked?.badge ?? "Listening room", variant: "outline" } },
    chart: { type: "bar_chart", props: { bars } },
    reaction: {
      type: "text",
      props: { content: picked?.reaction ?? "Vote to reveal your listening species.", size: "sm", align: "center" },
    },
    meta: {
      type: "text",
      props: { content: `${total} vote${total === 1 ? "" : "s"} today · ${day}`, size: "sm", align: "center" },
    },
    tortoise: openTortoiseButton(),
    again: {
      type: "button",
      props: { label: "Vote again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["tortoise", "again"] },
    share_btn: shareButton(self, shareText),
  };

  return { version: "1.0", theme: { accent: picked?.color ?? "teal" }, effects: picked ? ["confetti"] : undefined, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const today = dayKey();
  const votes = await getVotes(today);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    const total = OPTIONS.reduce((sum, option) => sum + (votes[option.value] ?? 0), 0);
    return startPage(self, total);
  }

  const picked = optionFor(ctx.action.inputs?.choice);
  if (picked) {
    await recordVote(today, picked);
  }

  return resultPage(self, today, await getVotes(today), picked);
});

export { OPTIONS, dayKey, getVotes, optionFor, recordVote, resultPage, startPage };
export default app;
