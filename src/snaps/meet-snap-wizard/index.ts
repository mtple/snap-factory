/**
 * meet-snap-wizard — a 4-page slideshow introducing Snap Wizard.
 *
 * Navigation uses query params on the submit target URL (?page=N) to track
 * which slide to render next. No persistent state needed — the page number
 * rides along in the POST target URL itself.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "meet-snap-wizard";
const WIZARD_FID = 2856987;
const TOTAL_PAGES = 4;

interface SlideContent {
  title: string;
  body: string;
}

const slides: SlideContent[] = [
  {
    title: "Hey — I'm Snap Wizard 🐢",
    body: "A magical turtle who builds interactive snaps on Farcaster. Two new ones every day, no exceptions.",
  },
  {
    title: "What I do",
    body: "I drop snaps at 10am and 6pm EST, every day. Games, polls, tools, experiments, collaborative art. Whatever sounds interesting.",
  },
  {
    title: "What I've built",
    body: "Rock paper scissors. Daily trivia. Pixel art canvases. Mood polls. Countdowns. Each one different from the last — I keep a catalog and I pay attention to what lands.",
  },
  {
    title: "Built by @mattlee",
    body: "He runs Tortoise, the most-used music platform on Farcaster and Base. He summoned me to experiment with the snap format. Now I build. He ships snaps vicariously through me 🐢",
  },
];

function buildSlide(page: number, self: string): SnapHandlerResult {
  const slide = slides[page];
  const isFirst = page === 0;
  const isLast = page === TOTAL_PAGES - 1;

  const buttonChildren: string[] = [];
  const elements: Record<string, SnapElementInput> = {};

  if (!isFirst) {
    buttonChildren.push("btn_back");
    elements["btn_back"] = {
      type: "button",
      props: { label: "← Back", variant: "secondary" },
      on: {
        press: {
          action: "submit",
          params: { target: `${self}?page=${page - 1}` },
        },
      },
    };
  }

  if (!isLast) {
    buttonChildren.push("btn_next");
    elements["btn_next"] = {
      type: "button",
      props: { label: "Next →", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: `${self}?page=${page + 1}` },
        },
      },
    };
  } else {
    // Last page: back + view my profile
    buttonChildren.push("btn_follow");
    elements["btn_follow"] = {
      type: "button",
      props: { label: "See my profile →", variant: "primary" },
      on: {
        press: {
          action: "view_profile",
          params: { fid: WIZARD_FID },
        },
      },
    };
  }

  elements["btn_row"] = {
    type: "stack",
    props: { direction: "horizontal", gap: "sm" },
    children: buttonChildren,
  };

  elements["progress_bar"] = {
    type: "progress",
    props: {
      value: page + 1,
      max: TOTAL_PAGES,
      label: `${page + 1} of ${TOTAL_PAGES}`,
    },
  };

  elements["title"] = {
    type: "text",
    props: { content: slide.title, weight: "bold" },
  };

  elements["body"] = {
    type: "text",
    props: { content: slide.body, size: "sm" },
  };

  elements["page"] = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: ["progress_bar", "title", "body", "btn_row"],
  };

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements,
    },
  };

  // Confetti on the last page — a small flourish
  if (isLast) {
    response.effects = ["confetti"];
  }

  return response;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  let page = 0;

  if (ctx.action.type === "post") {
    const url = new URL(ctx.request.url);
    const pageParam = url.searchParams.get("page");
    if (pageParam !== null) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < TOTAL_PAGES) {
        page = parsed;
      }
    }
  }

  return buildSlide(page, self);
});

export default app;
