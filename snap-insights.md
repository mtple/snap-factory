# Snap Insights

_Last updated: 2026-08-06T07:00:38.397Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

_(none yet — no scored snaps in the last 14 days)_

## Patterns observed

- **tortoise** is over-indexing (7 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (8 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **icon** is over-indexing (5 snaps; examples: profile-constellation, snap-radio, listening-room). Keep testing adjacent variants.
- **pink** is over-indexing (9 snaps; examples: album-oracle, snap-radio, duo-do-song-quiz). Keep testing adjacent variants.
- **quiz** is over-indexing (5 snaps; examples: bot-or-not, movie-emoji, duo-do-song-quiz). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 70.4 | 7 |
| music | 62.4 | 8 |
| icon | 41.4 | 5 |
| pink | 41.0 | 9 |
| quiz | 35.8 | 5 |
| open_url | 33.1 | 18 |
| lore | 27.0 | 2 |
| prompt | 27.0 | 2 |
| multi-page | 24.1 | 7 |
| item_group | 21.4 | 27 |
| gray | 21.3 | 4 |
| community | 21.0 | 4 |

## What to try next

- **Exploit winners lightly** — combine `tortoise`, `music`, `icon` with one fresh mechanic so the feed does not feel repetitive.

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
