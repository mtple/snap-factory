/**
 * drum-machine — Build a 4-step beat in Farcaster, then play it in your browser.
 *
 * GET:     Show beat builder with 4 multi-select toggle_groups
 *          (Kick, Snare, Hi-hat, Clap), each with 4 step slots.
 *          Defaults to a classic rock beat so there's always something to hear.
 * POST:    Encode the selected steps as a binary string per instrument,
 *          build a player URL, and return a "Play in browser" open_url button.
 * /player: Serve a standalone HTML + Web Audio page that plays the beat.
 *
 * Components: toggle_group (multiple), text, button, item, item_group,
 *             separator, stack
 * Actions:    submit, open_url, compose_cast
 * State:      stateless — pattern lives in the query string
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "drum-machine";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Inputs = Record<string, string | string[] | undefined>;

/** Convert a toggle_group multi-select result to a 4-char binary string. */
function toBinary(selected: string | string[] | undefined): string {
  if (!selected) return "0000";
  const arr = Array.isArray(selected) ? selected : [selected];
  return ["1", "2", "3", "4"].map(step => arr.includes(step) ? "1" : "0").join("");
}

/** Convert binary string to a dot-display: "1010" → "●  ·  ●  ·" */
function toDisplay(pattern: string): string {
  return pattern.split("").map(b => b === "1" ? "●" : "·").join("  ");
}

// ── HTML player — served at /player?k=&s=&h=&c= ───────────────────────────────
// Registered before registerSnapHandler so Hono routes it first.
app.get("/player", (c) => {
  const clean = (v: string | undefined) =>
    (v ?? "0000").replace(/[^01]/g, "0").padEnd(4, "0").slice(0, 4);
  const k  = clean(c.req.query("k"));
  const s  = clean(c.req.query("s"));
  const h  = clean(c.req.query("h"));
  const cl = clean(c.req.query("c"));
  return c.html(buildPlayerHtml(k, s, h, cl));
});

