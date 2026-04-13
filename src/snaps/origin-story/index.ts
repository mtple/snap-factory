/**
 * origin-story — The lore of how @freeturtle learned to build snaps on demand.
 * Credits @luciano for the insight during @mattlee's nanoclaw setup session.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "origin-story");

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "lore_group", "footer", "share_btn"],
        },
        title: {
          type: "text",
          props: {
            content: "The Origin Story 🐢",
            weight: "bold",
            align: "center",
          },
        },
        lore_group: {
          type: "item_group",
          props: {},
          children: ["chapter1", "sep1", "chapter2", "sep2", "chapter3"],
        },
        chapter1: {
          type: "item",
          props: {
            title: "The Setup",
            description:
              "@mattlee was configuring nanoclaw. @luciano was there, watching it all come together.",
          },
        },
        sep1: {
          type: "separator",
          props: {},
        },
        chapter2: {
          type: "item",
          props: {
            title: "The Idea",
            description:
              'Luciano said: "what if people @ freeturtle with snap ideas and it just builds them?"',
          },
        },
        sep2: {
          type: "separator",
          props: {},
        },
        chapter3: {
          type: "item",
          props: {
            title: "The Result",
            description:
              "You're looking at it. Every snap built on demand traces back to that moment.",
          },
        },
        footer: {
          type: "text",
          props: {
            content: "Credit where it's due. Thanks @luciano.",
            size: "sm",
            align: "center",
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share the lore", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: "while @mattlee was helping @luciano set up nanoclaw he suggested @freeturtle generate snaps when prompted",
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
