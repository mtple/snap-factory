/**
 * collab-art-seed — make a tiny decorative pixel-art seed for others to remix.
 *
 * Components: input, toggle_group, text, badge, cell_grid, button, stack
 * Actions: submit, compose_cast
 * State: stateless URL params
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "collab-art-seed";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type PaletteKey = "sunrise" | "forest" | "arcade" | "moon";
type ShapeKey = "creature" | "garden" | "skyline" | "relic";
type Cell = { row: number; col: number; color: string };

type Palette = {
  label: string;
  accent: Accent;
  colors: string[];
};

type SeedArt = {
  prompt: string;
  paletteKey: PaletteKey;
  shape: ShapeKey;
  maker: number;
  title: string;
  badge: string;
  caption: string;
  shareText: string;
  cells: Cell[];
  accent: Accent;
};

const PALETTES: Record<PaletteKey, Palette> = {
  sunrise: {
    label: "Sunrise",
    accent: "amber",
    colors: ["#fff7ed", "#fed7aa", "#fb923c", "#ef4444", "#7c2d12", "#1f2937"],
  },
  forest: {
    label: "Forest",
    accent: "green",
    colors: ["#ecfdf5", "#bbf7d0", "#4ade80", "#16a34a", "#14532d", "#1f2937"],
  },
  arcade: {
    label: "Arcade",
    accent: "pink",
    colors: ["#fdf2f8", "#f0abfc", "#22d3ee", "#a855f7", "#ec4899", "#111827"],
  },
  moon: {
    label: "Moon",
    accent: "purple",
    colors: ["#f8fafc", "#c7d2fe", "#818cf8", "#7c3aed", "#312e81", "#020617"],
  },
};

const SHAPES: Record<ShapeKey, { label: string; noun: string }> = {
  creature: { label: "Creature", noun: "tiny creature" },
  garden: { label: "Garden", noun: "micro garden" },
  skyline: { label: "Skyline", noun: "little skyline" },
  relic: { label: "Relic", noun: "ancient relic" },
};

function cleanPrompt(raw: unknown): string {
  const prompt = String(raw ?? "")
    .replace(/[<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return prompt || "open canvas";
}

function cleanPalette(raw: unknown): PaletteKey {
  const value = String(raw ?? "sunrise");
  return value in PALETTES ? (value as PaletteKey) : "sunrise";
}

function cleanShape(raw: unknown): ShapeKey {
  const value = String(raw ?? "creature");
  return value in SHAPES ? (value as ShapeKey) : "creature";
}

function cleanMaker(raw: string | null): number {
  const parsed = Number(raw ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(999_999_999, Math.floor(parsed)));
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ShapeVariant = {
  shiftX: number;
  shiftY: number;
  wobble: number;
  width: number;
  height: number;
  density: number;
  notch: number;
};

function variantFromSeed(seed: number): ShapeVariant {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  return {
    shiftX: (rand() - 0.5) * 0.16,
    shiftY: (rand() - 0.5) * 0.12,
    wobble: 0.015 + rand() * 0.055,
    width: 0.86 + rand() * 0.28,
    height: 0.86 + rand() * 0.24,
    density: 0.35 + rand() * 0.45,
    notch: rand(),
  };
}

function warpPoint(x: number, y: number, variant: ShapeVariant): { x: number; y: number } {
  const wave = Math.sin((y * 5.5 + variant.notch * 3) * Math.PI) * variant.wobble;
  return {
    x: Math.max(0, Math.min(1, x + variant.shiftX + wave)),
    y: Math.max(0, Math.min(1, y + variant.shiftY - wave / 2)),
  };
}

function shapeMask(shape: ShapeKey, x: number, y: number, rand: () => number, variant: ShapeVariant): number {
  const point = warpPoint(x, y, variant);
  const px = point.x;
  const py = point.y;
  const cx = Math.abs(px - 0.5) * 2;
  const cy = Math.abs(py - 0.5) * 2;
  const dist = Math.sqrt((cx / variant.width) ** 2 + (cy / variant.height) ** 2);
  const texture = rand();

  if (shape === "creature") {
    const belly = dist < 0.72 + variant.density * 0.2 && py > 0.14 && py < 0.94;
    const head = Math.sqrt(((px - 0.5) / (0.28 + variant.wobble)) ** 2 + ((py - 0.27) / 0.2) ** 2) < 1;
    const earSpread = 0.2 + variant.notch * 0.16;
    const ears = (Math.abs(px - (0.5 - earSpread)) < 0.06 + variant.wobble || Math.abs(px - (0.5 + earSpread)) < 0.06 + variant.wobble) && py < 0.24 + variant.shiftY;
    const feet = py > 0.82 && (Math.abs(px - 0.34) < 0.11 || Math.abs(px - 0.66) < 0.11);
    const cutout = texture > 0.93 && py > 0.35 && py < 0.78;
    return (belly || head || ears || feet) && !cutout ? 1 + Math.floor(rand() * 4) : 0;
  }

  if (shape === "garden") {
    const stem = Math.abs(px - (0.48 + variant.shiftX / 2)) < 0.05 + variant.wobble && py > 0.35;
    const bloomCenter = 0.37 + variant.shiftY;
    const bloom = Math.abs(Math.sqrt(((px - 0.5) / variant.width) ** 2 + ((py - bloomCenter) / variant.height) ** 2) - (0.34 + variant.density * 0.18)) < 0.1 + variant.wobble;
    const petals = Math.sin((px * 18 + variant.notch * 8) * Math.PI) > 0.15 && py < 0.68;
    const soil = py > 0.78 + variant.shiftY && texture > 0.12 + variant.notch * 0.2;
    return stem || (bloom && petals) || soil ? 1 + Math.floor(rand() * 4) : 0;
  }

  if (shape === "skyline") {
    const column = Math.floor(px * 8);
    const heightSeed = hashText(`${column}:${variant.notch.toFixed(3)}:${variant.width.toFixed(3)}`);
    const towerRand = mulberry32(heightSeed);
    const towerHeight = 0.2 + towerRand() * 0.54;
    const roof = py > 1 - towerHeight - 0.06 && py <= 1 - towerHeight && Math.abs((px * 8) % 1 - 0.5) < 0.36 + variant.wobble;
    const building = py > 1 - towerHeight;
    const window = building && Math.floor(px * 16 + variant.notch * 3) % 3 === 1 && Math.floor(py * 12) % 2 === 0;
    return building || roof ? (window ? 1 : 2 + Math.floor(rand() * 3)) : 0;
  }

  const ring = Math.abs(dist - (0.43 + variant.density * 0.18)) < 0.08 + variant.wobble;
  const slashA = Math.abs(px - py + variant.shiftX) < 0.05 + variant.wobble;
  const slashB = Math.abs(1 - px - py + variant.shiftY) < 0.05 + variant.wobble;
  const core = dist < 0.13 + variant.notch * 0.16;
  const chip = texture > 0.9 && dist < 0.82;
  return (ring || slashA || slashB || core || chip) ? 1 + Math.floor(rand() * 4) : 0;
}

export function buildSeedArt(prompt: string, paletteKey: PaletteKey, shape: ShapeKey, maker: number): SeedArt {
  const palette = PALETTES[paletteKey];
  const shapeInfo = SHAPES[shape];
  const seed = hashText(`${prompt}|${paletteKey}|${shape}|${maker || "anon"}`);
  const rand = mulberry32(seed);
  const variant = variantFromSeed(seed);
  const cols = 16;
  const rows = 12;
  const cells: Cell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const noiseSeed = hashText(`${seed}:${row}:${col}`);
      const localRand = mulberry32(noiseSeed);
      const x = (col + 0.5) / cols;
      const y = (row + 0.5) / rows;
      const colorIndex = shapeMask(shape, x, y, localRand, variant);
      const sparkle = localRand() > 0.94 ? 1 : 0;
      const color = palette.colors[Math.min(colorIndex + sparkle, palette.colors.length - 1)] ?? "#111827";
      cells.push({ row, col, color: colorIndex === 0 && sparkle === 0 ? palette.colors[0] ?? "#ffffff" : color });
    }
  }

  const adjective = ["odd", "tiny", "glowy", "quiet", "brave", "soft"][(seed >>> 8) % 6] ?? "tiny";
  const title = `${PALETTES[paletteKey].label} ${SHAPES[shape].label} Seed`;
  const caption = `Decorative pixel seed for “${prompt}”: a ${adjective} ${shapeInfo.noun}. Remix by changing the prompt, palette, or shape.`;

  return {
    prompt,
    paletteKey,
    shape,
    maker,
    title,
    badge: `${palette.label} · ${shapeInfo.label}`,
    caption,
    shareText: `I planted a ${palette.label.toLowerCase()} ${shapeInfo.noun} seed for “${prompt}”. Remix it in SnapWizard. 🎨`,
    cells,
    accent: palette.accent,
  };
}

function seedUrl(self: string, art: Pick<SeedArt, "prompt" | "paletteKey" | "shape" | "maker">): string {
  const params = new URLSearchParams({
    prompt: art.prompt,
    palette: art.paletteKey,
    shape: art.shape,
    maker: String(art.maker),
  });
  return `${self}?${params.toString()}`;
}

function shareButton(self: string, text = "Plant a tiny pixel-art seed with SnapWizard.", label = "Share snap") {
  return {
    type: "button" as const,
    props: { label, variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: ["title", "intro", "prompt", "palette", "shape", "actions"] },
    title: { type: "text", props: { content: "Collab Art Seed", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Pick a vibe, palette, and shape. SnapWizard grows a tiny decorative pixel seed others can remix.", size: "sm", align: "center" },
    },
    prompt: {
      type: "input",
      props: { name: "prompt", label: "Seed prompt", placeholder: "friendly space fern", maxLength: 80 },
    },
    palette: {
      type: "toggle_group",
      props: {
        name: "palette",
        label: "Palette",
        defaultValue: "sunrise",
        options: Object.entries(PALETTES).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    shape: {
      type: "toggle_group",
      props: {
        name: "shape",
        label: "Shape",
        defaultValue: "creature",
        options: Object.entries(SHAPES).map(([value, config]) => ({ label: config.label, value })),
      },
    },
    generate: {
      type: "button",
      props: { label: "Grow seed", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=generate` } } },
    },
    share_btn: shareButton(self),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["generate", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, art: SeedArt): SnapHandlerResult {
  const permalink = seedUrl(self, art);
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children: ["title", "grid", "badge", "caption", "hint", "actions"] },
    title: { type: "text", props: { content: art.title, weight: "bold", align: "center" } },
    grid: {
      type: "cell_grid",
      props: { cols: 16, rows: 12, rowHeight: 13, cells: art.cells },
    },
    badge: { type: "badge", props: { label: art.badge, variant: "outline" } },
    caption: { type: "text", props: { content: art.caption, size: "sm", align: "center" } },
    hint: { type: "text", props: { content: "This mosaic is decorative; remix by generating a new seed, then share the permalink.", size: "sm", align: "center" } },
    remix: {
      type: "button",
      props: { label: "Remix", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(permalink, art.shareText.slice(0, 280), "Share seed"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["remix", "share_btn"] },
  };

  return { version: "2.0", theme: { accent: art.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (ctx.action.type === "get") {
      const promptParam = url.searchParams.get("prompt");
      if (promptParam) {
        const prompt = cleanPrompt(promptParam);
        const palette = cleanPalette(url.searchParams.get("palette"));
        const shape = cleanShape(url.searchParams.get("shape"));
        const maker = cleanMaker(url.searchParams.get("maker"));
        return resultPage(self, buildSeedArt(prompt, palette, shape, maker));
      }
      return startPage(self);
    }

    const action = url.searchParams.get("action");
    if (action !== "generate") {
      return startPage(self);
    }

    const prompt = cleanPrompt(ctx.action.inputs?.prompt);
    const palette = cleanPalette(ctx.action.inputs?.palette);
    const shape = cleanShape(ctx.action.inputs?.shape);
    const maker = ctx.action.user.fid;
    return resultPage(self, buildSeedArt(prompt, palette, shape, maker));
  },
  {
    openGraph: {
      title: "Collab Art Seed",
      description: "Grow a tiny decorative pixel-art seed from a prompt, palette, and shape.",
    },
  },
);

export default app;
