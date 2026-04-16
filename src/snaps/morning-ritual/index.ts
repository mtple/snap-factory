/**
 * morning-ritual — Build your morning ritual, discover your archetype.
 *
 * GET:   5 switch inputs (coffee, workout, quiet, news, music) → submit
 * POST:  Based on which switches are on, determine one of 9 archetypes
 *        with a short description + share button.
 *        "Try again" sends to ?reset=1 to return to the input screen.
 *
 * Components: switch, badge, text, separator, button, stack
 * Actions:    submit, compose_cast
 * State:      stateless
 * Accent:     blue
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "morning-ritual";

type AccentColor =
  | "gray"
  | "blue"
  | "red"
  | "amber"
  | "green"
  | "teal"
  | "purple"
  | "pink";

interface Archetype {
  name: string;
  description: string;
  color: AccentColor;
  shareText: string;
}

function getArchetype(
  coffee: boolean,
  workout: boolean,
  quiet: boolean,
  news: boolean,
  music: boolean
): Archetype {
  const count = [coffee, workout, quiet, news, music].filter(Boolean).length;

  if (count === 0) {
    return {
      name: "The Zero Protocol",
      description:
        "No rituals. The day starts when it starts. Honestly? Respect the chaos.",
      color: "gray",
      shareText:
        "my morning ritual: nothing. zero. the day starts when it starts 🐢",
    };
  }

  if (count >= 4 || (coffee && workout && quiet && music)) {
    return {
      name: "The Maximalist",
      description:
        "Coffee, movement, stillness, and music. You're doing it all before 9am. The day doesn't stand a chance.",
      color: "green",
      shareText:
        "apparently i'm a morning maximalist. doing it all before 9am 🌅",
    };
  }

  if (quiet && workout && !news) {
    return {
      name: "Monk Mode",
      description:
        "Move the body, quiet the mind. You're locked in before the notifications start.",
      color: "blue",
      shareText:
        "monk mode morning: move the body, quiet the mind. locked in 🧘",
    };
  }

  if (coffee && news && !quiet && !workout) {
    return {
      name: "The Informed Grinder",
      description:
        "Caffeinated and caught up. You know what's happening before anyone else does.",
      color: "amber",
      shareText:
        "coffee + news every morning. i am the informed grinder ☕",
    };
  }

  if (music && coffee && !quiet && !news) {
    return {
      name: "The Vibe Merchant",
      description:
        "You float into the morning on a good playlist and a hot drink. The best kind of start.",
      color: "pink",
      shareText:
        "coffee + music. the vibe merchant morning. no notes 🎵",
    };
  }

  if (workout && coffee && music && !quiet) {
    return {
      name: "The Chaotic Creative",
      description:
        "All energy, no grounding. You'll figure out what you're doing by 10am.",
      color: "red",
      shareText:
        "workout, coffee, music — all energy, zero plan. chaotic creative morning 🔥",
    };
  }

  if (quiet && !workout && !news) {
    return {
      name: "The Minimalist Monk",
      description:
        "Just stillness. One clear input before the noise. Most people can't actually do this.",
      color: "purple",
      shareText:
        "quiet before the noise. minimalist monk energy in the morning 🧘",
    };
  }

  if (workout && !coffee && !quiet) {
    return {
      name: "The Body-First",
      description:
        "Physical before everything else. The caffeine is optional. The movement is not.",
      color: "teal",
      shareText:
        "body-first morning — physical before everything else 💪",
    };
  }

  return {
    name: "The Balanced Builder",
    description:
      "A little of everything, nothing excessive. You're not optimizing — you're living. Good instincts.",
    color: "blue",
    shareText:
      "my morning ritual gives 'balanced builder' energy. sounds right 🌅",
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const resetTarget = `${self}?reset=1`;

  const url = new URL(ctx.request.url);
  const isReset = url.searchParams.get("reset") === "1";

  // ── Input screen (GET or ?reset=1) ────────────────────────────────────
  if (ctx.action.type === "get" || isReset) {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "blue" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: [
              "title",
              "subtitle",
              "sw_coffee",
              "sw_workout",
              "sw_quiet",
              "sw_news",
              "sw_music",
              "submit_btn",
              "share_btn",
            ],
          },
          title: {
            type: "text",
            props: {
              content: "Morning Ritual",
              weight: "bold",
              align: "center",
            },
          },
          subtitle: {
            type: "text",
            props: {
              content: "What does your morning actually look like?",
              size: "sm",
              align: "center",
            },
          },
          sw_coffee: {
            type: "switch",
            props: { name: "coffee", label: "Coffee or tea ☕" },
          },
          sw_workout: {
            type: "switch",
            props: { name: "workout", label: "Move your body 🏃" },
          },
          sw_quiet: {
            type: "switch",
            props: {
              name: "quiet",
              label: "Quiet time (meditation / journaling)",
            },
          },
          sw_news: {
            type: "switch",
            props: { name: "news", label: "Check the news 📰" },
          },
          sw_music: {
            type: "switch",
            props: { name: "music", label: "Listen to music 🎵" },
          },
          submit_btn: {
            type: "button",
            props: { label: "Read my vibe →", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
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
                  text: "what does your morning ritual say about you? 🌅",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return response;
  }

  // ── Result screen (POST with switch inputs) ───────────────────────────
  const inputs = ctx.action.inputs;
  const coffee = inputs.coffee === true;
  const workout = inputs.workout === true;
  const quiet = inputs.quiet === true;
  const news = inputs.news === true;
  const music = inputs.music === true;

  const archetype = getArchetype(coffee, workout, quiet, news, music);

  // Build a readable list of what the user picked
  const picked: string[] = [];
  if (coffee) picked.push("Coffee or tea ☕");
  if (workout) picked.push("Moving the body 🏃");
  if (quiet) picked.push("Quiet time 🧘");
  if (news) picked.push("News 📰");
  if (music) picked.push("Music 🎵");

  const ritualsText =
    picked.length > 0 ? picked.join(" · ") : "Nothing selected";

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: archetype.color },
    ui: {
      root: "result_page",
      elements: {
        result_page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "archetype_badge",
            "description",
            "sep",
            "rituals_label",
            "try_again_btn",
            "share_btn",
          ],
        },
        archetype_badge: {
          type: "badge",
          props: { label: archetype.name, color: archetype.color },
        },
        description: {
          type: "text",
          props: { content: archetype.description, align: "center" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        rituals_label: {
          type: "text",
          props: { content: ritualsText, size: "sm", align: "center" },
        },
        try_again_btn: {
          type: "button",
          props: { label: "Try again", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: resetTarget },
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
                text: archetype.shareText,
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
