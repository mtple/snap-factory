/**
 * wizard-trivia — daily web3 & culture trivia with persistent score tracking
 *
 * A new question every day. Submit your answer, see if you're right, track
 * your score against other players on the leaderboard.
 *
 * State (Turso):
 *   wt:done:<YYYYMMDD>:<fid>  → "1"     (answered today)
 *   wt:score:<fid>            → number  (total correct, JSON-serialized)
 *   wt:lb                     → JSON Array<{fid:number,score:number}> top 10 desc
 *
 * Components: text, toggle_group, progress, button, separator, item, item_group, stack
 * Actions: submit, compose_cast
 * Accent: amber
 */

import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult, SnapElementInput } from "@farcaster/snap";
import { snapUrl } from "../../_lib/base-url.js";
import { createTursoDataStore } from "@farcaster/snap-turso";

const app = new Hono();
const SNAP_NAME = "wizard-trivia";
const store = createTursoDataStore();

type Elements = Record<string, SnapElementInput>;

// ── Question bank ─────────────────────────────────────────────────────────

type Question = {
  q: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  fact: string;
};

const QUESTIONS: Question[] = [
  {
    q: "What is the max cast length on Farcaster?",
    options: ["140 chars", "280 chars", "320 chars", "512 chars"],
    correct: 2,
    fact: "Farcaster casts max out at 320 characters.",
  },
  {
    q: "What year was Bitcoin launched?",
    options: ["2007", "2008", "2009", "2011"],
    correct: 2,
    fact: "The Bitcoin genesis block was mined on Jan 3, 2009.",
  },
  {
    q: "What does 'gm' mean in crypto culture?",
    options: ["good morning", "go mainstream", "great meme", "genesis miner"],
    correct: 0,
    fact: "gm = good morning. The friendliest two letters in web3.",
  },
  {
    q: "How many Bitcoin can ever exist?",
    options: ["18 million", "21 million", "42 million", "unlimited"],
    correct: 1,
    fact: "Bitcoin's hard cap is 21 million. No exceptions, ever.",
  },
  {
    q: "What does 'NFT' stand for?",
    options: ["Non-Fungible Token", "New Farcaster Tool", "Network Fee Tag", "Next Future Tech"],
    correct: 0,
    fact: "Non-Fungible Token — unique, provably scarce onchain assets.",
  },
  {
    q: "Who created Bitcoin?",
    options: ["Vitalik Buterin", "Satoshi Nakamoto", "Nick Szabo", "Hal Finney"],
    correct: 1,
    fact: "Satoshi Nakamoto — still anonymous to this day.",
  },
  {
    q: "What does 'HODL' come from?",
    options: ["Hold On for Dear Life", "A typo of 'hold'", "Hold Or Dump Later", "A trading strategy"],
    correct: 1,
    fact: "HODL was a typo in a 2013 Bitcoin forum post. It stuck.",
  },
  {
    q: "Ethereum's main smart contract language?",
    options: ["Rust", "Solidity", "JavaScript", "Cairo"],
    correct: 1,
    fact: "Solidity is the dominant smart contract language for the EVM.",
  },
  {
    q: "What does 'DeFi' stand for?",
    options: ["Digital Finance", "Decentralized Finance", "Direct Finance", "Deferred Finance"],
    correct: 1,
    fact: "DeFi = Decentralized Finance. Banking without banks.",
  },
  {
    q: "How many semitones are in an octave?",
    options: ["8", "10", "12", "16"],
    correct: 2,
    fact: "An octave spans 12 semitones in Western music.",
  },
  {
    q: "What does 'DAO' stand for?",
    options: ["Digital Asset Org", "Decentralized Autonomous Org", "Data Analytics Output", "Direct Access Online"],
    correct: 1,
    fact: "DAO = Decentralized Autonomous Organization.",
  },
  {
    q: "What is 'gas' in Ethereum?",
    options: ["ETH price index", "Transaction fee unit", "Token standard name", "Wallet type"],
    correct: 1,
    fact: "Gas measures computational work. You pay it in ETH.",
  },
  {
    q: "What does 'L2' mean in crypto?",
    options: ["Second wallet tier", "Layer 2 scaling solution", "Token version 2", "Leverage 2x trade"],
    correct: 1,
    fact: "Layer 2 = scaling solutions built on top of L1 blockchains.",
  },
  {
    q: "Who proposed Ethereum?",
    options: ["Satoshi Nakamoto", "Charlie Lee", "Gavin Wood", "Vitalik Buterin"],
    correct: 3,
    fact: "Vitalik Buterin proposed Ethereum in 2013, at age 19.",
  },
  {
    q: "What is a 'whale' in crypto?",
    options: ["A big price dump", "A holder with huge bags", "A wash trader", "A mining pool"],
    correct: 1,
    fact: "Whales hold so much that their moves can move markets.",
  },
  {
    q: "What does 'minting' an NFT mean?",
    options: ["Buying it on secondary", "Creating it on-chain", "Burning it permanently", "Staking for rewards"],
    correct: 1,
    fact: "Minting = the act of publishing an NFT to the blockchain.",
  },
  {
    q: "What is 'proof of work'?",
    options: ["Staking tokens as collateral", "Solve hash puzzles, mint blocks", "A KYC process", "A DAO vote mechanism"],
    correct: 1,
    fact: "PoW = miners compete to solve hash puzzles. Bitcoin uses it.",
  },
  {
    q: "What does 'airdrop' mean in crypto?",
    options: ["Token price crash", "Free tokens distributed", "A hardware wallet attack", "Send tokens to burn address"],
    correct: 1,
    fact: "Airdrops distribute free tokens, often as a reward or launch.",
  },
  {
    q: "What is a 'seed phrase'?",
    options: ["A trading signal", "Words that restore your wallet", "A smart contract function", "An NFT metadata field"],
    correct: 1,
    fact: "Your seed phrase (12-24 words) is the master key to your wallet.",
  },
  {
    q: "What is 'Base' in the crypto ecosystem?",
    options: ["Coinbase's L2 network", "Bitcoin's base layer", "A DEX protocol", "An NFT marketplace"],
    correct: 0,
    fact: "Base is Coinbase's L2 network, built on the OP Stack.",
  },
];

