/**
 * farcaster-100 — Community tap counter.
 *
 * The whole community works together to hit 100 taps in a day.
 * One tap per FID per day. Progress bar shows how close we are.
 * Confetti fires when you land the 100th tap.
 *
 * Components: progress, badge, text, button, separator
 * Actions:    submit, compose_cast
 * State:      Turso KV (daily count + per-FID tapped flag)
 * Theme:      green
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "farcaster-100";
const GOAL = 100;

function today(): string {
  return new Date().toISOString().slice(0, 10); // "2026-04-22"
}

async function getCounter(
  date: string,
): Promise<{ count: number; contributors: number }> {
  const [count, contributors] = await Promise.all([
    store.get(`farcaster-100:count:${date}`),
    store.get(`farcaster-100:contributors:${date}`),
  ]);
  return {
    count: typeof count === "number" ? count : 0,
    contributors: typeof contributors === "number" ? contributors : 0,
  };
}

async function hasTapped(fid: number, date: string): Promise<boolean> {
  const val = await store.get(`farcaster-100:tapped:${fid}:${date}`);
  return val === 1;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const date = today();

  // ── POST: handle a tap ────────────────────────────────────────────────
  if (ctx.action.type === "post") {
    const fid = ctx.action.fid;
    const alreadyTapped = await hasTapped(fid, date);

    if (alreadyTapped) {
      // Already contributed today — show current progress
      const { count, contributors } = await getCounter(date);
      const pct = Math.min(count, GOAL);
      const isGoalHit = count >= GOAL;

      const response: SnapHandlerResult = {
        version: "1.0",
        theme: { accent: "green" },
        ui: {
          root: "page",
          elements: {
            page: {
              type: "stack",
              props: { direction: "vertical", gap: "md" },
              children: [
                "title",
                "already_text",
                "sep",
                "progress_bar",
                "contrib_badge",
                "share_btn",
              ],
            },
            title: {
              type: "text",
              props: {
                content: isGoalHit ? "Goal hit! 🎯" : "The Big 100",
                weight: "bold",
                align: "center",
              },
            },
            already_text: {
              type: "text",
              props: {
                content:
                  "You already tapped today. Come back tomorrow for another go.",
                size: "sm",
                align: "center",
              },
            },
            sep: { type: "separator", props: {} },
            progress_bar: {
              type: "progress",
              props: {
                value: pct,
                max: GOAL,
                label: `${count} of ${GOAL} taps today`,
              },
            },
            contrib_badge: {
              type: "badge",
              props: {
                label: `${contributors} contributor${contributors !== 1 ? "s" : ""}`,
                color: "green",
              },
            },
            share_btn: {
              type: "button",
              props: { label: "Share", variant: "secondary" },
              on: {
                press: {
                  action: "compose_cast",
                  params: {
                    text: `we're at ${count}/${GOAL} taps on this community counter. add yours 👇`,
                    embeds: [self],
                  },
                },
              },
            },
          },
        },
      };
      return response;
    }

    // New tap — increment counters
    const { count: prevCount, contributors: prevContribs } =
      await getCounter(date);
    const newCount = prevCount + 1;
    const newContribs = prevContribs + 1;

    await Promise.all([
      store.set(`farcaster-100:count:${date}`, newCount),
      store.set(`farcaster-100:contributors:${date}`, newContribs),
      store.set(`farcaster-100:tapped:${fid}:${date}`, 1),
    ]);

    const hitGoal = newCount === GOAL;
    const pastGoal = newCount > GOAL;
    const pct = Math.min(newCount, GOAL);

    let tapMessage: string;
    if (hitGoal) {
      tapMessage = `YOU DID IT. That's tap #${GOAL}. Community wins today.`;
    } else if (pastGoal) {
      tapMessage = `Tap #${newCount} — we already cleared ${GOAL}! Still going.`;
    } else {
      tapMessage = `You're tap #${newCount} of ${GOAL}. ${GOAL - newCount} left.`;
    }

    const shareText =
      hitGoal
        ? `just landed tap #${GOAL} on the community counter 🎯`
        : pastGoal
          ? `we cleared ${GOAL} taps today. still going at #${newCount} 🎯`
          : `added tap #${newCount}/${GOAL} to the community counter. ${GOAL - newCount} left!`;

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "green" },
      effects: hitGoal ? ["confetti"] : undefined,
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: [
              "tap_msg",
              "sep",
              "progress_bar",
              "contrib_badge",
              "share_btn",
            ],
          },
          tap_msg: {
            type: "text",
            props: {
              content: tapMessage,
              weight: "bold",
              align: "center",
            },
          },
          sep: { type: "separator", props: {} },
          progress_bar: {
            type: "progress",
            props: {
              value: pct,
              max: GOAL,
              label: `${newCount} of ${GOAL} taps today`,
            },
          },
          contrib_badge: {
            type: "badge",
            props: {
              label: `${newContribs} contributor${newContribs !== 1 ? "s" : ""}`,
              color: "green",
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
        },
      },
    };
    return response;
  }

  // ── GET: initial view ─────────────────────────────────────────────────
  const { count, contributors } = await getCounter(date);
  const pct = Math.min(count, GOAL);
  const isGoalHit = count >= GOAL;

  const subtitle = isGoalHit
    ? `We hit ${GOAL} today. The community delivered. 🎯`
    : `${GOAL - count} taps left to hit today's goal.`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "green" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "title",
            "subtitle",
            "sep",
            "progress_bar",
            "contrib_badge",
            "tap_btn",
            "share_btn",
          ],
        },
        title: {
          type: "text",
          props: {
            content: "The Big 100",
            weight: "bold",
            align: "center",
          },
        },
        subtitle: {
          type: "text",
          props: { content: subtitle, size: "sm", align: "center" },
        },
        sep: { type: "separator", props: {} },
        progress_bar: {
          type: "progress",
          props: {
            value: pct,
            max: GOAL,
            label: `${count} of ${GOAL} taps today`,
          },
        },
        contrib_badge: {
          type: "badge",
          props: {
            label: `${contributors} contributor${contributors !== 1 ? "s" : ""}`,
            color: "green",
          },
        },
        tap_btn: {
          type: "button",
          props: { label: "Add my tap", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: self },
            },
          },
        },
        share_btn: {
          type: "button",
          props: { label: "Share", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `can farcaster hit ${GOAL} taps today? one tap per person. add yours 👇`,
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
