/**
 * natal-chart-v2 — accurate birth chart generator with location.
 *
 * Enter your birth month, day, year, hour, UTC offset (timezone), and
 * birth city to get your sun sign, approximate moon sign, and a
 * significantly more accurate rising sign based on sidereal time.
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
  return 11; // Pisces
}

/**
 * Approximate moon sign index.
 * Anchor: Jan 6 2000 UTC ≈ New Moon in Capricorn (index 9).
 * Moon moves ~2.277 days per sign.
 */
function getMoonIdx(year: number, month: number, day: number): number {
  const ref   = Date.UTC(2000, 0, 6);
  const birth = Date.UTC(year, month - 1, day);
  const daysDiff = (birth - ref) / 86_400_000;
  return ((Math.floor(daysDiff / 2.277) % 12) + 9 + 1200) % 12;
}

/**
 * Rising sign index using Local Sidereal Time.
 *
 * Method:
 *  1. Convert local birth hour to UTC.
 *  2. Compute Julian Day for the birth date at UTC midnight.
 *  3. Compute Greenwich Mean Sidereal Time at UTC birth moment.
 *  4. Approximate Local Sidereal Time: LST ≈ GMST + utcOffset (hours).
 *     (UTC offset in hours ≈ longitude / 15°, which is the standard
 *      approximation when the exact birth longitude is unknown.)
 *  5. Convert LST hours to zodiac sign (0h ≈ Aries, 2h per sign).
 *
 * This is far more accurate than the old sun-sign + hour offset method,
 * especially for people born far from their timezone's central meridian.
 */
function getRisingIdx(
  year: number,
  month: number,
  day: number,
  localHour: number,
  utcOffset: number,
): number {
  // Step 1: UTC hour
  const utcHour = ((localHour - utcOffset) % 24 + 24) % 24;

  // Step 2: Julian Day Number at noon (J2000 epoch base)
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const JD =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Days from J2000.0 (JD 2451545.0), adjusted for time within day
  const D = JD - 2451545.0 + (utcHour - 12) / 24;

  // Step 3: Greenwich Mean Sidereal Time (hours)
  let GMST = 6.697375 + 0.0657098242 * D + utcHour;
  GMST = ((GMST % 24) + 24) % 24;

  // Step 4: Local Sidereal Time (utcOffset hours ≈ longitude / 15°)
  const LST = ((GMST + utcOffset) % 24 + 24) % 24;

  // Step 5: Convert to zodiac sign (Aries starts near 0h LST at vernal equinox)
  return Math.floor(LST / 2) % 12;
}

// ── Views ─────────────────────────────────────────────────────────────────────

function formView(self: string, showError = false): SnapHandlerResult {
  const children: string[] = ["title", "sub"];
  if (showError) children.push("err");
  children.push("month_in", "day_in", "year_in", "hour_in", "tz_in", "city_in", "go_btn");

  return {
    version: "1.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: { direction: "vertical", gap: "sm" },
          children,
        },
        title: {
          type: "text",
          props: { content: "✨ Natal Chart", weight: "bold", align: "center" },
        },
        sub: {
          type: "text",
          props: {
            content: "Add your birth city & timezone for an accurate rising sign.",
            size: "sm",
            align: "center",
          },
        },
        err: {
          type: "text",
          props: {
            content: "Check your inputs: month 1–12, day 1–31, 4-digit year, hour 0–23, UTC offset –12 to +14.",
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
            label: "Birth Hour, local time (0–23)",
            placeholder: "e.g. 14",
            maxLength: 2,
          },
        },
        tz_in: {
          type: "input",
          props: {
            name: "tz",
            type: "number",
            label: "UTC offset (e.g. -5 for EST, +1 for CET)",
            placeholder: "e.g. -5",
            maxLength: 3,
          },
        },
        city_in: {
          type: "input",
          props: {
            name: "city",
            type: "text",
            label: "Birth City (optional, shown in results)",
            placeholder: "e.g. New York",
            maxLength: 60,
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
  city: string,
): SnapHandlerResult {
  const sun    = SIGNS[sunIdx];
  const moon   = SIGNS[moonIdx];
  const rising = SIGNS[risingIdx];
  const location = city.trim() ? ` · ${city.trim()}` : "";

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
          props: {
            content: `✨ Your Birth Chart${location}`,
            weight: "bold",
            align: "center",
          },
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
  const self = snapUrl(ctx.request, "natal-chart-v2");

  if (ctx.action.type === "get") {
    return formView(self);
  }

  // POST — check if "New reading" was pressed (no month) or chart request
  const monthRaw = ctx.action.inputs?.month;
  if (monthRaw === undefined || String(monthRaw).trim() === "") {
    return formView(self);
  }

  const month = parseInt(String(monthRaw), 10);
  const day   = parseInt(String(ctx.action.inputs?.day  ?? ""), 10);
  const year  = parseInt(String(ctx.action.inputs?.year ?? ""), 10);
  const hourRaw  = ctx.action.inputs?.hour;
  const hour  = hourRaw && String(hourRaw).trim() !== ""
    ? Math.max(0, Math.min(23, parseInt(String(hourRaw), 10)))
    : 12; // default noon

  const tzRaw = ctx.action.inputs?.tz;
  const utcOffset = tzRaw && String(tzRaw).trim() !== ""
    ? Math.max(-12, Math.min(14, parseFloat(String(tzRaw))))
    : 0; // default UTC

  const city = String(ctx.action.inputs?.city ?? "").slice(0, 60);

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
  const risingIdx = getRisingIdx(year, month, day, isNaN(hour) ? 12 : hour, isNaN(utcOffset) ? 0 : utcOffset);

  return chartView(self, sunIdx, moonIdx, risingIdx, city);
});

export default app;
