/**
 * beautiful-thing — mystery snap that reveals "the most beautiful thing
 * God ever created." One button. No hints. The reveal is the user's own face.
 *
 * Flow:
 *   GET /            → snap card with one button ("see it →") using open_url
 *   GET /reveal      → fullscreen HTML camera page (front-facing, no UI chrome)
 *
 * Components: text, button, stack
 * Actions: open_url, compose_cast
 * Accent: gray
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "beautiful-thing";

// ── Reveal page (HTML camera) — registered BEFORE snap handler ────────────

app.get("/reveal", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>✦</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:none}
#loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;opacity:.3;font-size:14px;font-family:system-ui,sans-serif;letter-spacing:.2em;transition:opacity .4s}
#loader.hidden{opacity:0;pointer-events:none}
#error{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;opacity:.5;font-size:13px;font-family:system-ui,sans-serif;text-align:center;line-height:1.6;display:none;max-width:260px}
</style>
</head>
<body>
<video id="cam" autoplay playsinline muted></video>
<div id="loader">✦</div>
<div id="error">beautiful things take a moment.<br>try again.</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var video = document.getElementById('cam');
  var loader = document.getElementById('loader');
  var error = document.getElementById('error');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    loader.classList.add('hidden');
    error.style.display = 'block';
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(function(stream) {
      video.srcObject = stream;
      video.style.display = 'block';
      loader.classList.add('hidden');
    })
    .catch(function() {
      loader.classList.add('hidden');
      error.style.display = 'block';
    });
});
</script>
</body>
</html>`;
  return c.html(html);
});

// ── Snap handler ──────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const revealUrl = `${self}/reveal`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "gray" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg", justify: "center" },
          children: ["title", "reveal_btn", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "There is something I need you to see.",
            align: "center",
          },
        },
        reveal_btn: {
          type: "button",
          props: { label: "see it →", variant: "primary" },
          on: {
            press: {
              action: "open_url",
              params: { target: revealUrl },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "the most beautiful thing",
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
