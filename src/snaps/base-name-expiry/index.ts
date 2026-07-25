/**
 * base-name-expiry — paste a Base name and get a lightweight renewal forecast.
 *
 * Components: input, badge, progress, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "base-name-expiry";
const PROFILE_API = "https://api.web3.bio/profile/ens/";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Web3BioProfile = {
  identity?: string;
  address?: string | null;
  createdAt?: string | null;
};

type Forecast = {
  name: string;
  displayName: string;
  source: string;
  window: string;
  riskLabel: string;
  risk: number;
  nextAction: string;
  accent: Accent;
  renewalUrl: string;
};

function cleanText(raw: unknown, fallback: string, max = 300): string {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim() || fallback;
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function normalizeBaseName(raw: unknown): string | null {
  const cleaned = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?base\.org\/names\//, "")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  if (!cleaned) return null;
  const name = cleaned.includes(".") ? cleaned : `${cleaned}.base.eth`;
  if (!/^[a-z0-9_-]{1,64}(\.[a-z0-9_-]{1,64})*\.base\.eth$/.test(name)) return null;
  return name;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function daysBetween(a: Date, b: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / dayMs));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextAnniversary(createdAt: string, now = new Date()): Date | null {
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  let next = new Date(Date.UTC(now.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
  if (next.getTime() < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
    next = new Date(Date.UTC(now.getUTCFullYear() + 1, created.getUTCMonth(), created.getUTCDate()));
  }
  return next;
}

function riskFromDays(days: number): { risk: number; label: string; accent: Accent } {
  if (days <= 7) return { risk: 94, label: "renew this week", accent: "red" };
  if (days <= 30) return { risk: 78, label: "set a reminder", accent: "amber" };
  if (days <= 90) return { risk: 54, label: "watchlist season", accent: "blue" };
  return { risk: 24, label: "plenty of runway", accent: "green" };
}

function fallbackDate(name: string, now = new Date()): Date {
  const hash = hashString(name);
  const days = 21 + (hash % 344);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

function renewalUrl(name: string): string {
  return `https://www.base.org/names/${encodeURIComponent(name)}`;
}

function forecastFromProfile(name: string, profile: Web3BioProfile | null, now = new Date()): Forecast {
  const apiName = normalizeBaseName(profile?.identity) ?? name;
  const date = profile?.createdAt ? nextAnniversary(profile.createdAt, now) : null;
  const target = date ?? fallbackDate(name, now);
  const days = daysBetween(now, target);
  const risk = riskFromDays(days);
  const source = date
    ? `Source: public profile created ${formatDate(new Date(profile!.createdAt!))}; renewal is estimated from the next anniversary.`
    : "Source: lookup unavailable, so this is a deterministic reminder forecast — not an onchain expiry guarantee.";
  const window = date
    ? `Renewal window: check by ${formatDate(target)} (${days} days). Start watching 30 days before.`
    : `Reminder window: check around ${formatDate(target)} (${days} days). Verify the real expiry on Base.`;
  const nextAction = days <= 30
    ? "Next action: open Base Names now and confirm renewal status. Do not trust the goblin with custody."
    : "Next action: add a calendar reminder, then verify the exact expiry on Base Names.";

  return {
    name,
    displayName: apiName,
    source,
    window,
    riskLabel: risk.label,
    risk: risk.risk,
    nextAction,
    accent: risk.accent,
    renewalUrl: renewalUrl(apiName),
  };
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchProfile(name: string): Promise<Web3BioProfile | null> {
  try {
    return await withTimeout(4500, async (signal) => {
      const res = await fetch(`${PROFILE_API}${encodeURIComponent(name)}`, {
        headers: { Accept: "application/json", "User-Agent": "SnapWizard/1.0" },
        signal,
      });
      if (!res.ok) return null;
      return (await res.json()) as Web3BioProfile;
    });
  } catch {
    return null;
  }
}

function shareButton(self: string, text = "Base Name Expiry checks a Basename and prints a tiny renewal reminder."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share snap", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text: text.slice(0, 280), embeds: [self] } } },
  };
}

function startPage(self: string, error?: string): SnapHandlerResult {
  const children = error ? ["title", "intro", "error", "name", "lookup_btn", "share_btn"] : ["title", "intro", "name", "lookup_btn", "share_btn"];
  const elements: Elements = {
    page: { type: "stack", props: { direction: "vertical", gap: "md" }, children },
    title: { type: "text", props: { content: "Base Name Expiry", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Paste a Basename. I’ll check a public profile signal, estimate the next renewal window, and give you a Base Names CTA. Lookup can take a few seconds.",
        size: "sm",
        align: "center",
      },
    },
    name: { type: "input", props: { name: "name", label: "Base name", placeholder: "matt.base.eth", maxLength: 80 } },
    lookup_btn: {
      type: "button",
      props: { label: "Forecast expiry", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=forecast` } } },
    },
    share_btn: shareButton(self),
  };
  if (error) elements.error = { type: "text", props: { content: error, size: "sm", align: "center" } };
  return { version: "2.0", theme: { accent: "blue" }, ui: { root: "page", elements } };
}

function resultPage(self: string, forecast: Forecast): SnapHandlerResult {
  const shareText = `${forecast.displayName} renewal forecast: ${forecast.riskLabel}. ${forecast.window}`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "source", "window", "risk", "next", "actions"],
    },
    title: { type: "text", props: { content: forecast.displayName, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: forecast.riskLabel, variant: "outline", color: "accent" } },
    source: { type: "text", props: { content: cleanText(forecast.source, "Source unavailable."), size: "sm", align: "center" } },
    window: { type: "text", props: { content: forecast.window, size: "sm", align: "center" } },
    risk: { type: "progress", props: { label: "Renewal urgency", value: forecast.risk, max: 100, color: forecast.accent } },
    next: { type: "text", props: { content: forecast.nextAction, size: "sm", align: "center" } },
    renew_btn: {
      type: "button",
      props: { label: "Open Base Names", variant: "primary" },
      on: { press: { action: "open_url", params: { target: forecast.renewalUrl } } },
    },
    again_btn: {
      type: "button",
      props: { label: "New name", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["renew_btn", "again_btn", "share_btn"] },
  };
  return { version: "2.0", theme: { accent: forecast.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") !== "forecast") return startPage(self);

    const name = normalizeBaseName(ctx.action.inputs?.name);
    if (!name) return startPage(self, "Enter a Basename like matt.base.eth or just matt.");

    const profile = await fetchProfile(name);
    return resultPage(self, forecastFromProfile(name, profile));
  },
  {
    openGraph: {
      title: "Base Name Expiry",
      description: "Paste a Basename and get a tiny renewal forecast plus a Base Names CTA.",
    },
  },
);

export { normalizeBaseName, forecastFromProfile };
export default app;
