/**
 * drum-machine — 4-track, 8-step beat sequencer
 *
 * Shows a 4×8 cell_grid (rows = Kick, Snare, Hi-hat, Clap; cols = 8 steps).
 * State is encoded as a 32-bit hex string in the submit target URL — stateless.
 *
 * Flow:
 *   GET / POST ?mode=edit  → edit view: grid + "Apply Beats" + "Play →" + "Clear"
 *   POST ?mode=play        → ready view: updated grid + "▶ Open Player" (open_url) + "Edit"
 *
 * Fixes:
 *   - All 32 cells are always rendered (gray = inactive, colored = active)
 *   - "Play →" goes through a server submit so the hex is always current
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

// ── Constants ────────────────────────────────────────────────────────────────

const ROWS = 4;
const COLS = 8;
const ROW_COLORS = ["red", "blue", "amber", "green"] as const;
type RowColor = (typeof ROW_COLORS)[number];

const ROW_LABELS = ["Kick", "Snare", "Hi-hat", "Clap"];

// ── State helpers ─────────────────────────────────────────────────────────────

function isCellOn(state: number, row: number, col: number): boolean {
  return Boolean((state >>> (row * COLS + col)) & 1);
}

function stateToHex(state: number): string {
  return (state >>> 0).toString(16).padStart(8, "0");
}

/**
 * Builds the full 32-cell array for cell_grid.
 * Inactive cells use "gray" so the grid structure is always visible.
 */
function buildCells(
  state: number,
): Array<{ row: number; col: number; color: RowColor | "gray" }> {
  const cells: Array<{ row: number; col: number; color: RowColor | "gray" }> =
    [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({
        row: r,
        col: c,
        color: isCellOn(state, r, c) ? ROW_COLORS[r] : "gray",
      });
    }
  }
  return cells;
}

function parseSelection(raw: unknown): Array<[number, number]> {
  if (typeof raw !== "string" || !raw) return [];
  return raw
    .split("|")
    .map((s) => {
      const parts = s.split(",");
      return [
        parseInt(parts[0] ?? "", 10),
        parseInt(parts[1] ?? "", 10),
      ] as [number, number];
    })
    .filter(
      ([r, c]) =>
        Number.isFinite(r) &&
        Number.isFinite(c) &&
        r >= 0 &&
        r < ROWS &&
        c >= 0 &&
        c < COLS,
    );
}

// ── Play page (HTML + Web Audio) ─────────────────────────────────────────────

app.get("/play", (c) => {
  const patHex = c.req.query("p") ?? "00000000";
  const state = (parseInt(patHex, 16) || 0) >>> 0;

  const grid: boolean[][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, col) => isCellOn(state, r, col)),
  );

  const rowCss = ["#ef4444", "#3b82f6", "#f59e0b", "#22c55e"];
  const stepNums = Array.from(
    { length: COLS },
    (_, i) => `<div class="sn">${i + 1}</div>`,
  ).join("");

  const gridHtml = grid
    .map((row, r) => {
      const label = `<div class="rl" style="color:${rowCss[r]}">${ROW_LABELS[r]}</div>`;
      const beats = row
        .map(
          (on, col) =>
            `<div class="bc${on ? " on" : ""}" data-r="${r}" data-c="${col}" style="${on ? `background:${rowCss[r]};border-color:${rowCss[r]}` : ""}"></div>`,
        )
        .join("");
      return `<div class="dr">${label}${beats}</div>`;
    })
    .join("");

  const isEmpty = state === 0;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Drum Machine — Snap Wizard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f172a;color:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.wrap{max-width:400px;width:100%}
