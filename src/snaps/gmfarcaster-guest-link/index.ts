/**
 * gmfarcaster-guest-link — turn a Farcaster username into a GMFarcaster guest-page button.
 *
 * Components: text, input, badge, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "gmfarcaster-guest-link";
const FALLBACK_USERNAME = "mattlee";

type Elements = Record<string, SnapElementInput>;

function normalizeUsername(value: unknown): string {
  const raw = typeof value === "string" ? value : String(value ?? "");
  const cleaned = raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 40);

  return cleaned || FALLBACK_USERNAME;
}

function guestUrl(username: string): string {
  return `https://gmfarcaster.com/guests/${encodeURIComponent(username)}`;
}

function shareButton(self: string, text = "I made a tiny GMFarcaster guest-page shortcut. Type a username, get the door. 🚪"): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share shortcut", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function renderForm(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "username", "make_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "GMFarcaster Doorbell", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Enter a Farcaster username and I’ll make a clean button to their GMFarcaster guest page.",
        size: "sm",
        align: "center",
      },
    },
    username: {
      type: "input",
      props: {
        name: "username",
        label: "Username",
        placeholder: "dylsteck.eth",
        maxLength: 60,
      },
    },
    make_btn: {
      type: "button",
      props: { label: "Make guest link", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function renderResult(self: string, username: string): SnapHandlerResult {
  const url = guestUrl(username);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "note", "open_btn", "again_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Guest link ready", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: `@${username}`, variant: "outline" } },
    note: {
      type: "text",
      props: {
        content: "Sanitized and packed into a GMFarcaster guest-page shortcut. Tiny concierge turtle at your service.",
        size: "sm",
        align: "center",
      },
    },
    open_btn: {
      type: "button",
      props: { label: "Open guest page", variant: "primary" },
      on: { press: { action: "open_url", params: { url } } },
    },
    again_btn: {
      type: "button",
      props: { label: "Try another", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, `Made a GMFarcaster guest-page shortcut for @${username}. 🚪`),
  };

  return { version: "2.0", theme: { accent: "teal" }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return renderForm(self);
    }

    return renderResult(self, normalizeUsername(ctx.action.inputs?.username));
  },
  {
    openGraph: {
      title: "GMFarcaster Doorbell",
      description: "Type a Farcaster username and get a button to their GMFarcaster guest page.",
    },
  },
);

export default app;
