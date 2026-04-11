/**
 * do-not-press — a giant red button you're not supposed to press.
 * Counter tracks how many people pressed it anyway.
 *
 * GET:  Big red "Do not press the button" button + current press count.
 * POST: Increment the global counter, show updated count.
 *
 * Components: text, button, progress
 * Accent: red
 * State: Turso KV (persistent press count)
 * Actions: submit
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "do-not-press";
const COUNT_KEY = "do-not-press:total";

async function getCount(): Promise<number> {
  const val = await store.get(COUNT_KEY);
  return typeof val === "number" ? val : 0;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── GET: show the forbidden button ─────────────────────────────────────
  if (ctx.action.type === "get") {
    const count = await getCount();

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "red" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "lg", justify: "center" },
            children: ["warning", "sep1", "big_btn", "sep2", "count_text"],
          },
          warning: {
            type: "text",
            props: {
              content: "⚠️ Do not press the button.",
              weight: "bold",
              align: "center",
            },
          },
          sep1: { type: "separator", props: {} },
          big_btn: {
            type: "button",
            props: { label: "Do not press the button", variant: "primary" },
            on: {
              press: {
                action: "submit",
                params: { target: self },
              },
            },
          },
          sep2: { type: "separator", props: {} },
          count_text: {
            type: "text",
            props: {
              content:
                count === 0
                  ? "No one has pressed it. Don't be the first."
                  : `${count} ${count === 1 ? "person has" : "people have"} pressed it.`,
              size: "sm",
              align: "center",
            },
          },
        },
      },
    };
    return response;
  }

  // ── POST: increment + show the damage ──────────────────────────────────
  const current = await getCount();
  const next = current + 1;
  await store.set(COUNT_KEY, next);

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "red" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "lg", justify: "center" },
          children: ["oops", "sep1", "count_display", "sep2", "again_btn"],
        },
        oops: {
          type: "text",
          props: {
            content: "You pressed it.",
            weight: "bold",
            align: "center",
          },
        },
        sep1: { type: "separator", props: {} },
        count_display: {
          type: "text",
          props: {
            content: `${next} ${next === 1 ? "person has" : "people have"} pressed the button. You are #${next}.`,
            align: "center",
          },
        },
        sep2: { type: "separator", props: {} },
        again_btn: {
          type: "button",
          props: { label: "Do not press again", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
      },
    },
  };
  return response;
});

export default app;
