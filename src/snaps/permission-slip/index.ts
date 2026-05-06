/**
 * permission-slip — issue a tiny, playful permission slip for overthinkers.
 *
 * Components: text, input, toggle_group, switch, badge, progress, separator, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "permission-slip";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type PermissionKind = "Ship it" | "Log off" | "Ask for help" | "Make it tiny";

type Slip = {
  title: string;
  badge: string;
  sentence: string;
  action: string;
  confidence: number;
  accent: Accent;
  share: string;
};

const PERMISSIONS: PermissionKind[] = ["Ship it", "Log off", "Ask for help", "Make it tiny"];

const ACTIONS: Record<PermissionKind, readonly string[]> = {
  "Ship it": [
    "Ship the smallest honest version, then write down the one thing future-you can improve.",
    "Post the useful part now. Let polish stand in line like everybody else.",
    "Send it with one clear caveat and a glass of water nearby.",
  ],
  "Log off": [
    "Close the tab, move your body for three minutes, and let the internet miss you politely.",
    "Declare the decision closed until tomorrow. No committee meetings with the ceiling tonight.",
    "Put the device down before the draft learns a fifth personality.",
  ],
  "Ask for help": [
    "Ask one specific person one specific question. No lore dump, no courtroom exhibit packet.",
    "Send the messy version to a trusted human and request exactly one kind of feedback.",
    "Trade the spiral for a sentence: “Can you sanity-check this before I overbuild it?”",
  ],
  "Make it tiny": [
    "Cut the task until it can fit inside ten minutes and one slightly smug checklist box.",
    "Remove the fanciest requirement and ship the little skeleton that still teaches you something.",
    "Define done as one visible inch of progress. The mountain can file a complaint later.",
  ],
};

const BADGES: Record<PermissionKind, string> = {
  "Ship it": "Approved to ship",
  "Log off": "Approved to disappear",
  "Ask for help": "Approved to recruit a human",
  "Make it tiny": "Approved to shrink ray",
};

const ACCENTS: Record<PermissionKind, Accent> = {
  "Ship it": "teal",
  "Log off": "purple",
  "Ask for help": "green",
  "Make it tiny": "amber",
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanConcern(value: unknown): string {
  if (typeof value !== "string") return "the thing";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "the thing";
  return cleaned.slice(0, 90);
}

function cleanKind(value: unknown): PermissionKind {
  return PERMISSIONS.includes(value as PermissionKind) ? (value as PermissionKind) : "Make it tiny";
}

function isAccountable(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "on" || value === "yes";
  return false;
}

function slipFor(concern: string, kind: PermissionKind, accountable: boolean, fid: number): Slip {
  const seed = hashText(`${concern}:${kind}:${accountable}:${fid || "anon"}`);
  const action = ACTIONS[kind][seed % ACTIONS[kind].length] ?? ACTIONS[kind][0];
  const confidence = 57 + (seed % 39);
  const accountability = accountable
    ? " This slip may be shown to the timeline if courage requires witnesses."
    : " Private permission granted; no public performance required.";

  return {
    title: `${kind} permission slip`,
    badge: BADGES[kind],
    sentence: `The wizard grants permission to stop overthinking “${concern}.”${accountability}`,
    action,
    confidence,
    accent: ACCENTS[kind],
    share: `Permission granted: ${kind.toLowerCase()} for “${concern}.” Tiny next move secured. 📝`,
  };
}

function shareButton(self: string, text = "Need permission to stop overthinking? The wizard has a stamp.", label = "Share slip"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderForm(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "concern", "kind", "accountable", "stamp_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Permission Slip", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Overthinking something? Fill out one tiny form and receive an extremely official wizard excuse to move.",
        align: "center",
        size: "sm",
      },
    },
    concern: {
      type: "input",
      props: {
        name: "concern",
        label: "What are you overthinking?",
        placeholder: "launch, reply, errand, tiny life admin...",
        maxLength: 120,
      },
    },
    kind: {
      type: "toggle_group",
      props: {
        name: "kind",
        label: "Permission requested",
        options: PERMISSIONS,
        orientation: "vertical",
        variant: "outline",
      },
    },
    accountable: {
      type: "switch",
      props: { name: "accountable", label: "Make it timeline-accountable" },
    },
    stamp_btn: {
      type: "button",
      props: { label: "Stamp my slip", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function renderResult(self: string, slip: Slip): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "permission", "confidence", "next", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: slip.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: slip.badge, variant: "outline" } },
    permission: { type: "text", props: { content: slip.sentence, align: "center", size: "sm" } },
    confidence: { type: "progress", props: { label: "Wizard confidence", value: slip.confidence, max: 100 } },
    next: { type: "text", props: { content: `Tiny next move: ${slip.action}`, align: "center", size: "sm" } },
    again_btn: {
      type: "button",
      props: { label: "Write another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, slip.share, "Share permission"),
  };

  return { version: "2.0", theme: { accent: slip.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderForm(self);
    }

    const concern = cleanConcern(ctx.action.inputs?.concern);
    const kind = cleanKind(ctx.action.inputs?.kind);
    const accountable = isAccountable(ctx.action.inputs?.accountable);
    const fid = ctx.action.user?.fid ?? 0;
    return renderResult(self, slipFor(concern, kind, accountable, fid));
  },
  {
    openGraph: {
      title: "Permission Slip",
      description: "Get a tiny official excuse to stop overthinking and move.",
    },
  },
);

export default app;
