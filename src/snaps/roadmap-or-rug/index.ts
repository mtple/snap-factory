/**
 * roadmap-or-rug — daily product-promise quiz for Farcaster/startup culture.
 *
 * Components: text, badge, toggle_group, progress, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "roadmap-or-rug";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type PromiseChoice = "Protocol" | "AI agent" | "Points" | "Mobile app";

type Scenario = {
  setup: string;
  choices: Record<PromiseChoice, string>;
  ruggiest: PromiseChoice;
  safest: PromiseChoice;
  badge: string;
};

type Verdict = {
  risk: number;
  title: string;
  badge: string;
  line: string;
  note: string;
  accent: Accent;
  confetti: boolean;
};

const CHOICES: PromiseChoice[] = ["Protocol", "AI agent", "Points", "Mobile app"];

const SCENARIOS: Scenario[] = [
  {
    setup: "A founder drops a calm 11:58pm update: everything is on track, just 'sequencing the GTM surface area.' Which promise smells ruggiest?",
    choices: {
      Protocol: "Protocol v2 this quarter",
      "AI agent": "Autonomous agent beta soon",
      Points: "Retroactive points are safe",
      "Mobile app": "Native mobile app next week",
    },
    ruggiest: "Points",
    safest: "Protocol",
    badge: "Roadmap fog",
  },
  {
    setup: "The team ships a landing page with seven gradients, one waitlist, and zero screenshots. Choose the future excuse.",
    choices: {
      Protocol: "Decentralizing after PMF",
      "AI agent": "Agents need one more model",
      Points: "Points math is proprietary",
      "Mobile app": "App Store review is haunted",
    },
    ruggiest: "AI agent",
    safest: "Mobile app",
    badge: "Screenshot famine",
  },
  {
    setup: "A roadmap says 'community-owned infra' five times and has a rocket emoji near the token-shaped paragraph.",
    choices: {
      Protocol: "Open source after audit",
      "AI agent": "Personal AI copilot Q3",
      Points: "Season 1 points multiplier",
      "Mobile app": "Android parity by Friday",
    },
    ruggiest: "Protocol",
    safest: "Mobile app",
    badge: "Infra incense",
  },
  {
    setup: "The demo works perfectly, but only on the founder's laptop and only when nobody asks about pricing.",
    choices: {
      Protocol: "Protocol fees TBD",
      "AI agent": "Agent handles everything",
      Points: "Points unlock governance",
      "Mobile app": "iOS TestFlight tonight",
    },
    ruggiest: "AI agent",
    safest: "Mobile app",
    badge: "Demo gremlins",
  },
  {
    setup: "A pivot announcement uses the words 'consumer social' and 'enterprise wedge' in the same sentence. Pick the wobble.",
    choices: {
      Protocol: "SDK first, app later",
      "AI agent": "Internal agent marketplace",
      Points: "Loyalty points season zero",
      "Mobile app": "Daily habit app relaunch",
    },
    ruggiest: "Mobile app",
    safest: "Protocol",
    badge: "Pivot fumes",
  },
];

const CLEAN_LINES = [
  "Correct. You smelled the smoke before the roadmap became interpretive dance.",
  "Clean call. A tiny due-diligence goblin salutes you.",
  "You found the soft floorboard. Product instincts remain operational.",
];

const MID_LINES = [
  "Playable guess. Not the biggest red flag, but still wearing a little fake mustache.",
  "Reasonable suspicion. The wizard files it under 'monitor aggressively.'",
  "Not wrong, just not the loudest siren in the slide deck.",
];

const MISS_LINES = [
  "That was actually the least cursed promise. The rug walked past you wearing a badge.",
  "Surprisingly safe! The scarier sentence was hiding elsewhere in the roadmap.",
  "A noble miss. The spreadsheet goblin has requested another look.",
];

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

function pick<T>(items: T[], seed: number, salt = 0): T {
  return items[(seed + salt * 1103515245) % items.length];
}

function scenarioFor(fid: number): Scenario {
  const seed = hashText(`${SNAP_NAME}:${todayKey()}:${fid || "anon"}`);
  return SCENARIOS[seed % SCENARIOS.length] ?? SCENARIOS[0];
}

function normalizeChoice(value: unknown): PromiseChoice {
  const asString = String(value ?? "Points");
  return CHOICES.includes(asString as PromiseChoice) ? (asString as PromiseChoice) : "Points";
}

function shareButton(self: string, text = "I played Roadmap or Rug — a tiny product-promise smell test.", label = "Share snap"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function verdictFor(fid: number, scenario: Scenario, choice: PromiseChoice): Verdict {
  const seed = hashText(`${SNAP_NAME}:${fid || 0}:${todayKey()}:${choice}`);
  const correct = choice === scenario.ruggiest;
  const safeMiss = choice === scenario.safest;
  const risk = correct ? 88 + (seed % 12) : safeMiss ? 14 + (seed % 16) : 49 + (seed % 25);
  const title = correct ? "Rug radar calibrated" : safeMiss ? "False alarm goblin" : "Suspicious, not fatal";
  const line = correct ? pick(CLEAN_LINES, seed, 1) : safeMiss ? pick(MISS_LINES, seed, 2) : pick(MID_LINES, seed, 3);
  const note = correct
    ? `Yep: “${scenario.choices[choice]}” was today's ruggiest promise.`
    : `The ruggiest promise was “${scenario.choices[scenario.ruggiest]}.” You picked “${scenario.choices[choice]}.”`;
  return {
    risk,
    title,
    badge: correct ? "Verified smoke" : safeMiss ? "Mostly harmless" : "Yellow flag",
    line,
    note,
    accent: correct ? "green" : safeMiss ? "blue" : "amber",
    confetti: correct,
  };
}

function renderStart(self: string, fid: number): SnapHandlerResult {
  const scenario = scenarioFor(fid);
  const options = CHOICES.map((choice) => ({ label: choice, value: choice }));
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "setup", "picker", "submit_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Roadmap or Rug?", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: scenario.badge, variant: "outline" } },
    setup: { type: "text", props: { content: scenario.setup, align: "center" } },
    picker: {
      type: "toggle_group",
      props: {
        name: "promise",
        label: "Which promise is the ruggiest?",
        options,
        orientation: "vertical",
        variant: "outline",
        defaultValue: "Points",
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Sniff the roadmap", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?judge=1` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "gray" }, ui: { root: "page", elements } };
}

function renderResult(self: string, fid: number, choice: PromiseChoice): SnapHandlerResult {
  const scenario = scenarioFor(fid);
  const verdict = verdictFor(fid, scenario, choice);
  const shareText = verdict.confetti
    ? "My Roadmap or Rug radar found the product smoke. 🧙"
    : `Roadmap or Rug gave my product-rug radar ${verdict.risk}% smoke.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "line", "note", "buttons"],
    },
    title: { type: "text", props: { content: verdict.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: verdict.badge, variant: "outline" } },
    meter: { type: "progress", props: { label: "Rug smoke", value: verdict.risk, max: 100 } },
    line: { type: "text", props: { content: verdict.line, align: "center" } },
    note: { type: "text", props: { content: verdict.note, size: "sm", align: "center" } },
    buttons: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again_btn", "share_btn"] },
    again_btn: {
      type: "button",
      props: { label: "Judge again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText, "Share verdict"),
  };

  return {
    version: "2.0",
    theme: { accent: verdict.accent },
    ...(verdict.confetti ? { effects: ["confetti" as const] } : {}),
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
      return renderStart(self, fid);
    }

    return renderResult(self, fid, normalizeChoice(ctx.action.inputs?.promise));
  },
  {
    openGraph: {
      title: "Roadmap or Rug?",
      description: "A daily product-promise smell test for Farcaster builders with suspicious roadmap instincts.",
    },
  },
);

export default app;
