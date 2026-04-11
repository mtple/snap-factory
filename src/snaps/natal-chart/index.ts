/**
 * natal-chart — birth chart generator.
 *
 * Enter your birth month, day, year, and hour to get your sun sign,
 * approximate moon sign, and approximate rising sign with traits.
 *
 * GET:  Birth details input form
 * POST: Computed natal chart (sun, moon, rising)
 *
 * Components: text, input, button, separator
 * Accent: purple
 * Actions: submit
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();

const SIGNS = [
  { name: "Aries",       symbol: "♈", element: "Fire",  modality: "Cardinal", traits: "Bold, energetic, pioneering, driven" },
  { name: "Taurus",      symbol: "♉", element: "Earth", modality: "Fixed",    traits: "Patient, reliable, sensual, stubborn" },
  { name: "Gemini",      symbol: "♊", element: "Air",   modality: "Mutable",  traits: "Curious, witty, adaptable, restless" },
  { name: "Cancer",      symbol: "♋", element: "Water", modality: "Cardinal", traits: "Intuitive, nurturing, protective, moody" },
  { name: "Leo",         symbol: "♌", element: "Fire",  modality: "Fixed",    traits: "Confident, creative, generous, dramatic" },
  { name: "Virgo",       symbol: "♍", element: "Earth", modality: "Mutable",  traits: "Analytical, precise, practical, critical" },
  { name: "Libra",       symbol: "♎", element: "Air",   modality: "Cardinal", traits: "Diplomatic, fair, social, indecisive" },
  { name: "Scorpio",     symbol: "♏", element: "Water", modality: "Fixed",    traits: "Passionate, perceptive, intense, secretive" },
  { name: "Sagittarius", symbol: "♐", element: "Fire",  modality: "Mutable",  traits: "Adventurous, optimistic, philosophical, free" },
  { name: "Capricorn",   symbol: "♑", element: "Earth", modality: "Cardinal", traits: "Ambitious, disciplined, patient, reserved" },
  { name: "Aquarius",    symbol: "♒", element: "Air",   modality: "Fixed",    traits: "Independent, original, humanitarian, aloof" },
  { name: "Pisces",      symbol: "♓", element: "Water", modality: "Mutable",  traits: "Compassionate, artistic, intuitive, dreamy" },
];

/** Sun sign index (0=Aries…11=Pisces) from birth month+day. */
function getSunIdx(month: number, day: number): number {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 0;
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 1;
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 2;
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 3;
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 4;
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 5;
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 6;
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 7;
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 8;
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 9;
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 10;
  return 11; // Pisces (Feb 19 – Mar 20)
}

/**
 * Approximate moon sign index.
 * Moon cycles in ~27.3 days (≈2.275 days per sign).
 * Reference anchor: Jan 1 2000 UTC ≈ Libra (index 6).
 */
function getMoonIdx(year: number, month: number, day: number): number {
  const ref = Date.UTC(2000, 0, 1);
  const birth = Date.UTC(year, month - 1, day);
  const daysDiff = (birth - ref) / 86_400_000;
  return ((Math.floor(daysDiff / 2.275) % 12) + 6 + 1200) % 12;
}

/**
 * Approximate rising sign index.
 * Rising changes ~every 2 hours; offset from sun sign by birth hour.
 */
function getRisingIdx(hour: number, sunIdx: number): number {
  return (sunIdx + Math.floor(hour / 2)) % 12;
}

// ── Views ─────────────────────────────────────────────────────────────────────

