/**
 * mona-lisa — Detailed pixel art recreation of Leonardo da Vinci's Mona Lisa
 * using ONLY snap UI elements (cell_grid). No images. No hex colors.
 * Uses all 8 named palette colors for maximum tonal range.
 *
 * Palette:
 *   B = blue   → sky
 *   G = green  → landscape (distant hills / trees)
 *   T = teal   → sfumato mid-ground (atmospheric haze)
 *   U = purple → deepest shadows (hair mass, eye sockets, dark clothing)
 *   H = gray   → hair mid-tone, shadow under brows, upper clothing
 *   F = amber  → skin base (warm sfumato tone)
 *   P = pink   → skin highlights / sfumato light
 *   R = red    → lips, warm nostril corners
 *
 * Grid: 32 cols × 16 rows
 * Standard row zones (0-indexed columns):
 *   0–5  : left landscape  (G×6)
 *   6–8  : left sfumato    (T×3)
 *   9    : left hair edge  (U×1)  — deep shadow where hair meets bg
 *  10–11 : left hair       (H×2)
 *  12–19 : face / figure   (8 cols — the portrait's core)
 *  20–21 : right hair      (H×2)
 *   22   : right hair edge (U×1)
 *  23–25 : right sfumato   (T×3)
 *  26–31 : right landscape (G×6)
 *
 * Total per standard row: 6+3+1+2+8+2+1+3+6 = 32 ✓
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

type PalColor =
  | "blue"
  | "green"
  | "teal"
  | "purple"
  | "gray"
  | "amber"
  | "pink"
  | "red";

type CellEntry = { row: number; col: number; color: PalColor };

const KEY: Record<string, PalColor | null> = {
  B: "blue",
  G: "green",
  T: "teal",
  U: "purple", // deepest shadow
  H: "gray",
  F: "amber",
  P: "pink",
  R: "red",
  ".": null,
};

/**
 * 16 rows × 32 cols — every string is EXACTLY 32 characters.
 *
 * Face columns 12–19 breakdown per row:
 *   r5  FFFFFFFF  forehead (pure amber skin)
 *   r6  FPPPPPPF  forehead sfumato highlight
 *   r7  FUPFFPUF  eyes — U = purple iris/pupil, P = brow highlight
 *   r8  FFHFFHFF  nose — H = nostril wing shadow
 *   r9  FRPPPPPRF  ... wait: FRPPPPRP — see actual: FRPPPPRPF wait
 *        Actually face r9 = FRPPPPRP? No, let me be precise:
 *        FRPPPPRP = 8: F R P P P P R F — the smile corners (R) with pink lips
 *   r10 FPPPPPPF  chin (pink highlight — soft round chin)
 *   r11 FFPPPPFF  lower chin (highlight narrows)
 *   r12 FFFFFFFF  neck (amber skin)
 */
const ROWS: string[] = [
  //         0         1         2         3
  //         0123456789012345678901234567890 1
  /* r0  */ "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", // sky
  /* r1  */ "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", // sky
  /* r2  */ "GGGGGGBBBBBBBBBBBBBBBBBBBBGGGGGG", // distant landscape + open sky
  /* r3  */ "GGGGGGTTTTTTTTTTTTTTTTTTTTGGGGGG", // sfumato haze (Leonardo's signature)
  /* r4  */ "GGGGGGTTTUUUUUUUUUUUUUUUUTTTGGGG", // dark hair mass crowning the figure
  /* r5  */ "GGGGGGTTTUHHFFFFFFFFHHUTTTGGGGGG", // forehead — warm amber skin
  /* r6  */ "GGGGGGTTTUHHFPPPPPPFHHUTTTGGGGGG", // sfumato highlight on brow / upper face
  /* r7  */ "GGGGGGTTTUHHFUPFFPUFHHUTTTGGGGGG", // eyes — purple iris, P = inner-corner light
  /* r8  */ "GGGGGGTTTUHHFFHFFHFFHHUTTTGGGGGG", // nose — H = nostril-wing shadows
  /* r9  */ "GGGGGGTTTUHHFRPPPPRFHHUTTTGGGGGG", // the smile — R corners, pink lips
  /* r10 */ "GGGGGGTTTUHHFPPPPPPFHHUTTTGGGGGG", // chin highlight
  /* r11 */ "GGGGGGTTTUHHFFPPPPFFHHUTTTGGGGGG", // lower chin (highlight narrows)
  /* r12 */ "GGGGGGTTTUHHFFFFFFFFHHUTTTGGGGGG", // neck (amber skin)
  /* r13 */ "GGGGGGTTTUHHHFFFFFFHHHUTTTGGGGGG", // collar — neck narrows, H closes in
  /* r14 */ "GGGGGGTTTHHUUUUUUUUUUHHTTTGGGGGG", // dark clothing (purple mass)
  /* r15 */ "GGGGGGGGTTTTTTTTTTTTTTTTGGGGGGGG", // base — landscape widens, figure merges
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
            content:
              "Leonardo da Vinci, c. 1503 · all 8 palette colors · snap UI only",
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
