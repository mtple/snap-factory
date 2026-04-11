/**
 * raffle — enter a list of names, draw a random winner.
 * Built for @dylsteck.eth.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

function makeFormPage(selfUrl: string, error?: string): SnapHandlerResult {
  const children = ["title", "subtitle"];
  if (error) children.push("errorMsg");
  children.push("names", "draw");

  const elements: SnapHandlerResult["ui"]["elements"] = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children,
    },
    title: {
      type: "text",
      props: { content: "Raffle", weight: "bold" },
    },
    subtitle: {
      type: "text",
      props: {
        content: "Enter names separated by commas, then draw a winner.",
        size: "sm",
      },
    },
    names: {
      type: "input",
      props: {
        name: "names",
        label: "Names",
        placeholder: "Alice, Bob, Charlie...",
        maxLength: 280,
      },
    },
    draw: {
      type: "button",
      props: { label: "Draw a winner", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: selfUrl },
        },
      },
    },
  };

  if (error) {
    elements.errorMsg = {
      type: "text",
      props: { content: error, size: "sm" },
    };
  }

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const selfUrl = snapUrl(ctx.request, "raffle");

  if (ctx.action.type === "get") {
    return makeFormPage(selfUrl);
  }

  // POST — parse names from input
  const raw = (ctx.action.inputs?.names as string) ?? "";
  const names = raw
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (names.length < 2) {
    return makeFormPage(
      selfUrl,
      names.length === 0
        ? "Enter at least 2 names to run a raffle."
        : "Need at least 2 names to pick a winner.",
    );
  }

  // Pick a random winner
  const winner = names[Math.floor(Math.random() * names.length)];
  // Truncate winner name to stay well within 320-char text limit
  const displayName = winner.slice(0, 60);
  const countText = `drawn from ${names.length} participant${names.length === 1 ? "" : "s"}`;

  return {
    version: "1.0",
    theme: { accent: "amber" },
    effects: ["confetti"],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["header", "sep", "winnerLabel", "winnerName", "count", "again"],
        },
        header: {
          type: "text",
          props: { content: "Raffle", weight: "bold" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        winnerLabel: {
          type: "text",
          props: { content: "Winner!", size: "sm", align: "center" },
        },
        winnerName: {
          type: "text",
          props: { content: displayName, weight: "bold", align: "center" },
        },
        count: {
          type: "text",
          props: { content: countText, size: "sm", align: "center" },
        },
        again: {
          type: "button",
          props: { label: "New raffle", variant: "secondary" },
          on: {
            press: {
              action: "submit",
              params: { target: selfUrl },
            },
          },
        },
      },
    },
  };
});

export default app;
