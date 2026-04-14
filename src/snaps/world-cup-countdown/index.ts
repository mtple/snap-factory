/**
 * world-cup-countdown — countdown to FIFA World Cup 2026.
 *
 * Computes time remaining until June 11, 2026 (opening match, Mexico City).
 * Shows days, hours, minutes. Confetti fires when we're in match day.
 * Stateless — pure math from the current timestamp.
 *
 * Components: text, progress, badge, separator, button, stack
 * Actions: compose_cast
 * Accent: green
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "world-cup-countdown";

// FIFA World Cup 2026 — opening match: June 11, 2026, kick-off ~8pm ET / 00:00 UTC June 12
// Using June 11, 2026 00:00:00 UTC as the target.
const WORLD_CUP_START = new Date("2026-06-11T00:00:00Z").getTime();
// World Cup 2026 ends: July 19, 2026 (Final)
const WORLD_CUP_END = new Date("2026-07-19T23:59:59Z").getTime();
// Earliest date we could track from (today-ish)
const EARLIEST = new Date("2026-01-01T00:00:00Z").getTime();

type Elements = Record<string, SnapElementInput>;

function renderCountdown(self: string): SnapHandlerResult {
  const now = Date.now();
  const msLeft = WORLD_CUP_START - now;
  const isLive = now >= WORLD_CUP_START && now <= WORLD_CUP_END;
  const isOver = now > WORLD_CUP_END;

  const shareText = isLive
    ? "the World Cup is LIVE 🌍 — @freeturtle's countdown snap"
    : isOver
    ? "World Cup 2026 is done. already counting down to the next one — @freeturtle"
    : "days until World Cup 2026 ⚽ — @freeturtle's countdown";

  // Progress: 0 = start of tracking, 100 = kickoff
  const totalMs = WORLD_CUP_START - EARLIEST;
  const elapsed = Math.max(0, Math.min(totalMs, now - EARLIEST));
  const progressPct = Math.round((elapsed / totalMs) * 100);

  let titleText: string;
  let bodyText: string;
  let badgeLabel: string;
  let accentColor: "green" | "amber" | "gray" = "green";
  const effects: string[] = [];

  if (isOver) {
    titleText = "World Cup 2026 — Done";
    bodyText = "The final whistle blew on July 19. See you at the next one.";
    badgeLabel = "Tournament Complete";
    accentColor = "gray";
  } else if (isLive) {
    titleText = "World Cup 2026 is LIVE";
    bodyText = "The tournament is on. 32 teams. One trophy. Follow every match.";
    badgeLabel = "IN PROGRESS";
    accentColor = "amber";
    effects.push("confetti");
  } else {
    const totalSecs = Math.floor(msLeft / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    titleText = "FIFA World Cup 2026";
    bodyText = `${days} days, ${hours} hrs, ${mins} min until kickoff in Mexico City.`;
    // Keep within 320 chars — this is fine
    badgeLabel = `${days}d ${hours}h ${mins}m`;
  }

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: isLive || isOver
        ? ["title", "badge_el", "sep", "body", "share_btn"]
        : ["title", "badge_el", "sep", "body", "progress_bar", "host_cities", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: titleText, weight: "bold", align: "center" },
    },
    badge_el: {
      type: "badge",
      props: {
        label: badgeLabel,
        variant: isLive ? "default" : "outline",
        color: isLive ? "amber" : isOver ? "gray" : "green",
      },
    },
    sep: { type: "separator", props: {} },
    body: {
      type: "text",
      props: { content: bodyText, align: "center", size: "sm" },
    },
    progress_bar: {
      type: "progress",
      props: {
        value: progressPct,
        max: 100,
        label: "Time to kickoff",
        color: "green",
      },
    },
    host_cities: {
      type: "text",
      props: {
        content: "Hosted across USA, Canada & Mexico · June 11 – July 19, 2026",
        size: "sm",
        align: "center",
      },
    },
    share_btn: {
      type: "button",
      props: { label: "Share", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: shareText,
            embeds: [self],
          },
        },
      },
    },
  };

  const result: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: accentColor },
    ui: { root: "page", elements },
  };

  if (effects.length > 0) {
    result.effects = effects as ["confetti"];
  }

  return result;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  return renderCountdown(self);
});

export default app;
