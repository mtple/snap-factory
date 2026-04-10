# Snap Template — How to Build a New Snap

When building a new snap, follow this exact pattern. Each snap is an independent Vercel function at `api/snaps/[name]/index.ts` and accessible at `/snaps/[name]` (clean URL).

## Steps

1. **Pick a short kebab-case name** for the snap (e.g., `rock-paper-scissors`, `music-mood-poll`, `daily-trivia`). This becomes the directory name and the URL slug.

2. **Create the directory:**
   ```bash
   mkdir -p api/snaps/[name]
   ```

3. **Copy the hello-farcaster sample as a starting point** and modify:
   ```bash
   cp api/snaps/hello-farcaster/index.ts api/snaps/[name]/index.ts
   ```
   Then update the `basePath` and the `snapUrl(ctx.request, "...")` call to match the new name.

4. **Write the snap logic** inside the `registerSnapHandler` callback:
   - `ctx.action.type === "get"` — initial render (first time someone sees the snap)
   - `ctx.action.type === "post"` — user interaction (has `ctx.action.inputs`, `ctx.action.fid`, `ctx.action.button_index`)

5. **For multi-page snaps**, use `snapUrl()` from `_lib/base-url` to build button target URLs:
   ```typescript
   import { snapUrl } from "../../_lib/base-url.js";
   // ...
   const self = snapUrl(ctx.request, "my-snap");
   // Use `self` in button target URLs for navigation within the snap
   ```
   This ensures URLs work correctly across dev, preview, and production. The helper reads `SNAP_PUBLIC_BASE_URL` first, then falls back to constructing from request headers.

6. **For state**, use `@farcaster/snap-turso`:
   ```typescript
   import { createTursoDataStore } from "@farcaster/snap-turso";
   const store = createTursoDataStore();
   // await store.get(key)
   // await store.set(key, value)
   ```
   Namespace your keys with the snap name: `store.get("rock-paper-scissors:game-state")`. This prevents collisions across snaps.

7. **Type check before committing:**
   ```bash
   npm run build
   ```
   If it fails, fix the errors. Never push code that doesn't type-check.

8. **Commit and push** via the `mcp__nanoclaw__git_commit_and_push` MCP tool (the host runs the actual git push for you):
   ```
   message: "snap: [name] — [short description]"
   repo: "snap-factory"  (or omit, that's the default)
   ```
   Vercel auto-deploys on the push.

9. **Wait and verify:**
   Poll the snap URL every 10 seconds for up to 3 minutes:
   ```bash
   curl -fsSL -H 'Accept: application/vnd.farcaster.snap+json' \
     "$SNAP_PUBLIC_BASE_URL/snaps/[name]"
   ```
   Check for valid JSON with `"version": "1.0"` (or `"2.0"` if you targeted v2) and a `ui` field. Only post to Farcaster after verification succeeds.

## URL Pattern

**Canonical URL (use this for Farcaster posts and inter-snap links):**
```
$SNAP_PUBLIC_BASE_URL/snaps/[name]
```

**File location on disk:**
```
api/snaps/[name]/index.ts
```

Both `/snaps/[name]` and `/api/snaps/[name]` resolve to the same function — the clean form is a Vercel rewrite to the file-based form. **Always use the clean form publicly** (in casts, in button targets, in `snapUrl()` results).

## Isolation Rules

