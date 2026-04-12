/**
 * tip-calculator — enter a bill, pick your tip % and how many people, get the split.
 *
 * Two-page snap: form (shows chosen values inline) → result.
 * Stateless — all math happens server-side on POST.
 *
 * Components: text, input, slider (x2), button, item_group, item, separator
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

// ── Page 1: input form ────────────────────────────────────────────────────

interface FormOpts {
  errorMsg?: string;
  tipPct?: number;   // current tip % to display (default 18)
  split?: number;    // current split count to display (default 1)
}

function renderForm(opts: FormOpts = {}): SnapHandlerResult {
  const { errorMsg, tipPct = 18, split = 1 } = opts;

  const tipNote = `${tipPct}%`;
  const splitNote = `${split} ${split === 1 ? "person" : "people"}`;

  const children = ["title", "subtitle", "sep"];
  if (errorMsg) children.push("err_msg");
  children.push("bill", "tip_pct", "tip_note", "split_count", "split_note", "calc_btn", "share_btn");

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
      type: "slider",
      props: {
        name: "tip_pct",
        label: "Tip % (0–30)",
        min: 0,
        max: 30,
        step: 1,
        defaultValue: tipPct,
      },
    },
    tip_note: {
      type: "text",
      props: { content: `Tip: ${tipNote}`, size: "sm" },
    },
    split_count: {
      type: "slider",
      props: {
        name: "split_count",
        label: "Split between (1–8)",
        min: 1,
        max: 8,
        step: 1,
        defaultValue: split,
      },
    },
    split_note: {
      type: "text",
      props: { content: `Splitting: ${splitNote}`, size: "sm" },
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
  const billRaw = inputs["bill"] as string | undefined;

  // Empty inputs = "Calculate again" tapped from result page — show form
  if (!billRaw || billRaw.trim() === "") {
    return makeForm();
  }

  const bill = parseFloat(billRaw);

  const tipPctRaw = inputs["tip_pct"];
  const splitRaw = inputs["split_count"];
  const tipPct = typeof tipPctRaw === "number" ? Math.round(tipPctRaw) : 18;
  const split = typeof splitRaw === "number" ? Math.round(splitRaw) : 1;
  const safeTip = Math.max(0, Math.min(30, tipPct));
  const safeSplit = Math.max(1, Math.min(8, split));

  if (isNaN(bill) || bill <= 0 || bill > 100_000) {
    return makeForm({ errorMsg: "Enter a valid bill amount (e.g. 42.00).", tipPct: safeTip, split: safeSplit });
  }

  // Go directly to results — no confirm page
  return renderResult(bill, safeTip, safeSplit, self);
});

export default app;