function buildPlayerHtml(k: string, s: string, h: string, cl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Drum Machine — Snap Wizard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d0d0d;color:#f0f0f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:1.5rem}
h1{font-size:1.5rem}
.sub{color:#555;font-size:.85rem}
.grid{display:grid;grid-template-columns:56px repeat(4,1fr);gap:8px;width:100%;max-width:380px}
.lbl{display:flex;align-items:center;font-size:.8rem;font-weight:600;color:#888}
.cell{height:52px;border-radius:8px;border:2px solid #222;background:#1a1a1a;transition:all .08s ease}
.active.kick{background:#ef4444;border-color:#ef4444}
.active.snare{background:#3b82f6;border-color:#3b82f6}
.active.hihat{background:#10b981;border-color:#10b981}
.active.clap{background:#f59e0b;border-color:#f59e0b}
.flash{opacity:.35!important;transform:scale(.9)}
.dot-row{grid-column:2/-1;display:flex;gap:8px;justify-content:space-around;padding:4px 0}
.dot{width:10px;height:10px;border-radius:50%;background:#222;transition:background .06s}
.dot.lit{background:#8b5cf6}
.controls{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;justify-content:center}
#pb{padding:.7rem 2rem;border-radius:8px;border:none;cursor:pointer;font-size:1rem;font-weight:600;background:#8b5cf6;color:#fff;transition:opacity .15s}
#pb:hover{opacity:.85}
#pb.on{background:#dc2626}
.bpm{display:flex;align-items:center;gap:.5rem;color:#666;font-size:.9rem}
input[type=range]{width:90px;accent-color:#8b5cf6}
.foot{color:#333;font-size:.75rem}
</style>
</head>
<body>
<h1>Drum Machine</h1>
<p class="sub">Built with Snap Wizard on Farcaster</p>
<div class="grid">
  <div></div>
  <div class="dot-row">
    <div class="dot" id="d0"></div><div class="dot" id="d1"></div>
    <div class="dot" id="d2"></div><div class="dot" id="d3"></div>
  </div>
  <div class="lbl">Kick</div>
  <div class="cell kick ${k[0]==='1'?'active':''}" id="k0"></div>
  <div class="cell kick ${k[1]==='1'?'active':''}" id="k1"></div>
  <div class="cell kick ${k[2]==='1'?'active':''}" id="k2"></div>
  <div class="cell kick ${k[3]==='1'?'active':''}" id="k3"></div>
  <div class="lbl">Snare</div>
  <div class="cell snare ${s[0]==='1'?'active':''}" id="s0"></div>
  <div class="cell snare ${s[1]==='1'?'active':''}" id="s1"></div>
  <div class="cell snare ${s[2]==='1'?'active':''}" id="s2"></div>
  <div class="cell snare ${s[3]==='1'?'active':''}" id="s3"></div>
  <div class="lbl">Hi-hat</div>
  <div class="cell hihat ${h[0]==='1'?'active':''}" id="h0"></div>
  <div class="cell hihat ${h[1]==='1'?'active':''}" id="h1"></div>
  <div class="cell hihat ${h[2]==='1'?'active':''}" id="h2"></div>
  <div class="cell hihat ${h[3]==='1'?'active':''}" id="h3"></div>
  <div class="lbl">Clap</div>
  <div class="cell clap ${cl[0]==='1'?'active':''}" id="c0"></div>
  <div class="cell clap ${cl[1]==='1'?'active':''}" id="c1"></div>
  <div class="cell clap ${cl[2]==='1'?'active':''}" id="c2"></div>
  <div class="cell clap ${cl[3]==='1'?'active':''}" id="c3"></div>
</div>
<div class="controls">
  <button id="pb">&#9654; Play</button>
  <div class="bpm">
    <span id="bv">120 BPM</span>
    <input type="range" id="bs" min="60" max="200" value="120">
  </div>
</div>
<p class="foot">snap wizard 🐢</p>
<script>
var P={k:"${k}",s:"${s}",h:"${h}",c:"${cl}"};
var ac=null,play=false,cur=0,tid=null,bpm=120;
function ms(){return 60/bpm*1000;}
document.getElementById('bs').oninput=function(){bpm=+this.value;document.getElementById('bv').textContent=bpm+' BPM';if(play){clearInterval(tid);tid=setInterval(tick,ms());}};
document.getElementById('pb').onclick=tog;
function ea(){if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();}
function nb(d){var n=Math.ceil(ac.sampleRate*d),b=ac.createBuffer(1,n,ac.sampleRate),dd=b.getChannelData(0);for(var i=0;i<n;i++)dd[i]=Math.random()*2-1;return b;}
function kick(t){var o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(0.01,t+0.3);g.gain.setValueAtTime(1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.3);o.start(t);o.stop(t+0.35);}
function snare(t){var s=ac.createBufferSource(),g=ac.createGain();s.buffer=nb(0.16);s.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(0.6,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.16);s.start(t);s.stop(t+0.18);}
function hihat(t){var s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb(0.04);f.type='highpass';f.frequency.value=7000;s.connect(f);f.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.04);s.start(t);s.stop(t+0.05);}
function clap(t){for(var i=0;i<3;i++){var s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=nb(0.04);f.type='bandpass';f.frequency.value=1100;s.connect(f);f.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(0.4,t+i*0.013);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.013+0.04);s.start(t+i*0.013);s.stop(t+i*0.013+0.05);}}
var SND={k:kick,s:snare,h:hihat,c:clap};
var TRS=['k','s','h','c'];
function tick(){
  var now=ac.currentTime;
  TRS.forEach(function(tr){if(P[tr][cur]==='1')SND[tr](now);});
  TRS.forEach(function(tr){var el=document.getElementById(tr+cur);if(el&&el.classList.contains('active')){el.classList.add('flash');setTimeout(function(){el.classList.remove('flash');},80);}});
  for(var i=0;i<4;i++)document.getElementById('d'+i).classList.toggle('lit',i===cur);
  cur=(cur+1)%4;
}
function tog(){
  ea();
  var b=document.getElementById('pb');
  if(play){
    clearInterval(tid);play=false;cur=0;
    b.innerHTML='&#9654; Play';b.classList.remove('on');
    for(var i=0;i<4;i++)document.getElementById('d'+i).classList.remove('lit');
  } else {
    play=true;b.innerHTML='&#9632; Stop';b.classList.add('on');
    tick();tid=setInterval(tick,ms());
  }
}
</script>
</body>
</html>`;
}

// ── Snap handler ──────────────────────────────────────────────────────────────

function buildPickerScreen(self: string): SnapHandlerResult {
  return {
    version: "1.0",
    theme: { accent: "green" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title", "subtitle",
            "kick_g", "snare_g", "hihat_g", "clap_g",
            "play_btn", "share_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: "Drum Machine", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Pick steps for each drum, then hit Play",
            size: "sm",
            align: "center",
          },
        },
        kick_g: {
          type: "toggle_group",
          props: {
            name: "kick",
            label: "Kick",
            options: ["1", "2", "3", "4"],
            orientation: "horizontal",
            variant: "outline",
            multiple: true,
            defaultValue: ["1", "3"],
          },
        },
        snare_g: {
          type: "toggle_group",
          props: {
            name: "snare",
            label: "Snare",
            options: ["1", "2", "3", "4"],
            orientation: "horizontal",
            variant: "outline",
            multiple: true,
            defaultValue: ["2", "4"],
          },
        },
        hihat_g: {
          type: "toggle_group",
          props: {
            name: "hihat",
            label: "Hi-hat",
            options: ["1", "2", "3", "4"],
            orientation: "horizontal",
            variant: "outline",
            multiple: true,
            defaultValue: ["1", "2", "3", "4"],
          },
        },
        clap_g: {
          type: "toggle_group",
          props: {
            name: "clap",
            label: "Clap",
            options: ["1", "2", "3", "4"],
            orientation: "horizontal",
            variant: "outline",
            multiple: true,
            defaultValue: ["4"],
          },
        },
        play_btn: {
          type: "button",
          props: { label: "Play beat", variant: "primary" },
          on: {
            press: { action: "submit", params: { target: self } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "build a drum beat in Farcaster 🥁",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  if (ctx.action.type === "get") {
    return buildPickerScreen(self);
  }

  // POST: encode the selected steps and show the play screen
  const inputs = ctx.action.inputs as Inputs;
  const k  = toBinary(inputs.kick);
  const s  = toBinary(inputs.snare);
  const h  = toBinary(inputs.hihat);
  const cl = toBinary(inputs.clap);

  // Fall back to a classic rock beat if nothing was selected
  const hasBeat = [k, s, h, cl].some(p => p.includes("1"));
  const fK  = hasBeat ? k  : "1010";
  const fS  = hasBeat ? s  : "0101";
  const fH  = hasBeat ? h  : "1111";
  const fCl = hasBeat ? cl : "0001";

  const playerUrl = `${self}/player?k=${fK}&s=${fS}&h=${fH}&c=${fCl}`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "green" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title", "subtitle",
            "pattern_group",
            "sep",
            "listen_btn", "reset_btn", "share_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: "Your beat 🥁", weight: "bold", align: "center" },
        },
        subtitle: {
          type: "text",
          props: {
            content: "Open in your browser to hear it play",
            size: "sm",
            align: "center",
          },
        },
        pattern_group: {
          type: "item_group",
          props: {},
          children: ["kick_row", "snare_row", "hihat_row", "clap_row"],
        },
        kick_row: {
          type: "item",
          props: { title: "Kick", description: toDisplay(fK) },
        },
        snare_row: {
          type: "item",
          props: { title: "Snare", description: toDisplay(fS) },
        },
        hihat_row: {
          type: "item",
          props: { title: "Hi-hat", description: toDisplay(fH) },
        },
        clap_row: {
          type: "item",
          props: { title: "Clap", description: toDisplay(fCl) },
        },
        sep: {
          type: "separator",
          props: {},
        },
        listen_btn: {
          type: "button",
          props: { label: "Open player in browser", variant: "primary" },
          on: {
            press: { action: "open_url", params: { target: playerUrl } },
          },
        },
        reset_btn: {
          type: "button",
          props: { label: "Build another beat", variant: "secondary" },
          on: {
            press: { action: "submit", params: { target: self } },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "built a drum beat with snap wizard 🥁",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
