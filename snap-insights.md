# Snap Insights

_Last updated: 2026-05-03T07:01:12.075Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | album-oracle | 269 | 84 | 3 | 1 | music, tortoise, slider, toggle_group, progress, item_group, open_url, submit, compose_cast, stateless, pink |
| 2 | profile-constellation | 100 | 31 | 1 | 1 | personalized, fid, social, cell_grid, icon, item_group, badge, view_profile, submit, compose_cast, stateless, purple |
| 3 | walkout-song | 95 | 30 | 1 | 0 | music, tortoise, input, toggle_group, progress, badge, open_url, submit, compose_cast, stateless, blue |
| 4 | polite-no | 83 | 27 | 0 | 1 | utility, switch, badge, submit, compose_cast, stateless, purple, daily-life |
| 5 | hooksmith | 82 | 24 | 2 | 0 | utility, input, multi-page, item_group, badge, submit, compose_cast, stateless, amber |
| 6 | degen-quest | 57 | 19 | 0 | 0 | game, absurd, toggle_group, stateless, amber, crypto, replayable |
| 7 | bot-or-not | 54 | 10 | 0 | 12 | game, quiz, farcaster-native, toggle_group, badge, separator, submit, compose_cast, stateless, gray |
| 8 | movie-emoji | 47 | 14 | 1 | 0 | game, quiz, movies, emoji, toggle_group, badge, submit, compose_cast, stateless, amber |
| 9 | snap-radio | 43 | 12 | 1 | 1 | showcase, meta, icon, badge, progress, item_group, submit, open_url, view_cast, compose_cast, stateless, pink |
| 10 | listening-room | 42 | 14 | 0 | 0 | music, tortoise, daily, prompt, icon, badge, separator, open_url, compose_cast, stateless, green |

## Patterns observed

- **tortoise** is over-indexing (7 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (8 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **personalized** is over-indexing (3 snaps; examples: profile-constellation, farcaster-sign, profile-weather). Keep testing adjacent variants.
- **item_group** is over-indexing (12 snaps; examples: album-oracle, profile-constellation, hooksmith). Keep testing adjacent variants.
- **icon** is over-indexing (5 snaps; examples: profile-constellation, snap-radio, listening-room). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 71.0 | 7 |
| music | 62.9 | 8 |
| personalized | 49.7 | 3 |
| item_group | 49.6 | 12 |
| icon | 43.6 | 5 |
| pink | 42.3 | 9 |
| open_url | 42.1 | 14 |
| daily-life | 41.5 | 2 |
| slider | 39.6 | 11 |
| fid | 38.5 | 4 |
| progress | 38.3 | 15 |
| social | 37.8 | 4 |

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
