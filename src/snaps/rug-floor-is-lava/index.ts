/**
 * rug-floor-is-lava — crypto survival platformer.
 *
 * Red candles rise from the floor (the rug). Jump between platforms
 * before the lava consumes you. Survive 4 jumps to escape.
 *
 * Turn-based: each turn the player chooses JUMP (safe, go up) or
 * HODL (stay, get rugged). Lava rises one row per turn.
 * Player starts at row 4 on an 8×6 grid. Win by reaching row 0.
 *
 * State is encoded in URL query params: ?t=<turn>&r=<player_row>
 *
 * Components: text, button, cell_grid, separator
 * Actions:    submit
 * Accent:     red (danger)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "rug-floor-is-lava";
const COLS = 8;
const ROWS = 6;
const PLAYER_COL = 3;

// Colors
const RED = "#e74c3c";       // lava / red candles
const GREEN = "#27ae60";     // safe zone / green candles
const AMBER = "#f39c12";     // player
const DARK = "#1a1a2e";      // empty air

/**
 * Build the cell grid for a given game state.
 * lavaMin = first row (0-indexed top) that is lava.
 * playerRow = current row of the player.
 * platformRow = row one above lava — the platform to jump to.
 */
function buildGrid(
  playerRow: number,
  lavaMin: number,
): Record<string, { color: string }> {
  const cells: Record<string, { color: string }> = {};

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r}:${c}`;
      if (r >= lavaMin) {
        // Lava zone — red candle pattern (alternating heights for visual drama)
        cells[key] = { color: RED };
      } else if (r === playerRow && c === PLAYER_COL) {
        // Player
        cells[key] = { color: AMBER };
      } else if (r === lavaMin - 1) {
        // Platform row just above lava — green safe cells
        // Platform has a gap at col 6 and 7 for visual variety
        cells[key] = { color: c < 6 ? GREEN : DARK };
      } else {
        // Open air
        cells[key] = { color: DARK };
      }
    }
  }

  return cells;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  const turn = parseInt(url.searchParams.get("t") ?? "0", 10);
  const playerRow = parseInt(url.searchParams.get("r") ?? "4", 10);

  // ── Initial screen ─────────────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    // turn=0: lava at row 5 only, player at row 4
    const lavaMin = 5; // only bottom row
    const grid = buildGrid(4, lavaMin);

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "red" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "sm" },
            children: ["title", "sub", "board", "sep", "jumpBtn", "hodlBtn"],
          },
          title: {
            type: "text",
            props: { content: "Rug Floor is Lava", weight: "bold", align: "center" },
          },
          sub: {
            type: "text",
            props: {
              content: "Red candles are rising. Jump to the platform or get rugged.",
              size: "sm",
              align: "center",
            },
          },
          board: {
            type: "cell_grid",
            props: {
              cols: COLS,
              rows: ROWS,
              rowHeight: 20,
              cells: grid,
              selection: "off",
            },
          },
          sep: { type: "separator", props: {} },
          jumpBtn: {
            type: "button",
            props: { label: "JUMP! 🚀", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: `${self}?t=1&r=3&action=jump` },
              },
            },
          },
          hodlBtn: {
            type: "button",
            props: { label: "HODL (stay)", variant: "secondary" },
            on: {
              press: {
                action: "submit",
                params: { target: `${self}?t=1&r=4&action=hodl` },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── POST handler ───────────────────────────────────────────────────────────
  const action = url.searchParams.get("action") ?? "jump";

  // Lava after this turn: rises 1 row per turn
  // At turn T (after the action), lava fills rows from (5-T) to 5
  const lavaMin = Math.max(0, 5 - turn);

  // Check death: player is in lava zone
  if (playerRow >= lavaMin || action === "hodl") {
    // RUGGED
    const deathGrid = buildGrid(playerRow >= lavaMin ? playerRow : playerRow, lavaMin);
    // Override player cell to red if in lava
    if (playerRow >= lavaMin) {
      deathGrid[`${playerRow}:${PLAYER_COL}`] = { color: RED };
    }

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "red" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "sm" },
            children: ["title", "sub", "board", "sep", "shareBtn", "retryBtn"],
          },
          title: {
            type: "text",
            props: { content: "RUGGED 📉", weight: "bold", align: "center" },
          },
          sub: {
            type: "text",
            props: {
              content:
                action === "hodl"
                  ? "You held. The rug pulled the floor out from under you."
                  : "The lava caught up. Never hold the bag this long.",
              size: "sm",
              align: "center",
            },
          },
          board: {
            type: "cell_grid",
            props: {
              cols: COLS,
              rows: ROWS,
              rowHeight: 20,
              cells: deathGrid,
              selection: "off",
            },
          },
          sep: { type: "separator", props: {} },
          shareBtn: {
            type: "button",
            props: { label: "Share the rug", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "just got rugged on the floor is lava snap 📉 the rug is real",
                  embeds: [self],
                },
              },
            },
          },
          retryBtn: {
            type: "button",
            props: { label: "Try again", variant: "primary" },
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
    return response;
  }

  // ── WIN condition ──────────────────────────────────────────────────────────
  if (playerRow <= 0 || turn >= 5) {
    const winGrid = buildGrid(0, lavaMin);

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "green" },
      effects: ["confetti"],
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "sm" },
            children: ["title", "sub", "board", "sep", "shareBtn", "playBtn"],
          },
          title: {
            type: "text",
            props: { content: "Not rugged today ✅", weight: "bold", align: "center" },
          },
          sub: {
            type: "text",
            props: {
              content:
                "You escaped the rug floor. Sold the top, dodged the lava. Respect.",
              size: "sm",
              align: "center",
            },
          },
          board: {
            type: "cell_grid",
            props: {
              cols: COLS,
              rows: ROWS,
              rowHeight: 20,
              cells: winGrid,
              selection: "off",
            },
          },
          sep: { type: "separator", props: {} },
          shareBtn: {
            type: "button",
            props: { label: "Share the win", variant: "primary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "Didn't get rugged today 🔥 survived the rug floor",
                  embeds: [self],
                },
              },
            },
          },
          playBtn: {
            type: "button",
            props: { label: "Play again", variant: "secondary" },
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
    return response;
  }

  // ── Mid-game: still alive, show next board ─────────────────────────────────
  const nextLavaMin = Math.max(0, 5 - turn);
  const grid = buildGrid(playerRow, nextLavaMin);

  const nextTurn = turn + 1;
  const nextPlayerRow = Math.max(0, playerRow - 1);
  const nextLavaAfterJump = Math.max(0, 5 - nextTurn);

  // If jumping next puts them at win row
  const nextTarget =
    nextPlayerRow <= 0 || nextTurn >= 5
      ? `${self}?t=${nextTurn}&r=${nextPlayerRow}&action=jump`
      : `${self}?t=${nextTurn}&r=${nextPlayerRow}&action=jump`;

  const progressLabels = ["", "Turn 1/4", "Turn 2/4", "Turn 3/4", "Turn 4/4"];
  const progressLabel = progressLabels[turn] ?? `Turn ${turn}/4`;
  const urgency = turn >= 3 ? "The rug is right below you. ONE MORE JUMP!" : "Keep jumping — the lava is rising.";

  // Check: will hodl kill them next turn?
  const hodlNextRow = playerRow; // stays same
  const hodlNextLava = Math.max(0, 5 - nextTurn);
  const hodlDeath = hodlNextRow >= hodlNextLava;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "red" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            "title",
            "status",
            "board",
            "sep",
            "jumpBtn",
            ...(hodlDeath ? [] : ["hodlBtn"]),
          ],
        },
        title: {
          type: "text",
          props: { content: `Rug Floor is Lava — ${progressLabel}`, weight: "bold", align: "center" },
        },
        status: {
          type: "text",
          props: {
            content: urgency,
            size: "sm",
            align: "center",
          },
        },
        board: {
          type: "cell_grid",
          props: {
            cols: COLS,
            rows: ROWS,
            rowHeight: 20,
            cells: grid,
            selection: "off",
          },
        },
        sep: { type: "separator", props: {} },
        jumpBtn: {
          type: "button",
          props: { label: "JUMP! 🚀", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: nextTarget },
            },
          },
        },
        hodlBtn: {
          type: "button",
          props: { label: "HODL (risky)", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: {
                target: `${self}?t=${nextTurn}&r=${playerRow}&action=hodl`,
              },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
