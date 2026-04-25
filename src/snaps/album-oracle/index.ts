/**
 * album-oracle — music-adjacent aura generator for /tortoise.
 *
 * Components: slider, toggle_group, badge, progress, item_group, item, separator
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "album-oracle";
const TORTOISE_URL = "https://warpcast.com/~/channel/tortoise";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "pink" | "purple" | "teal" | "amber" | "blue" | "green";
type Mood = "Dusty" | "Neon" | "Heavy" | "Floating";

type AlbumAura = {
  title: string;
  label: string;
  description: string;
  opener: string;
  closer: string;
  recommendedMove: string;
  intensity: number;
  accent: Accent;
};

const MOODS: Mood[] = ["Dusty", "Neon", "Heavy", "Floating"];

const AURAS: Record<Mood, AlbumAura[]> = {
  Dusty: [
    {
      title: "Basement Sunbeam",
      label: "Dusty classic",
      description: "Warm tape hiss, patient drums, and one perfect guitar bend hiding in the corner.",
      opener: "Track 1 starts like a lost 1978 soundcheck.",
      closer: "Final note fades before it admits what it knows.",
      recommendedMove: "Play it while walking with no destination.",
      intensity: 48,
      accent: "amber",
    },
    {
      title: "Crate Ghosts",
      label: "Deep cut",
      description: "A record that smells like cardboard sleeves and suspiciously good coffee.",
      opener: "The bassline enters late, on purpose.",
      closer: "Side B wins by whispering.",
      recommendedMove: "Tell one friend you found something strange.",
      intensity: 55,
      accent: "purple",
    },
  ],
  Neon: [
    {
      title: "Chrome Afterparty",
      label: "Neon pulse",
      description: "Synths with clean shoes, drums with bad intentions, chorus glowing at midnight.",
      opener: "Track 1 kicks the door open politely.",
      closer: "The remix is already implied.",
      recommendedMove: "Post the hook and pretend it found you.",
      intensity: 82,
      accent: "pink",
    },
    {
      title: "Laser Rain",
      label: "Bright storm",
      description: "A sleek little thundercloud for people who dance through push notifications.",
      opener: "Arpeggios arrive like tiny headlights.",
      closer: "Everything resolves into one shiny chord.",
      recommendedMove: "Queue it before your next late-night build.",
      intensity: 74,
      accent: "blue",
    },
  ],
  Heavy: [
    {
      title: "Amplifier Weather",
      label: "Heavy sky",
      description: "Riffs stack like storm fronts. The snare has opinions. The outro lifts weights.",
      opener: "Track 1 tests the room's foundations.",
      closer: "The last cymbal refuses to leave.",
      recommendedMove: "Turn it up exactly one notch too far.",
      intensity: 91,
      accent: "purple",
    },
    {
      title: "Concrete Chorus",
      label: "Big mood",
      description: "A wall of sound with a tiny window cut through it for feelings.",
      opener: "The first chord lands like furniture.",
      closer: "Feedback becomes the credits scene.",
      recommendedMove: "Send it to the friend who says 'heavier.'",
      intensity: 86,
      accent: "teal",
    },
  ],
  Floating: [
    {
      title: "Cloudliner Notes",
      label: "Floating drift",
      description: "Soft pads, weightless vocals, and drums that learned to levitate.",
      opener: "Track 1 fogs the glass in a good way.",
      closer: "The outro keeps orbiting after it ends.",
      recommendedMove: "Play it while the tabs close themselves.",
      intensity: 38,
      accent: "teal",
    },
    {
      title: "Zero Gravity Folk",
      label: "Soft orbit",
      description: "Acoustic strings and lunar reverb sharing a blanket in the control room.",
      opener: "The first melody arrives barefoot.",
      closer: "One harmony waves from the moon.",
      recommendedMove: "Save it for golden hour, obviously.",
      intensity: 42,
      accent: "green",
    },
  ],
};

function asMood(raw: unknown): Mood {
  const mood = String(raw ?? "Dusty");
  return MOODS.includes(mood as Mood) ? (mood as Mood) : "Dusty";
}

function asTempo(raw: unknown): number {
  const parsed = Number(raw ?? 96);
  if (!Number.isFinite(parsed)) return 96;
  return Math.max(40, Math.min(180, Math.round(parsed)));
}

function pickAura(mood: Mood, tempo: number, fid: number): AlbumAura {
  const options = AURAS[mood];
  const index = Math.abs(Math.floor(tempo / 7) + (fid || 0)) % options.length;
  const base = options[index];
  const tempoLift = Math.round((tempo - 100) / 4);
  return {
    ...base,
    intensity: Math.max(10, Math.min(100, base.intensity + tempoLift)),
  };
}

function shareButton(self: string, text = "I consulted the Album Oracle on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: {
      press: {
        action: "compose_cast" as const,
        params: { text, embeds: [self] },
      },
    },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sub", "tempo", "mood", "ask", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Album Oracle", weight: "bold", align: "center" },
    },
    sub: {
      type: "text",
      props: {
        content: "Set a tempo, pick a mood, receive the record your day is secretly asking for.",
        size: "sm",
        align: "center",
      },
    },
    tempo: {
      type: "slider",
      props: { name: "tempo", label: "Tempo", min: 40, max: 180, step: 1, defaultValue: 96 },
    },
    mood: {
      type: "toggle_group",
      props: {
        name: "mood",
        label: "Mood",
        options: MOODS.map((label) => ({ label, value: label })),
        defaultValue: "Dusty",
      },
    },
    ask: {
      type: "button",
      props: { label: "Reveal my album", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "pink" }, ui: { root: "page", elements } };
}

function resultPage(self: string, tempo: number, mood: Mood, aura: AlbumAura): SnapHandlerResult {
  const shareText = `The Album Oracle gave me ${aura.title} at ${tempo} BPM.`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["badge", "title", "desc", "intensity", "notes", "sep", "tortoise", "again", "share_btn"],
    },
    badge: {
      type: "badge",
      props: { label: aura.label, variant: "primary" },
    },
    title: {
      type: "text",
      props: { content: aura.title, weight: "bold", align: "center" },
    },
    desc: {
      type: "text",
      props: { content: `${mood} mood at ${tempo} BPM. ${aura.description}`, size: "sm", align: "center" },
    },
    intensity: {
      type: "progress",
      props: { label: "Playback intensity", value: aura.intensity, max: 100 },
    },
    note_1: {
      type: "item",
      props: { title: "Opener", description: aura.opener },
    },
    note_2: {
      type: "item",
      props: { title: "Closer", description: aura.closer },
    },
    note_3: {
      type: "item",
      props: { title: "Move", description: aura.recommendedMove },
    },
    notes: {
      type: "item_group",
      props: {},
      children: ["note_1", "note_2", "note_3"],
    },
    sep: { type: "separator", props: {} },
    tortoise: {
      type: "button",
      props: { label: "Open /tortoise", variant: "primary" },
      on: { press: { action: "open_url", params: { url: TORTOISE_URL } } },
    },
    again: {
      type: "button",
      props: { label: "Try again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self, shareText),
  };

  return {
    version: "1.0",
    theme: { accent: aura.accent },
    effects: aura.intensity >= 88 ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return startPage(self);
  }

  const tempo = asTempo(ctx.action.inputs?.tempo);
  const mood = asMood(ctx.action.inputs?.mood);
  const aura = pickAura(mood, tempo, ctx.action.fid ?? 0);
  return resultPage(self, tempo, mood, aura);
});

export { asMood, asTempo, pickAura };
export default app;
