/**
 * mvr-showcase — a snap that showcases @mvr's miniapps (hamst.art),
 * with a name, brief description, and direct deeplink for each.
 * Built on request from @mvr at the Farcaster Snaps event, April 2026.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";

const app = new Hono();

const APPS = [
  {
    id: "hamscout",
    name: "HamScout",
    description:
      "Your one-stop Hamcaster. Track HAM activity, tips, and rewards on Farcaster.",
    url: "https://hamscout.hamst.art",
    buttonLabel: "Open HamScout",
  },
  {
    id: "tipopolis",
    name: "Tipopolis",
    description:
      "Add tips to your Farcaster casts easily. Manage tip allowances and frames.",
    url: "https://tipopolis.hamst.art",
    buttonLabel: "Open Tipopolis",
  },
];

registerSnapHandler(app, async (_ctx) => {
  const elements: Record<string, unknown> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: [
        "header",
        "tagline",
        "sep0",
        ...APPS.flatMap((a, i) => [
          `item_${a.id}`,
          `btn_${a.id}`,
          ...(i < APPS.length - 1 ? [`sep_${a.id}`] : []),
        ]),
      ],
    },
    header: {
      type: "text",
      props: { content: "mvr's miniapps 🐹", weight: "bold" },
    },
    tagline: {
      type: "text",
      props: {
        content: "apps by @mvr — built for Farcaster",
        size: "sm",
      },
    },
    sep0: {
      type: "separator",
      props: {},
    },
  };

  for (let i = 0; i < APPS.length; i++) {
    const a = APPS[i];

    elements[`item_${a.id}`] = {
      type: "item",
      props: {
        title: a.name,
        description: a.description,
      },
    };

    elements[`btn_${a.id}`] = {
      type: "button",
      props: { label: a.buttonLabel, variant: "primary" },
      on: {
        press: {
          action: "open_mini_app",
          params: { target: a.url },
        },
      },
    };

    if (i < APPS.length - 1) {
      elements[`sep_${a.id}`] = {
        type: "separator",
        props: {},
      };
    }
  }

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: elements as SnapHandlerResult["ui"]["elements"],
    },
  };

  return response;
});

export default app;
