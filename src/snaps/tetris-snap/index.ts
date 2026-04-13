/**
 * tetris-snap — Tetris-style falling blocks game.
 *
 * Turn-based play: tap ← Left, ↻ Rotate, → Right, ⬇ Drop.
 * Each move (except drop) also applies one step of soft gravity.
 * Color scheme: pink / purple / amber (the closest named palette color to orange).
 *
 * Components: cell_grid, text, button, badge, stack
 * Accent: pink
 * State: Turso KV (per-FID game state)
 * Actions: submit, compose_cast
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "tetris-snap";

const ROWS = 16;
const COLS = 10;
const ROW_HEIGHT = 24;

// ── Color palette ─────────────────────────────────────────────────────────────

type PColor = "pink" | "purple" | "amber" | "gray";

// 7 piece types mapped to our 3-color palette + gray for ghost
const PIECE_COLORS: Record<string, PColor> = {
  I: "amber",   // orange-ish
  O: "purple",
  T: "pink",
  S: "pink",
  Z: "amber",
  J: "purple",
  L: "amber",
};

// ── Tetromino definitions ─────────────────────────────────────────────────────
// Each piece: 4 rotations × N cells as [row, col] offsets from bounding-box top-left

const TETROMINOS: Record<string, [number, number][][]> = {
  I: [
    [[0,0],[0,1],[0,2],[0,3]],
    [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[0,1],[0,2],[0,3]],
    [[0,0],[1,0],[2,0],[3,0]],
  ],
  O: [
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,0],[1,0],[1,1],[2,0]],
    [[0,0],[0,1],[0,2],[1,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,1],[1,0],[1,1],[2,0]],
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,0],[0,1],[1,0],[2,0]],
    [[0,0],[0,1],[0,2],[1,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,0],[1,0],[2,0],[2,1]],
    [[0,0],[0,1],[0,2],[1,0]],
    [[0,0],[0,1],[1,1],[2,1]],
  ],
};

const PIECE_TYPES = Object.keys(TETROMINOS);

function randomPiece(): string {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

// ── Game state ────────────────────────────────────────────────────────────────

interface GameState {
  board: (PColor | null)[][];
  pieceType: string;
  rotation: number;
  px: number;
  py: number;
  nextType: string;
  score: number;
  lines: number;
  gameOver: boolean;
}

function emptyBoard(): (PColor | null)[][] {
  return Array.from({ length: ROWS }, () => Array<PColor | null>(COLS).fill(null));
}

function initGame(): GameState {
  const pieceType = randomPiece();
  const nextType = randomPiece();
  const px = Math.floor((COLS - 4) / 2); // start at col 3 (centres 4-wide piece)
  return {
    board: emptyBoard(),
    pieceType,
    rotation: 0,
    px,
    py: 0,
    nextType,
    score: 0,
    lines: 0,
    gameOver: false,
  };
}

// ── Physics helpers ───────────────────────────────────────────────────────────

function isValid(
  board: (PColor | null)[][],
  type: string,
  rot: number,
  px: number,
  py: number,
): boolean {
  for (const [dr, dc] of TETROMINOS[type][rot]) {
    const r = py + dr;
    const c = px + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function getGhostY(state: GameState): number {
  let gy = state.py;
  while (
    isValid(state.board, state.pieceType, state.rotation, state.px, gy + 1)
  ) {
    gy++;
  }
  return gy;
}

function lockAndClear(
  board: (PColor | null)[][],
  type: string,
  rot: number,
  px: number,
  py: number,
): { board: (PColor | null)[][]; linesCleared: number } {
  const next = board.map((r) => [...r]) as (PColor | null)[][];
  const color = PIECE_COLORS[type];
  for (const [dr, dc] of TETROMINOS[type][rot]) {
    const r = py + dr;
    const c = px + dc;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      next[r][c] = color;
    }
  }
  // Remove completed rows
  const kept: (PColor | null)[][] = next.filter((row) =>
    row.some((cell) => cell === null),
  );
  const linesCleared = ROWS - kept.length;
  while (kept.length < ROWS) {
    kept.unshift(Array<PColor | null>(COLS).fill(null));
  }
  return { board: kept, linesCleared };
}

function scoreForLines(n: number): number {
  return ([0, 100, 300, 500, 800] as number[])[n] ?? 800;
}

function spawnNext(state: GameState): GameState {
  const pieceType = state.nextType;
  const nextType = randomPiece();
  const px = Math.floor((COLS - 4) / 2);
  const py = 0;
  const newState: GameState = {
    ...state,
    pieceType,
    rotation: 0,
    px,
    py,
    nextType,
  };
  if (!isValid(newState.board, pieceType, 0, px, py)) {
    return { ...newState, gameOver: true };
  }
  return newState;
}

function applyAction(state: GameState, action: string): GameState {
  if (state.gameOver) return state;

  let { pieceType, rotation, px, py, board, score, lines, nextType } = state;

  // Step 1 — directional or rotation action
  if (action === "left") {
    if (isValid(board, pieceType, rotation, px - 1, py)) px--;
  } else if (action === "right") {
    if (isValid(board, pieceType, rotation, px + 1, py)) px++;
  } else if (action === "rotate") {
    const r1 = (rotation + 1) % 4;
    if (isValid(board, pieceType, r1, px, py)) {
      rotation = r1;
    } else if (isValid(board, pieceType, r1, px - 1, py)) {
      px--;
      rotation = r1;
    } else if (isValid(board, pieceType, r1, px + 1, py)) {
      px++;
      rotation = r1;
    }
  }

  // Step 2 — gravity
  let shouldLock = false;
  if (action === "drop") {
    while (isValid(board, pieceType, rotation, px, py + 1)) py++;
    shouldLock = true;
  } else {
    if (isValid(board, pieceType, rotation, px, py + 1)) {
      py++;
    } else {
      shouldLock = true;
    }
  }

  // Step 3 — lock if piece can't move further
  if (shouldLock) {
    const { board: newBoard, linesCleared } = lockAndClear(
      board,
      pieceType,
      rotation,
      px,
      py,
    );
    return spawnNext({
      board: newBoard,
      pieceType,
      rotation,
      px,
      py,
      nextType,
      score: score + scoreForLines(linesCleared),
      lines: lines + linesCleared,
      gameOver: false,
    });
  }

  return { board, pieceType, rotation, px, py, nextType, score, lines, gameOver: false };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

type CellEntry = { row: number; col: number; color: PColor };

function buildCells(state: GameState): CellEntry[] {
  const cells: CellEntry[] = [];

  // Locked board cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = state.board[r][c];
      if (color) cells.push({ row: r, col: c, color });
    }
  }

  if (!state.gameOver) {
    // Ghost piece (where active piece will land)
    const ghostY = getGhostY(state);
    if (ghostY !== state.py) {
      for (const [dr, dc] of TETROMINOS[state.pieceType][state.rotation]) {
        const r = ghostY + dr;
        const c = state.px + dc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !state.board[r][c]) {
          cells.push({ row: r, col: c, color: "gray" });
        }
      }
    }
    // Active piece (drawn on top, overwrites ghost if they coincide)
    const color = PIECE_COLORS[state.pieceType];
    for (const [dr, dc] of TETROMINOS[state.pieceType][state.rotation]) {
      const r = state.py + dr;
      const c = state.px + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        cells.push({ row: r, col: c, color });
      }
    }
  }

  return cells;
}

function renderPlaying(state: GameState, self: string): SnapHandlerResult {
  const cells = buildCells(state);
  const nextColor = PIECE_COLORS[state.nextType] as string;
  return {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["header", "grid", "controls", "share_btn"],
        },
        header: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "between" },
          children: ["score_badge", "lines_badge", "next_badge"],
        },
        score_badge: {
          type: "badge",
          props: { label: `${state.score} pts`, variant: "default", color: "pink" },
        },
        lines_badge: {
          type: "badge",
          props: { label: `${state.lines} lines`, variant: "outline" },
        },
        next_badge: {
          type: "badge",
          props: { label: `Next: ${state.nextType}`, variant: "default", color: nextColor },
        },
        grid: {
          type: "cell_grid",
          props: {
            cols: COLS,
            rows: ROWS,
            rowHeight: ROW_HEIGHT,
            cells,
          },
        },
        controls: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "center" },
          children: ["btn_left", "btn_rotate", "btn_right", "btn_drop"],
        },
        btn_left: {
          type: "button",
          props: { label: "← Left", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?a=left` } } },
        },
        btn_rotate: {
          type: "button",
          props: { label: "↻ Rotate", variant: "primary" },
          on: { press: { action: "submit", params: { target: `${self}?a=rotate` } } },
        },
        btn_right: {
          type: "button",
          props: { label: "Right →", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?a=right` } } },
        },
        btn_drop: {
          type: "button",
          props: { label: "⬇ Drop", variant: "secondary" },
          on: { press: { action: "submit", params: { target: `${self}?a=drop` } } },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "playing tetris on @freeturtle 🎮",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

function renderGameOver(state: GameState, self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg", justify: "center" },
          children: ["title", "score_text", "lines_text", "play_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "Game Over", weight: "bold", align: "center" },
        },
        score_text: {
          type: "text",
          props: { content: `Score: ${state.score}`, weight: "bold", align: "center" },
        },
        lines_text: {
          type: "text",
          props: {
            content: `Lines cleared: ${state.lines}`,
            size: "sm",
            align: "center",
          },
        },
        play_btn: {
          type: "button",
          props: { label: "Play again", variant: "primary" },
          on: { press: { action: "submit", params: { target: `${self}?a=new` } } },
        },
        share_btn: {
          type: "button",
          props: { label: "Share score", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `scored ${state.score} on tetris snap — ${state.lines} lines 🎮`,
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const fid = (ctx.action as { fid?: number }).fid ?? 0;
  const stateKey = `tetris-snap:${fid}`;

  // Load or initialize game state
  let state = (await store.get(stateKey)) as GameState | null;

  if (ctx.action.type === "get") {
    if (!state) {
      state = initGame();
      await store.set(stateKey, JSON.parse(JSON.stringify(state)));
    }
    return state.gameOver
      ? renderGameOver(state, self)
      : renderPlaying(state, self);
  }

  // POST — read action from URL param
  const reqUrl = new URL(ctx.request.url);
  const action = reqUrl.searchParams.get("a") ?? "rotate";

  if (action === "new" || !state) {
    state = initGame();
  } else {
    state = applyAction(state, action);
  }

  await store.set(stateKey, JSON.parse(JSON.stringify(state)));
  return state.gameOver
    ? renderGameOver(state, self)
    : renderPlaying(state, self);
});

export default app;
