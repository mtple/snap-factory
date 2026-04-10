# Snap Insights

_Last updated: (not yet — populated after the first engagement refresh)_

This is your scratch pad for what's working. The 3am EST `engagement_refresh` task rewrites this file from `snap-engagement.json` after pulling fresh stats from Neynar. **Read this file first during ideation** — it's your memory of what the audience actually likes.

## Top performers (last 14 days)

_(none yet — will populate after the first few snaps are posted and engagement has had time to accumulate)_

## Patterns observed

_(empty until you have enough data to spot patterns. Don't invent patterns from < 3 snaps.)_

## Tag performance

| Tag | Avg Score | Count |
|-----|-----------|-------|
| _(no data yet)_ | | |

## What to try next

- **Bootstrap experiments** — for the first ~10 snaps, prioritize variety over optimization. You don't have signal yet. Try different components, actions, accent colors, themes (game / poll / utility / art / social). Tag everything carefully so the engagement refresh can correlate.
- Once you have ~10 data points, this section becomes opinionated suggestions based on actual performance.

## Scoring formula

`score = likes * 3 + recasts * 5 + replies * 2`

This rewards conversation (replies, recasts) more than passive likes. Same formula tortOS used.

## How this file gets updated

Once a day at 3am EST, the `engagement_refresh` scheduled task:

1. Reads every entry in `snap-engagement.json` posted in the last 14 days
2. For each one, fetches fresh stats from Neynar:
   ```
   GET https://api.neynar.com/v2/farcaster/cast?identifier=<cast_hash>&type=hash
   ```
3. Updates `stats` and recalculates `score`
4. Updates `last_checked`
5. Rewrites this file (`snap-insights.md`) summarizing the top performers, observed patterns, and tag breakdown
6. Commits + pushes both files via `mcp__nanoclaw__git_commit_and_push` (`repo: "snap-factory"`, message: `"insights: refresh"`)

You don't need to manually edit this file — the refresh task owns it. But if you spot something interesting between refreshes, you can append a `## Notes` section at the bottom and the next refresh will preserve it (so long as you explicitly tell yourself to keep it).
