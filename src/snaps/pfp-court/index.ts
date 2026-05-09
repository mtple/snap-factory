/**
 * pfp-court — playful Farcaster avatar judgment snap.
 *
 * Components: toggle_group, slider, switch, badge, progress, text, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "pfp-court";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Vibe = "Founder" | "Goblin" | "Mystic" | "Creature";

type Verdict = {
  title: string;
  badge: string;
  line: string;
  suspicion: number;
  accent: Accent;
  confetti: boolean;
};

const VIBES: Vibe[] = ["Founder", "Goblin", "Mystic", "Creature"];

const TITLES: Record<Vibe, string[]> = {
  Founder: ["Boardroom cryptid", "Roadmap royalty", "Pitch deck paladin", "Stealth-mode monarch"],
  Goblin: ["Snack drawer menace", "Reply gremlin", "Timeline raccoon", "Meme basement mayor"],
  Mystic: ["Prophecy haver", "Aura compliance officer", "Moonlit moderator", "Soft-launch oracle"],
  Creature: ["Tiny forest CEO", "Mascot with a wallet", "Unlicensed familiar", "Wholesome jump scare"],
};

const LINES: Record<Vibe, string[]> = {
  Founder: [
    "The court detects three tabs of runway math and one brave little thesis.",
    "This avatar says: 'quick sync' but means 'summon the cap table.'",
    "Likely to say distribution before breakfast. Respectfully alarming.",
  ],
  Goblin: [
    "This PFP has opened the same draft twelve times and called it research.",
    "High side-quest density. Hide your snacks and your notifications.",
    "The court sees chaos, charm, and a suspiciously specific sticker folder.",
  ],
  Mystic: [
    "Posting cadence aligned with a weather system only you can perceive.",
    "The avatar knows when the group chat is about to get weird.",
    "Gentle omen energy. May bless a launch by liking it from the shadows.",
  ],
  Creature: [
    "Legally too shaped. The timeline will forgive almost anything.",
    "This PFP can commit crimes as long as they are adorable and low-stakes.",
    "Powerful mascot aura. Probably has better retention than your app.",
  ],
};

const BADGES = ["Mostly innocent", "Needs supervision", "Main character risk", "Extremely postable"];

function hashParts(parts: Array<string | number | boolean>): number {
  let hash = 2166136261;
  const text = parts.join("|");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanVibe(raw: unknown): Vibe {
  const value = String(raw ?? "Founder");
  return VIBES.includes(value as Vibe) ? (value as Vibe) : "Founder";
}

function cleanChaos(raw: unknown): number {
  const parsed = Number(raw ?? 45);
  if (!Number.isFinite(parsed)) return 45;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function cleanSwitch(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === "on" || raw === "1" || raw === 1;
}

function pick<T>(items: T[], seed: number, salt: number): T {
  return items[(seed + salt * 2654435761) % items.length];
}

function buildVerdict(vibe: Vibe, chaos: number, shades: boolean, fid: number): Verdict {
  const seed = hashParts([SNAP_NAME, vibe, chaos, shades, fid || 0]);
  const suspicion = Math.max(4, Math.min(100, chaos + (shades ? 17 : -4) + (seed % 19) - 9));
  const title = pick(TITLES[vibe], seed, 1);
  const line = pick(LINES[vibe], seed, 2);
  const badge = suspicion >= 82 ? BADGES[3] : suspicion >= 58 ? BADGES[2] : suspicion >= 33 ? BADGES[1] : BADGES[0];
  const accent: Accent = vibe === "Founder" ? "blue" : vibe === "Goblin" ? "amber" : vibe === "Mystic" ? "purple" : "green";
  return { title, badge, line, suspicion, accent, confetti: suspicion >= 88 || suspicion <= 12 };
}

function shareButton(self: string, text = "I brought my avatar before PFP Court. The verdict was legally tiny.", label = "Share court"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "intro", "vibe", "chaos", "shades", "buttons"] },
    title: { type: "text", props: { content: "PFP Court", weight: "bold", align: "center" } },
    intro: { type: "text", props: { content: "Put your avatar on trial. Pick the vibe, set the chaos, receive a completely binding timeline verdict.", size: "sm", align: "center" } },
    vibe: {
      type: "toggle_group",
      props: { name: "vibe", label: "Avatar vibe", options: VIBES.map((label) => ({ label, value: label })), defaultValue: "Goblin" },
    },
    chaos: { type: "slider", props: { name: "chaos", label: "Chaos level", min: 0, max: 100, step: 5, defaultValue: 45 } },
    shades: { type: "switch", props: { name: "shades", label: "Sunglasses involved" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["judge", "share_btn"] },
    judge: { type: "button", props: { label: "Judge PFP", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?action=judge` } } } },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, verdict: Verdict): SnapHandlerResult {
  const shareText = `PFP Court ruled my avatar: ${verdict.title}. ${verdict.badge}.`;
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "badge", "meter", "line", "buttons"] },
    title: { type: "text", props: { content: verdict.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: verdict.badge, variant: "outline" } },
    meter: { type: "progress", props: { label: "Timeline suspicion", value: verdict.suspicion, max: 100 } },
    line: { type: "text", props: { content: verdict.line, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
    again: { type: "button", props: { label: "Judge again", variant: "primary" }, on: { press: { action: "submit", params: { target: `${self}?reset=1` } } } },
    share_btn: shareButton(self, shareText, "Share verdict"),
  };

  return {
    version: "2.0",
    ...(verdict.confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: verdict.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const inputs = ctx.action.inputs ?? {};
    const vibe = cleanVibe(inputs.vibe);
    const chaos = cleanChaos(inputs.chaos);
    const shades = cleanSwitch(inputs.shades);
    const fid = ctx.action.user.fid;

    return resultPage(self, buildVerdict(vibe, chaos, shades, fid));
  },
  {
    openGraph: {
      title: "PFP Court",
      description: "Put your Farcaster avatar on trial and receive a tiny timeline verdict.",
    },
  },
);

export default app;
