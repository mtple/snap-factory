/**
 * music-collab — 4-person collaborative track builder.
 *
 * Each person picks one layer (drums → bass → chords → vibe) then passes
 * the snap to the next person via compose_cast. State and contributor FIDs
 * travel in URL query params. On the final page Neynar resolves FIDs to
 * @usernames and the full track is revealed.
 *
 * Components: text, toggle_group, button, badge, separator, stack
 * Accent: purple (layers 1-4), teal (final)
 * State: URL params (stateless server)
 * Actions: submit, compose_cast
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "music-collab";

// ── Layer definitions ─────────────────────────────────────────────────────────

const LAYERS = [
  {
    num: 1,
    key: "drum",
    name: "Drums",
    label: "Pick the drum pattern",
    options: ["Boom-bap", "Four-on-floor", "Jungle", "Sparse"],
  },
  {
    num: 2,
    key: "bass",
    name: "Bass",
    label: "Pick the bass note",
    options: ["C", "E", "G", "A"],
  },
  {
    num: 3,
    key: "chord",
    name: "Chords",
    label: "Pick the chord progression",
    options: ["I–IV–V", "I–V–vi–IV", "ii–V–I", "I–vi–IV–V"],
  },
  {
    num: 4,
    key: "vibe",
    name: "Vibe",
    label: "Set the vibe",
    options: ["Chill", "Hype", "Dreamy", "Raw"],
  },
] as const;

type LayerKey = "drum" | "bass" | "chord" | "vibe";

// ── State helpers ─────────────────────────────────────────────────────────────

interface TrackState {
  layer: number; // current layer to fill (1-4); 5 = complete
  drum: string;
  bass: string;
  chord: string;
  vibe: string;
  fids: number[]; // contributor FIDs in order
}

function parseState(url: URL): TrackState {
  const layer = parseInt(url.searchParams.get("l") ?? "1", 10) || 1;
  const drum = url.searchParams.get("drum") ?? "";
  const bass = url.searchParams.get("bass") ?? "";
  const chord = url.searchParams.get("chord") ?? "";
  const vibe = url.searchParams.get("vibe") ?? "";
  const fidsParam = url.searchParams.get("fids") ?? "";
  const fids = fidsParam
    ? fidsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
    : [];
  return { layer, drum, bass, chord, vibe, fids };
}

function buildNextUrl(base: string, state: TrackState): string {
  const u = new URL(base);
  u.searchParams.set("l", String(state.layer));
  if (state.drum) u.searchParams.set("drum", state.drum);
  if (state.bass) u.searchParams.set("bass", state.bass);
  if (state.chord) u.searchParams.set("chord", state.chord);
  if (state.vibe) u.searchParams.set("vibe", state.vibe);
  if (state.fids.length) u.searchParams.set("fids", state.fids.join(","));
  return u.toString();
}

// ── Neynar username resolution ────────────────────────────────────────────────

async function resolveUsernames(fids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!fids.length) return map;
  try {
    const key = process.env.NEYNAR_API_KEY ?? "";
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(",")}`,
      { headers: { "api_key": key } },
    );
    if (!res.ok) return map;
    const data = (await res.json()) as { users?: { fid: number; username: string }[] };
    for (const u of data.users ?? []) {
      map.set(u.fid, u.username);
    }
  } catch {
    // best-effort
  }
  return map;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderLayer(state: TrackState, self: string): SnapHandlerResult {
  const layerIdx = state.layer - 1;
  const layer = LAYERS[layerIdx];
  if (!layer) return renderComplete(state, self, new Map());

  const layerNum = state.layer;
  const totalLayers = LAYERS.length;

  // Progress labels for already-chosen layers
  const progressBadges: string[] = [];
  for (let i = 0; i < layerIdx; i++) {
    const l = LAYERS[i];
    const val = state[l.key as LayerKey];
    progressBadges.push(`badge_${l.key}`);
    // badges defined below in elements
    void val;
  }

  const children = [
    "title",
    "progress_text",
    "sep",
    ...progressBadges,
    "pick_label",
    "picker",
    "submit_btn",
  ];

  const elements: Record<string, object> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children,
    },
    title: {
      type: "text",
      props: {
        content: "Music Collab 🎵",
        weight: "bold",
        align: "center",
      },
    },
    progress_text: {
      type: "text",
      props: {
        content: `Layer ${layerNum} of ${totalLayers}: ${layer.name}`,
        size: "sm",
        align: "center",
      },
    },
    sep: { type: "separator", props: {} },
    pick_label: {
      type: "text",
      props: { content: layer.label, weight: "bold" },
    },
    picker: {
      type: "toggle_group",
      props: {
        name: layer.key,
        label: layer.name,
        options: layer.options as unknown as string[],
        orientation: "vertical",
        variant: "outline",
        defaultValue: layer.options[0],
      },
    },
    submit_btn: {
      type: "button",
      props: { label: "Add my layer →", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: self },
        },
      },
    },
  };

  // Add badges for completed layers
  for (let i = 0; i < layerIdx; i++) {
    const l = LAYERS[i];
    const val = state[l.key as LayerKey];
    elements[`badge_${l.key}`] = {
      type: "badge",
      props: {
        label: `${l.name}: ${val}`,
        variant: "default",
        color: "purple",
      },
    };
  }

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: { root: "page", elements: elements as never },
  };
}

function renderPassOn(state: TrackState, self: string): SnapHandlerResult {
  const justFinishedIdx = state.layer - 2; // layer just set = layer-1, index = layer-2
  const justFinished = LAYERS[justFinishedIdx];
  const nextLayer = LAYERS[state.layer - 1]; // next layer to fill

  const nextUrl = buildNextUrl(self, state);
  const layerName = justFinished?.name ?? "layer";
  const nextName = nextLayer?.name ?? "the next layer";

  // Build summary of what's been chosen so far
  const summaryBadges: string[] = [];
  for (let i = 0; i < state.layer - 1; i++) {
    const l = LAYERS[i];
    const val = state[l.key as LayerKey];
    if (val) summaryBadges.push(`badge_${l.key}`);
  }

  const children = [
    "title",
    "done_text",
    "sep",
    ...summaryBadges,
    "sep2",
    "pass_label",
    "pass_btn",
  ];

  const elements: Record<string, object> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children,
    },
    title: {
      type: "text",
      props: { content: "Layer added! 🎵", weight: "bold", align: "center" },
    },
    done_text: {
      type: "text",
      props: {
        content: `You set the ${layerName}. Now pass it on — someone else picks ${nextName}.`,
        size: "sm",
        align: "center",
      },
    },
    sep: { type: "separator", props: {} },
    sep2: { type: "separator", props: {} },
    pass_label: {
      type: "text",
      props: {
        content: "Pass this snap to someone who'll add the next layer.",
        size: "sm",
        align: "center",
      },
    },
    pass_btn: {
      type: "button",
      props: { label: "Pass it on 🎵", variant: "primary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: `adding my layer to a collab track — you're up, pick ${nextName} 👇`,
            embeds: [nextUrl],
          },
        },
      },
    },
  };

  // Summary badges
  for (let i = 0; i < state.layer - 1; i++) {
    const l = LAYERS[i];
    const val = state[l.key as LayerKey];
    if (val) {
      elements[`badge_${l.key}`] = {
        type: "badge",
        props: {
          label: `${l.name}: ${val}`,
          variant: "default",
          color: "purple",
        },
      };
    }
  }

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: { root: "page", elements: elements as never },
  };
}

function renderComplete(
  state: TrackState,
  self: string,
  usernames: Map<number, string>,
): SnapHandlerResult {
  // Build a track description
  const trackLines = [
    `Drums: ${state.drum || "—"}`,
    `Bass: ${state.bass || "—"}`,
    `Chords: ${state.chord || "—"}`,
    `Vibe: ${state.vibe || "—"}`,
  ];

  // Resolve contributors
  const contributors = state.fids
    .map((fid) => {
      const name = usernames.get(fid);
      return name ? `@${name}` : `fid:${fid}`;
    })
    .join(", ");

  const shareText = contributors
    ? `we built a track together 🎵 ${state.drum} drums, ${state.bass} bass, ${state.chord} chords — ${state.vibe} vibes. with ${contributors}`
    : `we built a track together 🎵 ${state.drum} drums, ${state.bass} bass, ${state.chord} chords — ${state.vibe} vibes`;

  const trackSummary = trackLines.join(" · ");

  const children = [
    "title",
    "subtitle",
    "sep",
    "drum_badge",
    "bass_badge",
    "chord_badge",
    "vibe_badge",
    "sep2",
    "contributors_text",
    "share_btn",
    "start_btn",
  ];

  return {
    version: "1.0",
    theme: { accent: "teal" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children,
        },
        title: {
          type: "text",
          props: {
            content: "Track complete! 🎵",
            weight: "bold",
            align: "center",
          },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Four people. One track.",
            size: "sm",
            align: "center",
          },
        },
        sep: { type: "separator", props: {} },
        drum_badge: {
          type: "badge",
          props: {
            label: `Drums: ${state.drum || "—"}`,
            variant: "default",
            color: "teal",
          },
        },
        bass_badge: {
          type: "badge",
          props: {
            label: `Bass: ${state.bass || "—"}`,
            variant: "default",
            color: "teal",
          },
        },
        chord_badge: {
          type: "badge",
          props: {
            label: `Chords: ${state.chord || "—"}`,
            variant: "outline",
            color: "teal",
          },
        },
        vibe_badge: {
          type: "badge",
          props: {
            label: `Vibe: ${state.vibe || "—"}`,
            variant: "outline",
            color: "teal",
          },
        },
        sep2: { type: "separator", props: {} },
        contributors_text: {
          type: "text",
          props: {
            content: contributors
              ? `Built by: ${contributors}`
              : "Built collaboratively",
            size: "sm",
            align: "center",
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share this track", variant: "primary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: shareText,
                embeds: [self],
              },
            },
          },
        },
        start_btn: {
          type: "button",
          props: { label: "Start a new track", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
      } as never,
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);

  if (ctx.action.type === "get") {
    const state = parseState(reqUrl);
    if (state.layer >= 5) {
      const usernames = await resolveUsernames(state.fids);
      return renderComplete(state, self, usernames);
    }
    return renderLayer(state, self);
  }

  // POST — user submitted a layer choice
  const fid = (ctx.action as { fid?: number }).fid ?? 0;
  const inputs = (ctx.action as { inputs?: Record<string, unknown> }).inputs ?? {};

  let state = parseState(reqUrl);

  // "Start a new track" button hits the base URL with no params
  if (state.layer < 1 || state.layer > 4) {
    state = { layer: 1, drum: "", bass: "", chord: "", vibe: "", fids: [] };
  }

  const layer = LAYERS[state.layer - 1];
  if (!layer) {
    // Already complete — re-render complete page
    const usernames = await resolveUsernames(state.fids);
    return renderComplete(state, self, usernames);
  }

  // Read the chosen value for this layer from inputs
  const chosen = inputs[layer.key] as string | undefined;
  const safeChosen =
    chosen && (layer.options as readonly string[]).includes(chosen)
      ? chosen
      : layer.options[0];

  // Update state
  const nextState: TrackState = {
    ...state,
    [layer.key]: safeChosen,
    fids: fid > 0 ? [...state.fids, fid] : state.fids,
    layer: state.layer + 1,
  };

  if (nextState.layer > 4) {
    // All 4 layers done — show complete
    const usernames = await resolveUsernames(nextState.fids);
    return renderComplete(nextState, self, usernames);
  }

  // Show "pass it on" screen
  return renderPassOn(nextState, self);
});

export default app;
