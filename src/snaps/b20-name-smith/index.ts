/**
 * b20-name-smith — "B20 Name Smith"
 *
 * A tiny B20 token naming forge. Type a vibe, pick a tone, get a
 * fictional B20 token name + ticker + 32×16 snap-native logo grid.
 *
 * Stateless; everything is derived from the inputs plus the authed
 * viewer's FID. Inspired by the /base "B20 deploy" feed signal.
 *
 * Components: input, toggle_group, text, button, badge, progress, item, item_group, cell_grid, stack
 * Actions: submit, compose_cast
 * Accent: amber
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "b20-name-smith";

type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Elements = SnapHandlerResult["ui"]["elements"];
type Tone = keyof typeof TONES;

const TONES = {
  friendly: { label: "Friendly", glyph: "🤝", inflection: "warm" },
  sharp:    { label: "Sharp",    glyph: "⚔️", inflection: "edgy" },
  mystic:   { label: "Mystic",   glyph: "🔮", inflection: "cosmic" },
  science:  { label: "Science",  glyph: "🧪", inflection: "lab" },
} as const;

const ROOTS = [
  "fable", "lantern", "ember", "harbor", "mossway", "kindling", "marrow",
  "cipher", "ferry", "marrow", "atlas", "rivet", "spindle", "halcyon",
  "tide", "nimbus", "willow", "tessera", "kettle", "pebble", "ledger",
  "glimmer", "north", "plume", "bramble", "obsidian", "verdant", "wisp",
  "thistle", "noodle", "bellows", "gizmo", "magnet", "lumen", "kelp",
  "lattice", "polestar", "dusty", "crumb", "rocket", "rune", "sprocket",
  "tackle", "saddle", "cinder", "beacon", "fable", "echo", "frond",
  "marble", "nest", "oven", "prism", "quill", "rivulet", "sigil",
  "tulip", "umbra", "vein", "whisper", "xylophone", "yarn", "zephyr",
  "pylon", "arrow", "basil", "crow", "delta", "elm", "finch", "garnet",
  "heron", "indigo", "juno", "koala", "lotus", "mint", "nectar", "onyx",
  "pepper", "quartz", "rose", "spruce", "thyme", "umber", "violet", "wren",
];

const SUFFIXES_BY_TONE: Record<Tone, string[]> = {
  friendly: ["Coin", "Pals", "Club", "Hut", "Co", "Bunch", "Squad", "Nest", "Jar"],
  sharp:    ["Edge", "Blade", "Spike", "Point", "Shard", "Barbed", "Fang", "Wire", "Lance"],
  mystic:   ["Oracle", "Rune", "Veil", "Aether", "Hallow", "Glow", "Mist", "Glyph", "Seer"],
  science:  ["Labs", "Forge", "Matrix", "Vessel", "Reactor", "Catalyst", "Sample", "Probe", "Field"],
};

const TICKER_FRAGMENTS = ["F", "B", "G", "K", "M", "P", "R", "S", "T", "V", "X", "Z", "L", "N", "D"];

const LOGO_PALETTES: Array<{ name: string; colors: string[]; accent: Accent }> = [
  { name: "amber",    colors: ["#fef3c7", "#fde68a", "#fcd34d", "#f59e0b", "#b45309", "#1f2937"], accent: "amber" },
  { name: "forge",    colors: ["#fff7ed", "#fed7aa", "#fb923c", "#ea580c", "#9a3412", "#1c1917"], accent: "red" },
  { name: "mint",     colors: ["#ecfdf5", "#bbf7d0", "#86efac", "#22c55e", "#15803d", "#052e16"], accent: "green" },
  { name: "ocean",    colors: ["#eff6ff", "#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a", "#0f172a"], accent: "blue" },
  { name: "twilight", colors: ["#faf5ff", "#e9d5ff", "#c084fc", "#9333ea", "#6b21a8", "#1e1b4b"], accent: "purple" },
  { name: "neon",     colors: ["#fdf2f8", "#fbcfe8", "#f472b6", "#ec4899", "#9d174d", "#0c0a09"], accent: "pink" },
  { name: "lab",      colors: ["#f0fdfa", "#ccfbf1", "#5eead4", "#14b8a6", "#0f766e", "#0c1a1a"], accent: "teal" },
  { name: "shadow",   colors: ["#f9fafb", "#e5e7eb", "#9ca3af", "#4b5563", "#1f2937", "#000000"], accent: "gray" },
];

function cleanVibe(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function toneInput(raw: unknown): Tone {
  const value = String(raw ?? "friendly");
  return value in TONES ? (value as Tone) : "friendly";
}

function hashParts(parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const str = String(part);
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

function pick<T>(arr: readonly T[], seed: number, salt = 0): T {
  if (arr.length === 0) throw new Error("empty pick");
  return arr[((seed >>> salt) % arr.length + arr.length) % arr.length] as T;
}

function uniq<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function buildToken(vibe: string, tone: Tone, fid: number) {
  const seed = hashParts([vibe, tone, fid || 0]);
  const palette = pick(LOGO_PALETTES, seed, 0);
  const root = pick(ROOTS, seed, 4);
  const suffix = pick(SUFFIXES_BY_TONE[tone], seed, 8);
  let name = `${root.charAt(0).toUpperCase()}${root.slice(1)} ${suffix}`;
  if (vibe) {
    const vibeWord = vibe.split(/\s+/)[0]?.toLowerCase().slice(0, 12);
    if (vibeWord && !name.toLowerCase().includes(vibeWord)) {
      const cap = vibeWord.charAt(0).toUpperCase() + vibeWord.slice(1);
      name = `${cap} ${suffix}`;
    }
  }

  // Ticker: 3-4 chars derived from root letters + deterministic filler
  const cleaned = root.replace(/[^a-z]/gi, "").toUpperCase();
  const base = cleaned.slice(0, 3) || "B20";
  const filler = pick(TICKER_FRAGMENTS, seed, 16);
  const ticker = cleaned.length >= 4
    ? `${cleaned.slice(0, 4)}`
    : `${base}${(seed % 9) + 1}`.padEnd(4, "X").slice(0, 4);

  // Logo: 32 cols × 16 rows, symmetric, deterministic.
  const cells: Array<{ row: number; col: number; color: string }> = [];
  const cols = 32;
  const rows = 16;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col / (cols - 1);
      const y = row / (rows - 1);
      const cx = Math.abs(x - 0.5) * 2;       // 0 center, 1 edges
      const cy = Math.abs(y - 0.5) * 2;
      const r = Math.sqrt(cx * cx + cy * cy);  // 0..~1.4
      // ring + diagonal stripes pattern, deterministic noise
      const stripe = ((row * 3 + col * 5 + (seed % 17)) % 11);
      const ringHit = Math.abs(r - 0.42) < 0.06 ? 1 : 0;
      const ringHit2 = Math.abs(r - 0.62) < 0.05 ? 1 : 0;
      const xMark = Math.abs(x - y) < 0.06 || Math.abs((1 - x) - y) < 0.06 ? 1 : 0;
      const stripeHit = stripe < 3 ? 1 : 0;
      const colorIndex = ringHit
        ? 3
        : ringHit2
          ? 4
          : xMark
            ? 2
            : stripeHit
              ? 1
              : r > 0.7
                ? 5
                : 0;
      cells.push({ row, col, color: palette.colors[colorIndex] ?? "#000000" });
    }
  }

  // Add a center dot for brand mark
  const center = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
  for (const c of cells) {
    if (c.row === center.row && c.col === center.col) c.color = palette.colors[3] ?? "#000";
  }

  // Tagline
  const taglines = uniq([
    `${TONES[tone].inflection} ${root} energy`,
    `${vibe || "first mint"} energy, onchain`,
    `${palette.name} palette, B20 ready`,
    `pure ${TONES[tone].inflection} ${root}`,
  ]);
  const tagline = pick(taglines, seed, 24);

  return { name, ticker, palette, cells, tagline, root, suffix };
}

function shareButton(self: string, text: string) {
  return {
    type: "button" as const,
    props: { label: "Share token", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text, embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const childSet = ["title", "intro", "vibe", "tone", "actions"];
  if (error) childSet.splice(2, 0, "error");

  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children: childSet },
    title: { type: "text", props: { content: "B20 Name Smith", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Mint a B20 token name, ticker, and snap-native logo from a vibe.",
        size: "sm",
        align: "center",
      },
    },
    vibe: {
      type: "input",
      props: {
        name: "vibe",
        label: "Vibe or project",
        placeholder: "synth garden, friendly loyalty coin",
        maxLength: 80,
      },
    },
    tone: {
      type: "toggle_group",
      props: {
        name: "tone",
        label: "Tone",
        defaultValue: "friendly",
        options: Object.entries(TONES).map(([value, config]) => ({
          label: `${config.glyph} ${config.label}`,
          value,
        })),
      },
    },
    forge: {
      type: "button",
      props: { label: "Forge token", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=forge` } } },
    },
    share_btn: shareButton(self, "Just forged a B20 token in the Name Smith ⚒️"),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["forge", "share_btn"] },
  };

  if (error) {
    elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  }

  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, tone: Tone, token: ReturnType<typeof buildToken>): SnapHandlerResult {
  const { name, ticker, palette, cells, tagline } = token;
  const confetti = ticker.startsWith("X") || palette.name === "neon";
  const shareText = `Forged ${name} ($${ticker}) — a ${palette.name} B20 token. ${tagline}`.slice(0, 280);

  // cell_grid structure: minimal props only (cols/rows/rowHeight/cells), per skill guidance.
  const logoGrid = {
    type: "cell_grid" as const,
    props: {
      cols: 32,
      rows: 16,
      rowHeight: 8,
      cells,
    },
  };

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "ticker_row", "logo", "tagline", "details", "actions"],
    },
    title: { type: "text", props: { content: name, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `B20 · ${palette.name} palette`, variant: "outline" } },
    ticker_row: {
      type: "text",
      props: { content: `Ticker: $${ticker}`, weight: "bold", align: "center", size: "sm" },
    },
    logo: logoGrid,
    tagline: { type: "text", props: { content: tagline, align: "center", size: "sm" } },
    detail_1: { type: "item", props: { title: "Tone", description: TONES[tone].label } },
    detail_2: { type: "item", props: { title: "Logo grid", description: "32×16, snap-native, zero images." } },
    detail_3: { type: "item", props: { title: "Next step", description: "Share, fork, or forge again with a new vibe." } },
    details: { type: "item_group", props: {}, children: ["detail_1", "detail_2", "detail_3"] },
    again: {
      type: "button",
      props: { label: "Forge another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again", "share_btn"] },
  };

  return {
    version: "2.0",
    ...(confetti ? { effects: ["confetti" as const] } : {}),
    theme: { accent: palette.accent },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const action = url.searchParams.get("action");
    if (action !== "forge") {
      return startPage(self);
    }

    const vibe = cleanVibe(ctx.action.inputs?.vibe);
    const tone: Tone = toneInput(ctx.action.inputs?.tone);
    if (!vibe) {
      return startPage(self, "Add a vibe or project name to forge a token.");
    }
    const token = buildToken(vibe, tone, ctx.action.user.fid);
    return resultPage(self, tone, token);
  },
  {
    openGraph: {
      title: "B20 Name Smith",
      description: "Mint a B20 token name, ticker, and snap-native logo from a vibe.",
    },
  }
);

export { buildToken, cleanVibe, toneInput };
export default app;
