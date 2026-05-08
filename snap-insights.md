# Snap Insights

_Last updated: 2026-05-08T07:01:09.494Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | album-oracle | 266 | 83 | 3 | 1 | music, tortoise, slider, toggle_group, progress, item_group, open_url, submit, compose_cast, stateless, pink |
| 2 | profile-constellation | 100 | 31 | 1 | 1 | personalized, fid, social, cell_grid, icon, item_group, badge, view_profile, submit, compose_cast, stateless, purple |
| 3 | walkout-song | 95 | 30 | 1 | 0 | music, tortoise, input, toggle_group, progress, badge, open_url, submit, compose_cast, stateless, blue |
| 4 | bot-or-not | 80 | 16 | 0 | 16 | game, quiz, farcaster-native, toggle_group, badge, separator, submit, compose_cast, stateless, gray |
| 5 | polite-no | 80 | 26 | 0 | 1 | utility, switch, badge, submit, compose_cast, stateless, purple, daily-life |
| 6 | hooksmith | 76 | 22 | 2 | 0 | utility, input, multi-page, item_group, badge, submit, compose_cast, stateless, amber |
| 7 | timeline-bingo | 65 | 20 | 1 | 0 | game, social, daily, farcaster-native, cell_grid, badge, submit, compose_cast, stateless, teal |
| 8 | movie-emoji | 59 | 18 | 1 | 0 | game, quiz, movies, emoji, toggle_group, badge, submit, compose_cast, stateless, amber |
| 9 | degen-quest | 57 | 19 | 0 | 0 | game, absurd, toggle_group, stateless, amber, crypto, replayable |
| 10 | snap-radio | 43 | 12 | 1 | 1 | showcase, meta, icon, badge, progress, item_group, submit, open_url, view_cast, compose_cast, stateless, pink |

## Patterns observed

- **tortoise** is over-indexing (7 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (8 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **item_group** is over-indexing (12 snaps; examples: album-oracle, profile-constellation, hooksmith). Keep testing adjacent variants.
- **quiz** is over-indexing (4 snaps; examples: bot-or-not, movie-emoji, duo-do-song-quiz). Keep testing adjacent variants.
- **icon** is over-indexing (5 snaps; examples: profile-constellation, snap-radio, listening-room). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 71.7 | 7 |
| music | 63.5 | 8 |
| item_group | 48.6 | 12 |
| quiz | 46.3 | 4 |
| icon | 43.6 | 5 |
| open_url | 42.4 | 14 |
| personalized | 42.3 | 4 |
| pink | 42.0 | 9 |
| social | 35.6 | 8 |
| farcaster-native | 34.9 | 7 |
| fid | 34.8 | 5 |
| slider | 34.0 | 16 |

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
