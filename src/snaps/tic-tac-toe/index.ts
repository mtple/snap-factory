/**
 * tic-tac-toe — classic grid game with two modes:
 *   vs AI (minimax, never loses) or Pass & Play (two humans, one device).
 *
 * State is fully URL-encoded — no Turso needed. Every button embeds the
 * entire game state in its submit target URL, so each request is stateless.
 *
 * URL params:
 *   ?phase  = 'playing' | 'done'  (absent = menu)
 *   ?board  = 9-char string: '.' | 'X' | 'O'  (e.g. "X.O...XO.")
 *   ?turn   = 'X' | 'O'
 *   ?mode   = 'ai' | 'pvp'
 *   ?mv     = 0-8 | 99  (cell index for this move; 99 = no-op)
 *   ?result = 'X' | 'O' | 'draw'  (only when phase=done)
 *
 * Components: text, button, badge, stack, toggle_group, separator
 * Accent: blue
 * Actions: submit, compose_cast
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "tic-tac-toe";

// ── Win conditions ────────────────────────────────────────────────────────

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

function checkResult(board: string[]): "X" | "O" | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== "." && board[a] === board[b] && board[b] === board[c]) {
      return board[a] as "X" | "O";
    }
  }
  if (board.every((c) => c !== ".")) return "draw";
  return null;
}

// ── Minimax AI ───────────────────────────────────────────────────────────

function minimax(board: string[], depth: number, isMaximizing: boolean): number {
  const result = checkResult(board);
  if (result === "O") return 10 - depth; // AI wins
  if (result === "X") return depth - 10; // Human wins
  if (result === "draw") return 0;

  const empties = board
    .map((v, i) => (v === "." ? i : -1))
    .filter((i) => i >= 0);

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of empties) {
      board[i] = "O";
      best = Math.max(best, minimax(board, depth + 1, false));
      board[i] = ".";
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empties) {
      board[i] = "X";
      best = Math.min(best, minimax(board, depth + 1, true));
      board[i] = ".";
    }
    return best;
  }
}

function bestAIMove(board: string[]): number {
  let best = -Infinity;
  let bestIdx = board.indexOf("."); // fallback: first empty cell
  for (let i = 0; i < 9; i++) {
    if (board[i] === ".") {
      board[i] = "O";
      const score = minimax(board, 0, false);
      board[i] = ".";
      if (score > best) {
        best = score;
        bestIdx = i;
      }
    }
  }
  return bestIdx;
}

// ── Rendering helpers ─────────────────────────────────────────────────────

type Elements = Record<string, SnapElementInput>;

/** Build the 3×3 board element tree (9 cell elements + 3 rows + board container). */
function buildBoardElements(
  board: string[],
  turn: string,
  mode: string,
  self: string,
  interactive: boolean,
  elements: Elements,
): void {
  const boardStr = board.join("");
  const baseTarget = `${self}?phase=playing&board=${boardStr}&turn=${turn}&mode=${mode}`;

  for (let i = 0; i < 9; i++) {
    const cell = board[i];
    const isOccupied = cell !== ".";
    const target = isOccupied
      ? `${baseTarget}&mv=99` // no-op click
      : `${baseTarget}&mv=${i}`;

    elements[`c${i}`] = {
      type: "button",
      props: {
        label: cell === "." ? "·" : cell,
        variant: isOccupied ? "primary" : "secondary",
      },
      ...(interactive
        ? { on: { press: { action: "submit", params: { target } } } }
        : {}),
    };
  }

  for (let r = 0; r < 3; r++) {
    elements[`row${r}`] = {
      type: "stack",
      props: { direction: "horizontal", gap: "sm", justify: "center" },
      children: [`c${r * 3}`, `c${r * 3 + 1}`, `c${r * 3 + 2}`],
    };
  }

  elements["board_grid"] = {
    type: "stack",
    props: { direction: "vertical", gap: "sm" },
    children: ["row0", "row1", "row2"],
  };
}

// ── Screens ───────────────────────────────────────────────────────────────

function renderMenu(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "blue" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg" },
          children: ["title", "subtitle", "sep", "mode_picker", "start_btn"],
        },
        title: {
          type: "text",
          props: { content: "Tic-Tac-Toe", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Classic 3×3. First to three in a row wins.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        mode_picker: {
          type: "toggle_group",
          props: {
            name: "mode",
            label: "Pick a mode",
            options: [
              { label: "vs AI", value: "ai" },
              { label: "Pass & Play", value: "pvp" },
            ],
            orientation: "horizontal",
            variant: "outline",
            defaultValue: "ai",
          },
        },
        start_btn: {
          type: "button",
          props: { label: "Start game", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
      },
    },
  };
}

