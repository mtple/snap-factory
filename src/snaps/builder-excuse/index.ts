/**
 * builder-excuse — generate a funny but plausible shipping excuse.
 *
 * Components: input, toggle_group, slider, badge, progress, item_group, item, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "builder-excuse";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Blocker = keyof typeof BLOCKERS;

type Excuse = {
  title: string;
  badge: string;
  excuse: string;
  proof: string;
  nextMove: string;
  plausibility: number;
  accent: Accent;
  confetti: boolean;
};

const BLOCKERS = {
  api: {
    label: "API goblin",
    noun: "API",
    excuses: [
      "the integration is returning success in every environment except the one with customers in it",
      "the webhook is technically alive but emotionally unavailable",
      "the docs describe a path that appears to exist only in folklore",
    ],
    proof: "I have a failing request, a timestamp, and one haunted header.",
    move: "Ship the mock path behind a flag and isolate the real integration.",
    accent: "teal" as const,
  },
  design: {
    label: "Design fog",
    noun: "design",
    excuses: [
      "the layout passed Figma court but failed the 480px goblin tribunal",
      "the empty state is currently more convincing than the product",
      "the button hierarchy is fighting itself in a very expensive font",
    ],
    proof: "I found the confusing screen before the replies did.",
    move: "Cut one section, make one button primary, and ship the ugly-correct version.",
    accent: "purple" as const,
  },
  data: {
    label: "Data swamp",
    noun: "data",
    excuses: [
      "the dataset contains three truths, two ghosts, and one row named test-final-final",
      "the cache is confidently serving yesterday's reality",
      "the migration worked locally because local has never met production entropy",
    ],
    proof: "I can reproduce it with one cursed record and a clean seed.",
    move: "Patch the bad edge case, backfill safely, and add a tiny guardrail.",
    accent: "amber" as const,
  },
  scope: {
    label: "Scope leak",
    noun: "scope",
    excuses: [
      "a tiny feature opened a side quest wearing a trench coat",
      "the MVP acquired a second MVP and they are nesting",
      "the acceptance criteria are reproducing faster than the test suite",
    ],
    proof: "The original ticket still fits on one line; the PR does not.",
    move: "Freeze the nice-to-haves, ship the spine, and rename the rest to tomorrow.",
    accent: "blue" as const,
  },
  vibes: {
    label: "Vibe audit",
    noun: "vibes",
    excuses: [
      "the feature works, but it currently enters the room like a tax form",
      "the copy is technically accurate and spiritually asleep",
      "the demo has functionality but no tiny drumroll before the payoff",
    ],
    proof: "Three clicks work; none of them make the user feel clever.",
    move: "Add one crisp line, one visible reward, and delete the ornamental fog.",
    accent: "pink" as const,
  },
} as const;

function blockerInput(raw: unknown): Blocker {
  const value = String(raw ?? "api");
  return value in BLOCKERS ? (value as Blocker) : "api";
}

function asNumber(raw: unknown, fallback: number): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function cleanDetail(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function hashParts(parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const char of parts.join("|")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildExcuse(blockerKey: Blocker, severity: number, detail: string, fid: number): Excuse {
  const blocker = BLOCKERS[blockerKey];
  const seed = hashParts([blockerKey, severity, detail || "ship it", fid || 0]);
  const line = blocker.excuses[seed % blocker.excuses.length] ?? blocker.excuses[0];
  const subject = detail || `the ${blocker.noun} bit`;
  const plausibility = Math.max(38, Math.min(97, 54 + severity * 4 + (seed % 19)));
  const tooSpicy = severity >= 8;
  const title = tooSpicy ? "Delay Approved, Somehow" : plausibility >= 82 ? "Plausible Enough" : "Needs More Receipts";

  return {
    title,
    badge: tooSpicy ? "red flag with snacks" : plausibility >= 82 ? "meeting-safe" : "add proof",
    excuse: `I would ship ${subject} today, but ${line}.`,
    proof: blocker.proof,
    nextMove: blocker.move,
    plausibility,
    accent: tooSpicy ? "red" : blocker.accent,
    confetti: plausibility >= 86 && !tooSpicy,
  };
}

function shareButton(self: string, text = "Try Builder Excuse Generator") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error
    ? ["title", "intro", "error", "detail", "blocker", "severity", "actions"]
    : ["title", "intro", "detail", "blocker", "severity", "actions"];

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "Builder Excuse Generator", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick the blockage. Get a funny, plausible shipping excuse plus the tiny move that unblocks it.",
        size: "sm",
        align: "center",
      },
    },
    detail: {
      type: "input",
      props: {
        name: "detail",
        label: "What are you trying to ship?",
        placeholder: "the onboarding flow",
        maxLength: 120,
      },
    },
    blocker: {
      type: "toggle_group",
      props: {
        name: "blocker",
        label: "What is blocked?",
        defaultValue: "api",
        options: Object.entries(BLOCKERS).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    severity: {
      type: "slider",
      props: { name: "severity", label: "How cursed is it?", min: 1, max: 10, step: 1, defaultValue: 5 },
    },
    generate: {
      type: "button",
      props: { label: "Generate excuse", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=generate` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["generate", "share_btn"] },
  };

  if (error) {
    elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  }

  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, detail: string, excuse: Excuse): SnapHandlerResult {
  const shareText = `Builder excuse: “${excuse.excuse}”`.slice(0, 260);
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "badge", "excuse", "meter", "receipts", "buttons"] },
    title: { type: "text", props: { content: excuse.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: excuse.badge, variant: "outline" } },
    excuse: { type: "text", props: { content: excuse.excuse, align: "center" } },
    meter: { type: "progress", props: { label: `Plausibility: ${excuse.plausibility}%`, value: excuse.plausibility, max: 100, color: excuse.accent } },
    proof_item: { type: "item", props: { title: "Receipt", description: excuse.proof } },
    move_item: { type: "item", props: { title: "Tiny unblock", description: excuse.nextMove } },
    receipts: { type: "item_group", props: {}, children: ["proof_item", "move_item"] },
    again: {
      type: "button",
      props: { label: "Try another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText || `Builder excuse generated for ${detail || "shipping"}`),
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return {
    version: "2.0",
    ...(excuse.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: excuse.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const action = url.searchParams.get("action");
  if (action !== "generate") {
    return startPage(self);
  }

  const detail = cleanDetail(ctx.action.inputs?.detail);
  if (!detail) {
    return startPage(self, "Name the thing first. The excuse needs a victim.");
  }

  const blocker = blockerInput(ctx.action.inputs?.blocker);
  const severity = asNumber(ctx.action.inputs?.severity, 5);
  const fid = ctx.action.user.fid;
  return resultPage(self, detail, buildExcuse(blocker, severity, detail, fid));
}, {
  openGraph: {
    title: "Builder Excuse Generator",
    description: "Pick what is blocked and get a funny but plausible shipping excuse.",
  },
});

export { buildExcuse, blockerInput, cleanDetail };
export default app;
