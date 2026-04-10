# Snap Factory — Catalog

Running log of every snap Snap Wizard has built. Updated automatically after each successful deploy and post.

## Format

URLs follow this pattern: `$SNAP_PUBLIC_BASE_URL/snaps/[name]` (the clean canonical form — Vercel rewrites this to `/api/snaps/[name]` internally).

The `Cast Hash` column is filled in by `mcp__nanoclaw__post_farcaster_cast` after the cast is posted. Use it as the key for engagement lookups in `snap-engagement.json`.

| # | Name | Description | URL | Cast Hash | Date | Tags |
|---|------|-------------|-----|-----------|------|------|
| 1 | hello-farcaster | Sample snap with welcome message and link to Tortoise | /snaps/hello-farcaster | (not posted) | 2026-04-09 | sample, button, stack |

## Stats

- Total snaps built: 1 (sample only)
- Live snaps: 1
- Components used so far: stack, text, button
- Actions used so far: open_url
- Accent colors used: teal
