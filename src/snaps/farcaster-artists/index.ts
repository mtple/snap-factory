/**
 * farcaster-artists — Farcaster Artists Starter Pack.
 *
 * Cycles through a curated list of notable visual/digital artists on Farcaster,
 * one at a time. Each screen shows the artist's name, handle, and a short
 * description, with buttons to view their profile or advance to the next artist.
 *
 * Requested by @luciano during the Snaps event.
 *
 * Components: text, badge, button, stack
 * Actions:    open_url, submit, compose_cast
 * State:      URL query param ?i=N (index into artist list)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "farcaster-artists";

const artists = [
  {
    name: "Superr",
    handle: "superr",
    desc: "Illustrator and digital designer. Bold, colorful work that stops the scroll.",
  },
  {
    name: "Les",
    handle: "les",
    desc: "Digital and generative artist. Known for vibrant color and geometric form.",
  },
  {
    name: "Wake",
    handle: "wake",
    desc: "Generative art explorer. Algorithm-driven pieces with a distinctive visual voice.",
  },
  {
    name: "Quasimatt",
    handle: "quasimatt",
    desc: "Pixel art and digital illustration with a lo-fi retro feel.",
  },
  {
    name: "Jacopo",
    handle: "jacopo",
    desc: "Creative coder and generative artist. Math made beautiful.",
  },
  {
    name: "Zeneca",
    handle: "zeneca",
    desc: "On-chain art advocate, collector, and creator in the crypto art scene.",
  },
  {
    name: "0xen",
    handle: "0xen",
    desc: "On-chain art with an experimental edge. Always trying something new.",
  },
  {
    name: "September",
    handle: "september",
    desc: "Digital illustration and character design with rich color palettes.",
  },
  {
    name: "Gami",
    handle: "gami",
    desc: "On-chain artist and creative community builder on Farcaster.",
  },
  {
    name: "Xcelencia",
    handle: "xcelencia",
    desc: "Digital art exploring identity and culture. Distinct voice and style.",
  },
];

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // Read current index from URL query param (works for both GET and POST)
  const urlObj = new URL(ctx.request.url);
  const rawIdx = parseInt(urlObj.searchParams.get("i") ?? "0") || 0;
  const idx = Math.min(Math.max(rawIdx, 0), artists.length - 1);

  const artist = artists[idx];
  const nextIdx = (idx + 1) % artists.length;
  const nextLabel = nextIdx === 0 ? "Start over" : "Next →";
  const nextTarget = `${self}?i=${nextIdx}`;

  const progressLabel = `${idx + 1} / ${artists.length}`;
  const shareText = "discover farcaster artists — a curated starter pack 🎨";

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "header_row",
            "artist_name",
            "artist_handle",
            "artist_desc",
            "btn_row",
            "share_btn",
          ],
        },
        header_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm", justify: "between" },
          children: ["title", "progress_badge"],
        },
        title: {
          type: "text",
          props: { content: "Farcaster Artists", weight: "bold" },
        },
        progress_badge: {
          type: "badge",
          props: { label: progressLabel, variant: "outline" },
        },
        artist_name: {
          type: "text",
          props: { content: artist.name, weight: "bold", size: "md" },
        },
        artist_handle: {
          type: "text",
          props: { content: `@${artist.handle}`, size: "sm" },
        },
        artist_desc: {
          type: "text",
          props: { content: artist.desc },
        },
        btn_row: {
          type: "stack",
          props: { direction: "horizontal", gap: "sm" },
          children: ["view_btn", "next_btn"],
        },
        view_btn: {
          type: "button",
          props: { label: "View Profile", variant: "primary" },
          on: {
            press: {
              action: "open_url",
              params: { target: `https://warpcast.com/${artist.handle}` },
            },
          },
        },
        next_btn: {
          type: "button",
          props: { label: nextLabel, variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: nextTarget },
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
                text: shareText,
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
