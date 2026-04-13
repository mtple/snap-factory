/**
 * checkers — two-player checkers.
 *
 * Create a game, share the link with a friend, take turns moving pieces.
 * Red pieces start at rows 5-7, teal at rows 0-2. Pieces move diagonally.
 * Jump over opponent pieces to capture. Reach the far end to become a king.
 *
 * State (Turso): checkers:game:{id} → JSON GameState
 *
 * Board display: 8×8 cell_grid
 *   - Red piece   → red
 *   - Red king    → pink
 *   - Teal piece  → teal
 *   - Teal king   → blue
 *   - Dark empty  → gray
 *   - Light empty → (no cell, default bg)
 *
 * Move input: two text fields, "row,col" notation (0-indexed, row 0 = top).
 *
 * Components: text, button, input, cell_grid, stack, badge
 * Actions: submit, compose_cast
 * Accent: red
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";
import { createTursoDataStore } from "@farcaster/snap-turso";

const app = new Hono();
const SNAP_NAME = "checkers";
const store = createTursoDataStore();

type Elements = Record<string, SnapElementInput>;

interface GameState {
  board: string;       // 64-char string: '.', 'r', 'b', 'R', 'B'
  p1?: number;         // FID of red player
  p2?: number;         // FID of teal player
  turn: "p1" | "p2";
  status: "waiting" | "playing" | "done";
  winner?: "p1" | "p2";
  created_at: number;
}

// ── Board helpers ─────────────────────────────────────────────────────────

type Piece = "." | "r" | "b" | "R" | "B";

function initialBoard(): string {
  const cells: Piece[] = Array(64).fill(".") as Piece[];
  // Teal (b) on dark squares rows 0-2
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) cells[row * 8 + col] = "b";
    }
  }
  // Red (r) on dark squares rows 5-7
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) cells[row * 8 + col] = "r";
    }
  }
  return cells.join("");
}

function getCell(board: string, row: number, col: number): Piece {
  return board[row * 8 + col] as Piece;
}

function isRed(p: Piece): boolean {
  return p === "r" || p === "R";
}
function isTeal(p: Piece): boolean {
  return p === "b" || p === "B";
}
function isKing(p: Piece): boolean {
  return p === "R" || p === "B";
}

function countPieces(board: string): { red: number; teal: number } {
  let red = 0,
    teal = 0;
  for (const c of board) {
    if (c === "r" || c === "R") red++;
    if (c === "b" || c === "B") teal++;
  }
  return { red, teal };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ── Move validation ───────────────────────────────────────────────────────

function parsePos(s: string): [number, number] | null {
  const m = s.trim().match(/^(\d+)[,\s]+(\d+)$/);
  if (!m) return null;
  const row = parseInt(m[1], 10);
  const col = parseInt(m[2], 10);
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return [row, col];
}

interface MoveResult {
  ok: boolean;
  message: string;
  newState?: GameState;
}

function applyMove(
  state: GameState,
  fid: number,
  fromStr: string,
  toStr: string,
): MoveResult {
  const isP1 = state.p1 === fid;
  const isP2 = state.p2 === fid;
  if (!isP1 && !isP2)
    return { ok: false, message: "You're not a player in this game." };

  const playerKey: "p1" | "p2" = isP1 ? "p1" : "p2";
  if (state.turn !== playerKey)
    return { ok: false, message: "Not your turn yet." };
  if (state.status !== "playing")
    return { ok: false, message: "This game is not active." };

  const from = parsePos(fromStr);
  const to = parsePos(toStr);
  if (!from)
    return { ok: false, message: "Invalid 'from'. Use row,col e.g. 5,1" };
  if (!to)
    return { ok: false, message: "Invalid 'to'. Use row,col e.g. 4,2" };

  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = getCell(state.board, fr, fc);

  if (piece === ".") return { ok: false, message: "No piece there." };
  if (isP1 && !isRed(piece))
    return { ok: false, message: "That's not your piece (you're red)." };
  if (isP2 && !isTeal(piece))
    return { ok: false, message: "That's not your piece (you're teal)." };
  if (getCell(state.board, tr, tc) !== ".")
    return { ok: false, message: "Target square is occupied." };
  if ((tr + tc) % 2 === 0)
    return {
      ok: false,
      message: "Must land on dark squares (row+col odd).",
    };

  const rowDiff = tr - fr;
  const colDiff = tc - fc;
  const king = isKing(piece);

  if (!king) {
    if (isRed(piece) && rowDiff > 0)
      return {
        ok: false,
        message: "Red moves upward (row decreases). Kings go any direction.",
      };
    if (isTeal(piece) && rowDiff < 0)
      return {
        ok: false,
        message: "Teal moves downward (row increases). Kings go any direction.",
      };
  }

  const boardArr = state.board.split("");
  let captured = false;

  if (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1) {
    // Simple diagonal step
    boardArr[tr * 8 + tc] = piece;
    boardArr[fr * 8 + fc] = ".";
  } else if (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2) {
    // Capture jump
    const midRow = (fr + tr) / 2;
    const midCol = (fc + tc) / 2;
    const midPiece = getCell(state.board, midRow, midCol);
    if (midPiece === ".") return { ok: false, message: "No piece to jump." };
    if (isP1 && isRed(midPiece))
      return { ok: false, message: "Can't jump your own piece." };
    if (isP2 && isTeal(midPiece))
      return { ok: false, message: "Can't jump your own piece." };
    boardArr[midRow * 8 + midCol] = ".";
    boardArr[tr * 8 + tc] = piece;
    boardArr[fr * 8 + fc] = ".";
    captured = true;
  } else {
    return {
      ok: false,
      message: "Move 1 square diagonally, or 2 to capture.",
    };
  }

  // King promotion
  if (boardArr[tr * 8 + tc] === "r" && tr === 0) boardArr[tr * 8 + tc] = "R";
  if (boardArr[tr * 8 + tc] === "b" && tr === 7) boardArr[tr * 8 + tc] = "B";

  const newBoard = boardArr.join("");
  const counts = countPieces(newBoard);
  const isDone = counts.red === 0 || counts.teal === 0;

  const newState: GameState = {
    ...state,
    board: newBoard,
    turn: state.turn === "p1" ? "p2" : "p1",
    status: isDone ? "done" : "playing",
    winner: isDone ? playerKey : undefined,
  };

  return {
    ok: true,
    message: captured ? "Captured! ✓" : "Moved. ✓",
    newState,
  };
}

// ── Cell grid builder ─────────────────────────────────────────────────────

function buildGrid(board: string): SnapElementInput {
  type CellColor =
    | "red"
    | "pink"
    | "teal"
    | "blue"
    | "gray"
    | "amber"
    | "green"
    | "purple";

  const cells: Array<{ row: number; col: number; color: CellColor }> = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = getCell(board, row, col);
      const isDark = (row + col) % 2 === 1;

      if (piece === "r") cells.push({ row, col, color: "red" });
      else if (piece === "b") cells.push({ row, col, color: "teal" });
      else if (piece === "R") cells.push({ row, col, color: "pink" });
      else if (piece === "B") cells.push({ row, col, color: "blue" });
      else if (isDark) cells.push({ row, col, color: "gray" });
    }
  }

  return {
    type: "cell_grid",
    props: {
      cols: 8,
      rows: 8,
      rowHeight: 32,
      selection: "off",
      cells,
    },
  };
}

// ── Store helpers ─────────────────────────────────────────────────────────

async function loadGame(id: string): Promise<GameState | null> {
  const raw = await store.get(`checkers:game:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw as string) as GameState;
  } catch {
    return null;
  }
}

async function saveGame(id: string, state: GameState): Promise<void> {
  await store.set(`checkers:game:${id}`, JSON.stringify(state));
}

// ── Screens ───────────────────────────────────────────────────────────────

function homeScreen(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "desc", "legend", "create_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "Checkers",
            weight: "bold",
            align: "center",
          },
        },
        desc: {
          type: "text",
          props: {
            content:
              "Two-player checkers. Create a game and share the link with your opponent — they join by opening it.",
            size: "sm",
            align: "center",
          },
        },
        legend: {
          type: "text",
          props: {
            content:
              "Red vs Teal · Kings in pink/blue · Enter moves as row,col",
            size: "sm",
            align: "center",
          },
        },
        create_btn: {
          type: "button",
          props: { label: "Create Game", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: self } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "two-player checkers on @freeturtle 🐢",
                embeds: [self],
              },
            },
          },
        },
      } as Elements,
    },
  };
}

function createdScreen(
  self: string,
  gameUrl: string,
  board: string,
): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title",
            "info",
            "grid",
            "invite_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: {
            content: "Game created — you're red",
            weight: "bold",
            align: "center",
          },
        },
        info: {
          type: "text",
          props: {
            content:
              "Share this game link with your opponent. They open it to join as teal and the game begins.",
            size: "sm",
            align: "center",
          },
        },
        grid: buildGrid(board),
        invite_btn: {
          type: "button",
          props: { label: "Invite opponent", variant: "primary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "come play checkers against me on @freeturtle 🐢",
                embeds: [gameUrl],
              },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "playing checkers on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      } as Elements,
    },
  };
}

function waitingScreen(
  self: string,
  gameUrl: string,
  board: string,
): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "grid", "join_msg", "join_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "Checkers — Join as Teal",
            weight: "bold",
            align: "center",
          },
        },
        grid: buildGrid(board),
        join_msg: {
          type: "text",
          props: {
            content:
              "Someone is waiting for an opponent. Tap to join and play teal!",
            size: "sm",
            align: "center",
          },
        },
        join_btn: {
          type: "button",
          props: { label: "Join game", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: gameUrl } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "playing checkers on @freeturtle",
                embeds: [self],
              },
            },
          },
        },
      } as Elements,
    },
  };
}

function gameScreen(
  game: GameState,
  viewerFid: number,
  gameUrl: string,
  self: string,
  message: string,
): SnapHandlerResult {
  const isP1 = game.p1 === viewerFid;
  const isP2 = game.p2 === viewerFid;
  const isMyTurn =
    (isP1 && game.turn === "p1") || (isP2 && game.turn === "p2");

  // Done state
  if (game.status === "done") {
    const iWon =
      (game.winner === "p1" && isP1) || (game.winner === "p2" && isP2);
    const resultText = iWon
      ? "You win! All opponent pieces captured 🎉"
      : isP1 || isP2
        ? "You lost. Better luck next time 🐢"
        : "Game over.";

    return {
      version: "1.0",
      theme: { accent: iWon ? "green" : "gray" },
      effects: iWon ? ["confetti"] : undefined,
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "grid", "result", "new_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Checkers — Game Over",
              weight: "bold",
              align: "center",
            },
          },
          grid: buildGrid(game.board),
          result: {
            type: "text",
            props: { content: resultText, weight: "bold", align: "center" },
          },
          new_btn: {
            type: "button",
            props: { label: "New game", variant: "primary" },
            on: {
              press: { action: "submit", params: { target: self } },
            },
          },
          share_btn: {
            type: "button",
            props: { label: "Share snap", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: iWon
                    ? "just won a checkers game on @freeturtle 🐢"
                    : "playing checkers on @freeturtle",
                  embeds: [self],
                },
              },
            },
          },
        } as Elements,
      },
    };
  }

  // Active game
  const counts = countPieces(game.board);
  const scoreText = `Red: ${counts.red} · Teal: ${counts.teal}`;
  const myColor = isP1 ? "red" : isP2 ? "teal" : "gray";
  const statusText = isMyTurn
    ? `Your turn (${isP1 ? "red" : "teal"}) — enter row,col for from/to`
    : game.status === "waiting"
      ? "Waiting for opponent to join..."
      : "Opponent's turn — check back after they move";

  const childIds: string[] = ["title", "grid", "score", "status"];
  if (message) childIds.push("msg_el");
  if (isMyTurn) childIds.push("from_pos", "to_pos", "move_btn");
  childIds.push("share_btn");

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: childIds,
    },
    title: {
      type: "text",
      props: { content: "Checkers", weight: "bold", align: "center" },
    },
    grid: buildGrid(game.board),
    score: {
      type: "text",
      props: { content: scoreText, size: "sm", align: "center" },
    },
    status: {
      type: "text",
      props: { content: statusText, size: "sm" },
    },
    share_btn: {
      type: "button",
      props: { label: "Share snap", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: "playing checkers on @freeturtle 🐢",
            embeds: [self],
          },
        },
      },
    },
  };

  if (message) {
    elements["msg_el"] = {
      type: "text",
      props: { content: message, size: "sm", weight: "bold" },
    };
  }

  if (isMyTurn) {
    elements["from_pos"] = {
      type: "input",
      props: {
        name: "from_pos",
        label: "From (row,col — e.g. 5,1)",
        type: "text",
        maxLength: 10,
        placeholder: "5,1",
      },
    };
    elements["to_pos"] = {
      type: "input",
      props: {
        name: "to_pos",
        label: "To (row,col — e.g. 4,2)",
        type: "text",
        maxLength: 10,
        placeholder: "4,2",
      },
    };
    elements["move_btn"] = {
      type: "button",
      props: { label: "Make move", variant: "primary" },
      on: {
        press: { action: "submit", params: { target: gameUrl } },
      },
    };
  }

  return {
    version: "1.0",
    theme: {
      accent: myColor as
        | "red"
        | "teal"
        | "gray"
        | "blue"
        | "pink"
        | "green"
        | "amber"
        | "purple",
    },
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const gameId = url.searchParams.get("g");

  // ── No game ID — home ────────────────────────────────────────────────
  if (!gameId) {
    if (ctx.action.type === "post") {
      // Create new game
      const id = generateId();
      const newGame: GameState = {
        board: initialBoard(),
        p1: ctx.action.fid,
        turn: "p1",
        status: "waiting",
        created_at: Date.now(),
      };
      await saveGame(id, newGame);
      const gameUrl = `${self}?g=${id}`;
      return createdScreen(self, gameUrl, newGame.board);
    }
    return homeScreen(self);
  }

  // ── Has game ID ───────────────────────────────────────────────────────
  const gameUrl = `${self}?g=${gameId}`;
  const game = await loadGame(gameId);

  if (!game) {
    return {
      version: "1.0",
      theme: { accent: "gray" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["msg", "new_btn", "share_btn"],
          },
          msg: {
            type: "text",
            props: {
              content: "Game not found. It may have expired.",
              align: "center",
            },
          },
          new_btn: {
            type: "button",
            props: { label: "New game", variant: "primary" },
            on: {
              press: { action: "submit", params: { target: self } },
            },
          },
          share_btn: {
            type: "button",
            props: { label: "Share snap", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "two-player checkers on @freeturtle 🐢",
                  embeds: [self],
                },
              },
            },
          },
        } as Elements,
      },
    };
  }

  // POST — player interaction
  if (ctx.action.type === "post") {
    const fid = ctx.action.fid;
    const inputs = ctx.action.inputs as Record<string, unknown>;

    // Join if waiting and not already a player
    if (game.status === "waiting" && game.p1 !== fid && !game.p2) {
      game.p2 = fid;
      game.status = "playing";
      await saveGame(gameId, game);
      // Show board — it's P1's turn first
      return gameScreen(game, fid, gameUrl, self, "Joined! Waiting for red to move first.");
    }

    // Try to apply a move
    const fromStr = String(inputs["from_pos"] ?? "").trim();
    const toStr = String(inputs["to_pos"] ?? "").trim();
    let msg = "";
    let currentGame = game;

    if (fromStr && toStr && game.status === "playing") {
      const result = applyMove(game, fid, fromStr, toStr);
      if (result.ok && result.newState) {
        await saveGame(gameId, result.newState);
        currentGame = result.newState;
        msg = result.message;
      } else {
        msg = result.message;
      }
    }

    return gameScreen(currentGame, fid, gameUrl, self, msg);
  }

  // GET — no player identity known
  if (game.status === "waiting") {
    return waitingScreen(self, gameUrl, game.board);
  }

  return gameScreen(game, 0, gameUrl, self, "");
});

export default app;
