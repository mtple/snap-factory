# Snap Insights

_Last updated: 2026-04-27T07:00:36.400Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | album-oracle | 210 | 66 | 2 | 1 | music, tortoise, slider, toggle_group, progress, item_group, open_url, submit, compose_cast, stateless, pink |
| 2 | hooksmith | 49 | 13 | 2 | 0 | utility, input, multi-page, item_group, badge, submit, compose_cast, stateless, amber |
| 3 | polite-no | 47 | 15 | 0 | 1 | utility, switch, badge, submit, compose_cast, stateless, purple, daily-life |
| 4 | profile-constellation | 31 | 8 | 1 | 1 | personalized, fid, social, cell_grid, icon, item_group, badge, view_profile, submit, compose_cast, stateless, purple |
| 5 | farcaster-sign | 28 | 8 | 0 | 2 | personalized, fid, badge, item_group, separator, submit, compose_cast, stateless, social |
| 6 | mona-lisa | 25 | 6 | 1 | 1 | art, cell_grid, compose_cast, stateless, amber, pixel-art, event-mode |
| 7 | farcaster-100 | 24 | 8 | 0 | 0 | collaborative, daily, progress, stateful, community, green |
| 8 | origin-story | 19 | 3 | 2 | 0 | lore, item_group, item, separator, compose_cast, stateless, purple, event-mode |
| 9 | degen-quest | 15 | 5 | 0 | 0 | game, absurd, toggle_group, stateless, amber, crypto, replayable |
| 10 | farcaster-hours | 15 | 5 | 0 | 0 | community, poll, slider, bar_chart, stateful, turso, teal |

## Patterns observed

- **tortoise** is over-indexing (3 snaps; examples: album-oracle, duo-do-song-quiz, drum-machine). Keep testing adjacent variants.
- **music** is over-indexing (4 snaps; examples: album-oracle, duo-do-song-quiz, drum-machine). Keep testing adjacent variants.
- **item_group** is over-indexing (11 snaps; examples: album-oracle, hooksmith, profile-constellation). Keep testing adjacent variants.
- **slider** is over-indexing (7 snaps; examples: album-oracle, farcaster-hours, tip-calculator). Keep testing adjacent variants.
- **pink** is over-indexing (8 snaps; examples: album-oracle, duo-do-song-quiz, farcaster-artists). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 86.3 | 3 |
| music | 66.3 | 4 |
| item_group | 35.8 | 11 |
| slider | 35.0 | 7 |
| pink | 34.9 | 8 |
| open_url | 34.2 | 9 |
| progress | 30.2 | 9 |
| personalized | 29.5 | 2 |
| daily-life | 23.5 | 2 |
| multi-page | 23.0 | 7 |
| quiz | 23.0 | 2 |
| toggle_group | 22.9 | 14 |

## What to try next

- **Exploit winners lightly** — combine `tortoise`, `music`, `item_group` with one fresh mechanic so the feed does not feel repetitive.

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
