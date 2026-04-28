# Snap Insights

_Last updated: 2026-04-28T07:00:33.660Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | album-oracle | 269 | 84 | 3 | 1 | music, tortoise, slider, toggle_group, progress, item_group, open_url, submit, compose_cast, stateless, pink |
| 2 | profile-constellation | 79 | 24 | 1 | 1 | personalized, fid, social, cell_grid, icon, item_group, badge, view_profile, submit, compose_cast, stateless, purple |
| 3 | hooksmith | 76 | 22 | 2 | 0 | utility, input, multi-page, item_group, badge, submit, compose_cast, stateless, amber |
| 4 | polite-no | 74 | 24 | 0 | 1 | utility, switch, badge, submit, compose_cast, stateless, purple, daily-life |
| 5 | degen-quest | 54 | 18 | 0 | 0 | game, absurd, toggle_group, stateless, amber, crypto, replayable |
| 6 | walkout-song | 50 | 15 | 1 | 0 | music, tortoise, input, toggle_group, progress, badge, open_url, submit, compose_cast, stateless, blue |
| 7 | farcaster-hours | 39 | 13 | 0 | 0 | community, poll, slider, bar_chart, stateful, turso, teal |
| 8 | token-type | 30 | 10 | 0 | 0 | personality, token, toggle_group, badge, view_token, compose_cast, stateless, blue, crypto |
| 9 | farcaster-100 | 27 | 9 | 0 | 0 | collaborative, daily, progress, stateful, community, green |
| 10 | daily-cast | 12 | 4 | 0 | 0 | daily, prompt, icon, compose_cast, stateful, community, teal |

## Patterns observed

- **tortoise** is over-indexing (5 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (6 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **personalized** is over-indexing (2 snaps; examples: profile-constellation, farcaster-sign). Keep testing adjacent variants.
- **item_group** is over-indexing (11 snaps; examples: album-oracle, profile-constellation, hooksmith). Keep testing adjacent variants.
- **slider** is over-indexing (7 snaps; examples: album-oracle, farcaster-hours, tip-calculator). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 74.8 | 5 |
| music | 63.3 | 6 |
| personalized | 53.5 | 2 |
| item_group | 48.0 | 11 |
| slider | 47.7 | 7 |
| pink | 42.3 | 8 |
| progress | 39.0 | 10 |
| open_url | 38.5 | 11 |
| fid | 37.3 | 3 |
| daily-life | 37.0 | 2 |
| social | 36.3 | 3 |
| icon | 32.3 | 3 |

## What to try next

- **Exploit winners lightly** — combine `tortoise`, `music`, `personalized` with one fresh mechanic so the feed does not feel repetitive.

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
