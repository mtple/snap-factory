/**
 * wizard-dice — Roll polyhedral dice (d4 through d20) in one tap.
 *
 * GET:    Pick a die from d4/d6/d8/d10/d12/d20 toggle_group → Roll
 * POST:   Roll the chosen die, show result with flavor text.
 *         "Roll again" encodes die in URL param (?die=d20) so the
 *         same die rolls without needing to pick again.
 *         "Change die" returns to the picker screen.
 *
 * Confetti fires on a natural max (rolling the highest possible value).
 *
 * Components: toggle_group, badge, text, button, separator, stack
 * Actions:    submit, compose_cast
 * State:      stateless
 * Accent:     amber
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "wizard-dice";

const DICE_SIZES: Record<string, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};
const DIE_OPTIONS = Object.keys(DICE_SIZES); // ["d4","d6","d8","d10","d12","d20"]

function flavorText(die: string, result: number): string {
  const max = DICE_SIZES[die];
  if (result === max) return "Natural max. The wizard approves.";
  if (result === 1) return "Critical fumble. Happens to the best of us.";
  if (result >= Math.ceil(max * 0.8)) return "Strong roll.";
  if (result <= Math.floor(max * 0.2)) return "Rough one.";
  return "The die has spoken.";
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const url = new URL(ctx.request.url);

  // ── Determine if we should show the picker ────────────────────────────
  // Show picker on GET, or on POST when no die is found (change die / back)
  const dieFromInput =
    ctx.action.type === "post"
      ? (ctx.action.inputs?.die as string | undefined)
      : undefined;
  const dieFromParam = url.searchParams.get("die") ?? undefined;
  const chosenDie = dieFromInput || dieFromParam;

  const showPicker =
    ctx.action.type === "get" || !chosenDie || !DICE_SIZES[chosenDie];

  // ── Picker screen ─────────────────────────────────────────────────────
  if (showPicker) {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "amber" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "sub", "die_picker", "roll_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: {
              content: "Wizard Dice",
              weight: "bold",
              align: "center",
            },
          },
          sub: {
            type: "text",
            props: {
              content: "Pick a die and roll",
              size: "sm",
              align: "center",
            },
          },
          die_picker: {
            type: "toggle_group",
            props: {
              name: "die",
              label: "Choose your die",
              options: DIE_OPTIONS,
              orientation: "horizontal",
              variant: "outline",
              defaultValue: "d20",
            },
          },
          roll_btn: {
            type: "button",
            props: { label: "Roll", variant: "primary" },
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
                  text: "roll d4 through d20 in one tap — wizard dice 🎲",
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

  // ── Roll! ─────────────────────────────────────────────────────────────
  const die = chosenDie as string;
  const max = DICE_SIZES[die];
  const result = Math.floor(Math.random() * max) + 1;
  const isCrit = result === max;
  const flavor = flavorText(die, result);

  const rerollTarget = `${self}?die=${die}`;
  const shareText = `rolled a ${result} on a ${die} with wizard dice 🎲`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "amber" },
    effects: isCrit ? ["confetti"] : undefined,
    ui: {
      root: "result_page",
      elements: {
        result_page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "die_badge",
            "result_num",
            "flavor_txt",
            "sep",
            "reroll_btn",
            "change_btn",
            "share_btn",
          ],
        },
        die_badge: {
          type: "badge",
          props: { label: die, variant: "default" },
        },
        result_num: {
          type: "text",
          props: {
            content: String(result),
            weight: "bold",
            size: "md",
            align: "center",
          },
        },
        flavor_txt: {
          type: "text",
          props: { content: flavor, size: "sm", align: "center" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        reroll_btn: {
          type: "button",
          props: { label: `Roll ${die} again`, variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: rerollTarget },
            },
          },
        },
        change_btn: {
          type: "button",
          props: { label: "Change die", variant: "secondary" },
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
