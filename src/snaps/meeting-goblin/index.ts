/**
 * meeting-goblin — playful productivity utility for taming a meeting.
 *
 * Components: input, toggle_group, slider, switch, progress, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "meeting-goblin";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Goal = "Decide" | "Align" | "Escape" | "Delegate";

type GoblinPlan = {
  title: string;
  badge: string;
  heat: number;
  agenda: string;
  action: string;
  accent: Accent;
  confetti: boolean;
};

const GOALS: Goal[] = ["Decide", "Align", "Escape", "Delegate"];
const FALLBACK_TOPICS = ["the thing", "timeline cleanup", "scope fog", "tiny launch", "mysterious spreadsheet"];

const AGENDA_BANK: Record<Goal, string[]> = {
  Decide: [
    "Open with the fork in the road, name the owner, then force a yes/no before goblins breed.",
    "Ask for one decision, one tradeoff, and one person brave enough to write it down.",
    "Ban lore for five minutes. Put Option A and Option B in tiny chairs and pick one.",
  ],
  Align: [
    "Make everyone say the same sentence in different hats, then write the least cursed version.",
    "Start with the goal, collect objections, end with one shared definition of done.",
    "Turn vibes into bullets: what changed, who cares, what happens next.",
  ],
  Escape: [
    "Arrive with a written answer. If no new facts appear, release the meeting back into the forest.",
    "Set a 12-minute timer and ask: what would make this worth not being async?",
    "Summon the exit clause early: if nobody owns a decision, the calendar goblin loses jurisdiction.",
  ],
  Delegate: [
    "Name the task, name the owner, name the due date. Everything else is decorative fog.",
    "Split the goblin pile into Do, Decide, and Dump. Assign one human to each surviving rock.",
    "Ask who can move this 80% forward without another ceremonial circle.",
  ],
};

const ACTION_BANK: Record<Goal, string[]> = {
  Decide: ["Send the two choices before the call.", "Write the decision sentence in advance.", "Ask for blockers, not opinions."],
  Align: ["Post a one-paragraph brief first.", "Define done in ten words.", "Collect disagreements before agenda time."],
  Escape: ["Propose an async memo instead.", "Put a hard stop in the invite.", "Bring the cancellation spell: no agenda, no meeting."],
  Delegate: ["Assign one owner before notes grow moss.", "Turn every tangent into a ticket.", "End with names beside verbs."],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: number, salt: number): T {
  return items[(seed + salt * 2654435761) % items.length] ?? items[0];
}

function cleanTopic(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 84);
}

function cleanGoal(raw: unknown): Goal {
  const value = String(raw ?? "Decide");
  return GOALS.includes(value as Goal) ? (value as Goal) : "Decide";
}

function cleanDread(raw: unknown): number {
  const parsed = Number(raw ?? 45);
  if (!Number.isFinite(parsed)) return 45;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function isOn(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1";
}

function fallbackTopic(fid: number): string {
  return pick(FALLBACK_TOPICS, hashText(`${SNAP_NAME}:fallback:${fid || 0}`), 1);
}

function buildPlan(topicInput: string, goal: Goal, dread: number, asyncOk: boolean, fid: number): GoblinPlan {
  const topic = topicInput || fallbackTopic(fid);
  const seed = hashText([SNAP_NAME, topic.toLowerCase(), goal, dread, asyncOk ? "async" : "live", fid || 0].join("|"));
  const asyncRelief = asyncOk ? 18 : 0;
  const goalPenalty = goal === "Escape" ? 6 : goal === "Delegate" ? 2 : 10;
  const heat = Math.max(8, Math.min(99, dread + goalPenalty - asyncRelief + (seed % 17) - 8));
  const title = heat >= 78 ? "Calendar goblin roaring" : heat >= 48 ? "Meeting goblin contained" : "This could be an email";
  const badge = asyncOk && heat < 65 ? "Async spell ready" : heat >= 78 ? "High heat" : goal === "Escape" ? "Exit route" : `${goal} mode`;
  const asyncClause = asyncOk ? " Async door is unlocked." : " Live ritual approved, barely.";
  const agenda = `${topic}: ${pick(AGENDA_BANK[goal], seed, 2)}${asyncClause}`;
  const action = pick(ACTION_BANK[goal], seed, 3);
  const accent: Accent = heat >= 78 ? "red" : asyncOk && heat < 55 ? "green" : goal === "Delegate" ? "teal" : goal === "Escape" ? "amber" : "blue";

  return { title, badge, heat, agenda, action, accent, confetti: heat <= 28 };
}

function shareButton(self: string, text = "Meeting Goblin turned my calendar fog into one tiny next move.", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "sub", "topic", "goal", "dread", "async", "buttons"] },
    title: { type: "text", props: { content: "Meeting Goblin", weight: "bold", align: "center" } },
    sub: { type: "text", props: { content: "Feed it a calendar goblin. Get one agenda spell, one escape hatch, and less meeting smoke.", size: "sm", align: "center" } },
    topic: { type: "input", props: { name: "topic", label: "Meeting or topic", placeholder: "Roadmap sync, launch review...", maxLength: 84 } },
    goal: { type: "toggle_group", props: { name: "goal", label: "What do you need?", options: GOALS.map((label) => ({ label, value: label })), defaultValue: "Decide" } },
    dread: { type: "slider", props: { name: "dread", label: "Meeting heat", min: 0, max: 100, step: 5, defaultValue: 45 } },
    async: { type: "switch", props: { name: "async", label: "Could be async" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["tame", "share_btn"] },
    tame: { type: "button", props: { label: "Tame goblin", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?tame=1` } } } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, plan: GoblinPlan): SnapHandlerResult {
  const shareText = `Meeting Goblin measured my calendar heat at ${plan.heat}%. Tiny agenda spell acquired.`;
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "meter", "agenda", "action", "buttons"] },
    title: { type: "text", props: { content: plan.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: plan.badge, variant: "outline" } },
    meter: { type: "progress", props: { label: "Meeting heat", value: plan.heat, max: 100 } },
    agenda: { type: "text", props: { content: plan.agenda, align: "center" } },
    action: { type: "text", props: { content: `Tiny next move: ${plan.action}`, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: { type: "button", props: { label: "Try another", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText, "Share spell"),
  };

  return {
    version: "2.0",
    theme: { accent: plan.accent },
    ...(plan.confetti ? { effects: ["confetti" as const] } : {}),
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const fid = ctx.action.type === "get" ? (ctx.action.user?.fid ?? 0) : ctx.action.user.fid;

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const plan = buildPlan(cleanTopic(ctx.action.inputs?.topic), cleanGoal(ctx.action.inputs?.goal), cleanDread(ctx.action.inputs?.dread), isOn(ctx.action.inputs?.async), fid);
    return resultPage(self, plan);
  },
  {
    openGraph: {
      title: "Meeting Goblin",
      description: "Tame a calendar goblin with one agenda spell, one tiny next action, and a meeting heat meter.",
    },
  },
);

export default app;