// ── Date + question helpers ───────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function getTodaysQuestion(): { question: Question; dayIndex: number } {
  const dayIndex = Math.floor(Date.now() / 86_400_000); // days since epoch
  const question = QUESTIONS[dayIndex % QUESTIONS.length];
  return { question, dayIndex };
}

// ── Leaderboard helpers ───────────────────────────────────────────────────

type LBEntry = { fid: number; score: number };

async function getLeaderboard(): Promise<LBEntry[]> {
  const raw = await store.get("wt:lb");
  if (!raw) return [];
  try {
    return JSON.parse(raw as string) as LBEntry[];
  } catch {
    return [];
  }
}

async function updateLeaderboard(fid: number, newScore: number): Promise<void> {
  let lb = await getLeaderboard();
  const idx = lb.findIndex((e) => e.fid === fid);
  if (idx >= 0) {
    lb[idx].score = newScore;
  } else {
    lb.push({ fid, score: newScore });
  }
  lb.sort((a, b) => b.score - a.score);
  lb = lb.slice(0, 10);
  await store.set("wt:lb", JSON.stringify(lb));
}

// ── Screens ───────────────────────────────────────────────────────────────

function renderQuestion(
  question: Question,
  dayIndex: number,
  alreadyAnswered: boolean,
  self: string,
): SnapHandlerResult {
  const qNum = (dayIndex % QUESTIONS.length) + 1;
  const elements: Elements = {};

  if (alreadyAnswered) {
    elements["page"] = {
      type: "stack",
      props: { direction: "vertical", gap: "md" },
      children: ["title", "done_msg", "answer_reveal", "sep", "share_btn"],
    };
    elements["title"] = {
      type: "text",
      props: { content: "Wizard's Daily Trivia", weight: "bold", align: "center" },
    };
    elements["done_msg"] = {
      type: "text",
      props: {
        content: "You've already answered today. Come back tomorrow for a new question.",
        size: "sm",
        align: "center",
      },
    };
    elements["answer_reveal"] = {
      type: "text",
      props: {
        content: `Correct answer: ${question.options[question.correct]}`,
        size: "sm",
      },
    };
    elements["sep"] = { type: "separator", props: {} };
    elements["share_btn"] = {
      type: "button",
      props: { label: "Share", variant: "secondary" },
      on: {
        press: {
          action: "compose_cast",
          params: {
            text: "playing wizard's daily trivia on @freeturtle — can you beat my score?",
            embeds: [self],
          },
        },
      },
    };
    return {
      version: "1.0",
      theme: { accent: "amber" },
      ui: { root: "page", elements },
    };
  }

  elements["page"] = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: ["title", "progress_bar", "question_text", "answer_picker", "submit_btn", "share_btn"],
  };
  elements["title"] = {
    type: "text",
    props: { content: "Wizard's Daily Trivia", weight: "bold", align: "center" },
  };
  elements["progress_bar"] = {
    type: "progress",
    props: {
      label: `Question ${qNum} of ${QUESTIONS.length}`,
      value: qNum,
      max: QUESTIONS.length,
      color: "amber",
    },
  };
  elements["question_text"] = {
    type: "text",
    props: { content: question.q },
  };
  elements["answer_picker"] = {
    type: "toggle_group",
    props: {
      name: "answer",
      label: "Pick your answer",
      options: [...question.options],
      orientation: "vertical",
      variant: "outline",
      defaultValue: question.options[0],
    },
  };
  elements["submit_btn"] = {
    type: "button",
    props: { label: "Lock in answer", variant: "primary" },
    on: {
      press: {
        action: "submit",
        params: { target: self },
      },
    },
  };
  elements["share_btn"] = {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: {
          text: "playing wizard's daily trivia on @freeturtle",
          embeds: [self],
        },
      },
    },
  };

  return {
    version: "1.0",
    theme: { accent: "amber" },
    ui: { root: "page", elements },
  };
}

