/**
 * stumble — StumbleUpon-style random discovery of Farcaster users, channels,
 * and miniapps. Hit the button, see what you find.
 *
 * GET:  Welcome screen with a big "Stumble!" button.
 * POST: Pick a random item from the pool and show it with a navigation button.
 *
 * Components: text, button, badge, separator
 * Accent: purple
 * Actions: submit, view_profile, open_url
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

type UserItem = { kind: "user"; name: string; fid: number; description: string };
type ChannelItem = { kind: "channel"; name: string; slug: string; description: string };
type MiniAppItem = { kind: "miniapp"; name: string; url: string; description: string };
type StumbleItem = UserItem | ChannelItem | MiniAppItem;

const pool: StumbleItem[] = [
  // Users
  { kind: "user", name: "Dan Romero", fid: 3, description: "Co-founder of Farcaster" },
  { kind: "user", name: "Vitalik Buterin", fid: 5650, description: "Creator of Ethereum" },
  { kind: "user", name: "Jesse Pollak", fid: 99, description: "Creator of Base" },
  { kind: "user", name: "Cameron Armstrong", fid: 617, description: "Builder on Farcaster" },
  { kind: "user", name: "Matt Lee", fid: 6591, description: "Founder of Tortoise" },
  { kind: "user", name: "Woj", fid: 576, description: "Warpcast team" },
  { kind: "user", name: "Horsefacts", fid: 1048, description: "Onchain dev legend" },
  { kind: "user", name: "Jacek Czarnecki", fid: 1, description: "Co-founder of Farcaster" },
  // Channels
  { kind: "channel", name: "/base", slug: "base", description: "The Base L2 channel" },
  { kind: "channel", name: "/art", slug: "art", description: "Farcaster art community" },
  { kind: "channel", name: "/dev", slug: "dev", description: "Builders and developers" },
  { kind: "channel", name: "/music", slug: "music", description: "Music lovers on FC" },
  { kind: "channel", name: "/snaps", slug: "snaps", description: "Farcaster Snaps channel" },
  { kind: "channel", name: "/gaming", slug: "gaming", description: "Onchain gamers" },
  { kind: "channel", name: "/degen", slug: "degen", description: "The DEGEN community" },
  { kind: "channel", name: "/memes", slug: "memes", description: "Memes on the chain" },
  // Miniapps
  { kind: "miniapp", name: "Tortoise", url: "https://tortoise.club", description: "Music streaming on Base" },
  { kind: "miniapp", name: "Zora", url: "https://zora.co", description: "Create and collect NFTs" },
  { kind: "miniapp", name: "Warpcast", url: "https://warpcast.com", description: "The main Farcaster client" },
  { kind: "miniapp", name: "Paragraph", url: "https://paragraph.xyz", description: "Writing on Farcaster" },
  { kind: "miniapp", name: "Farcaster.xyz", url: "https://www.farcaster.xyz", description: "The Farcaster homepage" },
];

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "stumble");

  // ── GET: welcome screen ────────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "lg", justify: "center" },
            children: ["title", "subtitle", "btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Stumble Into Farcaster",
              weight: "bold",
              align: "center",
            },
          },
          subtitle: {
            type: "text",
            props: {
              content:
                "Discover a random user, channel, or miniapp. Like StumbleUpon — but onchain.",
              align: "center",
            },
          },
          btn: {
            type: "button",
            props: { label: "Stumble!", variant: "primary" },
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
  }

  // ── POST: pick a random item and show it ───────────────────────────────────
  const item = pool[Math.floor(Math.random() * pool.length)];

  let kindLabel: string;
  let actionLabel: string;
  let actionDef: { action: string; params: Record<string, unknown> };

  if (item.kind === "user") {
    kindLabel = "Person";
    const label = `View ${item.name}`;
    actionLabel = label.length <= 30 ? label : label.slice(0, 27) + "...";
    actionDef = { action: "view_profile", params: { fid: item.fid } };
  } else if (item.kind === "channel") {
    kindLabel = "Channel";
    actionLabel = `Go to ${item.name}`;
    actionDef = {
      action: "open_url",
      params: { target: `https://warpcast.com/~/channel/${item.slug}` },
    };
  } else {
    kindLabel = "Mini App";
    const label = `Open ${item.name}`;
    actionLabel = label.length <= 30 ? label : label.slice(0, 27) + "...";
    actionDef = { action: "open_url", params: { target: item.url } };
  }

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md", justify: "center" },
          children: ["kind_badge", "name_text", "desc_text", "sep", "action_btn", "again_btn"],
        },
        kind_badge: {
          type: "badge",
          props: { label: kindLabel, variant: "outline" },
        },
        name_text: {
          type: "text",
          props: { content: item.name, weight: "bold", align: "center" },
        },
        desc_text: {
          type: "text",
          props: { content: item.description, align: "center" },
        },
        sep: { type: "separator", props: {} },
        action_btn: {
          type: "button",
          props: { label: actionLabel, variant: "primary" },
          on: { press: actionDef },
        },
        again_btn: {
          type: "button",
          props: { label: "Stumble again", variant: "secondary" },
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
