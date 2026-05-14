# Snap Insights

_Last updated: 2026-05-14T07:01:04.025Z_

This file is generated from `snap-engagement.json` after refreshing cast stats from Neynar. **Read this file first during ideation** — it is the current memory of what the audience actually likes.

## Top performers (last 14 days)

| # | Snap | Score | Likes | Recasts | Replies | Tags |
|---:|------|------:|------:|--------:|--------:|------|
| 1 | bot-or-not | 77 | 15 | 0 | 16 | game, quiz, farcaster-native, toggle_group, badge, separator, submit, compose_cast, stateless, gray |
| 2 | timeline-bingo | 65 | 20 | 1 | 0 | game, social, daily, farcaster-native, cell_grid, badge, submit, compose_cast, stateless, teal |
| 3 | movie-emoji | 59 | 18 | 1 | 0 | game, quiz, movies, emoji, toggle_group, badge, submit, compose_cast, stateless, amber |
| 4 | kredita-runeborn-lore | 38 | 12 | 0 | 1 | lore, fantasy, event-mode, toggle_group, badge, submit, compose_cast, stateless, purple |
| 5 | decision-dice | 36 | 12 | 0 | 0 | utility, productivity, toggle_group, slider, switch, progress, badge, submit, compose_cast, stateless, blue |
| 6 | palette-potion | 32 | 9 | 1 | 0 | creative, utility, palette, toggle_group, slider, switch, cell_grid, badge, submit, compose_cast, stateless, purple |
| 7 | grudge-compost | 32 | 10 | 0 | 1 | utility, daily-life, playful, input, toggle_group, slider, switch, progress, badge, submit, compose_cast, stateless, green |
| 8 | tab-tamer | 27 | 9 | 0 | 0 | utility, productivity, input, slider, switch, progress, bar_chart, badge, submit, compose_cast, stateless, blue |
| 9 | suchbot-roast | 26 | 6 | 0 | 4 | social, roast, farcaster-native, bot, text, view_profile, compose_cast, stateless, purple |
| 10 | reply-radar | 24 | 8 | 0 | 0 | utility, farcaster-native, input, toggle_group, slider, switch, progress, badge, submit, compose_cast, stateless, teal |

## Patterns observed

- **tortoise** is over-indexing (7 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **music** is over-indexing (8 snaps; examples: album-oracle, walkout-song, duo-do-song-quiz). Keep testing adjacent variants.
- **item_group** is over-indexing (12 snaps; examples: album-oracle, profile-constellation, hooksmith). Keep testing adjacent variants.
- **icon** is over-indexing (5 snaps; examples: profile-constellation, snap-radio, listening-room). Keep testing adjacent variants.
- **pink** is over-indexing (9 snaps; examples: album-oracle, snap-radio, duo-do-song-quiz). Keep testing adjacent variants.

## Tag performance

| Tag | Avg Score | Count |
|-----|----------:|------:|
| tortoise | 70.9 | 7 |
| music | 62.8 | 8 |
| item_group | 47.1 | 12 |
| icon | 43.0 | 5 |
| pink | 41.3 | 9 |
| open_url | 39.2 | 15 |
| quiz | 36.4 | 5 |
| personalized | 34.4 | 5 |
| meta | 34.0 | 2 |
| fid | 29.5 | 6 |
| lore | 28.5 | 2 |
| slider | 27.1 | 22 |

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