function renderResult(
  question: Question,
  isCorrect: boolean,
  chosenIdx: 0 | 1 | 2 | 3,
  score: number,
  fid: number,
  lb: LBEntry[],
  self: string,
): SnapHandlerResult {
  const elements: Elements = {};
  const pageChildren: string[] = ["title", "result_detail", "chosen_text", "score_text", "sep", "lb_title"];

  const resultTitle = isCorrect ? "Correct!" : "Not quite.";
  const resultDetail = isCorrect
    ? question.fact
    : `The answer was: ${question.options[question.correct]}. ${question.fact}`;
  const chosenLabel = question.options[chosenIdx];
  const chosenText = `You answered: ${chosenLabel}`;
  const rankIdx = lb.findIndex((e) => e.fid === fid);
  const rankStr = rankIdx >= 0 ? `#${rankIdx + 1}` : `unranked`;
  const scoreText = `Score: ${score} correct · Rank: ${rankStr}`;

  elements["title"] = {
    type: "text",
    props: { content: resultTitle, weight: "bold", align: "center" },
  };
  elements["result_detail"] = {
    type: "text",
    props: { content: resultDetail, size: "sm" },
  };
  elements["chosen_text"] = {
    type: "text",
    props: { content: chosenText, size: "sm" },
  };
  elements["score_text"] = {
    type: "text",
    props: { content: scoreText, size: "sm", weight: "bold" },
  };
  elements["sep"] = { type: "separator", props: {} };
  elements["lb_title"] = {
    type: "text",
    props: { content: "Leaderboard", weight: "bold" },
  };

  const top3 = lb.slice(0, 3);
  if (top3.length > 0) {
    const lbChildren: string[] = [];
    top3.forEach((entry, i) => {
      const isMe = entry.fid === fid;
      const key = `lb_item_${i}`;
      elements[key] = {
        type: "item",
        props: {
          title: `#${i + 1}${isMe ? " (you)" : ""}`,
          description: `${entry.score} correct`,
        },
      };
      lbChildren.push(key);
    });
    elements["lb_group"] = {
      type: "item_group",
      props: {},
      children: lbChildren,
    };
    pageChildren.push("lb_group");
  } else {
    elements["lb_empty"] = {
      type: "text",
      props: { content: "No one on the board yet. You're first!", size: "sm" },
    };
    pageChildren.push("lb_empty");
  }

  pageChildren.push("share_btn");

  const shareText = isCorrect
    ? "just got today's wizard trivia right — can you beat my score on @freeturtle?"
    : "wizard trivia got me today. do better on @freeturtle";

  elements["share_btn"] = {
    type: "button",
    props: { label: "Share", variant: "secondary" },
    on: {
      press: {
        action: "compose_cast",
        params: { text: shareText, embeds: [self] },
      },
    },
  };

  elements["page"] = {
    type: "stack",
    props: { direction: "vertical", gap: "md" },
    children: pageChildren,
  };

  return {
    version: "1.0",
    theme: { accent: isCorrect ? "green" : "red" },
    effects: isCorrect ? ["confetti"] : undefined,
    ui: { root: "page", elements },
  };
}

// ── Handler ───────────────────────────────────────────────────────────────

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const { question, dayIndex } = getTodaysQuestion();
  const date = todayStr();

  // ── GET: show question (or already-answered screen) ──────────────────
  if (ctx.action.type === "get") {
    // On GET, we don't have a FID — show the base question screen
    return renderQuestion(question, dayIndex, false, self);
  }

  // POST — we now have fid guaranteed
  const fid = ctx.action.user.fid;
  const doneKey = `wt:done:${date}:${fid}`;

  // ── POST: process answer ─────────────────────────────────────────────

  // Guard against double-submit
  if (await store.get(doneKey)) {
    return renderQuestion(question, dayIndex, true, self);
  }

  // Parse chosen answer — toggle_group returns the selected option string
  const rawAnswer = ctx.action.inputs?.["answer"] as string | undefined;
  const foundIdx = rawAnswer !== undefined ? question.options.indexOf(rawAnswer) : -1;
  const chosenIdx = (foundIdx >= 0 ? foundIdx : 0) as 0 | 1 | 2 | 3;

  const isCorrect = chosenIdx === question.correct;

  // Persist: mark as answered
  await store.set(doneKey, "1");

  // Update score
  const rawScore = await store.get(`wt:score:${fid}`);
  const prevScore = rawScore ? (JSON.parse(rawScore as string) as number) : 0;
  const newScore = isCorrect ? prevScore + 1 : prevScore;
  if (isCorrect) {
    await store.set(`wt:score:${fid}`, JSON.stringify(newScore));
  } else if (!rawScore) {
    // Initialize score at 0 so the player shows up in their own view
    await store.set(`wt:score:${fid}`, JSON.stringify(0));
  }

  // Update leaderboard for players with points
  if (newScore > 0) {
    await updateLeaderboard(fid, newScore);
  }

  const lb = await getLeaderboard();

  return renderResult(question, isCorrect, chosenIdx, newScore, fid, lb, self);
});

export default app;
