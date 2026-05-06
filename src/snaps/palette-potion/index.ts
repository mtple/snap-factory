/**
 * palette-potion — brew a tiny snap-native color palette from mood + warmth.
 *
 * Components: text, toggle_group, slider, switch, badge, cell_grid, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "palette-potion";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Mood = "Cozy" | "Sharp" | "Dreamy" | "Fresh";
type Cell = { row: number; col: number; color: Accent };

type Palette = {
  mood: Mood;
  warmth: number;
  dark: boolean;
  accent: Accent;
  title: string;
  badge: string;
  colors: Accent[];
  names: string[];
  notes: string;
  recipe: string;
  share: string;
};

const MOODS: Mood[] = ["Cozy", "Sharp", "Dreamy", "Fresh"];

const BASES: Record<Mood, Accent[]> = {
  Cozy: ["amber", "pink", "purple", "green", "gray"],
  Sharp: ["gray", "blue", "red", "teal", "amber"],
  Dreamy: ["purple", "pink", "blue", "teal", "gray"],
  Fresh: ["green", "teal", "blue", "amber", "gray"],
};

const NAME_BANK: Record<Accent, readonly string[]> = {
  gray: ["Fog Ink", "Ash Note", "Soft Graphite"],
  blue: ["Pocket Sky", "Signal Blue", "Rain Window"],
  red: ["Tiny Siren", "Tomato Spark", "Brave Stamp"],
  amber: ["Lamp Glow", "Honey Tab", "Golden Errand"],
  green: ["Garden Ping", "Mint Receipt", "Moss Button"],
  teal: ["Pool Cursor", "Sea Glass", "Fresh Byte"],
  purple: ["Wizard Plum", "Night Grape", "Velvet Bug"],
  pink: ["Blush Pixel", "Candy Cloud", "Rose Cache"],
};

const MOOD_NOTES: Record<Mood, readonly string[]> = {
  Cozy: ["for friendly corners", "for soft launches", "for warm little dashboards"],
  Sharp: ["for decisive buttons", "for clean product notes", "for crisp public artifacts"],
  Dreamy: ["for gentle weirdness", "for midnight prototypes", "for soft-focus experiments"],
  Fresh: ["for morning resets", "for optimistic tools", "for tidy greenfield starts"],
};

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanMood(value: unknown): Mood {
  return MOODS.includes(value as Mood) ? (value as Mood) : "Dreamy";
}

function cleanWarmth(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function cleanSwitch(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "on" || value === "yes";
  return false;
}

function rotate<T>(items: T[], steps: number): T[] {
  const offset = ((steps % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function paletteFor(mood: Mood, warmth: number, dark: boolean, fid: number): Palette {
  const seed = hashText(`${mood}:${warmth}:${dark}:${fid || "anon"}`);
  const warmTilt: Accent[] = warmth >= 67 ? ["amber", "pink", "red"] : warmth <= 33 ? ["blue", "teal", "green"] : [];
  const darkTilt: Accent[] = dark ? ["purple", "gray"] : [];
  const colors = rotate([...warmTilt, ...BASES[mood], ...darkTilt], seed % 5).slice(0, 5);
  while (colors.length < 5) colors.push("gray");

  const names = colors.map((color, index) => NAME_BANK[color][(seed + index) % NAME_BANK[color].length] ?? color);
  const accent = colors[0] ?? "purple";
  const note = MOOD_NOTES[mood][seed % MOOD_NOTES[mood].length] ?? "for tiny magic";
  const temperature = warmth >= 67 ? "sun-warmed" : warmth <= 33 ? "cool-headed" : "balanced";
  const mode = dark ? "night-mode" : "daylight";

  return {
    mood,
    warmth,
    dark,
    accent,
    title: `${mood} palette potion`,
    badge: `${temperature} · ${mode}`,
    colors,
    names,
    notes: `Use this ${temperature} ${mood.toLowerCase()} mix ${note}. Primary: ${names[0]}. Accent: ${names[2]}.`,
    recipe: `Recipe: ${names.join(" / ")}.`,
    share: `Brewed a ${mood.toLowerCase()} ${temperature} palette potion: ${names.slice(0, 3).join(", ")}. 🎨`,
  };
}

function paletteCells(colors: Accent[]): Cell[] {
  return colors.flatMap((color, col) => [
    { row: 0, col, color },
    { row: 1, col, color },
  ]);
}

function shareButton(self: string, text = "Brew a tiny color palette with Snap Wizard.", label = "Share potion"): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderForm(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "mood", "warmth", "dark", "brew", "share_btn"],
    },
    title: { type: "text", props: { content: "Palette Potion", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: { content: "Brew a snap-native color palette for your next tiny thing.", size: "sm", align: "center" },
    },
    mood: {
      type: "toggle_group",
      props: { name: "mood", label: "Mood", options: MOODS, orientation: "horizontal", variant: "outline" },
    },
    warmth: {
      type: "slider",
      props: { name: "warmth", label: "Warmth", min: 0, max: 100, step: 1, defaultValue: 55 },
    },
    dark: { type: "switch", props: { name: "dark", label: "Add night-mode depth" } },
    brew: {
      type: "button",
      props: { label: "Brew palette", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function renderResult(self: string, palette: Palette): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "grid", "badge", "notes", "recipe", "again", "share_btn"],
    },
    title: { type: "text", props: { content: palette.title, weight: "bold", align: "center" } },
    grid: {
      type: "cell_grid",
      props: { cols: 5, rows: 2, rowHeight: 30, cells: paletteCells(palette.colors) },
    },
    badge: { type: "badge", props: { label: palette.badge, variant: "outline" } },
    notes: { type: "text", props: { content: palette.notes, size: "sm", align: "center" } },
    recipe: { type: "text", props: { content: palette.recipe, size: "sm" } },
    again: {
      type: "button",
      props: { label: "Brew again", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, palette.share, "Share palette"),
  };

  return { version: "2.0", theme: { accent: palette.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderForm(self);
    }

    const mood = cleanMood(ctx.action.inputs?.mood);
    const warmth = cleanWarmth(ctx.action.inputs?.warmth);
    const dark = cleanSwitch(ctx.action.inputs?.dark);
    const fid = ctx.action.user?.fid ?? 0;
    return renderResult(self, paletteFor(mood, warmth, dark, fid));
  },
  {
    openGraph: {
      title: "Palette Potion",
      description: "Brew a tiny snap-native color palette from mood, warmth, and night-mode depth.",
    },
  },
);

export default app;
