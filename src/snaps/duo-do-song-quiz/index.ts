/**
 * duo-do-song-quiz — "Which Dúo Dø song are you?"
 *
 * A 3-page mood quiz that matches the user to a song from Dúo Dø's
 * catalog on Tortoise, based on their current vibe.
 *
 * Page 1 (GET):  Welcome + "Tell me" button
 * Page 2 (POST): Mood question (toggle_group)
 * Page 3 (POST): Song result + "Listen on Tortoise" button (open_url)
 *
 * Components: text, button, toggle_group, separator
 * Actions:    submit, open_url
 * State:      none (stateless — result derived from FID + mood selection)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

interface Song {
  name: string;
  tagline: string;
  url: string;
}

// Songs grouped by mood.
const BY_MOOD: Record<string, Song[]> = {
  hopeful: [
    {
      name: "Juro que…",
      tagline: "community · love · care",
      url: "https://tortoise.studio/song/juro-que",
    },
    {
      name: "Juro que… (Acoustic)",
      tagline: "friendship · sensitivity · grateful",
      url: "https://tortoise.studio/song/juro-que-acoustic",
    },
    {
      name: "Amarillo",
      tagline: "love · bravery",
      url: "https://tortoise.studio/song/amarillo",
    },
    {
      name: "Caminando",
      tagline: "healing · love · patience",
      url: "https://tortoise.studio?id=6261a354-ff3b-456a-b8f6-141d41b8b729",
    },
    {
      name: "Mientras no salga el sol",
      tagline: "happy · love · bright",
      url: "https://tortoise.studio?id=d8b174cf-826a-4e16-977f-745054206516",
    },
  ],
  melancholic: [
    {
      name: "Palomas y Cordajes",
      tagline: "melancholy · nostalgic · sensual",
      url: "https://tortoise.studio/song/palomas-y-cordajes",
    },
    {
      name: "Palomas y Cordajes (Acoustic)",
      tagline: "heartbreak · sensual · elegant",
      url: "https://tortoise.studio/song/palomas-y-cordajes-acoustic",
    },
    {
      name: "Fire",
      tagline: "dark · melancholy",
      url: "https://tortoise.studio/song/fire",
    },
    {
      name: "Mi gravedad",
      tagline: "grief · melancholy · anger",
      url: "https://www.tortoise.studio/song/mi-gravedad",
    },
    {
      name: "Rain",
      tagline: "sadness · lost",
      url: "https://tortoise.studio?id=d7b44836-690b-45a9-ab19-840992e87c8b",
    },
  ],
  strong: [
    {
      name: "YAMA",
      tagline: "legacy · proud · story",
      url: "https://tortoise.studio/song/yama",
    },
    {
      name: "Soy",
      tagline: "identity · proud",
      url: "https://tortoise.studio/song/soy",
    },
    {
      name: "Guerrera",
      tagline: "nostalgic · thankful",
      url: "https://tortoise.studio/song/guerrera",
    },
    {
      name: "Fragmentos",
      tagline: "community · bigger · complex",
      url: "https://tortoise.studio/song/fragmentos",
    },
  ],
  reflective: [
    {
      name: "Torii",
      tagline: "reflective · spirituality · life lessons",
      url: "https://tortoise.studio?id=a692bb77-5dcd-496a-be54-4456a2154451",
    },
    {
      name: "Arde",
      tagline: "sensual · love",
      url: "https://tortoise.studio?id=9bfee81e-babb-4851-b801-ac8806ba7b97",
    },
  ],
};

function pickSong(mood: string, fid: number): Song {
  const pool = BY_MOOD[mood] ?? BY_MOOD.hopeful;
  return pool[Math.abs(fid) % pool.length];
}

const MOOD_OPTIONS = ["Hopeful", "Melancholic", "Strong", "Reflective"] as const;

const MOOD_DESC: Record<string, string> = {
  hopeful: "Your energy is open and reaching toward something good.",
  melancholic: "You carry depth with you. There's beauty in the ache.",
  strong: "You're grounded and moving with purpose right now.",
  reflective: "You're in a thoughtful space, looking inward and outward.",
};

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "duo-do-song-quiz");
  const url = new URL(ctx.request.url);
  const page = url.searchParams.get("page") ?? "1";

  // ── Page 1 — Welcome ───────────────────────────────────────────────────────
  if (ctx.action.type === "get" || page === "1") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "pink" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "lg" },
            children: ["title", "sub", "sep", "btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Which Dúo Dø song are you?",
              weight: "bold",
              align: "center",
            },
          },
          sub: {
            type: "text",
            props: {
              content:
                "A quick vibe check to match you to a song from the Tortoise catalog.",
              size: "sm",
              align: "center",
            },
          },
          sep: {
            type: "separator",
            props: {},
          },
          btn: {
            type: "button",
            props: { label: "Tell me", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: `${self}?page=2` },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── Page 2 — Mood question ─────────────────────────────────────────────────
  if (page === "2") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "pink" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["q", "mood", "btn"],
          },
          q: {
            type: "text",
            props: {
              content: "What's your vibe right now?",
              weight: "bold",
              align: "center",
            },
          },
          mood: {
            type: "toggle_group",
            props: {
              name: "mood",
              label: "Pick the one that fits",
              options: [...MOOD_OPTIONS],
              orientation: "vertical",
              variant: "outline",
            },
          },
          btn: {
            type: "button",
            props: { label: "Find my song", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: `${self}?page=3` },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── Page 3 — Result ────────────────────────────────────────────────────────
  if (page === "3" && ctx.action.type === "post") {
    const fid = ctx.action.fid ?? 1;
    const rawMood = (ctx.action.inputs?.mood as string) ?? "Hopeful";
    const moodKey = rawMood.toLowerCase();
    const song = pickSong(moodKey, fid);
    const desc = MOOD_DESC[moodKey] ?? MOOD_DESC.hopeful;

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "pink" },
      effects: ["confetti"],
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["label", "songName", "tagline", "desc", "sep", "listenBtn", "againBtn"],
          },
          label: {
            type: "text",
            props: {
              content: "Your Dúo Dø match ✨",
              weight: "bold",
              align: "center",
            },
          },
          songName: {
            type: "text",
            props: {
              content: song.name,
              weight: "bold",
              align: "center",
            },
          },
          tagline: {
            type: "text",
            props: {
              content: song.tagline,
              size: "sm",
              align: "center",
            },
          },
          desc: {
            type: "text",
            props: {
              content: desc,
              size: "sm",
              align: "center",
            },
          },
          sep: {
            type: "separator",
            props: {},
          },
          listenBtn: {
            type: "button",
            props: { label: "Listen on Tortoise", variant: "primary" },
            on: {
              press: {
                action: "open_url",
                params: { target: song.url },
              },
            },
          },
          againBtn: {
            type: "button",
            props: { label: "Try again", variant: "secondary" },
            on: {
              press: {
                action: "submit",
                params: { target: `${self}?page=1` },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── Fallback — back to welcome ─────────────────────────────────────────────
  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg" },
          children: ["title", "btn"],
        },
        title: {
          type: "text",
          props: {
            content: "Which Dúo Dø song are you?",
            weight: "bold",
            align: "center",
          },
        },
        btn: {
          type: "button",
          props: { label: "Tell me", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${self}?page=2` },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
