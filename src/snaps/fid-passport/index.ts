/**
 * fid-passport — stamp a playful Farcaster passport from the viewer's FID.
 *
 * Components: text, badge, progress, button, stack
 * Actions: submit, view_profile, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "fid-passport";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";

type Passport = {
  region: string;
  role: string;
  motto: string;
  warning: string;
  readiness: number;
  accent: Accent;
};

const REGIONS = [
  "North Reply Archipelago",
  "Builder Customs Zone",
  "GM Time Province",
  "Quote-Cast Highlands",
  "Lurker Meadow",
  "Degen Border Station",
  "Tiny App Republic",
  "Bookmark Swamp",
];

const ROLES = [
  "Licensed Thread Cartographer",
  "Certified Vibe Importer",
  "Undercover Shipping Goblin",
  "Reply Diplomat, Third Class",
  "Keeper of Suspicious Drafts",
  "Timeline Weather Observer",
  "Meme Customs Inspector",
  "Casual Main Character",
];

const MOTTOS = [
  "Cast softly and carry a weird button.",
  "No draft left behind, unless it deserved it.",
  "Stamp first, explain the lore later.",
  "May your replies be brief and your bits be obvious.",
  "One more iteration before the border closes.",
  "Authorized to lurk with intent.",
  "Small apps, big hat energy.",
  "Proof of personhood: oddly specific opinions.",
];

const WARNINGS = [
  "Customs confiscated three vague ideas and one unnecessary caveat.",
  "Declare all hot takes before entering the replies.",
  "Do not feed the algorithm after midnight.",
  "This passport expires when the group chat says ship it.",
  "Traveler may spontaneously turn errands into side quests.",
  "Border agents detected excessive bookmarking and let it slide.",
  "Valid for one courageous post and unlimited lurking.",
  "Please keep hands, wallets, and drafts inside the timeline.",
];

const ACCENTS: Accent[] = ["teal", "purple", "amber", "green", "blue", "pink", "gray", "red"];

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  const index = Math.abs(Math.imul(seed + salt * 97, 2654435761)) % items.length;
  return items[index] ?? items[0];
}

function passportFor(fid: number): Passport {
  const seed = fid || 424242;
  return {
    region: pick(REGIONS, seed, 1),
    role: pick(ROLES, seed, 2),
    motto: pick(MOTTOS, seed, 3),
    warning: pick(WARNINGS, seed, 4),
    readiness: 38 + (Math.abs(Math.imul(seed, 1103515245)) % 61),
    accent: pick(ACCENTS, seed, 5),
  };
}

function shareButton(self: string, text = "I stamped my Farcaster passport. Your border agent is waiting. 🛂"): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share passport", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text, embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "badge", "intro", "stamp_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "FID Passport", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: "Farcaster border desk", variant: "outline" } },
    intro: {
      type: "text",
      props: {
        content: "Tap once to get a deterministic passport stamp from your FID: region, role, motto, and one extremely official customs warning.",
        align: "center",
        size: "sm",
      },
    },
    stamp_btn: {
      type: "button",
      props: { label: "Stamp passport", variant: "primary" },
      on: { press: { action: "submit", params: { target: self } } },
    },
    share_btn: shareButton(self),
  };

  return { version: "2.0", theme: { accent: "teal" }, ui: { root: "page", elements } };
}

function resultPage(self: string, fid: number, passport: Passport): SnapHandlerResult {
  const children = fid > 0
    ? ["title", "badge", "role", "readiness", "motto", "profile_btn", "share_btn"]
    : ["title", "badge", "role", "readiness", "motto", "again_btn", "share_btn"];

  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children,
    },
    title: { type: "text", props: { content: "Passport stamped", weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: passport.region, variant: "outline" } },
    role: {
      type: "text",
      props: {
        content: `${passport.role}\nFID ${fid || "unknown"} · ${passport.warning}`,
        align: "center",
        size: "sm",
      },
    },
    readiness: { type: "progress", props: { label: "Border confidence", value: passport.readiness, max: 100 } },
    motto: { type: "text", props: { content: `Motto: “${passport.motto}”`, align: "center", size: "sm" } },
    again_btn: {
      type: "button",
      props: { label: "Stamp again", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    profile_btn: {
      type: "button",
      props: { label: "View profile", variant: "secondary" },
      on: { press: { action: "view_profile", params: { fid } } },
    },
    share_btn: shareButton(self, `My FID Passport says I am a ${passport.role} from ${passport.region}. 🛂`),
  };

  return { version: "2.0", theme: { accent: passport.accent }, effects: ["confetti"], ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    const fid = ctx.action.user?.fid ?? 0;
    return resultPage(self, fid, passportFor(fid));
  },
  {
    openGraph: {
      title: "FID Passport",
      description: "Stamp a playful Farcaster passport from your FID.",
    },
  },
);

export default app;
