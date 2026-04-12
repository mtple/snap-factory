/**
 * tip-calculator — enter a bill, pick your tip % and how many people, get the split.
 *
 * Two-page snap: form → result.
 * Stateless — all math happens server-side on POST.
 *
 * Components: text, input, toggle_group (x2), button, item_group, item, separator
 * Actions: submit, compose_cast
 * Accent: teal
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "tip-calculator";

type Elements = Record<string, SnapElementInput>;

const TIP_OPTIONS = ["15%", "18%", "20%", "22%", "25%"];
const SPLIT_OPTIONS = ["1", "2", "3", "4", "5", "6"];

// ── Page 1: input form ────────────────────────────────────────────────────

interface FormOpts {
  errorMsg?: string;
  tipPct?: string;   // selected tip option string, e.g. "18%"
  split?: string;    // selected split option string, e.g. "1"
}

function renderForm(opts: FormOpts = {}): SnapHandlerResult {
  const { errorMsg, tipPct = "18%", split = "1" } = opts;

  const children = ["title", "subtitle", "sep"];
  if (errorMsg) children.push("err_msg");
  children.push("bill", "tip_pct", "split_count", "calc_btn", "share_btn");

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children,
    },
    title: {
      type: "text",
      props: { content: "Tip Calculator", weight: "bold" },
    },
    subtitle: {
      type: "text",
      props: { content: "Split the bill in seconds.", size: "sm" },
    },
    sep: { type: "separator", props: {} },
    bill: {
      type: "input",
      props: {
        name: "bill",
        type: "number",
        label: "Bill total ($)",
        placeholder: "e.g. 42.00",
        maxLength: 10,
      },
    },
    tip_pct: {
      type: "toggle_group",
      props: {
        name: "tip_pct",
        label: "Tip percentage",
        options: TIP_OPTIONS,
        orientation: "horizontal",
        variant: "outline",
        defaultValue: tipPct,
      },
    },
    split_count: {
      type: "toggle_group",
      props: {
        name: "split_count",
        label: "Split between (people)",
        options: SPLIT_OPTIONS,
        orientation: "horizontal",
        variant: "outline",
        defaultValue: split,
      },
    },
    calc_btn: {
      type: "button",
      props: { label: "Calculate", variant: "primary" },
      on: {
        press: {
          action: "submit",
          params: { target: "" }, // filled in at render time via self
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
            text: "handy tip calculator snap from @freeturtle",
            embeds: [""], // filled in at render time via self
          },
        },
      },
    },
  };

  if (errorMsg) {
    elements["err_msg"] = {
      type: "text",
      props: { content: errorMsg, size: "sm" },
    };
  }

  return {
    version: "1.0",
    theme: { accent: "teal" },
    ui: { root: "page", elements },
  };
}

// ── Page 2: result ────────────────────────────────────────────────────────

function renderResult(
  bill: number,
  tipPct: number,
  split: number,
  self: string,
): SnapHandlerResult {
  const tipAmt = bill * (tipPct / 100);
  const total = bill + tipAmt;
  const perPerson = total / split;

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const splitLabel =
    split > 1
      ? `${fmt(perPerson)} each (${split} people)`
      : fmt(total);

  const shareText =
    split > 1
      ? `split ${split} ways: ${splitLabel} — calculated with @freeturtle's tip calculator`
      : `total with ${tipPct}% tip: ${fmt(total)} — @freeturtle's tip calculator`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "sep", "result_group", "sep2", "recalc_btn", "share_btn"],
    },
    title: {
      type: "text",
      props: { content: "Here's your split", weight: "bold" },
    },
    sep: { type: "separator", props: {} },
    tip_item: {
      type: "item",
      props: {
        title: "Tip",
        description: `${tipPct}% of ${fmt(bill)} = ${fmt(tipAmt)}`,
      },
    },
    total_item: {
      type: "item",
      props: {
        title: "Total (bill + tip)",
        description: fmt(total),
      },
    },
    per_person_item: {
      type: "item",
      props: {
        title: split > 1 ? `Per person (${split} people)` : "You owe",
        description: split > 1 ? fmt(perPerson) : fmt(total),
      },
    },
    result_group: {
      type: "item_group",
      props: {},
      children: ["tip_item", "total_item", "per_person_item"],
    },
    sep2: { type: "separator", props: {} },
    recalc_btn: {
      type: "button",
      props: { label: "Calculate again", variant: "secondary" },
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
  };

  return {
    version: "1.0",
    theme: { accent: "teal" },
    effects: ["confetti"],
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);

  // Patch self into the form's button targets
  function makeForm(opts: FormOpts = {}): SnapHandlerResult {
    const snap = renderForm(opts);
    const els = snap.ui.elements as Elements;
    (els["calc_btn"] as SnapElementInput & { on: { press: { params: { target: string } } } }).on.press.params.target = self;
    (els["share_btn"] as SnapElementInput & { on: { press: { params: { embeds: string[] } } } }).on.press.params.embeds = [self];
    return snap;
  }

  // GET: show the form with defaults
  if (ctx.action.type === "get") {
    return makeForm();
  }

  // POST: form submitted — validate and go directly to result
  const inputs = ctx.action.inputs ?? {};

  // bill may arrive as string or number depending on client — normalise to string
  const billStr = inputs["bill"] != null ? String(inputs["bill"]).trim() : "";

  // Empty bill = "Calculate again" tapped from result page — show fresh form
  if (!billStr) {
    return makeForm();
  }

  // toggle_group (single) returns the selected option string
  const tipOption = (inputs["tip_pct"] as string | undefined) ?? "18%";
  const splitOption = (inputs["split_count"] as string | undefined) ?? "1";

  // Validate that options are in our known sets (guard against tampered payloads)
  const safeTipOption = TIP_OPTIONS.includes(tipOption) ? tipOption : "18%";
  const safeSplitOption = SPLIT_OPTIONS.includes(splitOption) ? splitOption : "1";

  const bill = parseFloat(billStr);
  if (isNaN(bill) || bill <= 0 || bill > 100_000) {
    return makeForm({
      errorMsg: "Enter a valid bill amount (e.g. 42.00).",
      tipPct: safeTipOption,
      split: safeSplitOption,
    });
  }

  // Parse numeric values from option strings
  const tipPct = parseInt(safeTipOption.replace("%", ""), 10);
  const split = parseInt(safeSplitOption, 10);

  return renderResult(bill, tipPct, split, self);
});

export default app;
