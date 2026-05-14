/**
 * desk-feng-shui — playful productivity desk rearrangement utility.
 *
 * Components: text, input, toggle_group, slider, switch, progress, badge, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "desk-feng-shui";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Chaos = "Notification swamp" | "Cable nest" | "Snack debris" | "Paper ghosts";

const CHAOS_OPTIONS: Chaos[] = ["Notification swamp", "Cable nest", "Snack debris", "Paper ghosts"];

const CHAOS_LINES: Record<Chaos, { cure: string; zone: string; accent: Accent }> = {
  "Notification swamp": {
    cure: "Banish the loudest rectangle to the far left like a tiny inbox goblin in timeout.",
    zone: "focus moat",
    accent: "teal",
  },
  "Cable nest": {
    cure: "Coil one cable, name it, and make it the mayor. The rest must follow local zoning law.",
    zone: "cord paddock",
    accent: "blue",
  },
  "Snack debris": {
    cure: "Move crumbs clockwise into a single sacrificial napkin. The keyboard stops being granola.",
    zone: "crumb altar",
    accent: "amber",
  },
  "Paper ghosts": {
    cure: "Stack every mysterious paper into one haunted tower, then rescue only the top three.",
    zone: "receipt cemetery",
    accent: "purple",
  },
};

function shareButton(self: string, text = "Desk Feng Shui gave my workspace a tiny exorcism.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function cleanObject(value: unknown): string {
  const raw = String(value ?? "desk goblin").trim().replace(/\s+/g, " ");
  if (!raw) return "desk goblin";
  return raw.slice(0, 48);
}

function cleanChaos(value: unknown): Chaos {
  return CHAOS_OPTIONS.includes(value as Chaos) ? (value as Chaos) : "Notification swamp";
}

function cleanClutter(value: unknown): number {
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function isEmergency(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function scoreFor(clutter: number, emergency: boolean): number {
  const emergencyBoost = emergency ? 18 : 0;
  return Math.max(7, Math.min(100, clutter + emergencyBoost));
}

function badgeFor(score: number, emergency: boolean): string {
  if (emergency) return "Emergency tidy spell";
  if (score >= 80) return "Desk poltergeist";
  if (score >= 55) return "Medium goblin weather";
  if (score >= 30) return "Manageable clutter";
  return "Mostly civilized";
}

function renderForm(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "object", "chaos", "clutter", "emergency", "arrange_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Desk Feng Shui", weight: "bold", align: "center" } },
    object: {
      type: "input",
      props: { name: "object", label: "Cursed desk object", placeholder: "mug, notebook, wallet…", maxLength: 48 },
    },
    chaos: {
      type: "toggle_group",
      props: { name: "chaos", label: "Main chaos source", options: CHAOS_OPTIONS, orientation: "vertical", variant: "outline", defaultValue: "Notification swamp" },
    },
    clutter: { type: "slider", props: { name: "clutter", label: "Clutter level", min: 0, max: 100, step: 5, defaultValue: 55 } },
    emergency: { type: "switch", props: { name: "emergency", label: "Emergency clean before call" } },
    arrange_btn: {
      type: "button",
      props: { label: "Rearrange the aura", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?arrange=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function renderResult(self: string, object: string, chaos: Chaos, clutter: number, emergency: boolean): SnapHandlerResult {
  const rule = CHAOS_LINES[chaos];
  const score = scoreFor(clutter, emergency);
  const corner = score > 75 ? "northwest panic corner" : score > 45 ? "center-left negotiation zone" : "sunny victory edge";
  const minutes = emergency ? 3 : score > 70 ? 9 : score > 40 ? 6 : 2;
  const prescription = `Move the ${object} to the ${corner}. ${rule.cure} Final step: clear a ${rule.zone} for ${minutes} minutes.`;
  const shareText = `Desk Feng Shui prescribed a ${minutes}-minute ${rule.zone} for my ${object}. The desk goblin has notes.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "prescription", "reset_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Aura rearranged", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: badgeFor(score, emergency), variant: "outline" } },
    meter: { type: "progress", props: { label: "Desk chaos", value: score, max: 100 } },
    prescription: { type: "text", props: { content: prescription, align: "center" } },
    reset_btn: {
      type: "button",
      props: { label: "Try another desk", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share prescription"),
  };

  return { version: "2.0", theme: { accent: rule.accent }, effects: emergency ? ["confetti"] : undefined, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderForm(self);
    }

    return renderResult(
      self,
      cleanObject(ctx.action.inputs?.object),
      cleanChaos(ctx.action.inputs?.chaos),
      cleanClutter(ctx.action.inputs?.clutter),
      isEmergency(ctx.action.inputs?.emergency),
    );
  },
  {
    openGraph: {
      title: "Desk Feng Shui",
      description: "A tiny productivity spell for rearranging your cursed desk aura.",
    },
  },
);

export default app;
