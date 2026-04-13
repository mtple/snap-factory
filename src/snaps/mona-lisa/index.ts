/**
 * mona-lisa — Pixel art recreation of Leonardo da Vinci's Mona Lisa
 * using ONLY snap UI elements (cell_grid). No images.
 * Built for @mattlee.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

// Color palette — warm sfumato tones
const C = {
  // Sky
  SKY_HI: "#aac8d8",   // bright sky
  SKY_MD: "#8ab0c4",   // mid sky
  SKY_LO: "#6a90a8",   // lower sky / horizon

  // Landscape / background
  LND_LT: "#7a9a6a",   // light green landscape
  LND_MD: "#5a7850",   // medium green
  LND_DK: "#3d5a38",   // dark green / shadowy trees
  WTR:    "#6a98aa",   // distant water / lake

  // Architecture hint (left column)
  STN_LT: "#a09070",   // stone light
  STN_DK: "#6a6048",   // stone dark

  // Hair
  HAR_DK: "#1a1008",   // very dark brown hair (core)
  HAR_MD: "#2a1c12",   // hair mid
  HAR_LT: "#3a2c20",   // hair outer edge

  // Skin
  SKN_HI: "#ecc898",   // highlight (forehead center, nose bridge)
  SKN_MD: "#d8a870",   // main skin tone
  SKN_SH: "#c09060",   // skin shadow
  SKN_DP: "#a07048",   // deep shadow (under chin, beside nose)

  // Facial features
  EYE_DK: "#3a2010",   // pupil / deep eye shadow
  EYE_MD: "#6a4028",   // iris / eye contour
  EYE_LT: "#8a5838",   // eye highlight / lid
  LIP_DK: "#a86050",   // lip shadow / outer
  LIP_MD: "#c47868",   // lip main
  LIP_HI: "#d48878",   // lip highlight (the smile!)

  // Clothing / dress
  CLT_DK: "#181008",   // very dark clothing
  CLT_MD: "#242018",   // medium dark fold
  CLT_LT: "#342c22",   // clothing highlight fold
  NCK_LN: "#3a2c1c",   // neckline / collar edge

  // Background fill
  BG:     "#2d3828",   // general background fill
};

function buildCells(): Record<string, { color: string }> {
  const W = 32, H = 16;

  // Initialize full grid with dark background
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill(C.BG));

  // ── ROW 0: Bright sky ──
  for (let c = 0; c < W; c++) {
    if (c < 3 || c > 28) g[0][c] = C.SKY_LO;
    else if (c >= 12 && c <= 19) g[0][c] = C.SKY_HI;
    else g[0][c] = C.SKY_MD;
  }

  // ── ROW 1: Lower sky with more variation ──
  for (let c = 0; c < W; c++) {
    if (c < 4 || c > 27) g[1][c] = C.SKY_LO;
    else if (c >= 20 && c <= 24) g[1][c] = C.WTR;    // right-side distant water
    else if (c >= 13 && c <= 18) g[1][c] = C.SKY_HI;
    else g[1][c] = C.SKY_MD;
  }

  // ── ROW 2: Upper landscape — greens + water ──
  for (let c = 0; c < W; c++) {
    if (c <= 3 || c >= 28)        g[2][c] = C.LND_DK;
    else if (c >= 4 && c <= 7)    g[2][c] = C.LND_MD;
    else if (c >= 8 && c <= 11)   g[2][c] = C.WTR;     // lake left
    else if (c >= 12 && c <= 13)  g[2][c] = C.SKY_HI;  // bright distant sky
    else if (c >= 14 && c <= 17)  g[2][c] = C.SKY_HI;  // bright distant sky
    else if (c >= 18 && c <= 19)  g[2][c] = C.WTR;     // lake right
    else if (c >= 20 && c <= 22)  g[2][c] = C.LND_LT;
    else if (c >= 23 && c <= 27)  g[2][c] = C.LND_MD;
    else                           g[2][c] = C.LND_DK;
  }

  // ── ROW 3: Landscape middle — stone arch hint on left, rolling hills right ──
  for (let c = 0; c < W; c++) {
    if (c <= 4 || c >= 27)        g[3][c] = C.LND_DK;
    else if (c >= 5 && c <= 6)    g[3][c] = C.STN_DK;  // column/arch left
    else if (c >= 7 && c <= 10)   g[3][c] = C.LND_MD;
    else if (c >= 11 && c <= 20)  g[3][c] = C.LND_LT;  // brighter mid-bg
    else if (c >= 21 && c <= 26)  g[3][c] = C.LND_MD;
    else                           g[3][c] = C.LND_DK;
  }

  // ── ROWS 4–11: Hair zone — fill entire head region with hair first, paint face over ──
  for (let r = 4; r <= 11; r++) {
    for (let c = 7; c <= 24; c++) {
      // Left hair band (cols 7–11)
      if (c <= 11) {
        g[r][c] = (c === 7) ? C.LND_DK :
                  (c === 8) ? C.HAR_LT :
                  (c === 9) ? C.HAR_MD : C.HAR_DK;
      }
      // Right hair band (cols 20–24)
      else if (c >= 20) {
        g[r][c] = (c === 24) ? C.LND_DK :
                  (c === 23) ? C.HAR_LT :
                  (c === 22) ? C.HAR_MD : C.HAR_DK;
      }
    }
  }

  // ── ROW 4: Top of head — hair across (no face yet, just hair) ──
  for (let c = 10; c <= 21; c++) {
    g[4][c] = (c === 15 || c === 16) ? C.HAR_LT  // center part hint
            : (c === 10 || c === 21) ? C.HAR_MD
            : C.HAR_DK;
  }

  // ── ROW 5: Forehead — face appears, hair flanks ──
  for (let c = 12; c <= 19; c++) {
    g[5][c] = (c >= 14 && c <= 17) ? C.SKN_HI : C.SKN_MD;
  }
  // Soft hair-to-skin transition at edge
  g[5][11] = C.HAR_MD; g[5][20] = C.HAR_MD;

  // ── ROW 6: Brow zone (Mona Lisa has no visible eyebrows — intentional!) ──
  for (let c = 11; c <= 20; c++) {
    if (c === 11 || c === 20)        g[6][c] = C.HAR_MD;
    else if (c === 12 || c === 19)   g[6][c] = C.SKN_SH;
    else if (c >= 14 && c <= 17)     g[6][c] = C.SKN_HI;
    else                             g[6][c] = C.SKN_MD;
  }

  // ── ROW 7: Eyes — the mysterious gaze ──
  for (let c = 11; c <= 20; c++) {
    if (c === 11 || c === 20)        g[7][c] = C.HAR_MD;
    else if (c === 12 || c === 19)   g[7][c] = C.SKN_SH;
    else if (c >= 15 && c <= 16)     g[7][c] = C.SKN_HI; // nose bridge highlight
    else                             g[7][c] = C.SKN_MD;
  }
  // Left eye (cols 13–14)
  g[7][13] = C.EYE_LT; g[7][14] = C.EYE_DK;
  // Right eye (cols 17–18)
  g[7][17] = C.EYE_DK; g[7][18] = C.EYE_LT;

  // ── ROW 8: Nose — sfumato, no hard line ──
  for (let c = 11; c <= 20; c++) {
    if (c === 11 || c === 20)        g[8][c] = C.HAR_MD;
    else if (c === 12 || c === 19)   g[8][c] = C.SKN_SH;
    else if (c >= 15 && c <= 16)     g[8][c] = C.SKN_HI; // nose highlight
    else if (c === 14 || c === 17)   g[8][c] = C.SKN_SH; // nostril shadow
    else                             g[8][c] = C.SKN_MD;
  }

  // ── ROW 9: The smile — subtle, famous ──
  for (let c = 12; c <= 19; c++) {
    if (c === 12 || c === 19)        g[9][c] = C.SKN_SH;
    else if (c === 13 || c === 18)   g[9][c] = C.SKN_DP; // corner shadow
    else if (c === 14)               g[9][c] = C.LIP_DK; // lip left
    else if (c === 15)               g[9][c] = C.LIP_HI; // slight upward curve
    else if (c === 16)               g[9][c] = C.LIP_HI; // slight upward curve
    else if (c === 17)               g[9][c] = C.LIP_DK; // lip right
    else                             g[9][c] = C.SKN_MD;
  }
  g[9][11] = C.HAR_DK; g[9][20] = C.HAR_DK;

  // ── ROW 10: Chin ──
  for (let c = 12; c <= 19; c++) {
    if (c === 12 || c === 19)        g[10][c] = C.SKN_SH;
    else if (c >= 15 && c <= 16)     g[10][c] = C.SKN_HI;
    else                             g[10][c] = C.SKN_MD;
  }
  g[10][11] = C.HAR_DK; g[10][20] = C.HAR_DK;

  // ── ROW 11: Chin taper + neck start ──
  for (let c = 13; c <= 18; c++) {
    g[11][c] = (c >= 15 && c <= 16) ? C.SKN_HI : C.SKN_MD;
  }
  g[11][12] = C.SKN_DP; g[11][19] = C.SKN_DP;
  g[11][11] = C.HAR_DK; g[11][20] = C.HAR_DK;

  // ── ROW 12: Neck ──
  for (let c = 14; c <= 17; c++) {
    g[12][c] = (c >= 15 && c <= 16) ? C.SKN_MD : C.SKN_SH;
  }
  g[12][13] = C.SKN_DP; g[12][18] = C.SKN_DP;
  // Clothing starts around neck
  for (let c = 5; c <= 12; c++)  g[12][c] = (c >= 9) ? C.CLT_MD : C.LND_DK;
  for (let c = 19; c <= 26; c++) g[12][c] = (c <= 22) ? C.CLT_MD : C.LND_DK;

  // ── ROW 13: V-neckline ──
  for (let c = 4; c <= 27; c++) {
    if (c < 8 || c > 23)             g[13][c] = C.LND_DK;
    else if (c === 8 || c === 23)    g[13][c] = C.HAR_DK;
    else if (c >= 14 && c <= 17)     g[13][c] = C.NCK_LN; // neckline fold shadow
    else                             g[13][c] = C.CLT_DK;
  }
  // Green underdress at neckline (visible in the original)
  g[13][14] = "#3a4830"; g[13][15] = "#3a4830";
  g[13][16] = "#3a4830"; g[13][17] = "#3a4830";

  // ── ROWS 14–15: Dark dress body ──
  for (let r = 14; r <= 15; r++) {
    for (let c = 3; c <= 28; c++) {
      if (c < 7 || c > 24)           g[r][c] = C.LND_DK;
      else if (c === 7 || c === 24)  g[r][c] = C.HAR_DK;
      // Fabric folds (sfumato on the dress)
      else if (r === 14 && (c === 10 || c === 21)) g[r][c] = C.CLT_LT;
      else if (r === 15 && (c === 9 || c === 22))  g[r][c] = C.CLT_LT;
      else if (c >= 13 && c <= 18)   g[r][c] = C.CLT_MD;
      else                           g[r][c] = C.CLT_DK;
    }
  }

  // Convert 2D grid to sparse cell_grid format
  const cells: Record<string, { color: string }> = {};
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      cells[`${r},${c}`] = { color: g[r][c] };
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
            rowHeight: 20,
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
