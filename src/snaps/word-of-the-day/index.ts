/**
 * word-of-the-day — Daily vocabulary snap.
 *
 * Shows a rare or interesting English word with its definition, pronunciation,
 * part of speech, and an example sentence. After reading, users vote on how
 * familiar they are (Know it / Heard it / New to me). The result page shows
 * a live bar_chart of Farcaster's collective familiarity with the word.
 *
 * Word changes daily — computed deterministically from date so everyone
 * sees the same word on the same day.
 *
 * GET:   Word card + familiarity toggle_group + submit
 * POST:  Familiarity confirmed + bar_chart of all votes + share button
 *
 * Components: text, badge, item, separator, toggle_group, button, bar_chart
 * Actions:    submit, compose_cast
 * State:      Turso KV (aggregate vote counts per word)
 * Accent:     teal
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();
const SNAP_NAME = "word-of-the-day";

interface WordEntry {
  word: string;
  pos: string;
  pronunciation: string;
  definition: string;
  example: string;
}

const WORDS: WordEntry[] = [
  { word: "Ephemeral", pos: "adjective", pronunciation: "ih-FEM-er-ul", definition: "Lasting for a very short time.", example: "The ephemeral beauty of cherry blossoms draws millions each spring." },
  { word: "Petrichor", pos: "noun", pronunciation: "PET-rih-kor", definition: "The pleasant earthy smell after rain.", example: "She stepped outside after the storm, breathing in the rich petrichor." },
  { word: "Serendipity", pos: "noun", pronunciation: "ser-en-DIP-ih-tee", definition: "The occurrence of fortunate events by happy chance.", example: "By pure serendipity, they ended up sitting next to each other on the flight." },
  { word: "Liminal", pos: "adjective", pronunciation: "LIM-ih-nul", definition: "Relating to a transitional stage; on a threshold.", example: "The empty airport at 3am had an eerie, liminal quality." },
  { word: "Hiraeth", pos: "noun", pronunciation: "HEER-eyeth", definition: "A Welsh longing for a home you can't return to.", example: "Listening to old records filled him with deep hiraeth for his childhood." },
  { word: "Sonder", pos: "noun", pronunciation: "SON-der", definition: "The realization that each passerby has a vivid inner life.", example: "Watching the busy street, she felt a wave of sonder wash over her." },
  { word: "Lacuna", pos: "noun", pronunciation: "luh-KYOO-nuh", definition: "A gap or missing portion, especially in a text.", example: "There's a notable lacuna in the historical record from those years." },
  { word: "Mellifluous", pos: "adjective", pronunciation: "meh-LIF-loo-us", definition: "Pleasingly smooth and musical to hear.", example: "Her mellifluous voice made even mundane announcements sound poetic." },
  { word: "Susurrus", pos: "noun", pronunciation: "suh-SUR-us", definition: "A whispering or rustling sound.", example: "The susurrus of wind through the pines was the only sound in the forest." },
  { word: "Insouciant", pos: "adjective", pronunciation: "in-SOO-see-unt", definition: "Showing a casual lack of concern; carefree.", example: "She gave an insouciant shrug and walked away." },
  { word: "Soporific", pos: "adjective", pronunciation: "sop-uh-RIF-ik", definition: "Tending to induce drowsiness or sleep.", example: "The professor's soporific lecture had half the class asleep by noon." },
  { word: "Loquacious", pos: "adjective", pronunciation: "loh-KWAY-shus", definition: "Tending to talk a great deal; garrulous.", example: "The loquacious host filled every silence with another story." },
  { word: "Laconic", pos: "adjective", pronunciation: "luh-KON-ik", definition: "Using very few words; brief to the point of seeming rude.", example: "His laconic reply — just 'no' — shut down the conversation." },
  { word: "Zeitgeist", pos: "noun", pronunciation: "TSYT-gyst", definition: "The defining spirit or mood of a particular era.", example: "The snap format perfectly captures the zeitgeist of short-form interaction." },
  { word: "Quixotic", pos: "adjective", pronunciation: "kwik-SOT-ik", definition: "Exceedingly idealistic; unrealistic and impractical.", example: "His quixotic plan to cross the ocean in a rowboat impressed no one." },
  { word: "Byzantine", pos: "adjective", pronunciation: "BIZ-un-teen", definition: "Excessively complicated; marked by devious scheming.", example: "The tax code was so byzantine that even accountants struggled with it." },
  { word: "Ebullience", pos: "noun", pronunciation: "ih-BOOL-yens", definition: "The quality of being lively, enthusiastic, and energetic.", example: "Her ebullience lit up every room she walked into." },
  { word: "Ennui", pos: "noun", pronunciation: "ON-wee", definition: "Listlessness and dissatisfaction from lack of occupation.", example: "After months of lockdown, ennui had settled deep into the household." },
  { word: "Alacrity", pos: "noun", pronunciation: "uh-LAK-rih-tee", definition: "Brisk and cheerful readiness.", example: "He accepted the challenge with alacrity, eager to prove himself." },
  { word: "Perspicacious", pos: "adjective", pronunciation: "pur-spih-KAY-shus", definition: "Having a ready insight into things; shrewd.", example: "A perspicacious investor sees opportunity where others see confusion." },
  { word: "Lugubrious", pos: "adjective", pronunciation: "luh-GOO-bree-us", definition: "Looking or sounding sad and dismal.", example: "The hound stared up at us with lugubrious brown eyes." },
  { word: "Pernicious", pos: "adjective", pronunciation: "pur-NISH-us", definition: "Having a harmful or destructive effect, especially gradually.", example: "The pernicious spread of misinformation eroded public trust." },
  { word: "Obstreperous", pos: "adjective", pronunciation: "ob-STREP-er-us", definition: "Noisy and difficult to control.", example: "The obstreperous crowd made it impossible to hear the speaker." },
  { word: "Schadenfreude", pos: "noun", pronunciation: "SHAHD-en-froy-duh", definition: "Pleasure derived from another person's misfortune.", example: "There was undeniable schadenfreude in watching his rival lose the pitch." },
  { word: "Recalcitrant", pos: "adjective", pronunciation: "rih-KAL-sih-trant", definition: "Having an obstinately uncooperative attitude.", example: "The recalcitrant student refused every offer of help." },
  { word: "Surreptitious", pos: "adjective", pronunciation: "sur-ep-TISH-us", definition: "Done secretly, especially to avoid disapproval.", example: "She cast a surreptitious glance at her phone under the table." },
  { word: "Truculent", pos: "adjective", pronunciation: "TRUK-yuh-lent", definition: "Eager or quick to argue; aggressively defiant.", example: "The truculent reply ended any chance of a civil conversation." },
  { word: "Ubiquitous", pos: "adjective", pronunciation: "yoo-BIK-wih-tus", definition: "Present or found everywhere at the same time.", example: "Smartphones are ubiquitous — almost no one leaves home without one." },
  { word: "Verisimilitude", pos: "noun", pronunciation: "ver-ih-sih-MIL-ih-tood", definition: "The appearance of being true or real.", example: "The novel's meticulous research gave it remarkable verisimilitude." },
  { word: "Zenith", pos: "noun", pronunciation: "ZEE-nith", definition: "The time at which something is most powerful or successful.", example: "The empire was at its zenith in the early 12th century." },
  { word: "Zephyr", pos: "noun", pronunciation: "ZEF-er", definition: "A soft, gentle breeze.", example: "A warm zephyr drifted in through the open window." },
  { word: "Palimpsest", pos: "noun", pronunciation: "PAL-imp-sest", definition: "Something altered but still bearing traces of an earlier form.", example: "The city is a palimpsest of its colonial and modern past." },
  { word: "Apocryphal", pos: "adjective", pronunciation: "uh-POK-rih-ful", definition: "Of doubtful authenticity, though widely circulated as true.", example: "The story of him crossing the icy river is probably apocryphal." },
  { word: "Catharsis", pos: "noun", pronunciation: "kuh-THAR-sis", definition: "The release of emotional tension through an experience.", example: "Writing the letter, even if never sent, offered a powerful catharsis." },
  { word: "Esoteric", pos: "adjective", pronunciation: "es-uh-TER-ik", definition: "Intended for a small group with specialized knowledge.", example: "His lectures were too esoteric for a general audience." },
  { word: "Mercurial", pos: "adjective", pronunciation: "mur-KYUR-ee-ul", definition: "Subject to sudden or unpredictable changes of mood.", example: "Her mercurial temperament made her both thrilling and exhausting." },
  { word: "Panacea", pos: "noun", pronunciation: "pan-uh-SEE-uh", definition: "A solution or remedy for all difficulties or diseases.", example: "Decentralization isn't a panacea — it comes with its own tradeoffs." },
  { word: "Paradigm", pos: "noun", pronunciation: "PAIR-uh-dym", definition: "A typical example or pattern; a standard model.", example: "The internet caused a fundamental paradigm shift in communication." },
  { word: "Pariah", pos: "noun", pronunciation: "puh-RY-uh", definition: "A person rejected from society; an outcast.", example: "After the scandal, he became a pariah in his industry." },
  { word: "Sagacious", pos: "adjective", pronunciation: "suh-GAY-shus", definition: "Having or showing good judgment and wisdom.", example: "Her sagacious advice saved the startup from an expensive mistake." },
  { word: "Umbrage", pos: "noun", pronunciation: "UM-brij", definition: "Offense or annoyance.", example: "He took umbrage at the suggestion that his work was derivative." },
  { word: "Whimsical", pos: "adjective", pronunciation: "WIM-zih-kul", definition: "Playfully quaint or fanciful in an appealing way.", example: "The app had a whimsical interface that made data entry feel like a game." },
  { word: "Ineffable", pos: "adjective", pronunciation: "in-EF-uh-bul", definition: "Too great or extreme to be expressed in words.", example: "The view from the summit was an ineffable mix of scale and silence." },
  { word: "Oscillate", pos: "verb", pronunciation: "OS-ih-layt", definition: "To move back and forth in a steady rhythm; to waver.", example: "Public opinion tends to oscillate between enthusiasm and skepticism." },
  { word: "Labyrinthine", pos: "adjective", pronunciation: "lab-uh-RIN-thin", definition: "Like a labyrinth; intricate and confusing.", example: "The regulatory process was labyrinthine — no one fully understood it." },
  { word: "Obfuscate", pos: "verb", pronunciation: "OB-fyoo-skayt", definition: "To make unclear or confusing; to muddle.", example: "The report used jargon to obfuscate more than it revealed." },
  { word: "Hubris", pos: "noun", pronunciation: "HYOO-bris", definition: "Excessive pride or self-confidence, often leading to downfall.", example: "His hubris in assuming he couldn't fail set the stage for disaster." },
  { word: "Anathema", pos: "noun", pronunciation: "uh-NATH-uh-muh", definition: "Something or someone greatly detested or loathed.", example: "Compromise was anathema to the hardline faction." },
  { word: "Lassitude", pos: "noun", pronunciation: "LAS-ih-tood", definition: "Physical or mental weariness; lack of energy.", example: "A week of poor sleep left him in a state of deep lassitude." },
  { word: "Euphoria", pos: "noun", pronunciation: "yoo-FOR-ee-uh", definition: "A feeling of intense happiness and excitement.", example: "The crowd erupted in euphoria as the final goal went in." },
  { word: "Sycophant", pos: "noun", pronunciation: "SIK-uh-fant", definition: "A person who flatters those in power to gain advantage.", example: "The CEO was surrounded by sycophants who never questioned him." },
  { word: "Stentorian", pos: "adjective", pronunciation: "sten-TOR-ee-un", definition: "Loud and powerful in sound.", example: "His stentorian voice carried to the back of the hall without a microphone." },
  { word: "Precocious", pos: "adjective", pronunciation: "prih-KOH-shus", definition: "Having developed abilities earlier than usual.", example: "The precocious child was reading novels before kindergarten." },
  { word: "Subliminal", pos: "adjective", pronunciation: "sub-LIM-ih-nul", definition: "Below the threshold of conscious perception.", example: "Advertisers have long used subliminal cues to influence buying decisions." },
  { word: "Melancholy", pos: "noun", pronunciation: "MEL-un-kol-ee", definition: "A feeling of pensive sadness, typically with no obvious cause.", example: "Autumn always brought with it a certain gentle melancholy." },
  { word: "Impecunious", pos: "adjective", pronunciation: "im-peh-KYOO-nee-us", definition: "Having little or no money; poor.", example: "His impecunious student years shaped a cautious relationship with spending." },
  { word: "Vapid", pos: "adjective", pronunciation: "VAP-id", definition: "Offering nothing stimulating or challenging; dull.", example: "The reunion special was utterly vapid — nothing but filler." },
  { word: "Irascible", pos: "adjective", pronunciation: "ih-RAS-ih-bul", definition: "Having a tendency to be easily angered.", example: "The irascible coach was fined for his outburst at the referee." },
  { word: "Mendacious", pos: "adjective", pronunciation: "men-DAY-shus", definition: "Not telling the truth; lying.", example: "The review was so mendacious it bordered on defamation." },
  { word: "Querulous", pos: "adjective", pronunciation: "KWER-yuh-lus", definition: "Complaining in a petulant or whining manner.", example: "The querulous customer demanded a manager for the fifth time." },
  { word: "Plethora", pos: "noun", pronunciation: "PLETH-uh-ruh", definition: "A large or excessive amount of something.", example: "There's a plethora of productivity apps, but few genuinely help." },
  { word: "Propitious", pos: "adjective", pronunciation: "pruh-PISH-us", definition: "Giving a good chance of success; favorable.", example: "The clear skies seemed propitious for the launch." },
  { word: "Equipoise", pos: "noun", pronunciation: "EK-wih-poyz", definition: "Balance of forces or interests; mental calmness.", example: "She maintained impressive equipoise in the face of the crisis." },
  { word: "Vicarious", pos: "adjective", pronunciation: "vy-KAIR-ee-us", definition: "Experienced in imagination through another person.", example: "I live vicariously through my sister's travel photos." },
  { word: "Solipsism", pos: "noun", pronunciation: "SOL-ip-siz-um", definition: "The view that only one's own mind is certain to exist.", example: "Social media can feed a kind of digital solipsism if you're not careful." },
  { word: "Jejune", pos: "adjective", pronunciation: "jih-JOON", definition: "Naïve, simplistic, and unsophisticated.", example: "The pitch was thoughtful, but the financial projections were jejune." },
  { word: "Nefarious", pos: "adjective", pronunciation: "nih-FAIR-ee-us", definition: "Wicked or criminal in nature.", example: "The investigation uncovered a nefarious scheme spanning three continents." },
  { word: "Obstinate", pos: "adjective", pronunciation: "OB-stih-nut", definition: "Stubbornly refusing to change one's opinion.", example: "Despite all evidence, he remained obstinate in his original position." },
  { word: "Halcyon", pos: "adjective", pronunciation: "HAL-see-un", definition: "Denoting a period of idyllic happiness and prosperity.", example: "Those were halcyon days — before everything got complicated." },
  { word: "Pulchritudinous", pos: "adjective", pronunciation: "pul-krih-TYOOD-ih-nus", definition: "Beautiful; physically attractive.", example: "The word sounds ugly but means its opposite — purely pulchritudinous." },
];

interface VoteCounts {
  know: number;
  heard: number;
  new: number;
}

function getTodaysWord(): WordEntry {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const index = Math.abs((now.getFullYear() * 367 + dayOfYear) % WORDS.length);
  return WORDS[index];
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const entry = getTodaysWord();
  const storeKey = `word-of-the-day:${entry.word.toLowerCase()}`;

  // ── GET: Show word card ───────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "teal" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["header", "word_badge", "sep1", "def_item", "example_item", "sep2", "vote_label", "familiarity", "submit_btn", "share_btn"],
          },
          header: {
            type: "text",
            props: { content: "Word of the Day", weight: "bold", align: "center" },
          },
          word_badge: {
            type: "badge",
            props: { label: entry.word, color: "teal" },
          },
          sep1: { type: "separator", props: {} },
          def_item: {
            type: "item",
            props: {
              title: `${entry.pos} · ${entry.pronunciation}`,
              description: entry.definition,
            },
          },
          example_item: {
            type: "item",
            props: {
              title: "Example",
              description: entry.example,
            },
          },
          sep2: { type: "separator", props: {} },
          vote_label: {
            type: "text",
            props: { content: "How familiar are you with this word?", align: "center" },
          },
          familiarity: {
            type: "toggle_group",
            props: {
              name: "familiarity",
              label: "Familiarity",
              options: ["Know it well", "Heard it before", "New to me"],
              orientation: "horizontal",
              variant: "default",
            },
          },
          submit_btn: {
            type: "button",
            props: { label: "Submit", variant: "primary" },
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
                  text: `Today's word: ${entry.word} — "${entry.definition}" Test your vocab →`,
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

  // ── POST: Tally vote, show results ───────────────────────────────────────
  const vote = ctx.action.inputs?.familiarity as string | undefined;

  let counts: VoteCounts = { know: 0, heard: 0, new: 0 };
  const stored = await store.get(storeKey);
  if (stored) {
    try {
      counts = JSON.parse(stored as string) as VoteCounts;
    } catch {
      // corrupt state — reset
    }
  }

  if (vote === "Know it well") counts.know++;
  else if (vote === "Heard it before") counts.heard++;
  else if (vote === "New to me") counts.new++;

  await store.set(storeKey, JSON.stringify(counts));

  const total = counts.know + counts.heard + counts.new;

  const resultResponse: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "teal" },
    ui: {
      root: "result",
      elements: {
        result: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: ["word_title", "your_badge", "sep1", "chart_label", "chart", "sep2", "share_btn"],
        },
        word_title: {
          type: "text",
          props: { content: entry.word, weight: "bold", align: "center" },
        },
        your_badge: {
          type: "badge",
          props: {
            label: vote ?? "voted",
            color: "teal",
          },
        },
        sep1: { type: "separator", props: {} },
        chart_label: {
          type: "text",
          props: {
            content: `How Farcaster knows "${entry.word}" (${total} vote${total !== 1 ? "s" : ""})`,
            align: "center",
          },
        },
        chart: {
          type: "bar_chart",
          props: {
            bars: [
              { label: "Know it", value: counts.know, color: "teal" },
              { label: "Heard it", value: counts.heard, color: "blue" },
              { label: "New to me", value: counts.new, color: "amber" },
            ],
          },
        },
        sep2: { type: "separator", props: {} },
        share_btn: {
          type: "button",
          props: { label: "Share snap", variant: "secondary" },
          on: {
            press: {
              action: "compose_cast",
              params: {
                text: `Today's word: ${entry.word} — "${entry.definition}" Test your vocab →`,
                embeds: [self],
              },
            },
          },
        },
      },
    },
  };
  return resultResponse;
});

export default app;
