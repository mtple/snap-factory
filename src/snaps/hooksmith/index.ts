/**
 * hooksmith — turn a rough idea into a cast-ready hook.
 *
 * Built from engagement learnings: multi-page + input + item_group utility.
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "hooksmith";

type Elements = SnapHandlerResult["ui"]["elements"];
type Tone = "Builder" | "Spicy" | "Useful" | "Weird";

const TONES: Tone[] = ["Builder", "Spicy", "Useful", "Weird"];

function cleanIdea(raw: unknown): string {
  const text = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 110);
}

function asTone(raw: unknown): Tone {
  const tone = String(raw ?? "Builder");
  return TONES.includes(tone as Tone) ? (tone as Tone) : "Builder";
}

function makeHooks(idea: string, tone: Tone, fid: number): string[] {
  const topic = idea || "my tiny internet experiment";
  const seed = Math.abs(fid || topic.length) % 3;

  const pools: Record<Tone, string[]> = {
    Builder: [
      `I built ${topic} because the best tools start as tiny rituals.`,
      `Shipping note: ${topic}. Small surface area, oddly useful, ready to poke.`,
      `Prototype energy: ${topic}. If it saves one minute, it earned its pixels.`,
    ],
    Spicy: [
      `Unpopular opinion: ${topic} should have existed already.`,
      `${topic} is either brilliant or cursed. Testing in public to find out.`,
      `I made ${topic}. Please use responsibly, or at least hilariously.`,
    ],
    Useful: [
      `Quick tool: ${topic}. Built for the moment between idea and action.`,
      `If you need a clean next step, try ${topic}.`,
      `${topic}: a tiny helper for people who would rather ship than overthink.`,
    ],
    Weird: [
      `I put ${topic} in the little internet cauldron. It blinked back.`,
      `${topic} arrived wearing a wizard hat and demanding a button.`,
      `Today's pocket spell: ${topic}. Side effects may include momentum.`,
    ],
  };

  const ordered = [...pools[tone]];
  if (seed === 1) ordered.push(ordered.shift() as string);
  if (seed === 2) ordered.unshift(ordered.pop() as string);
  return ordered.map((hook) => hook.slice(0, 260));
}

function shareButton(self: string, text = "Try Hooksmith — turn a rough idea into a cast hook") {
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

function pageOne(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "lg" },
      children: ["title", "sub", "sep", "start", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Hooksmith", weight: "bold", align: "center" },
    },
    sub: {
      type: "text",
      props: {
        content: "Feed the wizard a rough idea. Get three cast-ready hooks back.",
        size: "sm",
        align: "center",
      },
    },
    sep: { type: "separator", props: {} },
    start: {
      type: "button",
      props: { label: "Forge a hook", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?page=write` } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "1.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function writePage(self: string, error?: string): SnapHandlerResult {
  const children = ["title", "idea", "tone", "forge"];
  if (error) children.splice(1, 0, "error");
  children.push("share_btn");

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children,
    },
    title: {
      type: "text",
      props: { content: "What are you posting about?", weight: "bold" },
    },
    idea: {
      type: "input",
      props: {
        name: "idea",
        label: "Rough idea",
        placeholder: "a tiny snap that writes cast hooks",
        maxLength: 180,
      },
    },
    tone: {
      type: "toggle_group",
      props: {
        name: "tone",
        label: "Tone",
        options: TONES.map((label) => ({ label, value: label })),
        defaultValue: "Builder",
      },
    },
    forge: {
      type: "button",
      props: { label: "Make hooks", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?page=result` } } },
    },
    share_btn: shareButton(self),
  };

  if (error) {
    elements.error = {
      type: "text",
      props: { content: error, size: "sm" },
    };
  }

  return { version: "1.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, idea: string, tone: Tone, fid: number): SnapHandlerResult {
  const hooks = makeHooks(idea, tone, fid);
  const best = hooks[0];
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "hooks", "post", "again", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Three hooks, forged", weight: "bold", align: "center" },
    },
    badge: {
      type: "badge",
      props: { label: `${tone} mode`, variant: "primary" },
    },
    hook_1: {
      type: "item",
      props: { title: "1", description: hooks[0] },
    },
    hook_2: {
      type: "item",
      props: { title: "2", description: hooks[1] },
    },
    hook_3: {
      type: "item",
      props: { title: "3", description: hooks[2] },
    },
    hooks: {
      type: "item_group",
      props: {},
      children: ["hook_1", "hook_2", "hook_3"],
    },
    post: {
      type: "button",
      props: { label: "Post hook 1", variant: "primary" },
      on: {
        press: {
          action: "compose_cast",
          params: { text: best, embeds: [self] },
        },
      },
    },
    again: {
      type: "button",
      props: { label: "Forge another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?page=write` } } },
    },
    share_btn: shareButton(self, `Hooksmith made this for me: ${best}`),
  };

  return {
    version: "1.0",
    theme: { accent: "amber" },
    effects: ["confetti"],
    ui: { root: "page", elements },
  };
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);
  const page = url.searchParams.get("page") ?? "start";

  if (ctx.action.type === "get" || page === "start") {
    return pageOne(self);
  }

  if (page === "write") {
    return writePage(self);
  }

  const idea = cleanIdea(ctx.action.inputs?.idea);
  if (!idea) {
    return writePage(self, "Give me a rough idea first.");
  }

  return resultPage(self, idea, asTone(ctx.action.inputs?.tone), ctx.action.fid ?? 0);
});

export { asTone, cleanIdea, makeHooks };
export default app;
