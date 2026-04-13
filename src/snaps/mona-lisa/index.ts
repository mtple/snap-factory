/**
 * mona-lisa — Pixel art recreation of Leonardo da Vinci's Mona Lisa
 * using ONLY snap UI elements (cell_grid). No images. No hex colors.
 * Uses 8 named palette colors to compose the portrait.
 * Built for @mattlee.
 *
 * Palette mapping:
 *   blue   → sky
 *   green  → landscape
 *   teal   → sfumato mid-ground / architectural bg
 *   gray   → hair, dark clothing, deep shadow
 *   amber  → skin / face (warm sfumato tone)
 *   pink   → light skin highlights, lip corners
 *   red    → lips, warm nostril shadow
 *   purple → (unused — reserved)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

type PalColor = "blue" | "green" | "teal" | "gray" | "amber" | "pink" | "red";
type CellEntry = { row: number; col: number; color: PalColor };

// Character → palette color (null = transparent / no cell)
const KEY: Record<string, PalColor | null> = {
  B: "blue",
  G: "green",
  T: "teal",
  H: "gray",
  F: "amber",
  P: "pink",
  R: "red",
  ".": null,
};

/**
 * 16 rows × 32 cols grid, encoded as strings.
 * Every string is exactly 32 characters.
 *
 * Layout zones (col indices, 0-based):
 *   0–5   pure left landscape (G)
 *   6–8   left transition (T)
 *   9–11  left hair (H) / background
 *  12–19  face / figure center (F/P/R/H eyes)
 *  20–22  right hair (H) / background
 *  23–25  right transition (T)
 *  26–31  pure right landscape (G)
 */
const ROWS: string[] = [
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", //  0 — sky
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", //  1 — sky
  "GGGGGGGGBBBBBBBBBBBBBBBBGGGGGGGG", //  2 — landscape peeks, sky center
  "GGGGGGTTTTTTTTTTTTTTTTTTTTGGGGGG", //  3 — sfumato background behind figure
  "GGGGGGTTTHHHHHHHHHHHHHHTTTGGGGGG", //  4 — hair silhouette
  "GGGGGGTTTHHHFFFFFFFFHHHTTTGGGGGG", //  5 — forehead
  "GGGGGGTTTHHHFFFFFFFFHHHTTTGGGGGG", //  6 — brow (no eyebrows — historically accurate)
  "GGGGGGTTTHHHFHHFFHHFHHHTTTGGGGGG", //  7 — eyes
  "GGGGGGTTTHHHFFRFFRFFHHHTTTGGGGGG", //  8 — nose (nostril shadow)
  "GGGGGGTTTHHHFFRPPRFFHHHTTTGGGGGG", //  9 — mouth / the smile
  "GGGGGGTTTHHHFFPPPPFFHHHTTTGGGGGG", // 10 — chin (highlight)
  "GGGGGGTTTHHHHFFFFFFHHHHTTTGGGGGG", // 11 — lower chin (narrows)
  "GGGGGGTTTHHHHHFFFFHHHHHTTTGGGGGG", // 12 — neck
  "GGGGGGTTTHHHHHHFFHHHHHHTTTGGGGGG", // 13 — neckline / collar
  "GGGGGGTTTHHHHHHHHHHHHHHTTTGGGGGG", // 14 — clothing (same silhouette as row 4)
  "GGGGGGGGGHHHHHHHHHHHHHHGGGGGGGGG", // 15 — clothing bottom (landscape widens)
];

function buildCells(): CellEntry[] {
  const cells: CellEntry[] = [];
  for (let r = 0; r < ROWS.length; r++) {
    const row = ROWS[r];
    for (let c = 0; c < row.length; c++) {
      const color = KEY[row[c]];
      if (color !== null && color !== undefined) {
        cells.push({ row: r, col: c, color });
      }
    }
  }
  return cells;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "mona-lisa");

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["title", "painting", "caption", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "La Joconde",
            weight: "bold",
            align: "center",
          },
        },
        painting: {
          type: "cell_grid",
          props: {
            cols: 32,
            rows: 16,
            rowHeight: 18,
            select: "off",
            cells: buildCells(),
          },
        },
        caption: {
          type: "text",
          props: {
            content: "Leonardo da Vinci, c. 1503 · snap UI only, zero images",
            size: "sm",
            align: "center",
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "pixel art mona lisa built entirely from snap UI components. no images 🎨",
                embeds: [self],
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
