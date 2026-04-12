/**
 * pacman — Pac-Man style game snap.
 *
 * 16×12 maze with dots, power pellets, and 4 ghosts.
 * Navigate with ↑ ↓ ← → buttons. Each tap moves Pac-Man
 * one step and ghosts take one random step.
 *
 * Components: cell_grid, text, button, stack, separator
 * Accent: amber
 * State: Turso KV (per-FID game state)
 * Actions: submit
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "pacman";
const COLS = 16;
const ROWS = 12;

// 0=empty/ghost house, 1=wall, 2=dot, 3=power pellet
const MAZE_TEMPLATE: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 0, 0, 0, 0, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 0, 0, 0, 0, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1],
  [1, 2, 1, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const GHOST_STARTS: [number, number][] = [
  [6, 5],
  [7, 5],
  [8, 5],
  [9, 5],
];
const PAC_START: [number, number] = [7, 9];
const GHOST_COLORS = ["red", "pink", "teal", "purple"] as const;
const SCARED_COLOR = "green";

// ── Types ──────────────────────────────────────────────────────────────────────

interface GameState {
  pac: [number, number];
  ghosts: [number, number][];
  dotsGrid: number[][];
  score: number;
  lives: number;
  status: "playing" | "won" | "gameover";
  powerTimer: number;
}

// ── Game logic ─────────────────────────────────────────────────────────────────

function initialState(): GameState {
  return {
    pac: [PAC_START[0], PAC_START[1]],
    ghosts: GHOST_STARTS.map(([c, r]) => [c, r] as [number, number]),
    dotsGrid: MAZE_TEMPLATE.map((row) => [...row]),
    score: 0,
    lives: 3,
    status: "playing",
    powerTimer: 0,
  };
}

function isWall(grid: number[][], col: number, row: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
  return grid[row][col] === 1;
}

function countDots(grid: number[][]): number {
  return grid.reduce(
    (sum, row) => sum + row.filter((c) => c === 2 || c === 3).length,
    0,
  );
}

const DIR_MAP: Record<string, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function processMove(state: GameState, dir: string): GameState {
  if (state.status !== "playing") return state;

  const delta = DIR_MAP[dir];
  if (!delta) return state;

  const [dc, dr] = delta;
  const [pc, pr] = state.pac;

  // Deep copy
  const s: GameState = {
    pac: [pc, pr],
    ghosts: state.ghosts.map(([c, r]) => [c, r] as [number, number]),
    dotsGrid: state.dotsGrid.map((row) => [...row]),
    score: state.score,
    lives: state.lives,
    status: state.status,
    powerTimer: state.powerTimer,
  };

  // Move Pac-Man
  const nc = pc + dc;
  const nr = pr + dr;
  if (!isWall(s.dotsGrid, nc, nr)) {
    s.pac = [nc, nr];
    const cell = s.dotsGrid[nr][nc];
    if (cell === 2) {
      s.dotsGrid[nr][nc] = 0;
      s.score += 10;
    } else if (cell === 3) {
      s.dotsGrid[nr][nc] = 0;
      s.score += 50;
      s.powerTimer = 8;
    }
  }

  // Save ghost positions before moving (for crossing-collision detection)
  const oldGhostPositions = s.ghosts.map(([c, r]) => [c, r] as [number, number]);

  // Move ghosts (random valid direction each)
  const DIRS: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  s.ghosts = s.ghosts.map(([gc, gr]) => {
    const valid = DIRS.filter(([gdc, gdr]) => !isWall(s.dotsGrid, gc + gdc, gr + gdr));
    if (valid.length === 0) return [gc, gr] as [number, number];
    const [gdc, gdr] = valid[Math.floor(Math.random() * valid.length)];
    return [gc + gdc, gr + gdr] as [number, number];
  });

  // Decrease power timer
  if (s.powerTimer > 0) s.powerTimer--;

  // Check collisions: same cell OR crossed paths (odd-Manhattan-distance swap bug fix)
  const [npc, npr] = s.pac;
  for (let i = 0; i < s.ghosts.length; i++) {
    const [gc, gr] = s.ghosts[i];
    const [ogc, ogr] = oldGhostPositions[i];
    // Direct overlap after move, OR Pac-Man and ghost swapped cells (passed through each other)
    const directCollision = gc === npc && gr === npr;
    const crossing = npc === ogc && npr === ogr && gc === pc && gr === pr;
    if (directCollision || crossing) {
      if (s.powerTimer > 0) {
        // Eat scared ghost
        s.score += 200;
        s.ghosts[i] = [GHOST_STARTS[i][0], GHOST_STARTS[i][1]];
      } else {
        s.lives--;
        if (s.lives <= 0) {
          s.status = "gameover";
        } else {
          // Reset positions
          s.pac = [PAC_START[0], PAC_START[1]];
          s.ghosts = GHOST_STARTS.map(([c, r]) => [c, r] as [number, number]);
          s.powerTimer = 0;
        }
        break;
      }
    }
  }

  // Win condition
  if (s.status === "playing" && countDots(s.dotsGrid) === 0) {
    s.status = "won";
  }

  return s;
}

// ── Rendering ──────────────────────────────────────────────────────────────────

type PaletteColor = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type GridCell = { row: number; col: number; color: PaletteColor };

function buildCells(state: GameState): GridCell[] {
  const cells: GridCell[] = [];

  // Build ghost color map by position
  const ghostAt = new Map<string, PaletteColor>();
  state.ghosts.forEach(([gc, gr], i) => {
    ghostAt.set(
      `${gc},${gr}`,
      state.powerTimer > 0 ? SCARED_COLOR : (GHOST_COLORS[i] ?? "red"),
    );
  });

  const [pc, pr] = state.pac;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (pc === col && pr === row) {
        cells.push({ row, col, color: "amber" }); // Pac-Man
      } else {
        const ghostColor = ghostAt.get(`${col},${row}`);
        if (ghostColor) {
          cells.push({ row, col, color: ghostColor });
        } else {
          const cell = state.dotsGrid[row][col];
          if (cell === 1) cells.push({ row, col, color: "blue" });   // wall
          else if (cell === 2) cells.push({ row, col, color: "gray" }); // dot
          else if (cell === 3) cells.push({ row, col, color: "pink" }); // power pellet
          // empty cells (0) are not pushed — transparent background
        }
      }
    }
  }

  return cells;
}

function renderPlaying(state: GameState, self: string): SnapHandlerResult {
  const cells = buildCells(state);
  const hearts = "♥".repeat(state.lives) + "♡".repeat(Math.max(0, 3 - state.lives));
  const hudContent = `Score: ${state.score}  ${hearts}${state.powerTimer > 0 ? "  POWER!" : ""}`;

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["hud", "grid", "controls", "new_btn"],
        },
        hud: {
          type: "text",
          props: { content: hudContent, size: "sm", align: "center" },
        },
        grid: {
          type: "cell_grid",
          props: { cols: COLS, rows: ROWS, rowHeight: 20, cells },
        },
        controls: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["up_row", "dirs_row"],
        },
        up_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "center" },
          children: ["btn_up"],
        },
        dirs_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "center" },
          children: ["btn_left", "btn_down", "btn_right"],
        },
        btn_up: {
          type: "button",
          props: { label: "↑", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?dir=up` } } },
        },
        btn_left: {
          type: "button",
          props: { label: "←", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?dir=left` } } },
        },
        btn_down: {
          type: "button",
          props: { label: "↓", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?dir=down` } } },
        },
        btn_right: {
          type: "button",
          props: { label: "→", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?dir=right` } } },
        },
        new_btn: {
          type: "button",
          props: { label: "New game", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?dir=new` } } },
        },
      },
    },
  };
}

function renderEndScreen(state: GameState, self: string): SnapHandlerResult {
  const isWon = state.status === "won";
  return {
    version: "1.0",
    theme: { accent: isWon ? "green" : "red" },
    ...(isWon ? { effects: ["confetti"] } : {}),
    ui: {
      root: "end_page",
      elements: {
        end_page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg", justify: "center" },
          children: ["title", "score_text", "grid", "play_btn"],
        },
        title: {
          type: "text",
          props: {
            content: isWon ? "You win! 🎉" : "Game over",
            weight: "bold",
            align: "center",
          },
        },
        score_text: {
          type: "text",
          props: {
            content: `Final score: ${state.score}`,
            size: "sm",
            align: "center",
          },
        },
        grid: {
          type: "cell_grid",
          props: {
            cols: COLS,
            rows: ROWS,
            rowHeight: 20,
            cells: buildCells(state),
          },
        },
        play_btn: {
          type: "button",
          props: { label: "Play again", variant: "primary" },
          on: { press: { action: "submit", params: { target: `${self}?dir=new` } } },
        },
      },
    },
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const fid = (ctx.action as { fid?: number }).fid ?? 0;
  const stateKey = `pacman:state:${fid}`;

  // Load or initialize state
  let state = (await store.get(stateKey)) as GameState | null;
  if (!state || !state.pac) {
    state = initialState();
  }

  if (ctx.action.type === "get") {
    return state.status === "playing"
      ? renderPlaying(state, self)
      : renderEndScreen(state, self);
  }

  // POST: process direction or new game
  const reqUrl = new URL(ctx.request.url);
  const dir = reqUrl.searchParams.get("dir") ?? "";

  if (dir === "new") {
    state = initialState();
  } else {
    state = processMove(state, dir);
  }

  // JSON round-trip satisfies DataStoreValue's index-signature constraint
  await store.set(stateKey, JSON.parse(JSON.stringify(state)));

  return state.status === "playing"
    ? renderPlaying(state, self)
    : renderEndScreen(state, self);
});

export default app;
