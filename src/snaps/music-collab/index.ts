/**
 * music-collab — Collaborative grid sequencer for Farcaster.
 *
 * Build a 4-step sequence across drums + melodic parts in AUI, then open a
 * Web Audio player or pass the encoded pattern to collaborators.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "music-collab";
const STEPS = ["1", "2", "3", "4"] as const;
const PATTERN_LEN = 4;

type Inputs = Record<string, string | string[] | undefined>;
type TrackKey = "kick" | "snare" | "hat" | "bass" | "chord" | "lead";

interface TrackDef {
  key: TrackKey;
  param: string;
  label: string;
  short: string;
  color: "red" | "blue" | "green" | "yellow" | "purple" | "teal";
  defaultPattern: string;
}

const TRACKS: TrackDef[] = [
  { key: "kick", param: "k", label: "Kick", short: "K", color: "red", defaultPattern: "1001" },
  { key: "snare", param: "s", label: "Snare", short: "S", color: "blue", defaultPattern: "0100" },
  { key: "hat", param: "h", label: "Hi-hat", short: "H", color: "green", defaultPattern: "1111" },
  { key: "bass", param: "b", label: "Bass", short: "B", color: "purple", defaultPattern: "1010" },
  { key: "chord", param: "ch", label: "Chords", short: "C", color: "teal", defaultPattern: "0101" },
  { key: "lead", param: "l", label: "Lead", short: "L", color: "yellow", defaultPattern: "0010" },
];

type PatternState = Record<TrackKey, string>;

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

function defaults(): PatternState {
  return Object.fromEntries(TRACKS.map((track) => [track.key, track.defaultPattern])) as PatternState;
}

function patternsFromUrl(url: URL): PatternState {
  return Object.fromEntries(
    TRACKS.map((track) => [
      track.key,
      cleanPattern(url.searchParams.get(track.param), track.defaultPattern),
    ]),
  ) as PatternState;
}

function patternsFromInputs(inputs: Inputs): PatternState {
  const next = Object.fromEntries(
    TRACKS.map((track) => [track.key, inputToPattern(inputs[track.key])]),
  ) as PatternState;

  const hasAnyNote = Object.values(next).some((pattern) => pattern.includes("1"));
  return hasAnyNote ? next : defaults();
}

function patternUrl(self: string, state: PatternState): string {
  const url = new URL(self);
  for (const track of TRACKS) {
    url.searchParams.set(track.param, state[track.key]);
  }
  return url.toString();
}

function playerUrl(self: string, state: PatternState): string {
  const url = new URL(`${self}/player`);
  for (const track of TRACKS) {
    url.searchParams.set(track.param, state[track.key]);
  }
  return url.toString();
}

function hasPatternParams(url: URL): boolean {
  return TRACKS.some((track) => url.searchParams.has(track.param));
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
    TRACKS.map((track) => [track.key, cleanPattern(state[track.key], track.defaultPattern)]),
  ) as PatternState;
  const rows = TRACKS.map((track) => `
    <div class="lbl">${escapeHtml(track.label)}</div>
    ${safeState[track.key].split("").map((bit, index) => (
      `<div class="cell ${track.key} ${bit === "1" ? "active" : ""}" id="${track.key}-${index}"></div>`
    )).join("")}`,
  ).join("");
  const scriptState = JSON.stringify(safeState).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Music Collab — Snap Wizard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#09090b;color:#f8fafc;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:18px}
h1{font-size:1.65rem;letter-spacing:-.03em}.sub{color:#94a3b8;font-size:.9rem;text-align:center}.grid{display:grid;grid-template-columns:74px repeat(4,minmax(42px,1fr));gap:8px;width:100%;max-width:470px}.step{height:18px;color:#64748b;text-align:center;font-size:.75rem;font-weight:700}.lbl{display:flex;align-items:center;color:#cbd5e1;font-size:.82rem;font-weight:700}.cell{height:48px;border:2px solid #27272a;border-radius:10px;background:#18181b;transition:all .08s ease}.active.kick{background:#ef4444;border-color:#f87171}.active.snare{background:#3b82f6;border-color:#60a5fa}.active.hat{background:#22c55e;border-color:#4ade80}.active.bass{background:#8b5cf6;border-color:#a78bfa}.active.chord{background:#14b8a6;border-color:#2dd4bf}.active.lead{background:#f59e0b;border-color:#fbbf24}.hit{filter:brightness(1.9);transform:scale(.92)}.cursor{box-shadow:0 0 0 3px rgba(255,255,255,.22)}.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}button{border:0;border-radius:999px;padding:12px 24px;font-weight:800;background:#8b5cf6;color:white;cursor:pointer}button.on{background:#dc2626}.bpm{display:flex;gap:8px;align-items:center;color:#94a3b8;font-size:.9rem}input{accent-color:#8b5cf6}.foot{color:#52525b;font-size:.78rem}
</style>
</head>
<body>
<h1>Music Collab</h1>
<p class="sub">Sequenced in a Farcaster snap — drums, bass, chords, lead.</p>
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
const TRACKS=${JSON.stringify(TRACKS.map(({ key }) => key))};
let ac,playing=false,step=0,timer,bpm=118;
const scale=[130.81,146.83,164.81,196.00];
function init(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}
function env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);}
function noise(d){const n=Math.ceil(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;return b;}
function kick(t){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(36,t+.22);env(g,t,.01,.24,.9);o.start(t);o.stop(t+.28)}
function snare(t){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise(.14);f.type='bandpass';f.frequency.value=1600;s.connect(f);f.connect(g);g.connect(ac.destination);env(g,t,.005,.12,.38);s.start(t);s.stop(t+.16)}
function hat(t){const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise(.045);f.type='highpass';f.frequency.value=6500;s.connect(f);f.connect(g);g.connect(ac.destination);env(g,t,.002,.04,.22);s.start(t);s.stop(t+.05)}
function tone(t,freq,dur,type,gain){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(ac.destination);env(g,t,.012,dur,gain);o.start(t);o.stop(t+dur+.04)}
function bass(t,i){tone(t,scale[i]/2,.28,'sawtooth',.34)}
function chord(t,i){[0,2,4].forEach((off)=>tone(t,scale[(i+off)%4],.52,'triangle',.12))}
function lead(t,i){tone(t,scale[(i+1)%4]*2,.2,'square',.13)}
const SYN={kick,snare,hat,bass,chord,lead};
function interval(){return 60/bpm*1000/2}
document.getElementById('bpm').oninput=e=>{bpm=+e.target.value;document.getElementById('bpmv').textContent=bpm+' BPM';if(playing){clearInterval(timer);timer=setInterval(tick,interval())}};
document.getElementById('play').onclick=()=>{init();const b=document.getElementById('play');if(playing){clearInterval(timer);playing=false;step=0;b.textContent='▶ Play';b.classList.remove('on');clearCursor()}else{playing=true;b.textContent='■ Stop';b.classList.add('on');tick();timer=setInterval(tick,interval())}};
function clearCursor(){document.querySelectorAll('.cell').forEach(e=>e.classList.remove('cursor','hit'))}
function tick(){const now=ac.currentTime;clearCursor();TRACKS.forEach(k=>{const el=document.getElementById(k+'-'+step);if(el)el.classList.add('cursor');if(P[k][step]==='1'){SYN[k](now,step);if(el){el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),90)}}});step=(step+1)%4}
</script>
</body>
</html>`;
}

function buildSequencerScreen(self: string, state: PatternState, hasSeed = false): SnapHandlerResult {
  const children = ["title", "subtitle", "sep", ...TRACKS.map((track) => `${track.key}_grid`), "make_btn", "share_btn"];
  const elements: Record<string, object> = {
    page: { type: "stack", props: { direction: "vertical", gap: "sm" }, children },
    title: { type: "text", props: { content: "Music Collab Grid 🎛️", weight: "bold", align: "center" } },
    subtitle: {
      type: "text",
      props: {
        content: hasSeed ? "Remix the shared 4-step loop, then play/pass it." : "Program each instrument on the 4-step grid.",
        size: "sm",
        align: "center",
      },
    },
    sep: { type: "separator", props: {} },
    make_btn: {
      type: "button",
      props: { label: "Build the loop", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: {
      type: "button",
      props: { label: "Share starter", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: { text: "help sequence this Farcaster track 🎛️", embeds: [patternUrl(self, state)] },
        },
      },
    },
  };

  for (const track of TRACKS) {
    elements[`${track.key}_grid`] = {
      type: "toggle_group",
      props: {
        name: track.key,
        label: track.label,
        options: [...STEPS],
        orientation: "horizontal",
        variant: "outline",
        multiple: true,
        defaultValue: patternToSteps(state[track.key]),
      },
    };
  }

  return { version: "1.0", theme: { accent: "purple" }, ui: { root: "page", elements: elements as never } };
}

function buildResultScreen(self: string, state: PatternState): SnapHandlerResult {
  const loopUrl = patternUrl(self, state);
  const listenUrl = playerUrl(self, state);
  const elements: Record<string, object> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "subtitle", "patterns", "sep", "listen_btn", "remix_btn", "pass_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Loop programmed 🎶", weight: "bold", align: "center" } },
    subtitle: { type: "text", props: { content: "Open the synth player, or pass this pattern for a remix.", size: "sm", align: "center" } },
    patterns: { type: "item_group", props: {}, children: TRACKS.map((track) => `${track.key}_row`) },
    sep: { type: "separator", props: {} },
    listen_btn: {
      type: "button",
      props: { label: "Open music player", variant: "primary" },
      on: { press: { action: "open_url", params: { target: listenUrl } } },
    },
    remix_btn: {
      type: "button",
      props: { label: "Remix this grid", variant: "secondary" },
      on: { press: { action: "submit", params: { target: loopUrl } } },
    },
    pass_btn: {
      type: "button",
      props: { label: "Pass to collaborator", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: { text: "I sequenced a loop — add a part or remix it 🎛️", embeds: [loopUrl] },
        },
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share track", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: { text: "built a collaborative Farcaster loop 🎶", embeds: [loopUrl] },
        },
      },
    },
  };

  for (const track of TRACKS) {
    elements[`${track.key}_row`] = {
      type: "item",
      props: { title: track.label, description: `${track.short}: ${patternDisplay(state[track.key])}` },
    };
  }

  return { version: "1.0", theme: { accent: "teal" }, ui: { root: "page", elements: elements as never } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const reqUrl = new URL(ctx.request.url);

  if (ctx.action.type === "get") {
    const state = patternsFromUrl(reqUrl);
    return buildSequencerScreen(self, state, hasPatternParams(reqUrl));
  }

  const inputs = ((ctx.action as { inputs?: Inputs }).inputs ?? {}) as Inputs;
  return buildResultScreen(self, patternsFromInputs(inputs));
});

export { cleanPattern, inputToPattern, patternToSteps, patternDisplay };
export default app;
