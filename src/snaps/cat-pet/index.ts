/**
 * cat-pet — a virtual cat named Whiskers you feed, play with, clean, or reset.
 *
 * Four actions: Feed, Play, Clean, Reset.
 * Stats (hunger, happiness, cleanliness) decay over time.
 * Cat's mood and emoji reflect current stat average.
 *
 * State (Turso, per-FID):
 *   cat-pet:hunger:{fid}  → number 0–100
 *   cat-pet:happy:{fid}   → number 0–100
 *   cat-pet:clean:{fid}   → number 0–100
 *   cat-pet:last:{fid}    → ISO timestamp (for decay calculation)
 *
 * Pages (via ?page= query param on POST targets):
 *   GET / no page → welcome screen
 *   cat           → Whiskers status + 4 action buttons
 *   feed          → apply feed, show result
 *   play          → apply play, show result
 *   clean         → apply clean, show result
 *   reset         → reset all stats to 70, show result
 *
 * Components: text, button, progress, separator, stack
 * Actions: submit, compose_cast
 * Accent: pink (happy), amber (neutral), red (critical)
 * Event mode snap — built for @mehdihasan
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";
import { createTursoDataStore } from "@farcaster/snap-turso";

const app = new Hono();
const SNAP_NAME = "cat-pet";
const store = createTursoDataStore();

type Elements = Record<string, SnapElementInput>;
type AccentColor = "amber" | "green" | "red" | "blue" | "gray" | "teal" | "purple" | "pink";

const DEFAULT_STAT = 70;
// Decay: per hour, each stat loses this many points
const DECAY_RATE_PER_HOUR = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

interface CatState {
  hunger: number;
  happy: number;
  clean: number;
}

function applyDecay(state: CatState, lastIso: string | null): CatState {
  if (!lastIso) return state;
  const hoursElapsed = (Date.now() - new Date(lastIso).getTime()) / 3_600_000;
  const drop = Math.floor(hoursElapsed * DECAY_RATE_PER_HOUR);
  if (drop <= 0) return state;
  return {
    hunger: clamp(state.hunger - drop),
    happy: clamp(state.happy - drop),
    clean: clamp(state.clean - drop),
  };
}

function avgStat(state: CatState): number {
  return Math.round((state.hunger + state.happy + state.clean) / 3);
}

function catEmoji(avg: number): string {
  if (avg >= 80) return "😸";
  if (avg >= 60) return "🐱";
  if (avg >= 40) return "😾";
  if (avg >= 20) return "😿";
  return "🙀";
}

function catMood(avg: number): string {
  if (avg >= 80) return "Whiskers is thriving!";
  if (avg >= 60) return "Whiskers is doing okay.";
  if (avg >= 40) return "Whiskers is grumpy.";
  if (avg >= 20) return "Whiskers is unhappy — needs attention.";
  return "Whiskers is in crisis!";
}

function accentForAvg(avg: number): AccentColor {
  if (avg >= 60) return "pink";
  if (avg >= 30) return "amber";
  return "red";
}

async function loadState(fid: number): Promise<CatState> {
  const [hungerRaw, happyRaw, cleanRaw, lastRaw] = await Promise.all([
    store.get(`cat-pet:hunger:${fid}`),
    store.get(`cat-pet:happy:${fid}`),
    store.get(`cat-pet:clean:${fid}`),
    store.get(`cat-pet:last:${fid}`),
  ]);
  const raw: CatState = {
    hunger: typeof hungerRaw === "number" ? hungerRaw : DEFAULT_STAT,
    happy: typeof happyRaw === "number" ? happyRaw : DEFAULT_STAT,
    clean: typeof cleanRaw === "number" ? cleanRaw : DEFAULT_STAT,
  };
  const lastStr = typeof lastRaw === "string" ? lastRaw : null;
  return applyDecay(raw, lastStr);
}

async function saveState(fid: number, state: CatState): Promise<void> {
  await Promise.all([
    store.set(`cat-pet:hunger:${fid}`, state.hunger),
    store.set(`cat-pet:happy:${fid}`, state.happy),
    store.set(`cat-pet:clean:${fid}`, state.clean),
    store.set(`cat-pet:last:${fid}`, new Date().toISOString()),
  ]);
}

// ── Screens ───────────────────────────────────────────────────────────────────

function renderWelcome(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg" },
          children: ["title", "subtitle", "sep", "play_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "😸 Whiskers the Cat", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content:
              "Whiskers is your virtual cat. Feed her, play with her, keep her clean. Neglect her and she gets grumpy. Tap to check in.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        play_btn: {
          type: "button",
          props: { label: "Visit Whiskers", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: `${self}?page=cat` } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "checking in on my virtual cat Whiskers on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

function renderCat(self: string, state: CatState): SnapHandlerResult {
  const avg = avgStat(state);
  const emoji = catEmoji(avg);
  const mood = catMood(avg);
  const accent = accentForAvg(avg);

  const statColor = (v: number): AccentColor => {
    if (v >= 60) return "green";
    if (v >= 30) return "amber";
    return "red";
  };

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: [
        "title",
        "mood_txt",
        "sep",
        "hunger_bar",
        "happy_bar",
        "clean_bar",
        "sep2",
        "feed_btn",
        "play_btn",
        "clean_btn",
        "reset_btn",
        "share_btn",
      ],
    },
    title: {
      type: "text",
      props: { content: `${emoji} Whiskers`, weight: "bold", align: "center" },
    },
    mood_txt: {
      type: "text",
      props: { content: mood, size: "sm", align: "center" },
    },
    sep: { type: "separator", props: {} },
    hunger_bar: {
      type: "progress",
      props: {
        value: state.hunger,
        max: 100,
        label: `Hunger: ${state.hunger}/100`,
        color: statColor(state.hunger),
      },
    },
    happy_bar: {
      type: "progress",
      props: {
        value: state.happy,
        max: 100,
        label: `Happiness: ${state.happy}/100`,
        color: statColor(state.happy),
      },
    },
    clean_bar: {
      type: "progress",
      props: {
        value: state.clean,
        max: 100,
        label: `Cleanliness: ${state.clean}/100`,
        color: statColor(state.clean),
      },
    },
    sep2: { type: "separator", props: {} },
    feed_btn: {
      type: "button",
      props: { label: "Feed", variant: "primary" },
      on: {
        press: { action: "submit", params: { target: `${self}?page=feed` } },
      },
    },
    play_btn: {
      type: "button",
      props: { label: "Play", variant: "secondary" },
      on: {
        press: { action: "submit", params: { target: `${self}?page=play` } },
      },
    },
    clean_btn: {
      type: "button",
      props: { label: "Clean", variant: "secondary" },
      on: {
        press: { action: "submit", params: { target: `${self}?page=clean` } },
      },
    },
    reset_btn: {
      type: "button",
      props: { label: "Reset", variant: "secondary" },
      on: {
        press: { action: "submit", params: { target: `${self}?page=reset` } },
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: `Whiskers is at ${avg}/100 average happiness on @freeturtle. go visit your cat`,
            embeds: [self],
          },
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent },
    ui: { root: "page", elements },
  };
}

function renderResult(
  self: string,
  action: string,
  state: CatState,
  withConfetti: boolean,
): SnapHandlerResult {
  const avg = avgStat(state);
  const emoji = catEmoji(avg);
  const accent = accentForAvg(avg);

  const labels: Record<string, string> = {
    feed: "You fed Whiskers. Hunger +20.",
    play: "You played with Whiskers. Happiness +20, hunger -10.",
    clean: "You cleaned Whiskers. Cleanliness +20.",
    reset: "Whiskers has been reset. All stats back to 70.",
  };
  const resultText = labels[action] ?? "Done.";

  const statColor = (v: number): AccentColor => {
    if (v >= 60) return "green";
    if (v >= 30) return "amber";
    return "red";
  };

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            "title",
            "result_txt",
            "sep",
            "hunger_bar",
            "happy_bar",
            "clean_bar",
            "sep2",
            "back_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: `${emoji} Nice!`, weight: "bold", align: "center" },
        },
        result_txt: {
          type: "text",
          props: { content: resultText, size: "sm", align: "center" },
        },
        sep: { type: "separator", props: {} },
        hunger_bar: {
          type: "progress",
          props: {
            value: state.hunger,
            max: 100,
            label: `Hunger: ${state.hunger}/100`,
            color: statColor(state.hunger),
          },
        },
        happy_bar: {
          type: "progress",
          props: {
            value: state.happy,
            max: 100,
            label: `Happiness: ${state.happy}/100`,
            color: statColor(state.happy),
          },
        },
        clean_bar: {
          type: "progress",
          props: {
            value: state.clean,
            max: 100,
            label: `Cleanliness: ${state.clean}/100`,
            color: statColor(state.clean),
          },
        },
        sep2: { type: "separator", props: {} },
        back_btn: {
          type: "button",
          props: { label: "Back to Whiskers", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: `${self}?page=cat` } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `just took care of my virtual cat Whiskers on @freeturtle`,
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };

  if (withConfetti) {
    response.effects = ["confetti"];
  }

  return response;
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const page = url.searchParams.get("page");

  // Welcome screen on initial load
  if (ctx.action.type === "get") {
    return renderWelcome(self);
  }

  const fid = ctx.action.fid;

  // Cat status screen
  if (page === "cat") {
    const state = await loadState(fid);
    await saveState(fid, state); // persist decayed values
    return renderCat(self, state);
  }

  // Feed: hunger +20, capped at 100
  if (page === "feed") {
    const state = await loadState(fid);
    const newState: CatState = {
      hunger: clamp(state.hunger + 20),
      happy: state.happy,
      clean: state.clean,
    };
    await saveState(fid, newState);
    return renderResult(self, "feed", newState, false);
  }

  // Play: happiness +20, hunger -10
  if (page === "play") {
    const state = await loadState(fid);
    const newState: CatState = {
      hunger: clamp(state.hunger - 10),
      happy: clamp(state.happy + 20),
      clean: state.clean,
    };
    await saveState(fid, newState);
    return renderResult(self, "play", newState, true);
  }

  // Clean: cleanliness +20
  if (page === "clean") {
    const state = await loadState(fid);
    const newState: CatState = {
      hunger: state.hunger,
      happy: state.happy,
      clean: clamp(state.clean + 20),
    };
    await saveState(fid, newState);
    return renderResult(self, "clean", newState, false);
  }

  // Reset: all stats back to 70
  if (page === "reset") {
    const newState: CatState = { hunger: DEFAULT_STAT, happy: DEFAULT_STAT, clean: DEFAULT_STAT };
    await saveState(fid, newState);
    return renderResult(self, "reset", newState, false);
  }

  // Fallback → welcome
  return renderWelcome(self);
});

export default app;
