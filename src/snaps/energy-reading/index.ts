/**
 * energy-reading — the wizard reads your energy.
 *
 * GET:  Two sliders (Energy 0–100, Chaos 0–100) + submit button.
 * POST: item_group showing your stats + a personalised wizard reading.
 *       compose_cast share button pre-filled with your result.
 *
 * New components: slider (×2), item_group, item
 * New accent color: pink
 * Actions: submit, compose_cast
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SNAP_NAME = "energy-reading";

// ── Readings — bucketed by (energy, chaos) quadrant ────────────────────────

function getReading(energy: number, chaos: number): string {
  if (energy >= 70 && chaos >= 70)
    return "Off the charts on both axes. The wizard is getting interference. You might be a problem — or a gift. Probably both.";
  if (energy >= 70 && chaos <= 30)
    return "Disciplined and ready. You know what you want and you're going after it. The wizard respects this.";
  if (energy <= 30 && chaos >= 70)
    return "Tired but volatile. The wizard has seen this before. Rest is the spell you need right now.";
  if (energy <= 30 && chaos <= 30)
    return "Still. Peaceful. Or just done. The wizard reads no threats here.";
  if (energy >= 70)
    return "High energy, somewhere between order and chaos. You're moving fast — just make sure you know the direction.";
  if (chaos >= 70)
    return "Riding the chaos wave. Creative or chaotic? The wizard thinks: creative. Lean into it.";
  if (energy <= 30)
    return "Low energy, balanced chaos. You're coasting. Sometimes that's wisdom. Sometimes it's a nap.";
  if (chaos <= 30)
    return "Low chaos, steady energy. You're operating like a machine. The wizard is slightly suspicious.";
  return "Perfectly in the middle on both axes. The wizard cannot get a clear read. That's either very zen or very evasive.";
}

function levelLabel(val: number): string {
  if (val >= 80) return "Very high";
  if (val >= 60) return "High";
  if (val >= 40) return "Medium";
  if (val >= 20) return "Low";
  return "Very low";
}

// ── Snap handler ────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // ── GET: input screen ───────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "pink" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "sub", "sep1", "energy_slider", "chaos_slider", "sep2", "read_btn"],
          },
          title: {
            type: "text",
            props: { content: "The Wizard Reads Your Energy", weight: "bold", align: "center" },
          },
          sub: {
            type: "text",
            props: {
              content: "Set your sliders. The wizard sees all.",
              size: "sm",
              align: "center",
            },
          },
          sep1: { type: "separator", props: {} },
          energy_slider: {
            type: "slider",
            props: {
              name: "energy",
              label: "Your Energy",
              min: 0,
              max: 100,
              step: 10,
              defaultValue: 50,
              showValue: true,
            },
          },
          chaos_slider: {
            type: "slider",
            props: {
              name: "chaos",
              label: "Your Chaos",
              min: 0,
              max: 100,
              step: 10,
              defaultValue: 50,
              showValue: true,
            },
          },
          sep2: { type: "separator", props: {} },
          read_btn: {
            type: "button",
            props: { label: "Read my energy", variant: "primary" },
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

  // ── POST: show reading ─────────────────────────────────────────────────
  const energy = typeof ctx.action.inputs?.energy === "number" ? ctx.action.inputs.energy : 50;
  const chaos = typeof ctx.action.inputs?.chaos === "number" ? ctx.action.inputs.chaos : 50;

  const reading = getReading(energy, chaos);

  const shareText = `energy: ${energy}/100, chaos: ${chaos}/100 — the wizard gave me a reading 🔮`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "pink" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["title", "sep1", "stats", "sep2", "reading_text", "share_btn"],
        },
        title: {
          type: "text",
          props: { content: "The Wizard's Reading", weight: "bold", align: "center" },
        },
        sep1: { type: "separator", props: {} },
        stats: {
          type: "item_group",
          props: { border: true, separator: true },
          children: ["energy_item", "chaos_item"],
        },
        energy_item: {
          type: "item",
          props: {
            title: "Energy",
            description: `${energy}/100 — ${levelLabel(energy)}`,
          },
        },
        chaos_item: {
          type: "item",
          props: {
            title: "Chaos",
            description: `${chaos}/100 — ${levelLabel(chaos)}`,
          },
        },
        sep2: { type: "separator", props: {} },
        reading_text: {
          type: "text",
          props: { content: reading, align: "center" },
        },
        share_btn: {
          type: "button",
          props: { label: "Share my reading", variant: "secondary" },
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
});

export default app;
