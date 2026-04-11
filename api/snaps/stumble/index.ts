import { Hono } from "hono";
import { handle } from "hono/vercel";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

export const config = { runtime: "nodejs" };

const app = new Hono().basePath("/api/snaps/stumble");

type StumbleItem =
  | { kind: "user"; name: string; fid: number; description: string }
  | { kind: "channel"; name: string; slug: string; description: string }
  | { kind: "miniapp"; name: string; url: string; description: string };

const pool: StumbleItem[] = [
  // Users
  { kind: "user", name: "Dan Romero", fid: 3, description: "Co-founder of Farcaster" },
  { kind: "user", name: "Vitalik Buterin", fid: 5650, description: "Ethereum creator" },
  { kind: "user", name: "Jesse Pollak", fid: 99, description: "Creator of Base" },
  { kind: "user", name: "Cameron Armstrong", fid: 617, description: "Builder on Farcaster" },
  { kind: "user", name: "Matt Lee", fid: 6591, description: "Founder of Tortoise" },
  { kind: "user", name: "Woj", fid: 576, description: "Warpcast team" },
  { kind: "user", name: "Horsefacts", fid: 1048, description: "Onchain dev legend" },
  { kind: "user", name: "Jacek", fid: 1, description: "Co-founder of Farcaster" },
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
  { kind: "miniapp", name: "Tortoise", url: "https://tortoise.club", description: "Music on Base" },
  { kind: "miniapp", name: "Zora", url: "https://zora.co", description: "Create and collect NFTs" },
  { kind: "miniapp", name: "Warpcast", url: "https://warpcast.com", description: "The main Farcaster client" },
  { kind: "miniapp", name: "Farcaster.xyz", url: "https://www.farcaster.xyz", description: "The Farcaster homepage" },
  { kind: "miniapp", name: "Paragraph", url: "https://paragraph.xyz", description: "Writing on Farcaster" },
];

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "stumble");

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
              size: "md",
            },
          },
          subtitle: {
            type: "text",
            props: {
              content: "Discover a random user, channel, or miniapp. Like StumbleUpon but onchain.",
              align: "center",
            },
          },
          btn: {
            type: "button",
            props: { label: "Stumble!" },
            on: { press: { action: { type: "submit", target: self } } },
          },
        },
      },
    };
    return response;
  }

  // POST — pick a random item from the pool
  const item = pool[Math.floor(Math.random() * pool.length)];

  let kindLabel: string;
  let actionLabel: string;
  let actionDef: Record<string, unknown>;

  switch (item.kind) {
    case "user":
      kindLabel = "Person";
      actionLabel = `View ${item.name}`;
      actionDef = { type: "view_profile", fid: item.fid };
      break;
    case "channel":
      kindLabel = "Channel";
      actionLabel = `Go to ${item.name}`;
      actionDef = {
        type: "open_url",
        target: `https://warpcast.com/~/channel/${item.slug}`,
      };
      break;
    case "miniapp":
      kindLabel = "Mini App";
      actionLabel = `Open ${item.name}`;
      actionDef = { type: "open_url", target: item.url };
      break;
  }

  // Enforce button label ≤30 chars
  if (actionLabel.length > 30) {
    actionLabel = actionLabel.slice(0, 27) + "...";
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
          props: { content: item.name, weight: "bold", align: "center", size: "md" },
        },
        desc_text: {
          type: "text",
          props: { content: item.description, align: "center" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        action_btn: {
          type: "button",
          props: { label: actionLabel, variant: "primary" },
          on: { press: { action: actionDef } },
        },
        again_btn: {
          type: "button",
          props: { label: "Stumble again", variant: "secondary" },
          on: { press: { action: { type: "submit", target: self } } },
        },
      },
    },
  };

  return response;
});

export default handle(app);
