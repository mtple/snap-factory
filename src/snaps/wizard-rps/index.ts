/**
 * wizard-rps — Rock Paper Scissors vs the wizard.
 *
 * GET:   Show move-picker (toggle_group: Rock / Paper / Scissors) + Throw button.
 * POST:  If move is supplied, process game + show result with confetti on win.
 *        If no move (play-again tap), return to pick screen.
 *
 * The wizard picks randomly each round. Wins/losses/draws are tracked
 * per FID in Turso so your record persists across sessions.
 *
 * Components: toggle_group, badge, text, button, separator
 * Actions:    submit, compose_cast
 * State:      Turso KV (per-FID W/L/D record)
 */
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import { createTursoDataStore } from "@farcaster/snap-turso";
import { snapUrl } from "../../_lib/base-url.js";

const app = new Hono();
const store = createTursoDataStore();

const SNAP_NAME = "wizard-rps";

type Move = "rock" | "paper" | "scissors";
type Outcome = "win" | "loss" | "draw";
interface Score {
  wins: number;
  losses: number;
  draws: number;
}

const MOVES: Move[] = ["rock", "paper", "scissors"];

const MOVE_LABELS: Record<Move, string> = {
  rock: "🪨 Rock",
  paper: "📄 Paper",
  scissors: "✂️ Scissors",
};

function wizardPick(): Move {
  return MOVES[Math.floor(Math.random() * 3)];
}

function getOutcome(player: Move, wizard: Move): Outcome {
  if (player === wizard) return "draw";
  if (
    (player === "rock" && wizard === "scissors") ||
    (player === "paper" && wizard === "rock") ||
    (player === "scissors" && wizard === "paper")
  )
    return "win";
  return "loss";
}

const OUTCOME_MESSAGES: Record<Outcome, string[]> = {
  win: [
    "Ha. The wizard did not see that coming.",
    "Well played. The turtle bows.",
    "You win this round. The wizard is impressed.",
    "Ancient magic has been defeated. Temporarily.",
  ],
  loss: [
    "The wizard foresaw your move. 🔮",
    "Did you really think you could beat a wizard?",
    "The ancient magic wins again.",
    "The turtle is wise. And wins.",
  ],
  draw: [
    "Great minds think alike, apparently.",
    "The wizard mirrors your energy.",
    "A draw. The universe stays balanced.",
    "Neither wins. Neither loses. Very zen.",
  ],
};

function pickMessage(outcome: Outcome, fid: number): string {
  const msgs = OUTCOME_MESSAGES[outcome];
  return msgs[fid % msgs.length];
}

function scoreKeys(fid: number) {
  return {
    wins: `wizard-rps:wins:${fid}`,
    losses: `wizard-rps:losses:${fid}`,
    draws: `wizard-rps:draws:${fid}`,
  };
}

async function loadScore(fid: number): Promise<Score> {
  const keys = scoreKeys(fid);
  const [w, l, d] = await Promise.all([
    store.get(keys.wins),
    store.get(keys.losses),
    store.get(keys.draws),
  ]);
  return {
    wins: typeof w === "number" ? w : 0,
    losses: typeof l === "number" ? l : 0,
    draws: typeof d === "number" ? d : 0,
  };
}

async function saveScore(fid: number, score: Score): Promise<void> {
  const keys = scoreKeys(fid);
  await Promise.all([
    store.set(keys.wins, score.wins),
    store.set(keys.losses, score.losses),
    store.set(keys.draws, score.draws),
  ]);
}

function formatScore(s: Score): string {
  return `${s.wins}W · ${s.losses}L · ${s.draws}D`;
}

