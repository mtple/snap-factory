/**
 * snapagotchi-house — a virtual house you maintain daily or it falls apart.
 *
 * Do maintenance actions each day to keep your house healthy. Neglect it for
 * 24 hours and health decays by 30. Hit zero and the house collapses — rebuild
 * to start fresh. Top maintainers appear on the leaderboard.
 *
 * State (Turso):
 *   house:health:{fid}  → number 0–100 (stored after decay calculation)
 *   house:last:{fid}    → ISO timestamp of last maintenance action
 *   house:score:{fid}   → total lifetime maintenance actions
 *   house:lb            → JSON [{fid:number,score:number}] top 10 desc
 *
 * Pages (via ?page= query param on POST targets):
 *   GET / no page → home (start screen)
 *   house         → my house status + action picker
 *   maintain      → apply action, show result
 *   leaderboard   → top 10 homeowners
 *   rebuild       → reset collapsed house to 100 health
 *
 * Components: text, button, progress, toggle_group, item, item_group,
 *             separator, stack
 * Actions: submit, compose_cast
 * Accent: amber (main), green (success), red (collapsed)
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";
import { createTursoDataStore } from "@farcaster/snap-turso";

const app = new Hono();
const SNAP_NAME = "snapagotchi-house";
const store = createTursoDataStore();

type Elements = Record<string, SnapElementInput>;
type LbEntry = { fid: number; score: number };
type AccentColor = "amber" | "green" | "red" | "blue" | "gray" | "teal" | "purple" | "pink";

const DECAY_HOURS = 24;
const DECAY_AMOUNT = 30;
const HEAL_AMOUNT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcDecayedHealth(storedHealth: number, lastStr: string | null): number {
  if (!lastStr) return storedHealth;
  const hoursElapsed = (Date.now() - new Date(lastStr).getTime()) / 3_600_000;
  const periods = Math.floor(hoursElapsed / DECAY_HOURS);
  return Math.max(0, storedHealth - periods * DECAY_AMOUNT);
}

function houseEmoji(health: number): string {
  if (health >= 80) return "🏠";
  if (health >= 50) return "🏚";
  if (health > 0) return "⚠️";
  return "💀";
}

function healthStatus(health: number): string {
  if (health >= 80) return "In great shape";
  if (health >= 50) return "Needs some attention";
  if (health > 0) return "In bad shape — act fast";
  return "Collapsed";
}

function accentForHealth(health: number): AccentColor {
  if (health >= 50) return "green";
  if (health > 0) return "amber";
  return "red";
}

async function loadState(fid: number): Promise<{ health: number; score: number }> {
  const [healthRaw, lastRaw, scoreRaw] = await Promise.all([
    store.get(`house:health:${fid}`),
    store.get(`house:last:${fid}`),
    store.get(`house:score:${fid}`),
  ]);
  const storedHealth = typeof healthRaw === "number" ? healthRaw : 100;
  const lastStr = typeof lastRaw === "string" ? lastRaw : null;
  const health = calcDecayedHealth(storedHealth, lastStr);
  const score = typeof scoreRaw === "number" ? scoreRaw : 0;
  return { health, score };
}

async function updateLeaderboard(fid: number, score: number): Promise<void> {
  const raw = await store.get("house:lb");
  let lb: LbEntry[] = Array.isArray(raw) ? (raw as LbEntry[]) : [];
  const idx = lb.findIndex((e) => e.fid === fid);
  if (idx >= 0) {
    lb[idx].score = score;
  } else {
    lb.push({ fid, score });
  }
  lb.sort((a, b) => b.score - a.score);
  await store.set("house:lb", lb.slice(0, 10));
}

// ── Screens ───────────────────────────────────────────────────────────────────

function renderHome(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg" },
          children: ["title", "subtitle", "sep", "play_btn", "lb_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "🏠 Snapagotchi House", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content:
              "Your house needs daily care or it falls apart. Do maintenance to keep it alive. Neglect it for 24h and health drops. Hit zero — it collapses.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        play_btn: {
          type: "button",
          props: { label: "Check my house", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: `${self}?page=house` } },
          },
        },
        lb_btn: {
          type: "button",
          props: { label: "Leaderboard", variant: "secondary" },
          on: {
            press: { action: "submit", params: { target: `${self}?page=leaderboard` } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "maintaining my virtual house on @freeturtle. keep yours alive or it collapses",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

function renderHouse(
  self: string,
  health: number,
  score: number,
): SnapHandlerResult {
  const collapsed = health <= 0;
  const accent = accentForHealth(health);
  const emoji = houseEmoji(health);
  const status = healthStatus(health);

  const elements: Elements = {};

  if (collapsed) {
    elements.page = {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "status_txt", "health_bar", "score_txt", "rebuild_btn", "lb_btn", "share_btn"],
    };
    elements.title = {
      type: "text",
      props: { content: "💀 House Collapsed", weight: "bold", align: "center" },
    };
    elements.status_txt = {
      type: "text",
      props: {
        content: "You neglected it too long. Rebuild to start fresh.",
        size: "sm",
        align: "center",
      },
    };
    elements.health_bar = {
      type: "progress",
      props: { value: 0, max: 100, label: "Health: 0/100", color: "red" },
    };
    elements.score_txt = {
      type: "text",
      props: { content: `Lifetime actions: ${score}`, size: "sm", align: "center" },
    };
    elements.rebuild_btn = {
      type: "button",
      props: { label: "Rebuild house", variant: "primary" },
      on: {
        press: { action: "submit", params: { target: `${self}?page=rebuild` } },
      },
    };
    elements.lb_btn = {
      type: "button",
      props: { label: "Leaderboard", variant: "secondary" },
      on: {
        press: { action: "submit", params: { target: `${self}?page=leaderboard` } },
      },
    };
    elements.share_btn = {
      type: "button",
      props: { label: "Share", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: "my house on @freeturtle just collapsed. lesson learned 🏚",
            embeds: [self],
          },
        },
      },
    };

    return {
      version: "1.0",
      theme: { accent: "red" },
      ui: { root: "page", elements },
    };
  }

  elements.page = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: [
      "title",
      "status_txt",
      "health_bar",
      "score_txt",
      "sep",
      "action_picker",
      "maintain_btn",
      "lb_btn",
      "share_btn",
    ],
  };
  elements.title = {
    type: "text",
    props: { content: `${emoji} Your House`, weight: "bold", align: "center" },
  };
  elements.status_txt = {
    type: "text",
    props: { content: status, size: "sm", align: "center" },
  };
  elements.health_bar = {
    type: "progress",
    props: {
      value: health,
      max: 100,
      label: `Health: ${health}/100`,
      color: accent,
    },
  };
  elements.score_txt = {
    type: "text",
    props: { content: `Lifetime actions: ${score}`, size: "sm", align: "center" },
  };
  elements.sep = { type: "separator", props: {} };
  elements.action_picker = {
    type: "toggle_group",
    props: {
      name: "action",
      label: "What needs fixing?",
      options: [
        { label: "Fix something", value: "fix" },
        { label: "Water plants", value: "water" },
        { label: "Clean up", value: "clean" },
      ],
      orientation: "horizontal",
      variant: "outline",
      defaultValue: "fix",
    },
  };
  elements.maintain_btn = {
    type: "button",
    props: { label: "Do maintenance", variant: "primary" },
    on: {
      press: { action: "submit", params: { target: `${self}?page=maintain` } },
    },
  };
  elements.lb_btn = {
    type: "button",
    props: { label: "Leaderboard", variant: "secondary" },
    on: {
      press: { action: "submit", params: { target: `${self}?page=leaderboard` } },
    },
  };
  elements.share_btn = {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text: `maintaining my virtual house on @freeturtle. health: ${health}/100`,
          embeds: [self],
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
  newHealth: number,
  score: number,
): SnapHandlerResult {
  const labels: Record<string, string> = {
    fix: "Fixed something around the house",
    water: "Watered the plants",
    clean: "Cleaned up the place",
  };
  const actionLabel = labels[action] ?? "Did some maintenance";
  const emoji = houseEmoji(newHealth);

  return {
    version: "1.0",
    theme: { accent: "green" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title",
            "action_done",
            "health_bar",
            "score_txt",
            "back_btn",
            "lb_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: `${emoji} Nice work!`, weight: "bold", align: "center" },
        },
        action_done: {
          type: "text",
          props: { content: actionLabel, size: "sm", align: "center" },
        },
        health_bar: {
          type: "progress",
          props: {
            value: newHealth,
            max: 100,
            label: `Health: ${newHealth}/100 (+${HEAL_AMOUNT})`,
            color: "green",
          },
        },
        score_txt: {
          type: "text",
          props: {
            content: `Lifetime actions: ${score}`,
            size: "sm",
            align: "center",
          },
        },
        back_btn: {
          type: "button",
          props: { label: "Check house again", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: `${self}?page=house` } },
          },
        },
        lb_btn: {
          type: "button",
          props: { label: "Leaderboard", variant: "secondary" },
          on: {
            press: { action: "submit", params: { target: `${self}?page=leaderboard` } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `just maintained my virtual house on @freeturtle. health: ${newHealth}/100 🏠`,
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

async function renderLeaderboard(self: string, currentFid: number): Promise<SnapHandlerResult> {
  const raw = await store.get("house:lb");
  const lb: LbEntry[] = Array.isArray(raw) ? (raw as LbEntry[]).slice(0, 5) : [];

  const elements: Elements = {};
  const itemIds: string[] = [];
  const medals = ["🥇", "🥈", "🥉", "4th", "5th"];

  if (lb.length === 0) {
    elements.empty_txt = {
      type: "text",
      props: { content: "No one on the board yet. Be the first!", size: "sm", align: "center" },
    };
    itemIds.push("empty_txt");
  } else {
    lb.forEach((entry, i) => {
      const isMe = entry.fid === currentFid;
      const key = `lb_item_${i}`;
      elements[key] = {
        type: "item",
        props: {
          title: `${medals[i]} FID ${entry.fid}${isMe ? " (you)" : ""}`,
          description: `${entry.score} maintenance actions`,
        },
      };
      itemIds.push(key);
    });
  }

  elements.lb_group = {
    type: "item_group",
    props: {},
    children: itemIds,
  };

  elements.page = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: ["lb_title", "lb_sub", "lb_group", "back_btn", "share_btn"],
  };
  elements.lb_title = {
    type: "text",
    props: { content: "🏆 Best Homeowners", weight: "bold", align: "center" },
  };
  elements.lb_sub = {
    type: "text",
    props: { content: "Top 5 by total maintenance actions", size: "sm", align: "center" },
  };
  elements.back_btn = {
    type: "button",
    props: { label: "Check my house", variant: "primary" },
    on: {
      press: { action: "submit", params: { target: `${self}?page=house` } },
    },
  };
  elements.share_btn = {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text: "maintaining my virtual house on @freeturtle. see the leaderboard 🏆",
          embeds: [self],
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const page = url.searchParams.get("page");

  // Initial render → home screen
  if (ctx.action.type === "get") {
    return renderHome(self);
  }

  const fid = ctx.action.fid;

  // Check my house
  if (page === "house") {
    const { health, score } = await loadState(fid);
    // Persist decayed value so next load is accurate
    await store.set(`house:health:${fid}`, health);
    return renderHouse(self, health, score);
  }

  // Apply a maintenance action
  if (page === "maintain") {
    const { health, score } = await loadState(fid);

    if (health <= 0) {
      return renderHouse(self, 0, score);
    }

    const action = (ctx.action.inputs?.["action"] as string | undefined) ?? "fix";
    const newHealth = Math.min(100, health + HEAL_AMOUNT);
    const newScore = score + 1;
    const now = new Date().toISOString();

    await Promise.all([
      store.set(`house:health:${fid}`, newHealth),
      store.set(`house:last:${fid}`, now),
      store.set(`house:score:${fid}`, newScore),
      updateLeaderboard(fid, newScore),
    ]);

    return renderResult(self, action, newHealth, newScore);
  }

  // Rebuild a collapsed house
  if (page === "rebuild") {
    const scoreRaw = await store.get(`house:score:${fid}`);
    const score = typeof scoreRaw === "number" ? scoreRaw : 0;
    await Promise.all([
      store.set(`house:health:${fid}`, 100),
      store.set(`house:last:${fid}`, new Date().toISOString()),
    ]);
    return renderHouse(self, 100, score);
  }

  // Leaderboard
  if (page === "leaderboard") {
    return await renderLeaderboard(self, fid);
  }

  // Fallback → home
  return renderHome(self);
});

export default app;
