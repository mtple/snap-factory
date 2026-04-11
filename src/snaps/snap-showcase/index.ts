/**
 * snap-showcase — interactive tour of what snaps can do.
 *
 * Four live demos across five pages, each showing a different component set:
 *   home      — toggle_group navigation menu
 *   ?page=chart   — bar_chart + live voting (Turso KV)
 *   ?page=grid    — cell_grid color vibe picker (single-select)
 *   ?page=form    — slider + switch + toggle_group → personalized result
 *   ?page=stats   — item_group + progress + badge dashboard
 *
 * Routing: query param ?page= on POST target URLs
 * State:   Turso KV for chart vote counts (prefix: snap-showcase:v-)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "snap-showcase";

// ── Chart data ────────────────────────────────────────────────────────────────

const CHART_OPTS = ["Games", "Polls", "Tools", "Art"] as const;
type ChartOpt = (typeof CHART_OPTS)[number];

function chartKey(o: string) {
  return `snap-showcase:v-${o.toLowerCase()}`;
}

async function getVotes(): Promise<Record<ChartOpt, number>> {
  const r = {} as Record<ChartOpt, number>;
  for (const o of CHART_OPTS) {
    const v = await store.get(chartKey(o));
    r[o] = typeof v === "number" ? v : 0;
  }
  return r;
}

// ── Grid data ─────────────────────────────────────────────────────────────────

const GRID_COLS = 8;
const GRID_ROWS = 4;

interface VibeInfo {
  hex: string;
  name: string;
  msg: string;
  color: "red" | "amber" | "green" | "blue";
}

const VIBES: VibeInfo[] = [
  { hex: "#ef4444", name: "Fire", msg: "Fire mode activated. Nothing stops you.", color: "red" },
  { hex: "#f59e0b", name: "Amber", msg: "Warm energy. You're radiating right now.", color: "amber" },
  { hex: "#22c55e", name: "Chill", msg: "Grounded and calm. Forest-brained.", color: "green" },
  { hex: "#3b82f6", name: "Ocean", msg: "Cool under pressure. Deep thinker.", color: "blue" },
];

function buildGridCells(): Array<{ row: number; col: number; color: string }> {
  const cells: Array<{ row: number; col: number; color: string }> = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      cells.push({ row: r, col: c, color: VIBES[r].hex });
    }
  }
  return cells;
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);
  const page = reqUrl.searchParams.get("page") ?? "home";

  // GET always shows home
  if (ctx.action.type === "get") return homePage(self);

  // POST — safe to access inputs
  const inputs = ctx.action.inputs as Record<string, unknown>;

  // ── Home navigation ──────────────────────────────────────────────────────
  if (page === "home") {
    const demo = inputs.demo as string | undefined;
    if (demo === "Bar chart") {
      const votes = await getVotes();
      return chartFormPage(self, votes);
    }
    if (demo === "Color grid") return gridFormPage(self);
    if (demo === "Form") return formPage(self);
    if (demo === "Dashboard") {
      const votes = await getVotes();
      return dashboardPage(self, votes);
    }
    return homePage(self);
  }

  // ── Chart: vote + show results ───────────────────────────────────────────
  if (page === "chart") {
    const raw = inputs.vote as string | undefined;
    const valid = CHART_OPTS.find((o) => o === raw);
    if (valid) {
      const cur = await store.get(chartKey(valid));
      await store.set(chartKey(valid), (typeof cur === "number" ? cur : 0) + 1);
      const votes = await getVotes();
      return chartResultPage(self, valid, votes);
    }
    const votes = await getVotes();
    return chartFormPage(self, votes);
  }

  // ── Grid: pick color vibe ────────────────────────────────────────────────
  if (page === "grid") {
    const raw = inputs.grid_tap as string | undefined;
    if (raw) {
      const row = parseInt(raw.split(",")[0] ?? "", 10);
      if (!isNaN(row) && row >= 0 && row < GRID_ROWS) {
        return gridResultPage(self, VIBES[row]);
      }
    }
    return gridFormPage(self);
  }

  // ── Form: slider + switch + toggle → result ──────────────────────────────
  if (page === "form") {
    const rating =
      typeof inputs.rating === "number" ? Math.round(inputs.rating) : 5;
    const dark =
      typeof inputs.dark === "boolean" ? inputs.dark : false;
    const fav = (inputs.fav as string | undefined) ?? undefined;
    return formResultPage(self, rating, dark, fav);
  }

  // ── Stats dashboard ──────────────────────────────────────────────────────
  if (page === "stats") {
    const votes = await getVotes();
    return dashboardPage(self, votes);
  }

  return homePage(self);
});

// ── Page builders ─────────────────────────────────────────────────────────────

function homePage(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["badge", "title", "body", "sep", "pick", "go"],
        },
        badge: {
          type: "badge",
          props: { label: "Snap Showcase", variant: "outline" },
        },
        title: {
          type: "text",
          props: { content: "What can a snap do?", weight: "bold" },
        },
        body: {
          type: "text",
          props: {
            content:
              "A lot. Four live demos — each one shows off a different set of components. Pick one and see.",
            size: "sm",
          },
        },
        sep: { type: "separator", props: {} },
        pick: {
          type: "toggle_group",
          props: {
            name: "demo",
            label: "Pick a demo",
            options: ["Bar chart", "Color grid", "Form", "Dashboard"],
            orientation: "vertical",
            variant: "default",
          },
        },
        go: {
          type: "button",
          props: { label: "Explore →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
      },
    },
  };
}

function chartFormPage(
  self: string,
  votes: Record<ChartOpt, number>,
): SnapHandlerResult {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const bars = CHART_OPTS.map((o) => ({ label: o, value: votes[o] }));

  return {
    version: "1.0",
    theme: { accent: "blue" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "badge",
            "title",
            "chart",
            "total_txt",
            "sep",
            "vote_pick",
            "btn_row",
          ],
        },
        badge: {
          type: "badge",
          props: { label: "Bar chart + live voting", variant: "outline" },
        },
        title: {
          type: "text",
          props: {
            content: "What kind of snap do you like most?",
            weight: "bold",
          },
        },
        chart: { type: "bar_chart", props: { bars } },
        total_txt: {
          type: "text",
          props: {
            content:
              total > 0
                ? `${total} votes cast so far`
                : "No votes yet — be the first.",
            size: "sm",
          },
        },
        sep: { type: "separator", props: {} },
        vote_pick: {
          type: "toggle_group",
          props: {
            name: "vote",
            label: "Cast your vote",
            options: [...CHART_OPTS],
            orientation: "horizontal",
            variant: "default",
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "vote_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Home", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        vote_btn: {
          type: "button",
          props: { label: "Vote →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=chart` },
            },
          },
        },
      },
    },
  };
}

function chartResultPage(
  self: string,
  voted: ChartOpt,
  votes: Record<ChartOpt, number>,
): SnapHandlerResult {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const bars = CHART_OPTS.map((o) => ({
    label: o,
    value: votes[o],
    ...(o === voted ? { color: "blue" as const } : {}),
  }));
  const pct =
    total > 0 ? Math.round((votes[voted] / total) * 100) : 100;

  return {
    version: "1.0",
    theme: { accent: "blue" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "chart", "total_txt", "btn_row"],
        },
        title: {
          type: "text",
          props: {
            content: `You voted: ${voted} — ${pct}% agree`,
            weight: "bold",
          },
        },
        chart: { type: "bar_chart", props: { bars } },
        total_txt: {
          type: "text",
          props: { content: `${total} total votes`, size: "sm" },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "next_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Home", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        next_btn: {
          type: "button",
          props: { label: "Color grid →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=grid` },
            },
          },
        },
      },
    },
  };
}

function gridFormPage(self: string): SnapHandlerResult {
  const cells = buildGridCells();
  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["badge", "title", "body", "grid", "btn_row"],
        },
        badge: {
          type: "badge",
          props: { label: "Cell grid (single-select)", variant: "outline" },
        },
        title: {
          type: "text",
          props: { content: "Tap a color row to pick your vibe", weight: "bold" },
        },
        body: {
          type: "text",
          props: {
            content: "Fire · Amber · Chill · Ocean — tap any cell, then submit.",
            size: "sm",
          },
        },
        grid: {
          type: "cell_grid",
          props: {
            cols: GRID_COLS,
            rows: GRID_ROWS,
            rowHeight: 32,
            cells,
            select: "single",
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "submit_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Home", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        submit_btn: {
          type: "button",
          props: { label: "Pick this vibe →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=grid` },
            },
          },
        },
      },
    },
  };
}

function gridResultPage(self: string, vibe: VibeInfo): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["badge", "title", "body", "vibe_badge", "btn_row"],
        },
        badge: {
          type: "badge",
          props: { label: "Cell grid", variant: "default" },
        },
        title: {
          type: "text",
          props: { content: `Your vibe: ${vibe.name}`, weight: "bold" },
        },
        body: {
          type: "text",
          props: { content: vibe.msg, size: "sm" },
        },
        vibe_badge: {
          type: "badge",
          props: { label: vibe.name, variant: "default", color: vibe.color },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "next_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Home", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        next_btn: {
          type: "button",
          props: { label: "Form demo →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=form` },
            },
          },
        },
      },
    },
  };
}

function formPage(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["badge", "title", "rating", "dark", "fav", "btn_row"],
        },
        badge: {
          type: "badge",
          props: { label: "Slider + switch + toggle", variant: "outline" },
        },
        title: {
          type: "text",
          props: { content: "Tell me about yourself", weight: "bold" },
        },
        rating: {
          type: "slider",
          props: {
            name: "rating",
            label: "Energy level today (1–10)",
            min: 1,
            max: 10,
            step: 1,
            defaultValue: 5,
            showValue: true,
          },
        },
        dark: {
          type: "switch",
          props: {
            name: "dark",
            label: "Dark mode loyalist?",
            defaultValue: false,
          },
        },
        fav: {
          type: "toggle_group",
          props: {
            name: "fav",
            label: "Favorite snap type",
            options: ["Games", "Tools", "Polls", "Art"],
            orientation: "horizontal",
            variant: "outline",
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "submit_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Home", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        submit_btn: {
          type: "button",
          props: { label: "Submit →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=form` },
            },
          },
        },
      },
    },
  };
}

function formResultPage(
  self: string,
  rating: number,
  dark: boolean,
  fav: string | undefined,
): SnapHandlerResult {
  const energyLabel =
    rating >= 8 ? "high energy" : rating >= 5 ? "mid-range" : "chill";
  const darkStr = dark ? "dark mode devotee" : "light mode enjoyer";
  const favStr = fav ?? "undecided";

  return {
    version: "1.0",
    theme: { accent: "amber" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "badge",
            "title",
            "sep",
            "stats_group",
            "btn_row",
          ],
        },
        badge: {
          type: "badge",
          props: { label: "Your snap persona", variant: "default" },
        },
        title: {
          type: "text",
          props: { content: "Here's what the inputs say about you", weight: "bold" },
        },
        sep: { type: "separator", props: {} },
        stats_group: {
          type: "item_group",
          props: { border: true, separator: true },
          children: ["energy_item", "mode_item", "fav_item"],
        },
        energy_item: {
          type: "item",
          props: {
            title: "Energy",
            description: `${rating}/10 — ${energyLabel}`,
          },
        },
        mode_item: {
          type: "item",
          props: {
            title: "Display preference",
            description: darkStr,
          },
        },
        fav_item: {
          type: "item",
          props: {
            title: "Favorite snaps",
            description: favStr,
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "next_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Home", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        next_btn: {
          type: "button",
          props: { label: "Dashboard →", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=stats` },
            },
          },
        },
      },
    },
  };
}

function dashboardPage(
  self: string,
  votes: Record<ChartOpt, number>,
): SnapHandlerResult {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const topOpt = CHART_OPTS.reduce((a, b) =>
    votes[a] >= votes[b] ? a : b,
  );
  const topPct =
    total > 0 ? Math.round((votes[topOpt] / total) * 100) : 0;

  const votesDesc =
    total > 0
      ? `${total} votes — top pick: ${topOpt} (${topPct}%)`
      : "no votes yet";

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "badge",
            "title",
            "stats_group",
            "sep",
            "prog_snaps",
            "prog_votes",
            "btn_row",
          ],
        },
        badge: {
          type: "badge",
          props: { label: "Dashboard", variant: "outline" },
        },
        title: {
          type: "text",
          props: { content: "Snap Factory — Live Stats", weight: "bold" },
        },
        stats_group: {
          type: "item_group",
          props: { border: true, separator: true },
          children: ["snaps_item", "votes_item", "pages_item"],
        },
        snaps_item: {
          type: "item",
          props: {
            title: "Snaps deployed",
            description: "10 snaps live in production",
          },
        },
        votes_item: {
          type: "item",
          props: {
            title: "Showcase votes",
            description: votesDesc,
          },
        },
        pages_item: {
          type: "item",
          props: {
            title: "Pages in this snap",
            description: "5 pages — home, chart, grid, form, dashboard",
          },
        },
        sep: { type: "separator", props: {} },
        prog_snaps: {
          type: "progress",
          props: {
            value: 10,
            max: 14,
            label: "Snaps built this week (10 of 14)",
            color: "purple",
          },
        },
        prog_votes: {
          type: "progress",
          props: {
            value: Math.min(total, 50),
            max: 50,
            label: `Showcase engagement (${total} interactions)`,
            color: "teal",
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["home_btn", "share_btn"],
        },
        home_btn: {
          type: "button",
          props: { label: "← Start over", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=home` },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share this snap", variant: "primary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "just explored every snap component in one snap 🔮",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

export default app;
