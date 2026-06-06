/**
 * impact-swap — playful Base/Farcaster no-impact transaction checklist.
 *
 * Components: toggle_group, slider, switch, progress, bar_chart, badge, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "impact-swap";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type SwapKind = keyof typeof KINDS;

type Forecast = {
  title: string;
  badge: string;
  reading: string;
  checklist: string;
  confidence: number;
  accent: Accent;
  bars: Array<{ label: string; value: number }>;
};

const KINDS = {
  swap: {
    label: "Swap",
    verb: "swap",
    safeMove: "Preview route, check minimum received, then breathe before the blue button.",
    accent: "teal" as const,
  },
  bridge: {
    label: "Bridge",
    verb: "bridge",
    safeMove: "Send a tiny scout first if the bridge feels haunted. Big bags can wait one block.",
    accent: "blue" as const,
  },
  mint: {
    label: "Mint",
    verb: "mint",
    safeMove: "Verify collection link from the source, not the most excited reply guy.",
    accent: "purple" as const,
  },
  send: {
    label: "Send",
    verb: "send",
    safeMove: "Read the first six and last four characters out loud like a tiny spell.",
    accent: "green" as const,
  },
};

function shareButton(self: string, text = "Try Impact Swap") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function numberInput(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function kindInput(value: unknown): SwapKind {
  return typeof value === "string" && value in KINDS ? (value as SwapKind) : "swap";
}

function tinyHash(fid: number, kind: string, anxiety: number): number {
  let hash = (fid || 42) + anxiety * 13;
  for (const char of kind) hash = (hash * 29 + char.charCodeAt(0)) % 997;
  return hash;
}

function buildForecast(kindKey: SwapKind, anxiety: number, stealth: boolean, fid: number): Forecast {
  const kind = KINDS[kindKey];
  const seed = tinyHash(fid, kindKey, anxiety);
  const stealthBonus = stealth ? 12 : 0;
  const routeClarity = Math.max(8, Math.min(96, 96 - Math.round(anxiety * 0.52) + stealthBonus - (seed % 7)));
  const walletCalm = Math.max(10, Math.min(95, 88 - Math.round(anxiety * 0.6) + (stealth ? 8 : 0)));
  const impactFog = Math.max(4, Math.min(92, Math.round(anxiety * 0.68) + (stealth ? 4 : 16) + (seed % 11)));
  const confidence = Math.max(18, Math.min(97, Math.round((routeClarity + walletCalm + (100 - impactFog)) / 3)));
  const quiet = stealth ? "Stealth mode is on; timeline theater has been reduced to a whisper." : "Public chaos setting detected; prepare for one dramatic screenshot.";

  const title = confidence > 72 ? "Low-Impact Lane Found" : confidence > 45 ? "Proceed With Tiny Helmet" : "Impact Fog Advisory";
  const badge = confidence > 72 ? "quiet route" : confidence > 45 ? "check twice" : "wait one block";
  const accent: Accent = confidence > 72 ? kind.accent : confidence > 45 ? "amber" : "red";

  return {
    title,
    badge,
    reading: `Your ${kind.verb} is carrying ${anxiety}/100 impact anxiety. ${quiet}`,
    checklist: `No-impact checklist: ${kind.safeMove}`,
    confidence,
    accent,
    bars: [
      { label: "Route clarity", value: routeClarity },
      { label: "Wallet calm", value: walletCalm },
      { label: "Impact fog", value: impactFog },
    ],
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "kind", "anxiety", "stealth", "go", "share_btn"],
    },
    title: { type: "text", props: { content: "Impact Swap", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Tell the wizard what you are about to do. Get a tiny no-impact checklist before the transaction goblin starts narrating.",
        size: "sm",
        align: "center",
      },
    },
    kind: {
      type: "toggle_group",
      props: {
        name: "kind",
        label: "Transaction type",
        defaultValue: "swap",
        options: Object.entries(KINDS).map(([value, kind]) => ({ label: kind.label, value })),
      },
    },
    anxiety: { type: "slider", props: { name: "anxiety", label: "Impact anxiety", min: 0, max: 100, step: 5, defaultValue: 45 } },
    stealth: { type: "switch", props: { name: "stealth", label: "Stealth mode: no timeline theatrics" } },
    go: { type: "button", props: { label: "Check impact", variant: "primary" }, on: { press: { action: "submit", params: { target: self } } } },
    share_btn: shareButton(self, "I found the Impact Swap checklist"),
  };

  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, forecast: Forecast): SnapHandlerResult {
  const shareText = `Impact Swap says: ${forecast.title}. ${forecast.badge}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "reading", "confidence", "chart", "checklist", "actions"],
    },
    title: { type: "text", props: { content: forecast.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: forecast.badge, variant: "outline" } },
    reading: { type: "text", props: { content: forecast.reading, size: "sm", align: "center" } },
    confidence: { type: "progress", props: { label: `No-impact confidence: ${forecast.confidence}%`, value: forecast.confidence, max: 100, color: forecast.accent } },
    chart: { type: "bar_chart", props: { bars: forecast.bars, color: forecast.accent } },
    checklist: { type: "text", props: { content: forecast.checklist, size: "sm", align: "center" } },
    again: { type: "button", props: { label: "Check another", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: forecast.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const inputs = ctx.action.inputs ?? {};
  const kind = kindInput(inputs.kind);
  const anxiety = numberInput(inputs.anxiety, 45);
  const stealth = asBool(inputs.stealth);
  const fid = ctx.action.user.fid;

  return resultPage(self, buildForecast(kind, anxiety, stealth, fid));
}, {
  openGraph: {
    title: "Impact Swap",
    description: "A tiny no-impact checklist for Base swaps, bridges, mints, and sends.",
  },
});

export default app;