- **Never import code from another snap directory.** Each snap is fully self-contained. If you need shared utilities, add them to `api/_lib/` (underscore prefix means Vercel won't deploy as functions).
- **Never share state keys across snaps.** Namespace Turso keys with the snap name.
- **Never assume other snaps exist.** A snap deployment should not break if another snap is removed.

## Constraints (from the Farcaster Snaps spec)

### Text content
- `text.content`: max 320 chars
- `button.label`: max 30 chars
- `badge.label`: max 30 chars
- `item.title`: max 100 chars
- `item.description`: max 160 chars
- `input.label`, `slider.label`, `progress.label`: max 60 chars

### Input constraints
- `input.maxLength`: 1-280
- `toggle_group.options`: 2-6 options, each max 30 chars
- `bar_chart.bars`: 1-6 bars, each label max 40 chars
- `cell_grid`: 2-32 cols × 2-16 rows, `rowHeight` 8-64

### URLs
- Target URLs for `submit`, `open_url`, `open_mini_app` must be HTTPS in production
- `http://localhost` valid only in dev
- No `javascript:` URIs
- Images must be HTTPS, jpg/png/gif/webp only

### Response
- `version` must be `"1.0"` or `"2.0"` (the validator accepts both; pick one and stick to it within a snap)
- `theme.accent` must be a named palette color (gray, blue, red, amber, green, teal, purple, pink)
- `ui.root` must be an ID present in `ui.elements`
- POST responses timeout at 5 seconds — keep handlers fast

Violating constraints causes the snap to fail validation and not render. Always check limits before committing.

## Available Components

**Display:** text, button, badge, icon, image, item, progress, separator
**Container:** stack, item_group
**Data:** bar_chart, cell_grid
**Field (collect user input):** input, slider, switch, toggle_group

Every component lives in `ui.elements` as a named entry. The `type` field is the component name, `props` is the configuration, `children` is an array of child element IDs, `on` binds events (typically `on.press` on buttons).

## Available Actions (on button press)

1. `submit` — POST to server, get next page
2. `open_url` — open URL in browser
3. `open_mini_app` — launch Farcaster mini app
4. `view_cast` — navigate to a cast by hash
5. `view_profile` — navigate to a profile by FID
6. `compose_cast` — open cast composer with pre-filled content
7. `view_token` — view token in wallet (CAIP-19 identifier)
8. `send_token` — open send token flow
9. `swap_token` — open swap flow between two tokens

## Available Icons

**Navigation:** arrow-right, arrow-left, external-link, chevron-right
**Status:** check, x, alert-triangle, info, clock
**Social:** heart, message-circle, repeat, share, user, users
**Content:** star, trophy, zap, flame, gift
**Media:** image, play, pause
**Commerce:** wallet, coins
**Actions:** plus, minus, refresh-cw, bookmark
**Feedback:** thumbs-up, thumbs-down, trending-up, trending-down

## Accent Colors (Palette)

gray, blue, red, amber, green, teal, purple, pink

Default: `purple`. Pick one that matches the snap's mood. Use `teal` for tools and utilities, `green` for success/go states, `red` for urgency/stop, `amber` for warnings, `blue` for info/neutral, `pink` for playful, `purple` for mystical, `gray` for subtle.

## Effects

Only one effect is available: `confetti`. Use it sparingly — for wins, completions, milestones. Add at the top level:

```json
{
  "version": "1.0",
  "effects": ["confetti"],
  "ui": { ... }
}
```

## POST Payload Shape

When a user taps a button with a `submit` action, the client sends:

```json
{
  "fid": 12345,
  "inputs": {
    "fieldName": "value"
  },
  "button_index": 0,
  "timestamp": 1717200000
}
```

`@farcaster/snap-hono` parses this automatically into `ctx.action.fid`, `ctx.action.inputs`, `ctx.action.button_index`. JFS signature verification happens automatically unless `SKIP_JFS_VERIFICATION=1` is set (dev only).

## Quick Reference: Component Interplay

- **Field components** (`input`, `slider`, `switch`, `toggle_group`) collect user input. Their values appear in `ctx.action.inputs[name]` on the next POST.
- **Buttons** are the only components that fire actions. Buttons trigger `submit` to collect field values, `open_url` for navigation, etc.
- **Stacks** are the primary layout container. Every page's root should be a stack.
- **Item + item_group** is the pattern for structured lists (leaderboards, settings, key-value rows).
- **Bar_chart + progress** are the two ways to show numeric data visually.
- **Cell_grid** is for pixel art, game boards, and tap-to-select interfaces.

## See also

- The official `farcaster-snap` Claude Code skill (loaded into your container at
  `/home/node/.claude/skills/farcaster-snap/`) has the spec author's own guidance on
  building snaps. Use it for any snap you're building. Note: that skill defaults to
  deploying via `host.neynar.app` — ignore those steps. Our deploy is via Vercel and
  the `mcp__nanoclaw__git_commit_and_push` MCP tool. The override section at the
  bottom of the SKILL.md explains this.
