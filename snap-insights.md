# Snap Insights

_Last updated: 2026-07-25T07:00:57.754Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | profile-signal-scan | 14 | 3 | 1 | 0 | utility, social, farcaster-native, personalized, fid, neynar-api, llm, input, progress, item_group, badge, view_profile, submit, compose_cast, stateless, teal |
| 2 | channel-hop | 11 | 2 | 1 | 0 | discovery, social, farcaster-native, channel, toggle_group, item_group, badge, open_url, submit, compose_cast, stateless, teal |
| 3 | starcaster-door | 8 | 1 | 1 | 0 | game, social, farcaster-native, cell_grid, progress, submit, compose_cast, stateless, purple |
| 4 | snap-idea-market | 3 | 1 | 0 | 0 | social, poll, meta, farcaster-native, toggle_group, bar_chart, badge, submit, compose_cast, stateful, turso, purple |

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
| open_url | 35.0 | 17 |
| lore | 27.0 | 2 |
| prompt | 27.0 | 2 |
| multi-page | 25.3 | 7 |
| item_group | 22.5 | 26 |
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
