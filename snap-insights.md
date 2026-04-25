# Snap Insights

_Last updated: 2026-04-25T18:16:41.766Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | raffle | 43 | 12 | 1 | 1 | utility, input, submit, stateless, confetti, amber, event-mode |
| 2 | duo-do-song-quiz | 40 | 6 | 4 | 1 | quiz, toggle_group, open_url, multi-page, stateless, pink, music, event-mode, tortoise |
| 3 | mona-lisa | 22 | 5 | 1 | 1 | art, cell_grid, compose_cast, stateless, amber, pixel-art, event-mode |
| 4 | farcaster-sign | 21 | 7 | 0 | 0 | personalized, fid, badge, item_group, separator, submit, compose_cast, stateless, social |
| 5 | flappy-bird | 20 | 5 | 1 | 0 | game, cell_grid, submit, stateless, amber, event-mode |
| 6 | origin-story | 19 | 3 | 2 | 0 | lore, item_group, item, separator, compose_cast, stateless, purple, event-mode |
| 7 | pacman | 19 | 4 | 1 | 1 | game, cell_grid, submit, turso, stateful, amber, event-mode |
| 8 | tip-calculator | 15 | 3 | 0 | 3 | utility, input, slider, item_group, item, separator, submit, compose_cast, stateless, teal |
| 9 | tic-tac-toe | 14 | 3 | 1 | 0 | game, button, toggle_group, submit, stateless, blue, ai, event-mode |
| 10 | beautiful-thing | 11 | 3 | 0 | 1 | gag, open_url, html-page, camera, gray, compose_cast |

## Patterns observed

- **tortoise** is over-indexing (2 snaps; examples: duo-do-song-quiz, drum-machine). Keep testing adjacent variants.
- **confetti** is over-indexing (2 snaps; examples: raffle, dont-click). Keep testing adjacent variants.
- **quiz** is over-indexing (2 snaps; examples: duo-do-song-quiz, wizard-trivia). Keep testing adjacent variants.
- **music** is over-indexing (3 snaps; examples: duo-do-song-quiz, drum-machine, music-collab). Keep testing adjacent variants.
- **multi-page** is over-indexing (7 snaps; examples: duo-do-song-quiz, snap-101, meet-snap-wizard). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 23.0 | 2 |
| confetti | 21.5 | 2 |
| quiz | 21.5 | 2 |
| music | 16.3 | 3 |
| multi-page | 15.9 | 7 |
| event-mode | 11.7 | 27 |
| cell_grid | 11.6 | 7 |
| fid | 11.5 | 2 |
| social | 11.5 | 2 |
| item_group | 11.4 | 9 |
| input | 11.3 | 9 |
| open_url | 10.9 | 8 |

## What to try next

- **Exploit winners lightly** — combine `tortoise`, `confetti`, `quiz` with one fresh mechanic so the feed does not feel repetitive.

## Scoring formula

`score = likes * 3 + recasts * 5 + replies * 2`

This rewards conversation and distribution more than passive likes.

## How this file gets updated

The daily SnapWizard engagement-refresh cron job:

1. Reads every entry in `snap-engagement.json`
2. Fetches fresh cast stats from Neynar for each `cast_hash`
3. Updates `stats`, `score`, and `last_checked`
4. Rewrites this file with top performers, observed patterns, and tag breakdowns
5. Commits and pushes the results with the Hermes SnapWizard git tool
