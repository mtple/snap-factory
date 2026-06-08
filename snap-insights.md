# Snap Insights

_Last updated: 2026-06-08T07:00:56.932Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | tiny-launch-checklist | 2 | 0 | 0 | 1 | utility, productivity, launch, input, toggle_group, progress, item_group, badge, submit, compose_cast, stateless, blue |

## Patterns observed

- **tortoise** is over-indexing (7 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (8 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **item_group** is over-indexing (13 snaps; examples: album-oracle, profile-constellation, hooksmith). Keep testing adjacent variants.
- **icon** is over-indexing (5 snaps; examples: profile-constellation, snap-radio, listening-room). Keep testing adjacent variants.
- **pink** is over-indexing (9 snaps; examples: album-oracle, snap-radio, duo-do-song-quiz). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 70.9 | 7 |
| music | 62.8 | 8 |
| item_group | 42.8 | 13 |
| icon | 41.4 | 5 |
| pink | 41.3 | 9 |
| open_url | 39.5 | 15 |
| quiz | 36.4 | 5 |
| personalized | 32.8 | 5 |
| lore | 28.5 | 2 |
| fid | 28.2 | 6 |
| prompt | 27.0 | 2 |
| multi-page | 25.7 | 7 |

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
