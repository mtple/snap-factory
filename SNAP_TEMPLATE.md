# Snap Template — How to Build a New Snap

When building a new snap, follow this exact pattern. Each snap is an independent Vercel function at `api/snaps/[name]/index.ts`.

## Steps

1. Pick a short kebab-case name for the snap (e.g., `rock-paper-scissors`, `music-mood-poll`, `daily-trivia`). This becomes both the directory name and the URL slug.

2. Create the directory:
   ```bash
   mkdir -p api/snaps/[name]
   ```

3. Copy the template from `api/snaps/hello-farcaster/index.ts` as a starting point. Change the `basePath` to match the new directory.

4. Write the snap's response logic inside the `registerSnapHandler` callback. The `ctx` object tells you whether it's a GET (initial render) or POST (user interaction).

5. For state, use `@farcaster/snap-turso`:
   ```typescript
   import { createTursoDataStore } from "@farcaster/snap-turso";
   const store = createTursoDataStore();
   // await store.get(key)
   // await store.set(key, value)
   ```
   Namespace your keys with the snap name: `store.get("rock-paper-scissors:game-state")`. This prevents collisions across snaps.

6. Verify types with `npm run build` (runs `tsc --noEmit`) before committing. This catches broken snaps before they deploy.

7. Commit and push. Vercel auto-deploys. Poll the URL until it returns valid snap JSON, then post to Farcaster.

## URL Pattern

Every snap is accessible at:
```
$SNAP_PUBLIC_BASE_URL/api/snaps/[name]
```

For example:
```
https://snap-factory.vercel.app/api/snaps/rock-paper-scissors
```

This URL is what you post to Farcaster as the cast embed.

## Isolation Rule

**Never import code from another snap directory.** Each snap must be fully self-contained. If you need shared utilities, add them to `api/_lib/` (underscore prefix means Vercel won't treat it as a function). This keeps snaps independent — breaking one never breaks another.

## Constraints (from the Farcaster Snaps spec)

- `text.content`: max 320 chars
- `button.label`: max 30 chars
- `toggle_group.options`: 2-6 options, each max 30 chars
- `bar_chart.bars`: 1-6 bars
- `cell_grid`: 2-32 cols × 2-16 rows
- `input.maxLength`: 1-280
- `image.url`: HTTPS only, jpg/png/gif/webp
- POST response timeout: 5 seconds — keep handlers fast
- Target URLs must be HTTPS in production

Violating these constraints will cause the snap to fail validation and not render. Always check limits before deploying.

## Available Components

**Display:** text, button, badge, icon, image, item, progress, separator
**Container:** stack, item_group
**Data:** bar_chart, cell_grid
**Field (collect input):** input, slider, switch, toggle_group

## Available Actions (on button press)

submit, open_url, open_mini_app, view_cast, view_profile, compose_cast, view_token, send_token, swap_token

## Accent Colors

gray, blue, red, amber, green, teal, purple, pink
