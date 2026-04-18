import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const MAX_GUESSES = 7;

/** Same number for everyone each day — makes it social ("I got today's in 3!") */
function getDailyTarget(): number {
  const day = Math.floor(Date.now() / 86400000);
  return (day * 7919 + 37) % 99 + 1; // 1–99
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "number-wizard");

  if (ctx.action.type === "get") {
    const target = getDailyTarget();
    const nextUrl = `${self}?t=${target}&g=0&lo=1&hi=99`;

    const result: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "teal" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { gap: "md" },
            children: ["title", "subtitle", "sep1", "guess_slider", "guess_btn", "sep2", "share_btn"],
          },
          title: {
            type: "text",
            props: { content: "Guess My Number 🔮", weight: "bold", align: "center" },
          },
          subtitle: {
            type: "text",
            props: {
              content:
                "I'm thinking of a number between 1 and 99.\nSame number for everyone today. 7 guesses. Go.",
              align: "center",
            },
          },
          sep1: { type: "separator", props: {} },
          guess_slider: {
            type: "slider",
            props: {
              name: "guess",
              label: "Your guess (1–99)",
              min: 1,
              max: 99,
              step: 1,
              defaultValue: 50,
            },
          },
          guess_btn: {
            type: "button",
            props: { label: "Guess", variant: "primary" },
            on: { press: { action: "submit", params: { target: nextUrl } } },
          },
          sep2: { type: "separator", props: {} },
          share_btn: {
            type: "button",
            props: { label: "Share", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "can you guess the wizard's daily number? 🔮",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return result;
  }

  // POST — process a guess
  const url = new URL(ctx.request.url);
  const target = parseInt(url.searchParams.get("t") ?? String(getDailyTarget()), 10);
  const guessesUsed = parseInt(url.searchParams.get("g") ?? "0", 10);
  const lo = parseInt(url.searchParams.get("lo") ?? "1", 10);
  const hi = parseInt(url.searchParams.get("hi") ?? "99", 10);

  const rawGuess = ctx.action.inputs.guess;
  const guess = Math.round(typeof rawGuess === "number" ? rawGuess : parseFloat(String(rawGuess)));
  const newGuessesUsed = guessesUsed + 1;

  // WIN
  if (guess === target) {
    const praise =
      newGuessesUsed === 1
        ? "That's actually impossible. Are you a wizard too?"
        : newGuessesUsed <= 3
          ? "Wizard-level intuition. 🐢"
          : newGuessesUsed <= 5
            ? "Solid work."
            : "Made it just in time.";

    const result: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "teal" },
      effects: ["confetti"],
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { gap: "md" },
            children: ["title", "subtitle", "score_badge", "sep1", "share_btn"],
          },
          title: {
            type: "text",
            props: { content: "You got it! ✨", weight: "bold", align: "center" },
          },
          subtitle: {
            type: "text",
            props: {
              content: `The number was ${target}. You found it in ${newGuessesUsed} ${newGuessesUsed === 1 ? "guess" : "guesses"}. ${praise}`,
              align: "center",
            },
          },
          score_badge: {
            type: "badge",
            props: {
              label: `${newGuessesUsed} / ${MAX_GUESSES} guesses`,
              variant: "default",
            },
          },
          sep1: { type: "separator", props: {} },
          share_btn: {
            type: "button",
            props: { label: "Share result", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: `guessed today's wizard number in ${newGuessesUsed}/${MAX_GUESSES} tries 🔮 can you beat that?`,
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return result;
  }

  const isHigh = guess > target;
  const newLo = isHigh ? lo : Math.max(lo, guess + 1);
  const newHi = isHigh ? Math.min(hi, guess - 1) : hi;

  // LOSE — used all guesses
  if (newGuessesUsed >= MAX_GUESSES) {
    const result: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "teal" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { gap: "md" },
            children: ["title", "subtitle", "sep1", "share_btn"],
          },
          title: {
            type: "text",
            props: { content: "Out of guesses", weight: "bold", align: "center" },
          },
          subtitle: {
            type: "text",
            props: {
              content: `The number was ${target}. The wizard wins today. New number tomorrow — come back and try again. 🐢`,
              align: "center",
            },
          },
          sep1: { type: "separator", props: {} },
          share_btn: {
            type: "button",
            props: { label: "Share", variant: "secondary" },
            on: {
              press: {
                action: "compose_cast",
                params: {
                  text: "the wizard stumped me. can you guess today's number in 7 tries? 🔮",
                  embeds: [self],
                },
              },
            },
          },
        },
      },
    };
    return result;
  }

  // IN PROGRESS
  const remaining = MAX_GUESSES - newGuessesUsed;
  const hintText = isHigh ? "Too high — go lower." : "Too low — go higher.";
  const defaultMid = Math.round((newLo + newHi) / 2);
  const nextUrl = `${self}?t=${target}&g=${newGuessesUsed}&lo=${newLo}&hi=${newHi}`;

  const result: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { gap: "md" },
          children: ["hint_text", "guess_badge", "remaining_prog", "sep1", "next_slider", "guess_btn", "sep2", "share_btn"],
        },
        hint_text: {
          type: "text",
          props: { content: hintText, weight: "bold", align: "center" },
        },
        guess_badge: {
          type: "badge",
          props: { label: `Guessed: ${guess}`, variant: "outline" },
        },
        remaining_prog: {
          type: "progress",
          props: {
            label: `${remaining} ${remaining === 1 ? "guess" : "guesses"} remaining`,
            value: remaining,
            max: MAX_GUESSES,
          },
        },
        sep1: { type: "separator", props: {} },
        next_slider: {
          type: "slider",
          props: {
            name: "guess",
            label: `Next guess (${newLo}–${newHi})`,
            min: newLo,
            max: newHi,
            step: 1,
            defaultValue: defaultMid,
          },
        },
        guess_btn: {
          type: "button",
          props: { label: "Guess", variant: "primary" },
          on: { press: { action: "submit", params: { target: nextUrl } } },
        },
        sep2: { type: "separator", props: {} },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "trying to guess the wizard's daily number 🔮 can you do it in 7 tries?",
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
  return result;
});

export default app;
