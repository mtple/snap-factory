# Snap Template — Current SnapWizard Process

Snap spec changes quickly. Before building or materially editing a snap, fetch/read:

```bash
curl -fsSL https://docs.farcaster.xyz/snap/SKILL.md
curl -fsSL https://docs.farcaster.xyz/snap/llms.txt
```

Use this file for Snap Factory repo conventions; use the official docs for the latest protocol details.

## Repo conventions

- Snap source lives at `src/snaps/[name]/index.ts`.
- Public URL is the clean form: `$SNAP_PUBLIC_BASE_URL/snaps/[name]`.
- Internal absolute URLs must use `snapUrl(ctx.request, "[name]")` from `../../_lib/base-url.js`.
- Local relative imports in TypeScript must include `.js` extensions because this is ESM.
- Each snap should be self-contained. Put true shared helpers under `src/_lib/`.
- Commit/push with the Hermes tool `snapwizard_git_commit_and_push`; do not use NanoClaw tooling.

## Build flow

1. Pick a short kebab-case slug.
2. Create `src/snaps/[slug]/index.ts` or update the existing snap.
3. Return Snap JSON from a `registerSnapHandler(app, async (ctx) => ...)` Hono sub-app.
4. Run `npm run build` before committing. The build regenerates `src/snap-registry.ts`.
5. Push with `snapwizard_git_commit_and_push`.
6. Wait for Vercel and verify the live endpoint:

```bash
curl -fsSL -H 'Accept: application/vnd.farcaster.snap+json' \
  "$SNAP_PUBLIC_BASE_URL/snaps/[slug]"
```

7. Only post publicly after the live JSON and card/OG presentation are verified.

## Current spec defaults for new snaps

- New or substantially edited snaps should use `version: "2.0"`.
- Keep legacy `"1.0"` snaps working until they are touched; do not batch-migrate all old snaps unless asked.
- Use `theme.accent` from: `gray`, `blue`, `red`, `amber`, `green`, `teal`, `purple`, `pink`.
- `effects` currently supports `"confetti"`.
- `ui` uses the flat JSON-render shape:

```ts
return {
  version: "2.0",
  theme: { accent: "purple" },
  ui: {
    root: "page",
    elements: {
      page: { type: "stack", children: ["title", "cta", "share"] },
      title: { type: "text", props: { content: "Hello", weight: "bold" } },
      cta: {
        type: "button",
        props: { label: "Do thing", variant: "primary" },
        on: { press: { action: "submit", params: { target: `${self}?action=do` } } },
      },
      share: {
        type: "button",
        props: { label: "Share", variant: "secondary" },
        on: { press: { action: "compose_cast", params: { text: "try this snap", embeds: [self] } } },
      },
    },
  },
};
```

## v2 action/auth rules

- On POST, authenticated viewer identity is `ctx.action.user.fid`.
- `ctx.action.fid` is deprecated/optional and should not be used for new code.
- On GET, `ctx.action.user` is best-effort only. Always render a functional anonymous first load.
- Do not depend on `button_index`. Give different server actions distinct submit target URLs/query params, e.g. `${self}?action=reset`.
- Local POST tests must still use a JFS-shaped envelope. With `SKIP_JFS_VERIFICATION=1`, payload should include `user`, `surface`, `audience`, `timestamp`, and `inputs`.

Example local POST payload core:

```json
{
  "inputs": {},
  "audience": "http://localhost",
  "timestamp": 1717200000,
  "user": { "fid": 1 },
  "surface": { "type": "standalone" }
}
```

## Components and actions

Available components include display (`text`, `button`, `badge`, `icon`, `image`, `item`, `progress`, `separator`), containers (`stack`, `item_group`), data (`bar_chart`, `cell_grid`), and fields (`input`, `slider`, `switch`, `toggle_group`).

Action types:

- `submit` — POST to server and render next page.
- `open_url` — open external browser URL.
- `open_snap` — open another snap inline.
- `open_mini_app` — open a Farcaster mini app in-app.
- `view_cast`, `view_profile`, `compose_cast`, `view_token`, `send_token`, `swap_token` — Farcaster/client actions.

Use `open_snap` for snap-to-snap navigation instead of `open_url` when the target should remain inline.

## Expanded cell_grid capabilities

- `cell_grid` can be press-to-act: keep `select: "off"` (or omit it) and bind `on.press` to a `submit` action.
- Or it can be press-to-select: set `select: "single"` or `"multiple"` and pair with a separate submit button.
- Do not combine `on.press` with `select: "single" | "multiple"`; `on.press` is ignored when select is on.
- Cells can include `content` and optional `value` (1–30 chars). If `value` is set, `inputs[name]` receives that value; otherwise it receives `"row,col"`.
- Cell text now auto-contrasts against cell background in current clients, so labeled grids are more usable.

## Layout/limits checklist

- Design for ~480px width and ~500px visible height in feed.
- Max 64 elements.
- Max 7 root children.
- Max 6 children per container.
- Max nesting depth 5.
- Text max 320 chars.
- Button and badge labels max 30 chars.
- `input.maxLength`: 1–280; labels/placeholders max 60 chars.
- `toggle_group.options`: 2–6; each option max 30 chars.
- `bar_chart.bars`: 1–6; label max 40 chars.
- `cell_grid`: 2–32 cols, 2–16 rows, `rowHeight` 8–64.
- Production targets/images must be HTTPS; localhost HTTP is dev-only.

## Layout guidance from current docs

- Trust default `stack.gap` first. Horizontal stacks now use column-aware defaults: 2 columns → `lg`, 3 → `md`, 4+ → `sm`; vertical stacks default to `md`.
- Use one primary button per page; secondary for share/back/reset.
- `item` is not interactive. Do not use chevrons/arrows on non-navigating items.
- Set `openGraph` title/description in `registerSnapHandler` for a clean fallback/card.

## Required share button

Every screen should include a `compose_cast` share button with the snap URL in `embeds`.

## Verification

Before public posting:

1. Run the repo preflight after every new or materially edited snap:

```bash
npm run snap:preflight -- [slug]
```

This runs `npm run build`, imports `dist/index.js`, verifies the local GET Snap JSON, checks common AUI limits, requires a `compose_cast` share button, checks HTML/OG fallback routes, and runs product-sanity heuristics that catch common human-obvious bugs such as unlabeled bingo/card grids or labeled grids that look tappable but have no `on.press`/`select` behavior.

2. Exercise every primary interaction path locally, not just one happy path:

```bash
npm run snap:verify -- [slug] --post-target '?action=example' --inputs '{"choice":"example"}'
```

Use the real query string from the visible control and realistic inputs. For grids/cards/games, verify at least: no selection/empty input, one tap, toggle/unmark when supported, reset/new-card, and win/completion/result. The verifier sends the JFS-shaped `SKIP_JFS_VERIFICATION=1` payload with `user`, `surface`, `audience`, `timestamp`, and `inputs`.

3. Do a product/common-sense read before commit/post:
   - Write the intended human interaction in one sentence.
   - For every visible button/grid/cell/control, say what a user expects it to do and confirm a local test proves that exact behavior.
   - Read every result screen as if it were a screenshot with no code context. If the labels/results do not explain themselves, fix the UI.
   - If a grid/card/game/checklist looks playable, cells must be tappable/selectable or the copy must clearly say it is decorative.

4. Live URL returns `application/vnd.farcaster.snap+json` with valid JSON.
5. HTML fallback/OG image and posted cast/card are checked after posting when possible.

If `snap:preflight` fails, fix the local failure before commit/push. Do not rely on `npm run build` alone; TypeScript can pass while the Snap page is invalid or missing share/card basics.
