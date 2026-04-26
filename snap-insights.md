# Snap Insights

_Last updated: 2026-04-26T07:01:01.242Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | farcaster-sign | 25 | 7 | 0 | 2 | personalized, fid, badge, item_group, separator, submit, compose_cast, stateless, social |
| 2 | mona-lisa | 25 | 6 | 1 | 1 | art, cell_grid, compose_cast, stateless, amber, pixel-art, event-mode |
| 3 | album-oracle | 24 | 4 | 2 | 1 | music, tortoise, slider, toggle_group, progress, item_group, open_url, submit, compose_cast, stateless, pink |
| 4 | hooksmith | 22 | 4 | 2 | 0 | utility, input, multi-page, item_group, badge, submit, compose_cast, stateless, amber |
| 5 | origin-story | 19 | 3 | 2 | 0 | lore, item_group, item, separator, compose_cast, stateless, purple, event-mode |
| 6 | tip-calculator | 15 | 3 | 0 | 3 | utility, input, slider, item_group, item, separator, submit, compose_cast, stateless, teal |
| 7 | local-biz-search | 12 | 1 | 1 | 2 | utility, input, submit, open_url, stateless, green, event-mode, directory |
| 8 | beautiful-thing | 11 | 3 | 0 | 1 | gag, open_url, html-page, camera, gray, compose_cast |
| 9 | farcaster-100 | 9 | 3 | 0 | 0 | collaborative, daily, progress, stateful, community, green |
| 10 | world-cup-countdown | 9 | 3 | 0 | 0 | utility, countdown, progress, badge, separator, compose_cast, stateless, green, event-mode, sports |

## Patterns observed

- **tortoise** is over-indexing (3 snaps; examples: duo-do-song-quiz, album-oracle, drum-machine). Keep testing adjacent variants.
- **quiz** is over-indexing (2 snaps; examples: duo-do-song-quiz, wizard-trivia). Keep testing adjacent variants.
- **confetti** is over-indexing (2 snaps; examples: raffle, dont-click). Keep testing adjacent variants.
- **music** is over-indexing (4 snaps; examples: duo-do-song-quiz, album-oracle, drum-machine). Keep testing adjacent variants.
- **multi-page** is over-indexing (7 snaps; examples: duo-do-song-quiz, snap-101, hooksmith). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 24.3 | 3 |
| quiz | 23.0 | 2 |
| confetti | 21.5 | 2 |
| music | 19.8 | 4 |
| multi-page | 19.1 | 7 |
| item_group | 14.7 | 10 |
| fid | 13.5 | 2 |
| social | 13.5 | 2 |
| input | 13.3 | 9 |
| open_url | 12.9 | 9 |
| event-mode | 12.6 | 27 |
| amber | 12.3 | 12 |

## What to try next

- **Exploit winners lightly** — combine `tortoise`, `quiz`, `confetti` with one fresh mechanic so the feed does not feel repetitive.

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
