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

function shapeMask(shape: ShapeKey, x: number, y: number, rand: () => number): number {
  const cx = Math.abs(x - 0.5) * 2;
  const cy = Math.abs(y - 0.5) * 2;
  const dist = Math.sqrt(cx * cx + cy * cy);
  if (shape === "creature") {
    const body = dist < 0.8 && y > 0.12 && y < 0.92;
    const ears = (Math.abs(x - 0.28) < 0.09 || Math.abs(x - 0.72) < 0.09) && y < 0.22;
    return body || ears ? 1 + Math.floor(rand() * 4) : 0;
  }
  if (shape === "garden") {
    const stem = Math.abs(x - 0.5) < 0.08 && y > 0.35;
    const bloom = Math.abs(dist - 0.46) < 0.18 && y < 0.62;
    const soil = y > 0.82 && rand() > 0.25;
    return stem || bloom || soil ? 1 + Math.floor(rand() * 4) : 0;
  }
  if (shape === "skyline") {
    const towerHeight = 0.22 + Math.floor((x * 7 + rand() * 3) % 5) * 0.11;
    const building = y > 1 - towerHeight;
    const window = building && Math.floor(x * 16) % 3 === 1 && Math.floor(y * 12) % 2 === 0;
    return building ? (window ? 1 : 2 + Math.floor(rand() * 3)) : 0;
  }
  const ring = Math.abs(dist - 0.52) < 0.12;
  const slash = Math.abs(x - y) < 0.08 || Math.abs(1 - x - y) < 0.08;
  const core = dist < 0.22;
  return ring || slash || core ? 1 + Math.floor(rand() * 4) : 0;
}

export function buildSeedArt(prompt: string, paletteKey: PaletteKey, shape: ShapeKey, maker: number): SeedArt {
  const palette = PALETTES[paletteKey];
  const shapeInfo = SHAPES[shape];
  const seed = hashText(`${prompt}|${paletteKey}|${shape}|${maker || "anon"}`);
  const rand = mulberry32(seed);
  const cols = 16;
  const rows = 12;
  const cells: Cell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const mirrorCol = col < cols / 2 ? col : cols - 1 - col;
      const noiseSeed = hashText(`${seed}:${row}:${mirrorCol}`);
      const localRand = mulberry32(noiseSeed);
      const x = (mirrorCol + 0.5) / cols;
      const y = (row + 0.5) / rows;
      const colorIndex = shapeMask(shape, x, y, localRand);
      const sparkle = localRand() > 0.92 ? 1 : 0;
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
