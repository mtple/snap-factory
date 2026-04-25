/**
 * music-collab — Collaborative relay grid sequencer for Farcaster.
 *
 * Snaps cannot play Web Audio inline, so the cast snap shows the factual full
 * song grid and links out to a browser editor for hearing/editing each layer.
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
  color: string;
  defaultPattern: string;
  freq?: number;
  chord?: number[];
}

interface StageDef {
  id: Exclude<StageId, "complete">;
  title: string;
  subtitle: string;
  addLabel: string;
  shareLabel: string;
  shareText: string;
  editorTitle: string;
  lanes: LaneKey[];
  next: StageId;
}

const LANES: LaneDef[] = [
  { key: "kick", param: "k", label: "Kick", short: "K", group: "drums", kind: "kick", color: "#ef4444", defaultPattern: "1001" },
  { key: "snare", param: "s", label: "Snare", short: "S", group: "drums", kind: "snare", color: "#3b82f6", defaultPattern: "0100" },
  { key: "hat", param: "h", label: "Hi-hat", short: "H", group: "drums", kind: "hat", color: "#22c55e", defaultPattern: "1111" },
  { key: "bass_c", param: "bc", label: "Bass C", short: "BC", group: "bass", kind: "bass", color: "#8b5cf6", defaultPattern: "1000", freq: 65.41 },
  { key: "bass_f", param: "bf", label: "Bass F", short: "BF", group: "bass", kind: "bass", color: "#8b5cf6", defaultPattern: "0010", freq: 87.31 },
  { key: "bass_g", param: "bg", label: "Bass G", short: "BG", group: "bass", kind: "bass", color: "#8b5cf6", defaultPattern: "0001", freq: 98.00 },
  { key: "bass_a", param: "ba", label: "Bass A", short: "BA", group: "bass", kind: "bass", color: "#8b5cf6", defaultPattern: "0100", freq: 110.00 },
  { key: "chord_c", param: "cc", label: "C maj", short: "C", group: "chords", kind: "chord", color: "#14b8a6", defaultPattern: "1000", chord: [261.63, 329.63, 392.00] },
  { key: "chord_f", param: "cf", label: "F maj", short: "F", group: "chords", kind: "chord", color: "#14b8a6", defaultPattern: "0010", chord: [349.23, 440.00, 523.25] },
  { key: "chord_g", param: "cg", label: "G maj", short: "G", group: "chords", kind: "chord", color: "#14b8a6", defaultPattern: "0001", chord: [392.00, 493.88, 587.33] },
  { key: "chord_am", param: "ca", label: "A min", short: "Am", group: "chords", kind: "chord", color: "#14b8a6", defaultPattern: "0100", chord: [220.00, 261.63, 329.63] },
  { key: "lead_c", param: "lc", label: "Melody C", short: "C", group: "lead", kind: "lead", color: "#f59e0b", defaultPattern: "1000", freq: 523.25 },
  { key: "lead_d", param: "ld", label: "Melody D", short: "D", group: "lead", kind: "lead", color: "#f59e0b", defaultPattern: "0000", freq: 587.33 },
  { key: "lead_e", param: "le", label: "Melody E", short: "E", group: "lead", kind: "lead", color: "#f59e0b", defaultPattern: "0010", freq: 659.25 },
  { key: "lead_g", param: "lg", label: "Melody G", short: "G", group: "lead", kind: "lead", color: "#f59e0b", defaultPattern: "0001", freq: 783.99 },
  { key: "lead_a", param: "la", label: "Melody A", short: "A", group: "lead", kind: "lead", color: "#f59e0b", defaultPattern: "0100", freq: 880.00 },
];

const STAGES: StageDef[] = [
  {
    id: "drums",
    title: "Music Collab: drums needed 🥁",
    subtitle: "The snap shows the song grid. Open the web editor to hear + add drums.",
    addLabel: "Add drums",
    shareLabel: "Share starter",
    shareText: "Start this Farcaster track: add drums, then pass it on 🥁",
    editorTitle: "Add drums",
    lanes: ["kick", "snare", "hat"],
    next: "bass",
  },
  {
    id: "bass",
    title: "Drums in — add bass",
    subtitle: "Open the web editor to hear the drums and sequence bass notes.",
    addLabel: "Add bass",
    shareLabel: "Share: add bass",
    shareText: "Drums are in. Add bass to this Farcaster track 🎛️",
    editorTitle: "Add bass notes",
    lanes: ["bass_c", "bass_f", "bass_g", "bass_a"],
    next: "chords",
  },
  {
    id: "chords",
    title: "Bass in — add chords",
    subtitle: "Open the web editor to hear the track and sequence chord hits.",
    addLabel: "Add chords",
    shareLabel: "Share: add chords",
    shareText: "Drums and bass are in. Add chords to this Farcaster track 🎹",
    editorTitle: "Add chord grid",
    lanes: ["chord_c", "chord_f", "chord_g", "chord_am"],
    next: "lead",
  },
  {
    id: "lead",
    title: "Chords in — add melody",
    subtitle: "Open the web editor to hear everything and write the melody.",
    addLabel: "Add melody",
    shareLabel: "Share: add melody",
    shareText: "Drums, bass, and chords are in. Add melody and finish this track ✨",
    editorTitle: "Add melody notes",
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

function editorUrl(self: string, state: PatternState, stage: Exclude<StageId, "complete">): string {
  const url = new URL(`${self}/editor`);
  url.searchParams.set(STAGE_PARAM, stage);
  for (const lane of LANES) url.searchParams.set(lane.param, cleanPattern(state[lane.key], "0000"));
  return url.toString();
}

function playerUrl(self: string, state: PatternState): string {
  const url = new URL(`${self}/player`);
  for (const lane of LANES) url.searchParams.set(lane.param, cleanPattern(state[lane.key], "0000"));
  return url.toString();
}

function composeUrl(embedUrl: string, text: string): string {
  const url = new URL("https://warpcast.com/~/compose");
  url.searchParams.set("text", text);
  url.searchParams.append("embeds[]", embedUrl);
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

function lanesForStage(stage: StageId): LaneKey[] {
  return stage === "complete" ? [] : STAGE_BY_ID[stage].lanes;
}

app.get("/player", (c) => {
  const url = new URL(c.req.url);
  return c.html(buildSongHtml(patternsFromUrl(url), [], "Music Collab Player", "Listen to the completed relay grid.", null));
});

app.get("/editor", (c) => {
  const url = new URL(c.req.url);
  const stageId = stageFromUrl(url);
  const state = patternsFromUrl(url);
  if (stageId === "complete") {
    return c.html(buildSongHtml(state, [], "Music Collab Player", "This relay track is complete.", null));
  }
  const stage = STAGE_BY_ID[stageId];
  return c.html(buildSongHtml(state, stage.lanes, stage.editorTitle, "Tap cells, press play to hear it, then save back to Farcaster.", stage));
});

function buildSongHtml(
  state: PatternState,
  editable: LaneKey[],
  title: string,
  subtitle: string,
  saveStage: StageDef | null,
): string {
  const safeState = Object.fromEntries(
    LANES.map((lane) => [lane.key, cleanPattern(state[lane.key], "0000")]),
  ) as PatternState;
  for (const key of editable) {
    if (safeState[key] === "0000") safeState[key] = LANES.find((lane) => lane.key === key)?.defaultPattern ?? "0000";
  }
  const editSet = new Set(editable);
  const rows = LANES.map((lane) => `
    <div class="lbl ${editSet.has(lane.key) ? "edit" : ""}">${escapeHtml(lane.label)}</div>
    ${safeState[lane.key].split("").map((bit, index) => (
      `<button class="cell ${lane.group} ${bit === "1" ? "active" : ""} ${editSet.has(lane.key) ? "editable" : "locked"}" data-lane="${lane.key}" data-step="${index}" id="${lane.key}-${index}" ${editSet.has(lane.key) ? "" : "disabled"}></button>`
    )).join("")}`,
  ).join("");
  const scriptState = JSON.stringify(safeState).replace(/</g, "\\u003c");
  const scriptLanes = JSON.stringify(LANES.map(({ key, group, kind, freq, chord }) => ({ key, group, kind, freq, chord }))).replace(/</g, "\\u003c");
  const scriptEditable = JSON.stringify(editable).replace(/</g, "\\u003c");
  const nextStage = saveStage?.next ?? "complete";
  const composeText = saveStage ? (saveStage.next === "complete" ? "We finished a collaborative Farcaster loop 🎶" : saveStage.shareText) : "";
  const saveButton = saveStage ? `<button id="save" class="save">Save + share in Farcaster</button>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — Snap Wizard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at top,#271447,#08080b 55%);color:#f8fafc;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;gap:16px}h1{font-size:1.6rem;letter-spacing:-.04em;text-align:center}.sub{color:#c4b5fd;font-size:.9rem;text-align:center;max-width:520px}.grid{display:grid;grid-template-columns:96px repeat(4,minmax(42px,1fr));gap:7px;width:100%;max-width:540px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(9,9,11,.72);box-shadow:0 20px 80px rgba(0,0,0,.45)}.step{height:18px;color:#a1a1aa;text-align:center;font-size:.75rem;font-weight:800}.lbl{display:flex;align-items:center;color:#a1a1aa;font-size:.76rem;font-weight:800}.lbl.edit{color:#fff}.cell{height:39px;border:2px solid #27272a;border-radius:10px;background:#18181b;transition:all .08s ease}.cell.locked{opacity:.5}.cell.editable{cursor:pointer}.cell.editable:hover{border-color:#fff}.active.drums{background:#ef4444;border-color:#f87171}.active.bass{background:#8b5cf6;border-color:#a78bfa}.active.chords{background:#14b8a6;border-color:#2dd4bf}.active.lead{background:#f59e0b;border-color:#fbbf24}.hit{filter:brightness(1.9);transform:scale(.92)}.cursor{box-shadow:0 0 0 3px rgba(255,255,255,.28)}.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}button{border:0;border-radius:999px;padding:12px 20px;font-weight:900;background:#8b5cf6;color:white;cursor:pointer}.save{background:#22c55e}.on{background:#dc2626}.bpm{display:flex;gap:8px;align-items:center;color:#c4b5fd;font-size:.9rem}input{accent-color:#8b5cf6}.foot{color:#71717a;font-size:.78rem}.hint{color:#a1a1aa;font-size:.78rem;text-align:center;max-width:520px}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="sub">${escapeHtml(subtitle)}</p>
<div class="grid">
  <div></div><div class="step">1</div><div class="step">2</div><div class="step">3</div><div class="step">4</div>
  ${rows}
</div>
<div class="controls"><button id="play">▶ Play</button>${saveButton}<div class="bpm"><span id="bpmv">118 BPM</span><input id="bpm" type="range" min="70" max="180" value="118"></div></div>
<p class="hint">Audio plays here in the browser editor. The Farcaster snap stays visual and shareable.</p>
<p class="foot">snap wizard 🐢</p>
<script>
const P=${scriptState};
const LANES=${scriptLanes};
const EDITABLE=${scriptEditable};
let ac,playing=false,step=0,timer,bpm=118;
function init(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}
function env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);}
function noise(d){const n=Math.ceil(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;return b;}
function kick(t){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(36,t+.22);env(g,t,.01,.24,.9);o.start(t);o.stop(t+.28)}
function snare(t){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise(.14);f.type='bandpass';f.frequency.value=1600;s.connect(f);f.connect(g);g.connect(ac.destination);env(g,t,.005,.12,.38);s.start(t);s.stop(t+.16)}
function hat(t){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise(.045);f.type='highpass';f.frequency.value=6500;s.connect(f);f.connect(g);g.connect(ac.destination);env(g,t,.002,.04,.22);s.start(t);s.stop(t+.05)}
function tone(t,freq,dur,type,gain){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(ac.destination);env(g,t,.012,dur,gain);o.start(t);o.stop(t+dur+.04)}
function playLane(l,t){if(l.kind==='kick')kick(t);else if(l.kind==='snare')snare(t);else if(l.kind==='hat')hat(t);else if(l.kind==='bass')tone(t,l.freq,.28,'sawtooth',.32);else if(l.kind==='lead')tone(t,l.freq,.18,'square',.12);else if(l.kind==='chord')l.chord.forEach(f=>tone(t,f,.52,'triangle',.1));}
function syncPattern(k){let bits='';for(let i=0;i<4;i++)bits+=document.getElementById(k+'-'+i).classList.contains('active')?'1':'0';P[k]=bits;}
document.querySelectorAll('.cell.editable').forEach(el=>el.onclick=()=>{el.classList.toggle('active');syncPattern(el.dataset.lane)});
function interval(){return 60/bpm*1000/2}
document.getElementById('bpm').oninput=e=>{bpm=+e.target.value;document.getElementById('bpmv').textContent=bpm+' BPM';if(playing){clearInterval(timer);timer=setInterval(tick,interval())}};
document.getElementById('play').onclick=()=>{init();const b=document.getElementById('play');if(playing){clearInterval(timer);playing=false;step=0;b.textContent='▶ Play';b.classList.remove('on');clearCursor()}else{playing=true;b.textContent='■ Stop';b.classList.add('on');tick();timer=setInterval(tick,interval())}};
const save=document.getElementById('save');if(save)save.onclick=()=>{LANES.forEach(l=>syncPattern(l.key));const snap=new URL(location.origin+location.pathname.replace('/editor',''));snap.searchParams.set('stage','${nextStage}');LANES.forEach(l=>snap.searchParams.set(l.param,P[l.key]||'0000'));const compose=new URL('https://warpcast.com/~/compose');compose.searchParams.set('text','${escapeHtml(composeText)}');compose.searchParams.append('embeds[]',snap.toString());location.href=compose.toString();};
function clearCursor(){document.querySelectorAll('.cell').forEach(e=>e.classList.remove('cursor','hit'))}
function tick(){const now=ac.currentTime;clearCursor();LANES.forEach(l=>{const el=document.getElementById(l.key+'-'+step);if(el)el.classList.add('cursor');if((P[l.key]||'0000')[step]==='1'){playLane(l,now);if(el){el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),90)}}});step=(step+1)%4}
</script>
</body>
</html>`;
}

function buildSnapScreen(self: string, state: PatternState, stageId: StageId): SnapHandlerResult {
  const complete = stageId === "complete";
  const stage = complete ? null : STAGE_BY_ID[stageId];
  const loopUrl = patternUrl(self, state, stageId);
  const children = ["title", "subtitle", "patterns", "sep"];
  if (stage) children.push("add_btn");
  if (complete) children.push("listen_btn");
  children.push("share_btn");

  const elements: Record<string, object> = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children },
    title: { type: "text", props: { content: stage?.title ?? "Full track complete 🎶", weight: "bold", align: "center" } },
    subtitle: {
      type: "text",
      props: {
        content: stage?.subtitle ?? "Open the web player to hear the completed collaborative grid.",
        size: "sm",
        align: "center",
      },
    },
    patterns: { type: "item_group", props: {}, children: LANES.map((lane) => `${lane.key}_row`) },
    sep: { type: "separator", props: {} },
    share_btn: {
      type: "button",
      props: { label: stage?.shareLabel ?? "Share finished track", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: { text: stage?.shareText ?? "We built a collaborative Farcaster loop 🎶", embeds: [loopUrl] },
        },
      },
    },
  };

  if (stage) {
    elements.add_btn = {
      type: "button",
      props: { label: stage.addLabel, variant: "primary" },
      on: { press: { action: "open_url", params: { target: editorUrl(self, state, stage.id) } } },
    };
  } else {
    elements.listen_btn = {
      type: "button",
      props: { label: "Open web player", variant: "primary" },
      on: { press: { action: "open_url", params: { target: playerUrl(self, state) } } },
    };
  }

  for (const lane of LANES) {
    const pattern = cleanPattern(state[lane.key], "0000");
    elements[`${lane.key}_row`] = {
      type: "item",
      props: { title: lane.label, description: `${lane.short}: ${patternDisplay(pattern)}` },
    };
  }

  return { version: "1.0", theme: { accent: complete ? "teal" : "purple" }, ui: { root: "page", elements: elements as never } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);
  const stageId = stageFromUrl(reqUrl);
  const state = patternsFromUrl(reqUrl);

  if (ctx.action.type !== "get" && stageId !== "complete") {
    const inputs = ((ctx.action as { inputs?: Inputs }).inputs ?? {}) as Inputs;
    const stage = STAGE_BY_ID[stageId];
    return buildSnapScreen(self, mergeInputsForStage(state, stage, inputs), stage.next);
  }

  return buildSnapScreen(self, state, stageId);
});

export { cleanPattern, inputToPattern, patternToSteps, patternDisplay, stageFromUrl };
export default app;