function formView(self: string, showError = false): SnapHandlerResult {
  const children = ["title", "sub"];
  if (showError) children.push("err");
  children.push("month_in", "day_in", "year_in", "hour_in", "go_btn");

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children,
        },
        title: {
          type: "text",
          props: { content: "✨ Natal Chart", weight: "bold", align: "center" },
        },
        sub: {
          type: "text",
          props: {
            content: "Enter your birth details to reveal your chart.",
            size: "sm",
            align: "center",
          },
        },
        err: {
          type: "text",
          props: {
            content: "Invalid date. Use month 1–12, day 1–31, and a 4-digit year.",
            size: "sm",
            align: "center",
          },
        },
        month_in: {
          type: "input",
          props: {
            name: "month",
            type: "number",
            label: "Birth Month (1–12)",
            placeholder: "e.g. 3",
            maxLength: 2,
          },
        },
        day_in: {
          type: "input",
          props: {
            name: "day",
            type: "number",
            label: "Birth Day (1–31)",
            placeholder: "e.g. 15",
            maxLength: 2,
          },
        },
        year_in: {
          type: "input",
          props: {
            name: "year",
            type: "number",
            label: "Birth Year",
            placeholder: "e.g. 1990",
            maxLength: 4,
          },
        },
        hour_in: {
          type: "input",
          props: {
            name: "hour",
            type: "number",
            label: "Birth Hour (0–23, optional)",
            placeholder: "e.g. 14",
            maxLength: 2,
          },
        },
        go_btn: {
          type: "button",
          props: { label: "Read My Chart", variant: "primary" },
          on: { press: { action: "submit", params: { target: self } } },
        },
      },
    },
  };
}

function chartView(
  self: string,
  sunIdx: number,
  moonIdx: number,
  risingIdx: number,
): SnapHandlerResult {
  const sun = SIGNS[sunIdx];
  const moon = SIGNS[moonIdx];
  const rising = SIGNS[risingIdx];

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            "title", "sep1",
            "sun_row", "moon_row", "rising_row",
            "sep2", "traits_lbl", "traits_txt",
            "sep3", "again_btn",
          ],
        },
        title: {
          type: "text",
          props: { content: "✨ Your Natal Chart", weight: "bold", align: "center" },
        },
        sep1: { type: "separator", props: {} },
        sun_row: {
          type: "text",
          props: {
            content: `☀️ Sun — ${sun.symbol} ${sun.name} · ${sun.element} · ${sun.modality}`,
            weight: "bold",
          },
        },
        moon_row: {
          type: "text",
          props: {
            content: `🌙 Moon — ${moon.symbol} ${moon.name} · ${moon.element} · ${moon.modality}`,
          },
        },
        rising_row: {
          type: "text",
          props: {
            content: `⬆️ Rising — ${rising.symbol} ${rising.name} · ${rising.element} · ${rising.modality}`,
          },
        },
        sep2: { type: "separator", props: {} },
        traits_lbl: {
          type: "text",
          props: { content: `${sun.name} traits:`, weight: "bold", size: "sm" },
        },
        traits_txt: {
          type: "text",
          props: { content: sun.traits, size: "sm" },
        },
        sep3: { type: "separator", props: {} },
        again_btn: {
          type: "button",
          props: { label: "New reading", variant: "secondary" },
          on: { press: { action: "submit", params: { target: self } } },
        },
      },
    },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, "natal-chart");

  if (ctx.action.type === "get") {
    return formView(self);
  }

  // POST — check if this is a "new reading" (no inputs) or a chart request
  const monthRaw = ctx.action.inputs?.month;

  // If month isn't present, the results page "New reading" button was pressed
  if (monthRaw === undefined || monthRaw === "") {
    return formView(self);
  }

  const month = parseInt(String(monthRaw), 10);
  const day   = parseInt(String(ctx.action.inputs?.day  ?? ""), 10);
  const year  = parseInt(String(ctx.action.inputs?.year ?? ""), 10);
  const hourRaw = ctx.action.inputs?.hour;
  const hour  = hourRaw && String(hourRaw).trim() !== ""
    ? Math.max(0, Math.min(23, parseInt(String(hourRaw), 10)))
    : 12; // default noon if not provided

  // Validate
  if (
    isNaN(month) || isNaN(day) || isNaN(year) ||
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    year < 1900 || year > 2100
  ) {
    return formView(self, true);
  }

  const sunIdx    = getSunIdx(month, day);
  const moonIdx   = getMoonIdx(year, month, day);
  const risingIdx = getRisingIdx(isNaN(hour) ? 12 : hour, sunIdx);

  return chartView(self, sunIdx, moonIdx, risingIdx);
});

export default app;
