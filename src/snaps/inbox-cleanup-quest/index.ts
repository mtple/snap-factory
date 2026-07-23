/**
 * inbox-cleanup-quest — sort a tiny 3x3 inbox into keep/close/reply actions.
 *
 * Components: text, badge, cell_grid, item_group, item, button, stack
 * Actions: submit, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "inbox-cleanup-quest";
const GRID_SIZE = 9;

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type InboxAction = "keep" | "close" | "reply";

type InboxItem = {
  id: string;
  label: string;
  action: InboxAction;
  receipt: string;
  color: Accent;
};

type GridCell = {
  row: number;
  col: number;
  color: Accent;
  content: string;
  value: string;
};

type Receipt = {
  selected: InboxItem[];
  parked: InboxItem[];
  keep: number;
  close: number;
  reply: number;
  score: number;
  headline: string;
  nextMove: string;
  accent: Accent;
};

const INBOX_ITEMS: InboxItem[] = [
  { id: "vip", label: "VIP ping", action: "reply", receipt: "Reply with one crisp sentence before it becomes lore.", color: "purple" },
  { id: "coupon", label: "Coupon fog", action: "close", receipt: "Archive. The discount goblin is baiting you.", color: "gray" },
  { id: "bug", label: "Bug clue", action: "keep", receipt: "Keep. Future-you needs this breadcrumb.", color: "amber" },
  { id: "calendar", label: "Calendar duel", action: "reply", receipt: "Reply with two time windows and no apology spiral.", color: "blue" },
  { id: "newsletter", label: "Essay wall", action: "close", receipt: "Close. If it mattered, it will haunt the timeline later.", color: "teal" },
  { id: "receipt", label: "Tiny receipt", action: "keep", receipt: "Keep. Taxes are a dragon with perfect memory.", color: "green" },
  { id: "intro", label: "Warm intro", action: "reply", receipt: "Reply kindly. The bridge troll accepts short notes.", color: "pink" },
  { id: "alert", label: "Fake alert", action: "close", receipt: "Close. Red badges are not a personality test.", color: "red" },
  { id: "idea", label: "Good idea", action: "keep", receipt: "Keep. Label it before it escapes into a notes swamp.", color: "purple" },
  { id: "thread", label: "Thread debt", action: "reply", receipt: "Reply with the useful part; ignore the courtroom seating.", color: "teal" },
  { id: "invoice", label: "Invoice imp", action: "keep", receipt: "Keep and pay attention. The imp brought numbers.", color: "amber" },
  { id: "sale", label: "Sale siren", action: "close", receipt: "Close. The siren only knows one song: buy later.", color: "pink" },
  { id: "friend", label: "Friend check", action: "reply", receipt: "Reply now. Humans beat inbox archaeology.", color: "green" },
  { id: "policy", label: "Policy mist", action: "close", receipt: "Close unless a real deadline is staring at you.", color: "gray" },
  { id: "access", label: "Access key", action: "keep", receipt: "Keep. Login keys vanish the second you need them.", color: "blue" },
  { id: "survey", label: "Survey trap", action: "close", receipt: "Close. Five minutes is never five minutes.", color: "red" },
  { id: "draft", label: "Draft ghost", action: "reply", receipt: "Reply with the tiny version. The ghost wanted closure.", color: "purple" },
  { id: "shipping", label: "Ship note", action: "keep", receipt: "Keep. Tracking numbers are breadcrumbs with shoes.", color: "teal" },
];

const ACTION_LABELS: Record<InboxAction, string> = {
  keep: "Keep",
  close: "Close",
  reply: "Reply",
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function itemsFor(fid: number): InboxItem[] {
  const seed = hashText(`${todayKey()}|${Math.max(0, Math.floor(fid || 0))}|${SNAP_NAME}`);
  const rand = mulberry32(seed);
  const pool = [...INBOX_ITEMS];
  const picks: InboxItem[] = [];
  while (picks.length < GRID_SIZE && pool.length > 0) {
    const index = Math.floor(rand() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item) picks.push(item);
  }
  return picks;
}

function cellsFor(items: InboxItem[]): GridCell[] {
  return items.map((item, index) => ({
    row: Math.floor(index / 3),
    col: index % 3,
    color: item.color,
    content: item.label,
    value: item.id,
  }));
}

function selectedValues(raw: unknown): Set<string> {
  const pieces = Array.isArray(raw)
    ? raw.flatMap((value) => String(value ?? "").split(","))
    : String(raw ?? "").split(",");
  return new Set(pieces.map((piece) => piece.trim()).filter(Boolean));
}

function buildReceipt(items: InboxItem[], selectedIds: Set<string>): Receipt {
  const selected = items.filter((item) => selectedIds.has(item.id));
  const parked = items.filter((item) => !selectedIds.has(item.id));
  const keep = selected.filter((item) => item.action === "keep").length;
  const close = selected.filter((item) => item.action === "close").length;
  const reply = selected.filter((item) => item.action === "reply").length;
  const score = Math.round((selected.length / GRID_SIZE) * 100);
  const accent: Accent = selected.length >= 7 ? "green" : selected.length >= 4 ? "teal" : "amber";
  const headline = selected.length === 0
    ? "No mail moved. Inbox goblin remains employed."
    : selected.length >= 7
      ? "Inbox mostly exorcised. The badge monster is sweating."
      : "Partial cleanse logged. The inbox floor is visible again.";
  const nextMove = selected.length === GRID_SIZE
    ? "Quest complete: close the tab before new mail spawns."
    : parked.length > 0
      ? `Next tiny move: handle ${parked[0]?.label ?? "one parked note"}.`
      : "Quest complete: breathe, hydrate, do not reopen spam.";
  return { selected, parked, keep, close, reply, score, headline, nextMove, accent };
}

function shareButton(self: string, text = "I ran Inbox Cleanup Quest. Tiny mail goblins were sorted responsibly.") {
  return {
    type: "button" as const,
    props: { label: "Share quest", variant: "secondary" as const },
    on: { press: { action: "compose_cast" as const, params: { text: text.slice(0, 280), embeds: [self] } } },
  };
}

function startPage(self: string, fid: number): SnapHandlerResult {
  const items = itemsFor(fid);
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "intro", "grid", "hint", "clean_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Inbox Cleanup Quest", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Select the inbox goblins you will handle now. The wizard files each picked item as Keep, Close, or Reply.",
        size: "sm",
        align: "center",
      },
    },
    grid: {
      type: "cell_grid",
      props: { name: "items", cols: 3, rows: 3, rowHeight: 48, select: "multiple", cells: cellsFor(items) },
    },
    hint: { type: "text", props: { content: "Tap any cells, then print the receipt. Unselected cells stay parked for later.", size: "sm", align: "center" } },
    clean_btn: {
      type: "button",
      props: { label: "Print cleanup receipt", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=clean` } } },
    },
    share_btn: shareButton(self),
  };
  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, receipt: Receipt): SnapHandlerResult {
  const topReceipts = receipt.selected.slice(0, 3);
  const handledLine = receipt.selected.length === 0
    ? "Handled 0 of 9. Select a few cells next time to move mail."
    : `Handled ${receipt.selected.length} of 9: ${receipt.keep} keep, ${receipt.close} close, ${receipt.reply} reply.`;
  const details = topReceipts.length > 0
    ? topReceipts.map((item) => `${ACTION_LABELS[item.action]} ${item.label}: ${item.receipt}`).join(" ").slice(0, 300)
    : "Receipt is blank because no goblins were selected. The inbox remains suspiciously alive.";
  const shareText = `Inbox Cleanup Quest: handled ${receipt.selected.length}/9 — ${receipt.keep} keep, ${receipt.close} close, ${receipt.reply} reply.`;

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "meter", "summary", "details", "next", "actions"],
    },
    title: { type: "text", props: { content: "Cleanup receipt", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: receipt.selected.length >= 7 ? "inbox exorcist" : "mail goblin wrangler", variant: "outline", color: "accent" } },
    meter: { type: "progress", props: { label: "Inbox cleared", value: receipt.score, max: 100, color: receipt.accent } },
    summary: { type: "text", props: { content: `${receipt.headline} ${handledLine}`, size: "sm", align: "center" } },
    details: { type: "text", props: { content: details, size: "sm", align: "center" } },
    next: { type: "text", props: { content: receipt.nextMove, size: "sm", align: "center" } },
    again_btn: {
      type: "button",
      props: { label: "New quest", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["again_btn", "share_btn"] },
  };
  return {
    version: "2.0",
    theme: { accent: receipt.accent },
    effects: receipt.selected.length === GRID_SIZE ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);
    const fid = ctx.action.type === "post" ? ctx.action.user.fid : (ctx.action.user?.fid ?? 0);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self, fid);
    }

    if (url.searchParams.get("action") !== "clean") {
      return startPage(self, fid);
    }

    const items = itemsFor(fid);
    return resultPage(self, buildReceipt(items, selectedValues(ctx.action.inputs?.items)));
  },
  {
    openGraph: {
      title: "Inbox Cleanup Quest",
      description: "Select tiny inbox goblins, then print a keep/close/reply cleanup receipt.",
    },
  },
);

export { buildReceipt, itemsFor, selectedValues };
export default app;
