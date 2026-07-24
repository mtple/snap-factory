/**
 * snack-oracle — pick a craving and receive one tiny snack plan.
 *
 * Components: toggle_group, slider, switch, badge, progress, button, stack
 * Actions: submit, open_url, compose_cast
 * State: stateless
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapElementInput, SnapHandlerResult } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const SNAP_NAME = "snack-oracle";

type Elements = Record<string, SnapElementInput>;
type Accent = "gray" | "blue" | "red" | "amber" | "green" | "teal" | "purple" | "pink";
type Craving = "salty" | "sweet" | "umami" | "spicy";

type Snack = {
  id: string;
  craving: Craving;
  title: string;
  badge: string;
  effort: "low" | "medium" | "high";
  pantry: boolean;
  hook: string;
  steps: string[];
  recipeUrl: string;
  accent: Accent;
};

type Reading = {
  snack: Snack;
  readiness: number;
  appetite: string;
  pantryLine: string;
};

const SNACKS: Snack[] = [
  {
    id: "pickle-popcorn",
    craving: "salty",
    title: "Pickle-Dust Popcorn",
    badge: "salty crunch goblin",
    effort: "low",
    pantry: true,
    hook: "Popcorn, oil or butter, garlic powder, dill, and a tiny vinegar sparkle.",
    steps: ["Pop corn.", "Toss with fat.", "Dust with dill, garlic, salt, and a few vinegar drops."],
    recipeUrl: "https://www.google.com/search?q=pickle+popcorn+recipe",
    accent: "teal",
  },
  {
    id: "crispy-chickpeas",
    craving: "salty",
    title: "Crispy Chickpea Meteorites",
    badge: "pantry asteroid",
    effort: "medium",
    pantry: true,
    hook: "A can of chickpeas becomes crunchy desk treasure with salt, paprika, and heat.",
    steps: ["Dry chickpeas well.", "Oil and season hard.", "Roast or air-fry until rattly."],
    recipeUrl: "https://www.google.com/search?q=crispy+chickpeas+recipe",
    accent: "amber",
  },
  {
    id: "miso-cracker-stack",
    craving: "salty",
    title: "Miso Cracker Stack",
    badge: "tiny savory tower",
    effort: "low",
    pantry: false,
    hook: "Crackers, cream cheese or butter, a miso smear, cucumber, and sesame crunch.",
    steps: ["Mix miso with soft fat.", "Spread thinly.", "Top with cucumber and sesame."],
    recipeUrl: "https://www.google.com/search?q=miso+crackers+snack",
    accent: "green",
  },
  {
    id: "salt-lime-avocado",
    craving: "salty",
    title: "Salt-Lime Avocado Boats",
    badge: "five-minute dignity",
    effort: "low",
    pantry: false,
    hook: "Avocado halves with lime, flaky salt, chili, and crushed chips for scooping.",
    steps: ["Halve avocado.", "Season with lime and salt.", "Scoop with chips like tiny oars."],
    recipeUrl: "https://www.google.com/search?q=avocado+lime+salt+snack",
    accent: "green",
  },
  {
    id: "honey-yogurt-bark",
    craving: "sweet",
    title: "Honey Yogurt Bark",
    badge: "freezer fairy slab",
    effort: "medium",
    pantry: false,
    hook: "Yogurt, honey, fruit, and crunchy bits freeze into a snack pretending to be dessert.",
    steps: ["Spread sweetened yogurt.", "Scatter fruit and crunch.", "Freeze, crack, snack."],
    recipeUrl: "https://www.google.com/search?q=honey+yogurt+bark+recipe",
    accent: "pink",
  },
  {
    id: "cinnamon-toast-coins",
    craving: "sweet",
    title: "Cinnamon Toast Coins",
    badge: "pantry dessert gremlin",
    effort: "low",
    pantry: true,
    hook: "Tortilla or bread circles fried/toasted with butter, cinnamon sugar, and zero ceremony.",
    steps: ["Cut or tear small pieces.", "Toast in butter.", "Toss with cinnamon sugar while warm."],
    recipeUrl: "https://www.google.com/search?q=cinnamon+sugar+tortilla+chips+recipe",
    accent: "amber",
  },
  {
    id: "date-peanut-bites",
    craving: "sweet",
    title: "Date-Peanut Thunder Bites",
    badge: "sweet battery pack",
    effort: "medium",
    pantry: true,
    hook: "Dates, peanut butter, oats, and salt make a tiny energy orb with opinions.",
    steps: ["Mash dates and peanut butter.", "Fold in oats and salt.", "Roll, chill, hoard."],
    recipeUrl: "https://www.google.com/search?q=date+peanut+butter+energy+bites",
    accent: "purple",
  },
  {
    id: "berry-toast",
    craving: "sweet",
    title: "Jammy Berry Toast",
    badge: "breakfast cosplay",
    effort: "low",
    pantry: false,
    hook: "Toast, ricotta or yogurt, berries or jam, honey, and lemon zest if the goblin allows.",
    steps: ["Toast bread.", "Spread creamy thing.", "Add fruit, honey, and a pinch of salt."],
    recipeUrl: "https://www.google.com/search?q=ricotta+berry+toast+recipe",
    accent: "pink",
  },
  {
    id: "soy-butter-noodles",
    craving: "umami",
    title: "Soy-Butter Noodle Nest",
    badge: "umami desk dragon",
    effort: "medium",
    pantry: true,
    hook: "Instant noodles or pasta get glossy with soy sauce, butter, pepper, and scallion if present.",
    steps: ["Cook noodles.", "Toss with butter and soy.", "Finish with pepper and any green bits."],
    recipeUrl: "https://www.google.com/search?q=soy+butter+noodles+recipe",
    accent: "blue",
  },
  {
    id: "mushroom-toast",
    craving: "umami",
    title: "Mushroom Toast Treaty",
    badge: "savory velvet",
    effort: "high",
    pantry: false,
    hook: "Mushrooms browned hard, then parked on toast with garlic, yogurt, or cheese.",
    steps: ["Brown mushrooms until quiet.", "Add garlic and salt.", "Pile on toast with creamy backup."],
    recipeUrl: "https://www.google.com/search?q=garlic+mushroom+toast+recipe",
    accent: "gray",
  },
  {
    id: "seaweed-rice-cups",
    craving: "umami",
    title: "Seaweed Rice Cups",
    badge: "pantry sushi-ish",
    effort: "low",
    pantry: true,
    hook: "Rice, soy, sesame, mayo or egg, and seaweed become tiny hand rolls without a committee.",
    steps: ["Season warm rice.", "Add protein or mayo.", "Scoop with seaweed squares."],
    recipeUrl: "https://www.google.com/search?q=seaweed+rice+snack",
    accent: "teal",
  },
  {
    id: "tomato-miso-soup",
    craving: "umami",
    title: "Tomato Miso Mug Soup",
    badge: "warm mug truce",
    effort: "low",
    pantry: true,
    hook: "Tomato paste, miso or bouillon, hot water, oil, and crackers make a very tiny soup office.",
    steps: ["Stir paste with hot water.", "Add oil and seasoning.", "Crush crackers on top."],
    recipeUrl: "https://www.google.com/search?q=tomato+miso+soup+recipe",
    accent: "red",
  },
  {
    id: "chili-crisp-eggs",
    craving: "spicy",
    title: "Chili-Crisp Egg Raft",
    badge: "spice goblin approved",
    effort: "medium",
    pantry: false,
    hook: "Eggs, toast or rice, chili crisp, and something cool to keep the peace.",
    steps: ["Cook egg your way.", "Land it on toast or rice.", "Spoon chili crisp and add cooling sauce."],
    recipeUrl: "https://www.google.com/search?q=chili+crisp+eggs+recipe",
    accent: "red",
  },
  {
    id: "tajin-fruit-cup",
    craving: "spicy",
    title: "Tajín Fruit Lightning Cup",
    badge: "sweet heat weather",
    effort: "low",
    pantry: false,
    hook: "Fruit, lime, chile salt, and crunchy peanuts if you want thunder.",
    steps: ["Cut fruit.", "Hit with lime.", "Dust with chile salt and crunch."],
    recipeUrl: "https://www.google.com/search?q=tajin+fruit+cup+recipe",
    accent: "amber",
  },
  {
    id: "hot-honey-crackers",
    craving: "spicy",
    title: "Hot Honey Cracker Spell",
    badge: "pantry firefly",
    effort: "low",
    pantry: true,
    hook: "Crackers, cheese or peanut butter, honey, hot sauce, and black pepper make sparks.",
    steps: ["Stack cracker and creamy base.", "Mix honey with hot sauce.", "Drizzle and pepper."],
    recipeUrl: "https://www.google.com/search?q=hot+honey+crackers+snack",
    accent: "pink",
  },
  {
    id: "spicy-cucumber-smash",
    craving: "spicy",
    title: "Spicy Cucumber Smash",
    badge: "cold crunch dragon",
    effort: "medium",
    pantry: false,
    hook: "Cucumber, chili oil, vinegar, soy, and sesame become crunchy air conditioning.",
    steps: ["Smash and salt cucumber.", "Drain briefly.", "Toss with chili oil, soy, vinegar, sesame."],
    recipeUrl: "https://www.google.com/search?q=spicy+smashed+cucumber+recipe",
    accent: "green",
  },
];

function clampNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cravingValue(value: unknown): Craving {
  return value === "sweet" || value === "umami" || value === "spicy" ? value : "salty";
}

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

function effortRank(effort: Snack["effort"]): number {
  return effort === "low" ? 0 : effort === "medium" ? 1 : 2;
}

function makeReading(craving: Craving, effort: number, pantryOnly: boolean, fid: number): Reading {
  const maxRank = effort < 34 ? 0 : effort < 70 ? 1 : 2;
  const candidates = SNACKS.filter((snack) => snack.craving === craving)
    .filter((snack) => !pantryOnly || snack.pantry)
    .filter((snack) => effortRank(snack.effort) <= maxRank);
  const fallback = SNACKS.filter((snack) => snack.craving === craving && (!pantryOnly || snack.pantry));
  const pool = candidates.length > 0 ? candidates : fallback.length > 0 ? fallback : SNACKS.filter((snack) => snack.craving === craving);
  const seed = hashText(`${SNAP_NAME}|${todayKey()}|${fid || 0}|${craving}|${effort}|${pantryOnly}`);
  const snack = pool[seed % pool.length] ?? SNACKS[0];
  const effortBonus = snack.effort === "low" ? 32 : snack.effort === "medium" ? 18 : 6;
  const readiness = Math.max(18, Math.min(98, 36 + Math.round(effort / 3) + effortBonus + (pantryOnly ? 8 : 0) - (seed % 9)));
  const appetite = effort > 72 ? "serious snack weather" : effort < 30 ? "minimal spoon treaty" : "reasonable nibble window";
  const pantryLine = pantryOnly ? "Pantry-only oath honored." : "Fresh ingredient side quest allowed.";
  return { snack, readiness, appetite, pantryLine };
}

function shareButton(self: string, text = "The Snack Oracle prescribed a tiny snack. The pantry goblin has notes."): SnapElementInput {
  return {
    type: "button",
    props: { label: "Share oracle", variant: "secondary" },
    on: { press: { action: "compose_cast", params: { text: text.slice(0, 280), embeds: [self] } } },
  };
}

function startPage(self: string): SnapHandlerResult {
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "intro", "craving", "effort", "pantry", "summon_btn", "share_btn"],
    },
    title: { type: "text", props: { content: "Snack Oracle", weight: "bold", align: "center" } },
    intro: {
      type: "text",
      props: {
        content: "Pick the craving, set your effort, and the oracle returns one snack with tiny prep steps plus a recipe jump.",
        size: "sm",
        align: "center",
      },
    },
    craving: {
      type: "toggle_group",
      props: {
        name: "craving",
        label: "Craving",
        options: [
          { label: "Salty", value: "salty" },
          { label: "Sweet", value: "sweet" },
          { label: "Umami", value: "umami" },
          { label: "Spicy", value: "spicy" },
        ],
        defaultValue: "salty",
      },
    },
    effort: { type: "slider", props: { name: "effort", label: "Effort / hunger", min: 0, max: 100, step: 5, defaultValue: 45 } },
    pantry: { type: "switch", props: { name: "pantry", label: "Pantry-only mode" } },
    summon_btn: {
      type: "button",
      props: { label: "Summon snack", variant: "primary" },
      on: { press: { action: "submit", params: { target: `${self}?action=summon` } } },
    },
    share_btn: shareButton(self),
  };
  return { version: "2.0", theme: { accent: "amber" }, ui: { root: "page", elements } };
}

function resultPage(self: string, reading: Reading): SnapHandlerResult {
  const { snack } = reading;
  const shareText = `Snack Oracle prescribed ${snack.title}: ${snack.hook}`;
  const elements: Elements = {
    page: {
      type: "stack",
      props: { direction: "vertical", gap: "sm" },
      children: ["title", "badge", "summary", "readiness", "steps", "actions"],
    },
    title: { type: "text", props: { content: snack.title, weight: "bold", align: "center" } },
    badge: { type: "badge", props: { label: snack.badge, variant: "outline", color: "accent" } },
    summary: {
      type: "text",
      props: { content: `${snack.hook} ${reading.pantryLine} Forecast: ${reading.appetite}.`, size: "sm", align: "center" },
    },
    readiness: { type: "progress", props: { label: "Snack readiness", value: reading.readiness, max: 100, color: snack.accent } },
    steps: {
      type: "text",
      props: { content: `Tiny prep: ${snack.steps.map((step, index) => `${index + 1}) ${step}`).join(" ")}`, size: "sm", align: "center" },
    },
    recipe_btn: {
      type: "button",
      props: { label: "Open recipe", variant: "primary" },
      on: { press: { action: "open_url", params: { target: snack.recipeUrl } } },
    },
    again_btn: {
      type: "button",
      props: { label: "New snack", variant: "secondary" },
      on: { press: { action: "submit", params: { target: `${self}?reset=1` } } },
    },
    share_btn: shareButton(self, shareText),
    actions: { type: "stack", props: { direction: "horizontal", gap: "sm" }, children: ["recipe_btn", "again_btn", "share_btn"] },
  };
  return { version: "2.0", theme: { accent: snack.accent }, ui: { root: "page", elements } };
}

registerSnapHandler(
  app,
  async (ctx) => {
    const self = snapUrl(ctx.request, SNAP_NAME);
    const url = new URL(ctx.request.url);

    if (ctx.action.type === "get" || url.searchParams.get("reset") === "1") {
      return startPage(self);
    }

    if (url.searchParams.get("action") !== "summon") {
      return startPage(self);
    }

    const inputs = ctx.action.inputs ?? {};
    const craving = cravingValue(inputs.craving);
    const effort = clampNumber(inputs.effort, 45);
    const pantryOnly = asBool(inputs.pantry);
    const fid = ctx.action.user?.fid ?? 0;
    return resultPage(self, makeReading(craving, effort, pantryOnly, fid));
  },
  {
    openGraph: {
      title: "Snack Oracle",
      description: "Pick a craving and get one tiny snack plan with prep steps and a recipe jump.",
    },
  },
);

export { makeReading };
export default app;