function renderPlaying(
  board: string[],
  turn: string,
  mode: string,
  self: string,
): SnapHandlerResult {
  const elements: Elements = {};

  buildBoardElements(board, turn, mode, self, true, elements);

  const modeLabel = mode === "ai" ? "vs AI" : "Pass & Play";
  const statusText =
    mode === "ai"
      ? turn === "X"
        ? "Your turn (X)"
        : "AI's turn (O) — tap any cell to continue"
      : `${turn}'s turn`;

  elements["title"] = {
    type: "text",
    props: { content: `Tic-Tac-Toe · ${modeLabel}`, weight: "bold", align: "center" },
  };
  elements["status"] = {
    type: "text",
    props: { content: statusText, size: "sm", align: "center" },
  };
  elements["share_btn"] = {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text: "playing tic-tac-toe on @freeturtle",
          embeds: [self],
        },
      },
    },
  };
  elements["page"] = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: ["title", "status", "board_grid", "share_btn"],
  };

  return {
    version: "1.0",
    theme: { accent: "blue" },
    ui: { root: "page", elements },
  };
}

function renderDone(
  board: string[],
  result: "X" | "O" | "draw",
  mode: string,
  self: string,
): SnapHandlerResult {
  const elements: Elements = {};

  // Board is non-interactive in done state
  buildBoardElements(board, "X", mode, self, false, elements);

  const winnerText =
    result === "draw"
      ? "It's a draw!"
      : mode === "ai"
        ? result === "X"
          ? "You win! 🎉"
          : "AI wins."
        : `${result} wins!`;

  elements["title"] = {
    type: "text",
    props: { content: "Tic-Tac-Toe", weight: "bold", align: "center" },
  };
  elements["result_text"] = {
    type: "text",
    props: { content: winnerText, weight: "bold", align: "center" },
  };
  elements["play_again_btn"] = {
    type: "button",
    props: { label: "Play again", variant: "primary" },
    on: {
      press: {
        action: "submit",
        params: { target: self },
      },
    },
  };
  elements["share_btn"] = {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text:
            result === "draw"
              ? "just drew a tic-tac-toe game on @freeturtle"
              : mode === "ai" && result === "X"
                ? "just beat the AI at tic-tac-toe on @freeturtle"
                : "playing tic-tac-toe on @freeturtle",
          embeds: [self],
        },
      },
    },
  };
  elements["btn_row"] = {
    type: "stack",
    props: { direction: "horizontal", gap: "sm", justify: "center" },
    children: ["play_again_btn", "share_btn"],
  };
  elements["page"] = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: ["title", "result_text", "board_grid", "btn_row"],
  };

  return {
    version: "1.0",
    theme: { accent: result === "draw" ? "gray" : result === "X" ? "blue" : "red" },
    effects: result !== "draw" ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const p = url.searchParams;

  // Initial render → show menu
  if (ctx.action.type === "get") {
    return renderMenu(self);
  }

  // POST — check phase
  const phase = p.get("phase");

  // ── No phase: transitioning from menu ──────────────────────────────────
  if (!phase) {
    const mode =
      (ctx.action.inputs?.["mode"] as string | undefined) === "pvp" ? "pvp" : "ai";
    const board = Array<string>(9).fill(".");
    return renderPlaying(board, "X", mode, self);
  }

  // ── Playing: process a move ────────────────────────────────────────────
  if (phase === "playing") {
    const boardStr = p.get("board") ?? ".........";
    const board = boardStr.split("").slice(0, 9);
    // Ensure board is exactly 9 cells
    while (board.length < 9) board.push(".");

    const turn = p.get("turn") === "O" ? "O" : "X";
    const mode = p.get("mode") === "pvp" ? "pvp" : "ai";
    const mv = parseInt(p.get("mv") ?? "99", 10);

    // Apply the human move
    if (mv >= 0 && mv < 9 && board[mv] === ".") {
      board[mv] = turn;

      const result = checkResult(board);
      if (result) {
        return renderDone(board, result, mode, self);
      }

      const nextTurn = turn === "X" ? "O" : "X";

      // AI takes its turn immediately
      if (mode === "ai" && nextTurn === "O") {
        const aiIdx = bestAIMove([...board]);
        if (aiIdx >= 0 && aiIdx < 9) {
          board[aiIdx] = "O";
          const aiResult = checkResult(board);
          if (aiResult) {
            return renderDone(board, aiResult, mode, self);
          }
          // Back to X
          return renderPlaying(board, "X", mode, self);
        }
      }

      return renderPlaying(board, nextTurn, mode, self);
    }

    // No-op (occupied cell clicked or invalid mv) — re-render same state
    return renderPlaying(board, turn, mode, self);
  }

  // Any other phase → menu
  return renderMenu(self);
});

export default app;
