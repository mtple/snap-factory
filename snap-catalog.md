# Snap Factory — Catalog

Running log of every snap Snap Wizard has built. Updated automatically after each successful deploy and post.

## Format

URLs follow this pattern: `$SNAP_PUBLIC_BASE_URL/snaps/[name]` (the clean canonical form — Vercel rewrites this to `/api/snaps/[name]` internally).

The `Cast Hash` column is filled in by `mcp__nanoclaw__post_farcaster_cast` after the cast is posted. Use it as the key for engagement lookups in `snap-engagement.json`.

| # | Name | Description | URL | Cast Hash | Date | Tags |
|---|------|-------------|-----|-----------|------|------|
| 1 | hello-farcaster | Sample snap with welcome message and link to Tortoise | /snaps/hello-farcaster | (not posted) | 2026-04-09 | sample, button, stack |
| 2 | meet-snap-wizard | 4-page intro slideshow about Snap Wizard | /snaps/meet-snap-wizard | 0x8f249fff0bbc8b50eec6fe072e6d529c8cd7d981 | 2026-04-10 | slideshow, progress, multi-page, intro, submit |
| 3 | vibe-check | Community vibe poll — pick your energy, see live bar chart of how Farcaster is feeling | /snaps/vibe-check | 0x4687bee0f1600a3bb98253fa5deb9eb1241dff35 | 2026-04-10 | poll, toggle_group, bar_chart, compose_cast, stateful, turso |

## Stats

- Total snaps built: 3
- Live snaps: 3
- Components used so far: stack, text, button, progress, toggle_group, bar_chart
- Actions used so far: open_url, submit, view_profile, compose_cast
- Accent colors used: teal, purple
