/**
 * cast-court — daily Farcaster etiquette case with crowd verdicts.
 *
 * Components: text, badge, toggle_group, bar_chart, separator, button, stack
 * Actions: submit, compose_cast
 * State: Turso KV (cast-court:YYYY-MM-DD:case-N:option-N)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "cast-court";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Verdict = {
  label: string;
  share: string;
  ruling: string;
  color: Accent;
};

type CaseFile = {
  title: string;
  charge: string;
  facts: string;
  badge: string;
  verdicts: readonly Verdict[];
};

const CASES: readonly CaseFile[] = [
  {
    title: "The Quote-Cast Goblin",
    charge: "A builder quote-cast a launch with only “interesting” and vanished.",
    facts: "No follow-up. No context. Just vibes and mild dread in the replies.",
    badge: "Case 001",
    verdicts: [
      { label: "Harmless", share: "harmless timeline theater", ruling: "The court permits mysterious punctuation, but orders one useful sentence next time.", color: "green" },
      { label: "Needs context", share: "needs context", ruling: "Guilty of making everyone squint. Add the take, not just the eyebrow.", color: "amber" },
      { label: "Reply jail", share: "reply jail", ruling: "Thirty minutes in reply jail. Sentence reduced for not saying “big if true.”", color: "red" },
      { label: "Wizard pardon", share: "wizard pardon", ruling: "Pardoned by chaos law. The timeline sometimes needs a fog machine.", color: "purple" },
    ],
  },
  {
    title: "The GM Time Traveler",
    charge: "Someone posted GM at 4:47pm local time and asked for no questions.",
    facts: "The sun was down in two countries. The coffee looked suspiciously like dinner.",
    badge: "Case 002",
    verdicts: [
      { label: "Still counts", share: "still counts", ruling: "The court rules that GM is a state of mind, not a clock event.", color: "teal" },
      { label: "GN instead", share: "should have been GN", ruling: "A gentle correction is entered. Please proceed directly to pajamas.", color: "blue" },
      { label: "Timezone magic", share: "timezone magic", ruling: "Acquitted under the international builder schedule doctrine.", color: "purple" },
      { label: "Caffeine audit", share: "caffeine audit", ruling: "The court demands receipts for every espresso after noon.", color: "amber" },
    ],
  },
  {
    title: "The Stealth Launch",
    charge: "A founder shipped a whole product in a reply to a reply to a reply.",
    facts: "Three people saw it. Two were bots. One is now emotionally invested.",
    badge: "Case 003",
    verdicts: [
      { label: "Icon behavior", share: "icon behavior", ruling: "Acquitted. Tiny launches in strange places are protected wizard habitat.", color: "green" },
      { label: "Needs a root cast", share: "needs a root cast", ruling: "Guilty of hiding the good stuff. Pin it where humans can find it.", color: "blue" },
      { label: "Marketing crime", share: "a marketing crime", ruling: "The court assigns one landing page and two clear screenshots.", color: "red" },
      { label: "Let it cook", share: "let it cook", ruling: "Continued until tomorrow. The mystery may be doing useful work.", color: "amber" },
    ],
  },
  {
    title: "The Thread Hydra",
    charge: "A simple question became a 37-cast thread with diagrams.",
    facts: "The original ask was “what changed?” The answer now has chapters.",
    badge: "Case 004",
    verdicts: [
      { label: "Educational", share: "educational", ruling: "The court thanks the defendant and requests a table of contents.", color: "teal" },
      { label: "Too many casts", share: "too many casts", ruling: "Guilty of thread sprawl. Summarize before the next hydra head grows.", color: "amber" },
      { label: "Bookmark bait", share: "bookmark bait", ruling: "Permitted. The timeline needs the occasional saved-for-later mountain.", color: "purple" },
      { label: "Make a doc", share: "make a doc", ruling: "Sentenced to one clean doc link and a merciful abstract.", color: "blue" },
    ],
  },
  {
    title: "The Poll Without Stakes",
    charge: "A cast asked “yes or no?” and refused to explain the question.",
    facts: "Hundreds voted. Nobody knows what happened. Democracy survived somehow.",
    badge: "Case 005",
    verdicts: [
      { label: "Valid bit", share: "valid bit", ruling: "The court recognizes nonsense polls as a historic timeline tradition.", color: "green" },
      { label: "Explain yourself", share: "explain yourself", ruling: "Guilty. The people demand one crumb of context after voting.", color: "amber" },
      { label: "Data goblin", share: "data goblin", ruling: "Suspicious but legal. All goblins must label their spreadsheets.", color: "purple" },
      { label: "Mistrial", share: "mistrial", ruling: "The case collapses because the judge also voted yes without knowing why.", color: "gray" },
    ],
  },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function todaysCase(): { file: CaseFile; index: number; key: string } {
  const key = todayKey();
  const index = hashText(key) % CASES.length;
  return { file: CASES[index] ?? CASES[0], index, key };
}

function optionKey(date: string, caseIndex: number, optionIndex: number): string {
  return `cast-court:${date}:case-${caseIndex}:option-${optionIndex}`;
}

async function getCounts(date: string, caseIndex: number, file: CaseFile): Promise<number[]> {
  const values = await Promise.all(file.verdicts.map((_, index) => store.get(optionKey(date, caseIndex, index))));
  return values.map((value) => (typeof value === "number" ? value : 0));
}

function choiceIndex(value: unknown, file: CaseFile): number {
  if (typeof value !== "string") return 0;
  const index = file.verdicts.findIndex((verdict) => verdict.label === value);
  return index >= 0 ? index : 0;
}

function buildBars(file: CaseFile, counts: number[], highlightIndex?: number) {
  return file.verdicts.map((verdict, index) => ({
    label: verdict.label,
    value: counts[index] ?? 0,
    ...(highlightIndex === index ? { color: verdict.color } : {}),
  }));
}

function shareButton(self: string, text = "Cast Court is in session. Come vote on today’s Farcaster etiquette case.", label = "Share court"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderForm(self: string, file: CaseFile, counts: number[]): SnapHandlerResult {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "charge", "chart", "picker", "vote_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Cast Court", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `${file.badge} · ${total} vote${total === 1 ? "" : "s"}`, variant: "outline" } },
    charge: {
      type: "text",
      props: { content: `${file.title}\n${file.charge}`, size: "sm", align: "center" },
    },
    chart: { type: "bar_chart", props: { bars: buildBars(file, counts) } },
    picker: {
      type: "toggle_group",
      props: {
        name: "verdict",
        label: "Your verdict",
        options: file.verdicts.map((verdict) => verdict.label),
        orientation: "vertical",
        variant: "outline",
      },
    },
    vote_btn: {
      type: "button",
      props: { label: "Cast verdict", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function renderResult(self: string, file: CaseFile, counts: number[], selected: number): SnapHandlerResult {
  const verdict = file.verdicts[selected] ?? file.verdicts[0];
  const total = counts.reduce((sum, count) => sum + count, 0);
  const same = counts[selected] ?? 0;
  const pct = total > 0 ? Math.round((same / total) * 100) : 100;
  const shareText = `Cast Court ruled: ${verdict.share}. ${pct}% chose this verdict. ⚖️`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "verdict", "chart", "ruling", "facts", "share_btn"],
    },
    title: { type: "text", props: { content: "Verdict entered", weight: "bold", align: "center" } },
    verdict: { type: "badge", props: { label: verdict.label, color: verdict.color, variant: "outline" } },
    chart: { type: "bar_chart", props: { bars: buildBars(file, counts, selected) } },
    ruling: { type: "text", props: { content: verdict.ruling, align: "center" } },
    facts: { type: "text", props: { content: `${pct}% chose this. ${file.facts}`, size: "sm", align: "center" } },
    share_btn: shareButton(self, shareText, "Share verdict"),
  };

  return { version: "2.0", theme: { accent: verdict.color }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const { file, index, key } = todaysCase();

    if (ctx.action.type === "get") {
      return renderForm(self, file, await getCounts(key, index, file));
    }

    const selected = choiceIndex(ctx.action.inputs?.verdict, file);
    const keyForChoice = optionKey(key, index, selected);
    const current = await store.get(keyForChoice);
    await store.set(keyForChoice, (typeof current === "number" ? current : 0) + 1);

    return renderResult(self, file, await getCounts(key, index, file), selected);
  },
  {
    openGraph: {
      title: "Cast Court",
      description: "Vote on today’s tiny Farcaster etiquette case.",
    },
  },
);

export default app;