registerSnapHandler(app, async (ctx) => {
  const self = snapUrl(ctx.request, SNAP_NAME);
  const fid = ctx.action.type === "post" ? ctx.action.user.fid : 0;

  // ── Pick screen (GET or play-again POST with no move) ─────────────────
  const shouldShowPicker =
    ctx.action.type === "get" ||
    (ctx.action.type === "post" &&
      (!ctx.action.inputs?.move || ctx.action.inputs.move === ""));

  if (shouldShowPicker) {
    const score = await loadScore(fid);
    const hasPlayed = score.wins + score.losses + score.draws > 0;

    const subtitleContent = hasPlayed
      ? `Your record: ${formatScore(score)}`
      : "Pick your move. The wizard picks too.";

    const response: SnapHandlerResult = {
      version: "1.0",
      theme: { accent: "purple" },
      ui: {
        root: "page",
        elements: {
          page: {
            type: "stack",
            props: { direction: "vertical", gap: "md" },
            children: ["title", "subtitle", "move_picker", "throw_btn", "share_btn"],
          },
          title: {
            type: "text",
            props: { content: "Wizard RPS 🔮", weight: "bold", align: "center" },
          },
          subtitle: {
            type: "text",
            props: { content: subtitleContent, size: "sm", align: "center" },
          },
          move_picker: {
            type: "toggle_group",
            props: {
              name: "move",
              label: "Your move",
              options: ["🪨 Rock", "📄 Paper", "✂️ Scissors"],
              orientation: "horizontal",
              variant: "outline",
            },
          },
          throw_btn: {
            type: "button",
            props: { label: "Throw!", variant: "primary" },
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
                  text: "can you beat the wizard at rock paper scissors? 🔮",
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

  // ── Result screen (POST with a move) ─────────────────────────────────
  // shouldShowPicker was false → we are guaranteed to be in the post branch.
  if (ctx.action.type !== "post") return { version: "1.0", theme: { accent: "purple" }, ui: { root: "p", elements: { p: { type: "stack", props: {}, children: [] } } } };
  const rawMove = ctx.action.inputs.move as string;
  // Map label back to key (user picks from display labels)
  const playerMove: Move =
    rawMove.includes("Rock") ? "rock" :
    rawMove.includes("Paper") ? "paper" :
    "scissors";

  const wMove = wizardPick();
  const outcome = getOutcome(playerMove, wMove);

  // Update score in Turso
  const score = await loadScore(fid);
  if (outcome === "win") score.wins++;
  else if (outcome === "loss") score.losses++;
  else score.draws++;
  await saveScore(fid, score);

  const message = pickMessage(outcome, fid);
  const scoreStr = formatScore(score);

  const outcomeLabel =
    outcome === "win" ? "You win! ✨" :
    outcome === "loss" ? "Wizard wins 🔮" :
    "Draw!";

  const outcomeBadgeColor =
    outcome === "win" ? "green" as const :
    outcome === "loss" ? "red" as const :
    "amber" as const;

  const shareText = outcome === "win"
    ? `beat the wizard at rps! my record: ${scoreStr} 🔮`
    : outcome === "draw"
    ? `tied the wizard at rps. my record: ${scoreStr} 🔮`
    : `the wizard keeps winning. my record: ${scoreStr} 🔮`;

  const response: SnapHandlerResult = {
    version: "1.0",
    theme: { accent: "purple" },
    effects: outcome === "win" ? ["confetti"] : undefined,
    ui: {
      root: "result_page",
      elements: {
        result_page: {
          type: "stack",
          props: { direction: "vertical", gap: "md" },
          children: [
            "outcome_badge",
            "moves_stack",
            "result_msg",
            "sep",
            "score_label",
            "play_again_btn",
            "share_btn",
          ],
        },
        outcome_badge: {
          type: "badge",
          props: { label: outcomeLabel, color: outcomeBadgeColor },
        },
        moves_stack: {
          type: "stack",
          props: { direction: "horizontal", gap: "lg", justify: "center" },
          children: ["you_col", "vs_text", "wizard_col"],
        },
        you_col: {
          type: "stack",
          props: { direction: "vertical", gap: "none" },
          children: ["you_label", "you_move"],
        },
        you_label: {
          type: "text",
          props: { content: "You", size: "sm", align: "center" },
        },
        you_move: {
          type: "text",
          props: {
            content: MOVE_LABELS[playerMove],
            weight: "bold",
            align: "center",
          },
        },
        vs_text: {
          type: "text",
          props: { content: "vs", size: "sm", align: "center" },
        },
        wizard_col: {
          type: "stack",
          props: { direction: "vertical", gap: "none" },
          children: ["wizard_label", "wizard_move"],
        },
        wizard_label: {
          type: "text",
          props: { content: "Wizard", size: "sm", align: "center" },
        },
        wizard_move: {
          type: "text",
          props: {
            content: MOVE_LABELS[wMove],
            weight: "bold",
            align: "center",
          },
        },
        result_msg: {
          type: "text",
          props: { content: message, size: "sm", align: "center" },
        },
        sep: {
          type: "separator",
          props: {},
        },
        score_label: {
          type: "text",
          props: {
            content: `Your record: ${scoreStr}`,
            size: "sm",
            align: "center",
          },
        },
        play_again_btn: {
          type: "button",
          props: { label: "Play again", variant: "primary" },
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
      },
    },
  };
  return response;
});

export default app;
