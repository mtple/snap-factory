# Snap Insights

_Last updated: 2026-05-02T07:00:48.853Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | album-oracle | 272 | 85 | 3 | 1 | music, tortoise, slider, toggle_group, progress, item_group, open_url, submit, compose_cast, stateless, pink |
| 2 | profile-constellation | 100 | 31 | 1 | 1 | personalized, fid, social, cell_grid, icon, item_group, badge, view_profile, submit, compose_cast, stateless, purple |
| 3 | walkout-song | 95 | 30 | 1 | 0 | music, tortoise, input, toggle_group, progress, badge, open_url, submit, compose_cast, stateless, blue |
| 4 | polite-no | 83 | 27 | 0 | 1 | utility, switch, badge, submit, compose_cast, stateless, purple, daily-life |
| 5 | hooksmith | 82 | 24 | 2 | 0 | utility, input, multi-page, item_group, badge, submit, compose_cast, stateless, amber |
| 6 | degen-quest | 57 | 19 | 0 | 0 | game, absurd, toggle_group, stateless, amber, crypto, replayable |
| 7 | listening-room | 42 | 14 | 0 | 0 | music, tortoise, daily, prompt, icon, badge, separator, open_url, compose_cast, stateless, green |
| 8 | farcaster-hours | 42 | 14 | 0 | 0 | community, poll, slider, bar_chart, stateful, turso, teal |
| 9 | snap-radio | 40 | 11 | 1 | 1 | showcase, meta, icon, badge, progress, item_group, submit, open_url, view_cast, compose_cast, stateless, pink |
| 10 | movie-emoji | 38 | 11 | 1 | 0 | game, quiz, movies, emoji, toggle_group, badge, submit, compose_cast, stateless, amber |

## Patterns observed

- **tortoise** is over-indexing (7 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (8 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **personalized** is over-indexing (3 snaps; examples: profile-constellation, farcaster-sign, profile-weather). Keep testing adjacent variants.
- **item_group** is over-indexing (12 snaps; examples: album-oracle, profile-constellation, hooksmith). Keep testing adjacent variants.
- **icon** is over-indexing (5 snaps; examples: profile-constellation, listening-room, snap-radio). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 71.4 | 7 |
| music | 63.3 | 8 |
| personalized | 49.7 | 3 |
| item_group | 49.6 | 12 |
| icon | 43.0 | 5 |
| pink | 42.3 | 9 |
| open_url | 42.1 | 14 |
| daily-life | 41.5 | 2 |
| slider | 40.9 | 10 |
| progress | 38.9 | 14 |
| fid | 38.5 | 4 |
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
