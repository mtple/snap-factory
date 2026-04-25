/**
 * music-collab — Collaborative relay grid sequencer for Farcaster.
 *
 * Each collaborator programs one playable grid layer at a time: drum lanes,
 * bass notes, chord choices, then melody notes. The full arrangement is only
 * revealed after the final melody layer is submitted.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "music-collab";
const STEPS = ["1", "2", "3", "4"] as const;
const PATTERN_LEN = 4;
const STAGE_PARAM = "stage";

type Inputs = Record<string, string | string[] | undefined>;
type StageId = "drums" | "bass" | "chords" | "lead" | "complete";
type LaneGroup = "drums" | "bass" | "chords" | "lead";
type LaneKind = "kick" | "snare" | "hat" | "bass" | "chord" | "lead";
type LaneKey =
  | "kick" | "snare" | "hat"
  | "bass_c" | "bass_f" | "bass_g" | "bass_a"
  | "chord_c" | "chord_f" | "chord_g" | "chord_am"
  | "lead_c" | "lead_d" | "lead_e" | "lead_g" | "lead_a";

interface LaneDef {
  key: LaneKey;
  param: string;
  label: string;
  short: string;
  group: LaneGroup;
  kind: LaneKind;
  color: "red" | "blue" | "green" | "yellow" | "purple" | "teal";
  defaultPattern: string;
  freq?: number;
  chord?: number[];
}

interface StageDef {
  id: Exclude<StageId, "complete">;
  title: string;
  subtitle: string;
  submitLabel: string;
  shareLabel: string;
  shareText: string;
  lanes: LaneKey[];
  next: StageId;
}

const LANES: LaneDef[] = [
  { key: "kick", param: "k", label: "Kick", short: "K", group: "drums", kind: "kick", color: "red", defaultPattern: "1001" },
  { key: "snare", param: "s", label: "Snare", short: "S", group: "drums", kind: "snare", color: "blue", defaultPattern: "0100" },
  { key: "hat", param: "h", label: "Hi-hat", short: "H", group: "drums", kind: "hat", color: "green", defaultPattern: "1111" },
  { key: "bass_c", param: "bc", label: "Bass C", short: "BC", group: "bass", kind: "bass", color: "purple", defaultPattern: "1000", freq: 65.41 },
  { key: "bass_f", param: "bf", label: "Bass F", short: "BF", group: "bass", kind: "bass", color: "purple", defaultPattern: "0010", freq: 87.31 },
  { key: "bass_g", param: "bg", label: "Bass G", short: "BG", group: "bass", kind: "bass", color: "purple", defaultPattern: "0001", freq: 98.00 },
  { key: "bass_a", param: "ba", label: "Bass A", short: "BA", group: "bass", kind: "bass", color: "purple", defaultPattern: "0100", freq: 110.00 },
  { key: "chord_c", param: "cc", label: "C maj", short: "C", group: "chords", kind: "chord", color: "teal", defaultPattern: "1000", chord: [261.63, 329.63, 392.00] },
  { key: "chord_f", param: "cf", label: "F maj", short: "F", group: "chords", kind: "chord", color: "teal", defaultPattern: "0010", chord: [349.23, 440.00, 523.25] },
  { key: "chord_g", param: "cg", label: "G maj", short: "G", group: "chords", kind: "chord", color: "teal", defaultPattern: "0001", chord: [392.00, 493.88, 587.33] },
  { key: "chord_am", param: "ca", label: "A min", short: "Am", group: "chords", kind: "chord", color: "teal", defaultPattern: "0100", chord: [220.00, 261.63, 329.63] },
  { key: "lead_c", param: "lc", label: "Melody C", short: "C", group: "lead", kind: "lead", color: "yellow", defaultPattern: "1000", freq: 523.25 },
  { key: "lead_d", param: "ld", label: "Melody D", short: "D", group: "lead", kind: "lead", color: "yellow", defaultPattern: "0000", freq: 587.33 },
  { key: "lead_e", param: "le", label: "Melody E", short: "E", group: "lead", kind: "lead", color: "yellow", defaultPattern: "0010", freq: 659.25 },
  { key: "lead_g", param: "lg", label: "Melody G", short: "G", group: "lead", kind: "lead", color: "yellow", defaultPattern: "0001", freq: 783.99 },
  { key: "lead_a", param: "la", label: "Melody A", short: "A", group: "lead", kind: "lead", color: "yellow", defaultPattern: "0100", freq: 880.00 },
];

const LANE_BY_KEY = Object.fromEntries(LANES.map((lane) => [lane.key, lane])) as Record<LaneKey, LaneDef>;

const STAGES: StageDef[] = [
  {
    id: "drums",
    title: "Step 1: sequence drums 🥁",
    subtitle: "Pick time slots for each drum lane, like a step sequencer.",
    submitLabel: "Lock drums → bass",
    shareLabel: "Share drum starter",
    shareText: "Start this Farcaster track: sequence the drums, then pass it on 🥁",
    lanes: ["kick", "snare", "hat"],
    next: "bass",
  },
  {
    id: "bass",
    title: "Step 2: sequence bass",
    subtitle: "Choose which bass notes hit on each step. Drums are saved underneath.",
    submitLabel: "Lock bass → chords",
    shareLabel: "Share: add bass",
    shareText: "Drums are in. Add a bass grid to this Farcaster track 🎛️",
    lanes: ["bass_c", "bass_f", "bass_g", "bass_a"],
    next: "chords",
  },
  {
    id: "chords",
    title: "Step 3: sequence chords",
    subtitle: "Choose chord hits across the timeline. Drums and bass are saved.",
    submitLabel: "Lock chords → melody",
    shareLabel: "Share: add chords",
    shareText: "Drums and bass are in. Add a chord grid to this Farcaster track 🎹",
    lanes: ["chord_c", "chord_f", "chord_g", "chord_am"],
    next: "lead",
  },
  {
    id: "lead",
    title: "Step 4: sequence melody",
    subtitle: "Pick melody notes in time, then reveal the full layered track.",
    submitLabel: "Finish track",
    shareLabel: "Share: add melody",
    shareText: "Drums, bass, and chords are in. Add the melody grid and finish this track ✨",
    lanes: ["lead_c", "lead_d", "lead_e", "lead_g", "lead_a"],
    next: "complete",
  },
];

const STAGE_BY_ID = Object.fromEntries(STAGES.map((stage) => [stage.id, stage])) as Record<Exclude<StageId, "complete">, StageDef>;

type PatternState = Record<LaneKey, string>;

function cleanPattern(value: string | null | undefined, fallback = "0000"): string {
  const raw = (value ?? fallback).replace(/[^01]/g, "0");
  return raw.padEnd(PATTERN_LEN, "0").slice(0, PATTERN_LEN);
}

function inputToPattern(selected: string | string[] | undefined): string {
  if (!selected) return "0000";
  const values = Array.isArray(selected) ? selected : [selected];
  return STEPS.map((step) => (values.includes(step) ? "1" : "0")).join("");
}

function patternToSteps(pattern: string): string[] {
  return STEPS.filter((_, index) => pattern[index] === "1");
}

function patternDisplay(pattern: string): string {
  return pattern.split("").map((bit) => (bit === "1" ? "●" : "·")).join("  ");
}

function emptyState(): PatternState {
  return Object.fromEntries(LANES.map((lane) => [lane.key, "0000"])) as PatternState;
}

function stageFromUrl(url: URL): StageId {
  const value = url.searchParams.get(STAGE_PARAM);
  if (value === "bass" || value === "chords" || value === "lead" || value === "complete") return value;
  return "drums";
}

function patternsFromUrl(url: URL): PatternState {
  return Object.fromEntries(
    LANES.map((lane) => [lane.key, cleanPattern(url.searchParams.get(lane.param), "0000")]),
  ) as PatternState;
}

function mergeInputsForStage(state: PatternState, stage: StageDef, inputs: Inputs): PatternState {
  const next = { ...state };
  for (const key of stage.lanes) next[key] = inputToPattern(inputs[key]);
  return next;
}

function patternUrl(self: string, state: PatternState, stage: StageId = "complete"): string {
  const url = new URL(self);
  url.searchParams.set(STAGE_PARAM, stage);
  for (const lane of LANES) url.searchParams.set(lane.param, cleanPattern(state[lane.key], "0000"));
  return url.toString();
}

function playerUrl(self: string, state: PatternState): string {
  const url = new URL(`${self}/player`);
  for (const lane of LANES) url.searchParams.set(lane.param, cleanPattern(state[lane.key], "0000"));
  return url.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] ?? char);
}

app.get("/player", (c) => {
  const url = new URL(c.req.url);
  const state = patternsFromUrl(url);
  return c.html(buildPlayerHtml(state));
});

function buildPlayerHtml(state: PatternState): string {
  const safeState = Object.fromEntries(
    LANES.map((lane) => [lane.key, cleanPattern(state[lane.key], "0000")]),
  ) as PatternState;
  const rows = LANES.map((lane) => `
    <div class="lbl">${escapeHtml(lane.label)}</div>
    ${safeState[lane.key].split("").map((bit, index) => (
      `<div class="cell ${lane.group} ${bit === "1" ? "active" : ""}" id="${lane.key}-${index}"></div>`
    )).join("")}`,
  ).join("");
  const scriptState = JSON.stringify(safeState).replace(/</g, "\\u003c");
  const scriptLanes = JSON.stringify(LANES.map(({ key, group, kind, freq, chord }) => ({ key, group, kind, freq, chord }))).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Music Collab — Snap Wizard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#09090b;color:#f8fafc;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:18px}
h1{font-size:1.65rem;letter-spacing:-.03em}.sub{color:#94a3b8;font-size:.9rem;text-align:center}.grid{display:grid;grid-template-columns:92px repeat(4,minmax(38px,1fr));gap:7px;width:100%;max-width:520px}.step{height:18px;color:#64748b;text-align:center;font-size:.75rem;font-weight:700}.lbl{display:flex;align-items:center;color:#cbd5e1;font-size:.78rem;font-weight:700}.cell{height:38px;border:2px solid #27272a;border-radius:9px;background:#18181b;transition:all .08s ease}.active.drums{background:#ef4444;border-color:#f87171}.active.bass{background:#8b5cf6;border-color:#a78bfa}.active.chords{background:#14b8a6;border-color:#2dd4bf}.active.lead{background:#f59e0b;border-color:#fbbf24}.hit{filter:brightness(1.9);transform:scale(.92)}.cursor{box-shadow:0 0 0 3px rgba(255,255,255,.22)}.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}button{border:0;border-radius:999px;padding:12px 24px;font-weight:800;background:#8b5cf6;color:white;cursor:pointer}button.on{background:#dc2626}.bpm{display:flex;gap:8px;align-items:center;color:#94a3b8;font-size:.9rem}input{accent-color:#8b5cf6}.foot{color:#52525b;font-size:.78rem}
</style>
</head>
<body>
<h1>Music Collab</h1>
<p class="sub">A Farcaster relay step sequencer — drums, bass notes, chords, melody.</p>
<div class="grid">
  <div></div><div class="step">1</div><div class="step">2</div><div class="step">3</div><div class="step">4</div>
  ${rows}
</div>
<div class="controls">
  <button id="play">▶ Play</button>
  <div class="bpm"><span id="bpmv">118 BPM</span><input id="bpm" type="range" min="70" max="180" value="118"></div>
</div>
<p class="foot">snap wizard 🐢</p>
<script>
const P=${scriptState};
const LANES=${scriptLanes};
let ac,playing=false,step=0,timer,bpm=118;
function init(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}
function env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);}
function noise(d){const n=Math.ceil(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;return b;}
function kick(t){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(36,t+.22);env(g,t,.01,.24,.9);o.start(t);o.stop(t+.28)}
function snare(t){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise(.14);f.type='bandpass';f.frequency.value=1600;s.connect(f);f.connect(g);g.connect(ac.destination);env(g,t,.005,.12,.38);s.start(t);s.stop(t+.16)}
function hat(t){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise(.045);f.type='highpass';f.frequency.value=6500;s.connect(f);f.connect(g);g.connect(ac.destination);env(g,t,.002,.04,.22);s.start(t);s.stop(t+.05)}
function tone(t,freq,dur,type,gain){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(ac.destination);env(g,t,.012,dur,gain);o.start(t);o.stop(t+dur+.04)}
function playLane(l,t){if(l.kind==='kick')kick(t);else if(l.kind==='snare')snare(t);else if(l.kind==='hat')hat(t);else if(l.kind==='bass')tone(t,l.freq,.28,'sawtooth',.32);else if(l.kind==='lead')tone(t,l.freq,.18,'square',.12);else if(l.kind==='chord')l.chord.forEach(f=>tone(t,f,.52,'triangle',.1));}
function interval(){return 60/bpm*1000/2}
document.getElementById('bpm').oninput=e=>{bpm=+e.target.value;document.getElementById('bpmv').textContent=bpm+' BPM';if(playing){clearInterval(timer);timer=setInterval(tick,interval())}};
document.getElementById('play').onclick=()=>{init();const b=document.getElementById('play');if(playing){clearInterval(timer);playing=false;step=0;b.textContent='▶ Play';b.classList.remove('on');clearCursor()}else{playing=true;b.textContent='■ Stop';b.classList.add('on');tick();timer=setInterval(tick,interval())}};
function clearCursor(){document.querySelectorAll('.cell').forEach(e=>e.classList.remove('cursor','hit'))}
function tick(){const now=ac.currentTime;clearCursor();LANES.forEach(l=>{const el=document.getElementById(l.key+'-'+step);if(el)el.classList.add('cursor');if(P[l.key][step]==='1'){playLane(l,now);if(el){el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),90)}}});step=(step+1)%4}
</script>
</body>
</html>`;
}

function buildSequencerScreen(self: string, state: PatternState, stage: StageDef): SnapHandlerResult {
  const stageUrl = patternUrl(self, state, stage.id);
  const children = ["title", "subtitle", "sep", ...stage.lanes.map((key) => `${key}_grid`), "make_btn", "share_btn"];
  const elements: Record<string, object> = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children },
    title: { type: "text", props: { content: stage.title, weight: "bold", align: "center" } },
    subtitle: { type: "text", props: { content: stage.subtitle, size: "sm", align: "center" } },
    sep: { type: "separator", props: {} },
    make_btn: {
      type: "button",
      props: { label: stage.submitLabel, variant: "primary" },
      on: { press: { action: "submit", params: { target: stageUrl } } },
    },
    share_btn: {
      type: "button",
      props: { label: stage.shareLabel, variant: "secondary" },
      on: { press: { action: "compose_cast", params: { text: stage.shareText, embeds: [stageUrl] } } },
    },
  };

  for (const key of stage.lanes) {
    const lane = LANE_BY_KEY[key];
    elements[`${lane.key}_grid`] = {
      type: "toggle_group",
      props: {
        name: lane.key,
        label: lane.label,
        options: [...STEPS],
        orientation: "horizontal",
        variant: "outline",
        multiple: true,
        defaultValue: patternToSteps(state[lane.key] === "0000" ? lane.defaultPattern : state[lane.key]),
      },
    };
  }

  return { version: "1.0", theme: { accent: "purple" }, ui: { root: "page", elements: elements as never } };
}

function buildResultScreen(self: string, state: PatternState): SnapHandlerResult {
  const loopUrl = patternUrl(self, state, "complete");
  const listenUrl = playerUrl(self, state);
  const elements: Record<string, object> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "subtitle", "patterns", "sep", "listen_btn", "share_btn", "restart_btn"],
    },
    title: { type: "text", props: { content: "Full track complete 🎶", weight: "bold", align: "center" } },
    subtitle: { type: "text", props: { content: "The completed grid layers drums, bass notes, chords, and melody.", size: "sm", align: "center" } },
    patterns: { type: "item_group", props: {}, children: LANES.map((lane) => `${lane.key}_row`) },
    sep: { type: "separator", props: {} },
    listen_btn: {
      type: "button",
      props: { label: "Open music player", variant: "primary" },
      on: { press: { action: "open_url", params: { target: listenUrl } } },
    },
    share_btn: {
      type: "button",
      props: { label: "Share finished track", variant: "secondary" },
      on: { press: { action: "compose_cast", params: { text: "We built a collaborative Farcaster loop 🎶", embeds: [loopUrl] } } },
    },
    restart_btn: {
      type: "button",
      props: { label: "Start new relay", variant: "secondary" },
      on: { press: { action: "submit", params: { target: patternUrl(self, emptyState(), "drums") } } },
    },
  };

  for (const lane of LANES) {
    elements[`${lane.key}_row`] = {
      type: "item",
      props: { title: lane.label, description: `${lane.short}: ${patternDisplay(state[lane.key])}` },
    };
  }

  return { version: "1.0", theme: { accent: "teal" }, ui: { root: "page", elements: elements as never } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);
  const stageId = stageFromUrl(reqUrl);
  const state = patternsFromUrl(reqUrl);

  if (ctx.action.type === "get") {
    if (stageId === "complete") return buildResultScreen(self, state);
    return buildSequencerScreen(self, state, STAGE_BY_ID[stageId]);
  }

  if (stageId === "complete") return buildResultScreen(self, state);

  const inputs = ((ctx.action as { inputs?: Inputs }).inputs ?? {}) as Inputs;
  const currentStage = STAGE_BY_ID[stageId];
  const nextState = mergeInputsForStage(state, currentStage, inputs);

  if (currentStage.next === "complete") return buildResultScreen(self, nextState);
  return buildSequencerScreen(self, nextState, STAGE_BY_ID[currentStage.next]);
});

export { cleanPattern, inputToPattern, patternToSteps, patternDisplay, stageFromUrl };
export default app;