h1{font-size:20px;font-weight:700;margin-bottom:2px}
.sub{font-size:11px;color:#475569;font-family:monospace;margin-bottom:18px}
.sn-row{display:flex;gap:4px;margin-bottom:4px;padding-left:52px}
.sn{width:30px;text-align:center;font-size:9px;color:#475569}
.dr{display:flex;align-items:center;gap:4px;margin-bottom:4px}
.rl{width:44px;font-size:10px;font-weight:600;flex-shrink:0;text-align:right;padding-right:4px}
.bc{width:30px;height:30px;border-radius:4px;background:#1e293b;border:2px solid #334155;transition:border-color .08s}
.bc.on{opacity:1}
.bc:not(.on){opacity:.22}
.bc.cur{border-color:#fff!important;transform:scale(1.12);opacity:1!important}
.controls{margin-top:18px;display:flex;flex-direction:column;gap:10px}
.brow{display:flex;align-items:center;gap:10px}
.bl{font-size:11px;color:#64748b;width:28px}
input[type=range]{flex:1;accent-color:#7c3aed}
.bv{font-size:11px;color:#e2e8f0;width:56px;text-align:right}
.pbtn{width:100%;padding:12px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:.02em}
.pbtn:hover{background:#6d28d9}
.pbtn.on{background:#dc2626}
.pbtn.on:hover{background:#b91c1c}
.hint{font-size:11px;color:#475569;text-align:center;margin-top:8px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Drum Machine</h1>
  <div class="sub">${isEmpty ? "empty pattern — go back and build one" : patHex}</div>
  <div class="sn-row">${stepNums}</div>
  <div id="grid">${gridHtml}</div>
  <div class="controls">
    <div class="brow">
      <span class="bl">BPM</span>
      <input type="range" id="bsl" min="60" max="200" value="120">
      <span class="bv" id="bv">120 BPM</span>
    </div>
    <button class="pbtn" id="pbtn">&#9654; Play</button>
  </div>
  <div class="hint">built with Snap Wizard 🐢</div>
</div>
<script>
const GRID=${JSON.stringify(grid)};
let ctx=null,playing=false,step=0,nxt=0,tid=null,bpm=120;
document.getElementById('bsl').oninput=function(){bpm=+this.value;document.getElementById('bv').textContent=bpm+' BPM';};
function si(){return 60/bpm/2}
function noise(c,dur){const n=Math.ceil(c.sampleRate*dur),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return b;}
function kick(c,t){const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.setValueAtTime(155,t);o.frequency.exponentialRampToValueAtTime(0.01,t+0.28);g.gain.setValueAtTime(1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.28);o.start(t);o.stop(t+0.32);}
function snare(c,t){const b=noise(c,.16),s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.55,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);s.start(t);s.stop(t+.18);}
function hihat(c,t){const b=noise(c,.04),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='highpass';f.frequency.value=7000;s.connect(f);f.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.28,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);s.start(t);s.stop(t+.05);}
function clap(c,t){for(let i=0;i<3;i++){const b=noise(c,.04),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=1100;s.connect(f);f.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.38,t+i*.012);g.gain.exponentialRampToValueAtTime(.001,t+i*.012+.04);s.start(t+i*.012);s.stop(t+i*.012+.05);}}
const SND=[kick,snare,hihat,clap];
let sched=[];
function doStep(s,t){for(let r=0;r<4;r++)if(GRID[r][s])SND[r](ctx,t);sched.push({s,t});}
function raf(){
  if(!playing)return;
  const now=ctx.currentTime;
  const cur=sched.filter(x=>x.t<=now+si()*.5&&x.t>now-si()).map(x=>x.s);
  document.querySelectorAll('.bc').forEach(el=>{
    const c=+el.dataset.c;el.classList.toggle('cur',cur.includes(c));
  });
  sched=sched.filter(x=>x.t>now-.2);
  requestAnimationFrame(raf);
}
function sched_loop(){
  while(nxt<ctx.currentTime+.1){doStep(step,nxt);step=(step+1)%8;nxt+=si();}
  tid=setTimeout(sched_loop,25);
}
function toggle(){
  if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();
  const b=document.getElementById('pbtn');
  ctx.resume().then(function(){
    playing=!playing;
    if(playing){step=0;nxt=ctx.currentTime+.05;sched_loop();requestAnimationFrame(raf);b.innerHTML='&#9632; Stop';b.classList.add('on');}
    else{clearTimeout(tid);b.innerHTML='&#9654; Play';b.classList.remove('on');}
  });
}
document.getElementById('pbtn').onclick=toggle;
</script>
</body>
</html>`;

  return c.html(html);
});

// ── Snap handler ──────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "drum-machine");
  const reqUrl = new URL(ctx.request.url);

  let state = 0;
  const mode = reqUrl.searchParams.get("mode") ?? "edit";

  if (ctx.action.type === "post") {
    const isClear = reqUrl.searchParams.get("clear") === "1";
    if (isClear) {
      state = 0;
    } else {
      const hexParam = reqUrl.searchParams.get("s") ?? "00000000";
      state = (parseInt(hexParam, 16) || 0) >>> 0;
      const rawSel = (ctx.action.inputs as Record<string, unknown>)?.[
        "grid_tap"
      ];
      for (const [r, c] of parseSelection(rawSel)) {
        const bit = r * COLS + c;
        state = (state ^ (1 << bit)) >>> 0;
      }
    }
  }

  const hex = stateToHex(state);
  const cells = buildCells(state);
  const activeCount = cells.filter((c) => c.color !== "gray").length;

  // ── Play-ready screen ─────────────────────────────────────────────────────
  if (mode === "play" && ctx.action.type === "post") {
    const playTarget = `${self}/play?p=${hex}`;
    const editTarget = `${self}?s=${hex}&mode=edit`;

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "sm" },
            children: ["title", "grid", "status", "play_btn", "edit_btn"],
          },
          title: {
            type: "text",
            props: { content: "Drum Machine", weight: "bold" },
          },
          grid: {
            type: "cell_grid",
            props: { cols: COLS, rows: ROWS, rowHeight: 28, cells, select: "off" },
          },
          status: {
            type: "text",
            props: {
              content:
                activeCount > 0
                  ? `${activeCount} beat${activeCount !== 1 ? "s" : ""} set — open in browser to play`
                  : "No beats set yet — go back and tap some cells",
              size: "sm",
            },
          },
          play_btn: {
            type: "button",
            props: { label: "▶ Open Player", variant: "primary" },
            on: { press: { action: "open_url", params: { target: playTarget } } },
          },
          edit_btn: {
            type: "button",
            props: { label: "← Edit Pattern", variant: "secondary" },
            on: {
              press: { action: "submit", params: { target: editTarget } },
            },
          },
        },
      },
    };
    return response;
  }

  // ── Edit screen ───────────────────────────────────────────────────────────
  const applyTarget = `${self}?s=${hex}&mode=edit`;
  const playSubmitTarget = `${self}?s=${hex}&mode=play`;
  const clearTarget = `${self}?clear=1&mode=edit`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: ["title", "subtitle", "grid", "action_row", "play_btn"],
        },
        title: {
          type: "text",
          props: { content: "Drum Machine", weight: "bold" },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Kick · Snare · Hi-hat · Clap — tap cells, hit Apply",
            size: "sm",
          },
        },
        grid: {
          type: "cell_grid",
          props: {
            cols: COLS,
            rows: ROWS,
            rowHeight: 28,
            cells,
            select: "multiple",
          },
        },
        action_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["apply_btn", "clear_btn"],
        },
        apply_btn: {
          type: "button",
          props: { label: "Apply Beats", variant: "secondary" },
          on: { press: { action: "submit", params: { target: applyTarget } } },
        },
        clear_btn: {
          type: "button",
          props: { label: "Clear", variant: "secondary" },
          on: { press: { action: "submit", params: { target: clearTarget } } },
        },
        play_btn: {
          type: "button",
          props: { label: "Play →", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: playSubmitTarget } },
          },
        },
      },
    },
  };

  return response;
});

export default app;
