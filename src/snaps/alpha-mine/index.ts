/**
 * alpha-mine — tap one tunnel to mine for timeline alpha.
 *
 * Components: text, badge, cell_grid, progress, button
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "alpha-mine";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Tunnel = "base" | "snap" | "identity" | "reward" | "test" | "token" | "berry" | "wizard" | "oatmeal";

type Outcome = {
  title: string;
  badge: string;
  line: string;
  detail: string;
  basePower: number;
  accent: Accent;
  confetti?: boolean;
};

const TUNNELS: Array<{ row: number; col: number; value: Tunnel; content: string; color: Accent }> = [
  { row: 0, col: 0, value: "base", content: "🟦", color: "blue" },
  { row: 0, col: 1, value: "snap", content: "⚡", color: "purple" },
  { row: 0, col: 2, value: "identity", content: "🪪", color: "teal" },
  { row: 1, col: 0, value: "reward", content: "🎁", color: "amber" },
  { row: 1, col: 1, value: "test", content: "🧪", color: "green" },
  { row: 1, col: 2, value: "token", content: "🪙", color: "gray" },
  { row: 2, col: 0, value: "berry", content: "🍓", color: "pink" },
  { row: 2, col: 1, value: "wizard", content: "🧙", color: "purple" },
  { row: 2, col: 2, value: "oatmeal", content: "🥣", color: "gray" },
];

const OUTCOMES: Record<Tunnel, Omit<Outcome, "basePower">> = {
  base: {
    title: "Blue vein struck",
    badge: "Real signal",
    line: "Your pick hit a clean Base vein: builders, shipping dust, and exactly one suspiciously shiny roadmap pebble.",
    detail: "Keep the hard hat on. This alpha wants one careful click before it becomes a threadstorm.",
    accent: "blue",
    confetti: true,
  },
  snap: {
    title: "Snap spark found",
    badge: "Inline magic",
    line: "You uncovered a tiny Snap crystal. It hums, validates JSON, and refuses to become a full mini app.",
    detail: "Good ore. Polish it into one interaction before the feature list starts tunneling sideways.",
    accent: "purple",
    confetti: true,
  },
  identity: {
    title: "Passport shard",
    badge: "Identity glimmer",
    line: "The tunnel produced a small identity shard with three stamps and no explanation for customs.",
    detail: "Useful, probably. Do not lick the credentials. The goblin compliance desk is watching.",
    accent: "teal",
  },
  reward: {
    title: "Reward pocket",
    badge: "Quest dust",
    line: "You found a reward pocket: daily check-ins, social quests, and a leaderboard wearing safety goggles.",
    detail: "Promising ore, but weigh it twice. Some treasure is just a chore with confetti.",
    accent: "amber",
  },
  test: {
    title: "Testnet lantern",
    badge: "Green light-ish",
    line: "The mine lit up with activation toggles and system tests. The lantern says yes, then asks for one more run.",
    detail: "Respect the lantern. Alpha that survives testing gets to leave the cave.",
    accent: "green",
  },
  token: {
    title: "Token fog",
    badge: "Maybe ore",
    line: "You walked into token fog. Something blue clanked nearby, but the echo also said 'not financial advice.'",
    detail: "Mark the coordinates, breathe slowly, and do not trade the echo.",
    accent: "gray",
  },
  berry: {
    title: "Berry geode",
    badge: "Sweet signal",
    line: "Crack: tiny berry crystals. They are cute, identity-coded, and somehow already have a launch slogan.",
    detail: "A rare snack vein. Share carefully before the orchard becomes a spreadsheet.",
    accent: "pink",
    confetti: true,
  },
  wizard: {
    title: "Wizard lint",
    badge: "Tower residue",
    line: "Your pick found wizard lint: three prophecies, a build log, and a TODO wearing a little robe.",
    detail: "Not alpha exactly, but it can patch a vibe leak in under five minutes.",
    accent: "purple",
  },
  oatmeal: {
    title: "Oatmeal seam",
    badge: "Noise deposit",
    line: "The tunnel gave oatmeal. Warm, beige, and optimized for saying 'big things coming' without specifying a thing.",
    detail: "Close this shaft. The mine will forgive you. The timeline might even respect you.",
    accent: "gray",
  },
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTunnel(value: unknown): Tunnel {
  const asString = String(value ?? "oatmeal");
  return TUNNELS.some((cell) => cell.value === asString) ? (asString as Tunnel) : "oatmeal";
}

function signalScore(fid: number, value: Tunnel): number {
  const seed = hashText(`${SNAP_NAME}:${todayKey()}:${fid || "anon"}:${value}`);
  const base: Record<Tunnel, number> = {
    base: 86,
    snap: 90,
    identity: 72,
    reward: 66,
    test: 78,
    token: 47,
    berry: 81,
    wizard: 58,
    oatmeal: 18,
  };
  return Math.min(99, Math.max(4, (base[value] ?? 50) + (seed % 19) - 9));
}

function shareButton(self: string, text = "I tapped the Alpha Mine, a tiny timeline signal game.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function gridCells(selected?: Tunnel) {
  return TUNNELS.map((cell) => ({
    row: cell.row,
    col: cell.col,
    color: selected === cell.value ? "amber" : cell.color,
    content: cell.content,
    value: cell.value,
  }));
}

function renderStart(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "prompt", "mine", "hint", "share_btn"],
    },
    title: { type: "text", props: { content: "Alpha Mine", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: "One-tap signal dig", variant: "outline" } },
    prompt: {
      type: "text",
      props: {
        content: "The timeline is muttering about Base, Snaps, identity, rewards, and tests. Tap one tunnel to mine for signal.",
        align: "center",
      },
    },
    mine: {
      type: "cell_grid",
      props: {
        name: "tunnel",
        cols: 3,
        rows: 3,
        rowHeight: 52,
        cellAspectRatio: "square",
        cells: gridCells(),
      },
      on: { press: { action: "submit", params: { target: `${self}?action=mine` } } },
    },
    hint: { type: "text", props: { content: "No charts. No threads. Just one suspicious little tunnel.", size: "sm", align: "center" } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function renderResult(self: string, fid: number, value: Tunnel): SnapHandlerResult {
  const template = OUTCOMES[value] ?? OUTCOMES.oatmeal;
  const signal = signalScore(fid, value);
  const shareText = `Alpha Mine gave my timeline dig ${signal}% signal: ${template.badge}.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "mine", "meter", "line", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: template.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: template.badge, variant: "outline", color: template.accent } },
    mine: {
      type: "cell_grid",
      props: {
        name: "result",
        cols: 3,
        rows: 3,
        rowHeight: 38,
        cellAspectRatio: "square",
        cells: gridCells(value),
      },
    },
    meter: { type: "progress", props: { label: "Signal strength", value: signal, max: 100 } },
    line: { type: "text", props: { content: `${template.line} ${template.detail}`, size: "sm", align: "center" } },
    again_btn: {
      type: "button",
      props: { label: "Mine another tunnel", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share result"),
  };

  return {
    version: "2.0",
    theme: { accent: template.accent },
    ...(template.confetti ? { effects: ["confetti" as const] } : {}),
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderStart(self);
    }

    const fid = ctx.action.user.fid;
    const tunnel = normalizeTunnel(ctx.action.inputs?.tunnel);
    return renderResult(self, fid, tunnel);
  },
  {
    openGraph: {
      title: "Alpha Mine",
      description: "Tap one tunnel to mine the Farcaster timeline for tiny Base/Snaps signal.",
    },
  },
);

export default app;
