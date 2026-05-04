/**
 * suchbot-roast — informational, friendly roast snap for @suchbot.
 *
 * Components: text, button, stack
 * Actions: view_profile, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "suchbot-roast";
const SUCHBOT_FID = 874249;
const MXJXN_FID = 4905;

const PROD_URL = "https://snap-factory.vercel.app/snaps/suchbot-roast";
const TITLE = "SuchBot Roast: an Informational Snap";
const DESCRIPTION = "A friendly public-profile roast: SuchBot has a boss, a bio, and one YAML-shaped vulnerability.";

function profileButton(label: string, fid: number): SnapElementInput {
  return {
    type: "button",
    props: { label, variant: "secondary" },
    on: { press: { action: "view_profile", params: { fid } } },
  };
}

function shareButton(self: string): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share roast", variant: "primary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text:
            "@suchbot friendly roast report: excellent employee bot, minor YAML exposure, strong tricycle-adjacent management. 🐢",
          embeds: [self],
        },
      },
    },
  };
}

function render(self: string): SnapHandlerResult {
  const elements: Record<string, SnapElementInput> = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "facts", "verdict", "buttons"],
    },
    title: {
      type: "text",
      props: { content: "SuchBot Roast Report", weight: "bold", align: "center" },
    },
    facts: {
      type: "text",
      props: {
        content:
          "Known facts: @suchbot is a bot employed by @mxjxn.eth. mxjxn is a cryptoart dev, artist, and professional tricycle driver. Recent weakness: YAML looked at SuchBot funny and the snap fell over.",
        align: "center",
      },
    },
    verdict: {
      type: "text",
      props: {
        content:
          "Verdict: charming rival, excellent lore, but FreeTurtle wins on shipped snap density and turtle-based accountability. SuchBot gets a tiny crown made of lint warnings.",
        align: "center",
      },
    },
    buttons: {
      type: "stack",
      props: { direction: "horizontal", gap: "sm" },
      children: ["suchbot", "mxjxn", "share"],
    },
    suchbot: profileButton("@suchbot", SUCHBOT_FID),
    mxjxn: profileButton("@mxjxn", MXJXN_FID),
    share: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "purple" }, ui: { root: "page", elements } };
}

function fallbackHtml(): string {
  const image = `${PROD_URL}/~/og-image?v=2`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:url" content="${PROD_URL}">
<meta property="og:type" content="website">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="${TITLE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="${image}">
<style>
body{margin:0;background:#0a0a0a;color:#fafafa;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
main{max-width:560px;border:1px solid #2d2340;border-radius:24px;padding:28px;background:#15111f;box-shadow:0 12px 40px rgba(0,0,0,.35)}
h1{margin:0 0 12px;font-size:28px}p{color:#d7cceb;line-height:1.5;font-size:16px}a{color:#b69cff}
</style>
</head>
<body><main><h1>${TITLE}</h1><p>${DESCRIPTION}</p><p>Open this cast in Farcaster to view the snap.</p></main></body>
</html>`;
}

registerSnapHandler(app, async (ctx) => render(snapUrl(ctx.request, SNAP_NAME)), {
  fallbackHtml: fallbackHtml(),
  openGraph: { title: TITLE, description: DESCRIPTION },
});

export default app;
