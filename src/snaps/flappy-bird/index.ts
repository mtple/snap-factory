/**
 * flappy-bird — tap to flap, survive the pipes.
 *
 * 14×10 cell_grid. Bird is always at col 2. One pipe at a time slides
 * left. State is fully encoded in submit target URL params — no Turso needed.
 *
 * ?y  = bird row (0–9)
 * ?v  = bird velocity + 5 offset (0–10, so stored value 5 = real vel 0)
 * ?pc = pipe column (0–13)
 * ?pr = pipe gap start row (1–6)
 * ?s  = score
 * ?dead = 1 if game over
 *
 * Components: cell_grid, text, button, stack
 * Accent: amber
 * Actions: submit
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "flappy-bird";
const COLS = 14;
const ROWS = 10;
const BIRD_COL = 2;
const GAP_SIZE = 3;

type PaletteColor =
  | "gray"
  | "blue"
  | "red"
  | "amber"
  | "green"
  | "teal"
  | "purple"
  | "pink";

interface State {
  birdRow: number;
  birdVel: number; // real velocity, can be negative
  pipeCol: number;
  pipeGapRow: number;
  score: number;
  dead: boolean;
}

function initialState(): State {
  return {
    birdRow: 4,
    birdVel: 0,
    pipeCol: COLS - 1,
    pipeGapRow: 3,
    score: 0,
    dead: false,
  };
}

/** Deterministic next gap row from score — no random needed. */
function nextGapRow(score: number): number {
  return ((score * 1664525 + 1013904223) >>> 0) % (ROWS - GAP_SIZE - 1) + 1;
}

function parseState(params: URLSearchParams): State {
  const y = parseInt(params.get("y") ?? "4", 10);
  const v = parseInt(params.get("v") ?? "5", 10) - 5; // undo offset
  const pc = parseInt(params.get("pc") ?? String(COLS - 1), 10);
  const pr = parseInt(params.get("pr") ?? "3", 10);
  const s = parseInt(params.get("s") ?? "0", 10);
  const dead = params.get("dead") === "1";
  return {
    birdRow: isNaN(y) ? 4 : Math.max(0, Math.min(ROWS - 1, y)),
    birdVel: isNaN(v) ? 0 : Math.max(-3, Math.min(3, v)),
    pipeCol: isNaN(pc) ? COLS - 1 : Math.max(0, Math.min(COLS - 1, pc)),
    pipeGapRow: isNaN(pr) ? 3 : Math.max(0, Math.min(ROWS - GAP_SIZE - 1, pr)),
    score: isNaN(s) ? 0 : Math.max(0, s),
    dead,
  };
}

function encodeState(s: State): string {
  return `y=${s.birdRow}&v=${s.birdVel + 5}&pc=${s.pipeCol}&pr=${s.pipeGapRow}&s=${s.score}&dead=${s.dead ? 1 : 0}`;
}

function tick(state: State, flap: boolean): State {
  if (state.dead) return state;

  const vel = flap ? -2 : Math.min(state.birdVel + 1, 2);
  const birdRow = state.birdRow + vel;

  let { pipeCol, pipeGapRow, score } = state;
  pipeCol--;

  // Pipe exited left — spawn new one
  if (pipeCol < 0) {
    score++;
    pipeCol = COLS - 1;
    pipeGapRow = nextGapRow(score);
  }

  // Bounds check
  if (birdRow < 0 || birdRow >= ROWS) {
    return {
      birdRow: Math.max(0, Math.min(ROWS - 1, birdRow)),
      birdVel: vel,
      pipeCol,
      pipeGapRow,
      score,
      dead: true,
    };
  }

  // Pipe collision
  if (pipeCol === BIRD_COL) {
    const inGap =
      birdRow >= pipeGapRow && birdRow < pipeGapRow + GAP_SIZE;
    if (!inGap) {
      return { birdRow, birdVel: vel, pipeCol, pipeGapRow, score, dead: true };
    }
  }

  return { birdRow, birdVel: vel, pipeCol, pipeGapRow, score, dead: false };
}

function buildCells(
  state: State,
): Array<{ row: number; col: number; color: PaletteColor }> {
  const cells: Array<{ row: number; col: number; color: PaletteColor }> = [];

  // Bird
  cells.push({ row: state.birdRow, col: BIRD_COL, color: "amber" });

  // Pipe (top + bottom around gap)
  for (let r = 0; r < ROWS; r++) {
    const inGap =
      r >= state.pipeGapRow && r < state.pipeGapRow + GAP_SIZE;
    if (!inGap) {
      cells.push({ row: r, col: state.pipeCol, color: "green" });
    }
  }

  // Ceiling and floor bars
  for (let c = 0; c < COLS; c++) {
    cells.push({ row: 0, col: c, color: "gray" });
    cells.push({ row: ROWS - 1, col: c, color: "gray" });
  }

  return cells;
}

function renderPlaying(state: State, self: string): SnapHandlerResult {
  const encoded = encodeState(state);
  const flapTarget = `${self}?action=flap&${encoded}`;
  const waitTarget = `${self}?action=wait&${encoded}`;

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["hud", "grid", "btn_row"],
        },
        hud: {
          type: "text",
          props: {
            content: `Score: ${state.score}  |  tap Flap to go up`,
            size: "sm",
            align: "center",
          },
        },
        grid: {
          type: "cell_grid",
          props: {
            cols: COLS,
            rows: ROWS,
            rowHeight: 22,
            cells: buildCells(state),
          },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["btn_flap", "btn_wait"],
        },
        btn_flap: {
          type: "button",
          props: { label: "Flap ↑", variant: "primary" },
          on: { press: { action: "submit", params: { target: flapTarget } } },
        },
        btn_wait: {
          type: "button",
          props: { label: "Fall →", variant: "secondary" },
          on: { press: { action: "submit", params: { target: waitTarget } } },
        },
      },
    },
  };
}

function renderDead(state: State, self: string): SnapHandlerResult {
  const newTarget = `${self}?action=new`;
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md", justify: "center" },
          children: ["title", "score_text", "grid", "play_btn"],
        },
        title: {
          type: "text",
          props: { content: "You died", weight: "bold", align: "center" },
        },
        score_text: {
          type: "text",
          props: {
            content: `Score: ${state.score}`,
            size: "sm",
            align: "center",
          },
        },
        grid: {
          type: "cell_grid",
          props: {
            cols: COLS,
            rows: ROWS,
            rowHeight: 22,
            cells: buildCells(state),
          },
        },
        play_btn: {
          type: "button",
          props: { label: "Try again", variant: "primary" },
          on: { press: { action: "submit", params: { target: newTarget } } },
        },
      },
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);
  const params = reqUrl.searchParams;

  if (ctx.action.type === "get") {
    const state = initialState();
    return renderPlaying(state, self);
  }

  const action = params.get("action") ?? "flap";

  if (action === "new") {
    return renderPlaying(initialState(), self);
  }

  const state = parseState(params);
  if (state.dead) {
    return renderDead(state, self);
  }

  const next = tick(state, action === "flap");
  return next.dead ? renderDead(next, self) : renderPlaying(next, self);
});

export default app;
