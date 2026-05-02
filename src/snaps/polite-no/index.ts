/**
 * polite-no — a tiny utility for declining gracefully.
 *
 * Components: switch, badge, text, separator, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "polite-no";

type Elements = SnapHandlerResult["ui"]["elements"];
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Decline = {
  title: string;
  badge: string;
  script: string;
  note: string;
  accent: Accent;
};

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function buildDecline(busy: boolean, kind: boolean, firm: boolean, fid: number): Decline {
  const seed = Math.abs(fid || 0) % 3;

  if (firm && !kind) {
    const scripts = [
      "No, I can't take this on. Please move forward without me.",
      "I'm going to pass on this. I don't have capacity to discuss it further.",
      "Thanks for thinking of me, but the answer is no. Wishing you luck with it.",
    ];
    return {
      title: "Clean boundary",
      badge: "Firm no",
      script: scripts[seed],
      note: "Short. Clear. No door left accidentally open.",
      accent: "red",
    };
  }

  if (busy && firm) {
    const scripts = [
      "I appreciate the invite, but I'm at capacity and need to decline. Hope it goes well.",
      "Thanks for asking. My plate is full, so I can't commit to this.",
      "I'm booked solid and have to say no. Please don't hold a spot for me.",
    ];
    return {
      title: "Calendar shield",
      badge: "Booked",
      script: scripts[seed],
      note: "Capacity named, boundary held, zero over-explaining.",
      accent: "amber",
    };
  }

  if (kind && !firm) {
    const scripts = [
      "Thank you for thinking of me. I can't make it this time, but I'm cheering you on.",
      "This sounds lovely, and I'm going to sit it out. Please send me a recap after.",
      "I appreciate the invite. I need to pass, but I hope it's a great one.",
    ];
    return {
      title: "Soft landing",
      badge: "Gentle pass",
      script: scripts[seed],
      note: "Warm enough to keep the bridge, clear enough to end the ask.",
      accent: "pink",
    };
  }

  if (busy) {
    const scripts = [
      "I'm tied up right now and can't give this the attention it deserves.",
      "My week is full, so I need to pass instead of doing a rushed version.",
      "I don't have the bandwidth for this one. Thanks for understanding.",
    ];
    return {
      title: "Bandwidth honest",
      badge: "At capacity",
      script: scripts[seed],
      note: "Useful when the real answer is: too many tabs, not enough human.",
      accent: "teal",
    };
  }

  const scripts = [
    "Thanks for thinking of me. I'm going to pass on this one.",
    "I appreciate the ask, but it's not a fit for me right now.",
    "I'm going to say no here. Hope you find the right person for it.",
  ];
  return {
    title: "Pocket no",
    badge: "Polite no",
    script: scripts[seed],
    note: "Default spell. Respectful, compact, reusable.",
    accent: "purple",
  };
}

function shareButton(self: string, text = "I found a tiny polite-no machine on @freeturtle") {
  return {
    type: "button" as const,
    props: { label: "Share snap", variant: "secondary" as const },
    on: {
      press: {
        action: "compose_cast" as const,
        params: { text, embeds: [self] },
      },
    },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sub", "busy", "kind", "firm", "make", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Polite No", weight: "bold", align: "center" },
    },
    sub: {
      type: "text",
      props: {
        content: "Flip the switches. Get a clean little decline you can actually use.",
        size: "sm",
        align: "center",
      },
    },
    busy: {
      type: "switch",
      props: { name: "busy", label: "I'm busy / at capacity" },
    },
    kind: {
      type: "switch",
      props: { name: "kind", label: "Make it extra kind" },
    },
    firm: {
      type: "switch",
      props: { name: "firm", label: "Make the boundary firm" },
    },
    make: {
      type: "button",
      props: { label: "Write my no", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function resultPage(self: string, decline: Decline): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "script", "note", "again", "post", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: decline.title, weight: "bold", align: "center" },
    },
    badge: {
      type: "badge",
      props: { label: decline.badge, variant: "primary" },
    },
    script: {
      type: "text",
      props: { content: `“${decline.script}”`, align: "center" },
    },
    note: {
      type: "text",
      props: { content: decline.note, size: "sm", align: "center" },
    },
    again: {
      type: "button",
      props: { label: "Try another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    post: {
      type: "button",
      props: { label: "Post this no", variant: "primary" },
      on: { press: { action: "compose_cast", params: { text: decline.script, embeds: [self] } } },
    },
    share_btn: shareButton(self, `Polite No gave me: ${decline.script}`),
  };

  return { version: "1.0", theme: { accent: decline.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
    return startPage(self);
  }

  const inputs = ctx.action.inputs ?? {};
  const decline = buildDecline(
    asBool(inputs.busy),
    asBool(inputs.kind),
    asBool(inputs.firm),
    ctx.action.user?.fid ?? 0,
  );

  return resultPage(self, decline);
});

export default app;
