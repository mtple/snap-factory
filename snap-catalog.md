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
| 4 | energy-reading | Wizard reads your energy — set two sliders (energy + chaos), get a personalised reading | /snaps/energy-reading | 0x8914da78ad5953a5189425051b64b2d1bc4cd561 | 2026-04-10 | absurd, slider, item_group, item, separator, compose_cast, pink |
| 5 | loud-links | Community YouTube link pool — drop a link, get a random one back | /snaps/loud-links | 0xb6a821aa5439947814aa60a764d4781de40e3411 | 2026-04-11 | collaborative, input, turso, stateful, open_url, community, red, event-mode |
| 6 | snapathon | Free snap request announcement with compose_cast CTA | /snaps/snapathon | 0xcacc8f13f3e8e51bdc9d0e80098723974bb836f9 | 2026-04-11 | announcement, compose_cast, event-mode, purple |
| 7 | drum-machine | 4-track 8-step beat sequencer — tap cell_grid to build a beat, Play Pattern opens Web Audio page | /snaps/drum-machine | 0x58f56317a69d1cdbad678998a36dc3e29f433d79 | 2026-04-11 | game, cell_grid, open_url, stateless, web-audio, purple |
| 8 | snap-101 | Self-demonstrating snap that explains what snaps are by being one — 2-page tutorial for @cameron | /snaps/snap-101 | 0xd494753c007a65321c99eafd21ec62cd473f7b37 | 2026-04-11 | tutorial, meta, badge, item_group, item, compose_cast, multi-page, event-mode, blue, green |
| 9 | follow-kayonfire | Follow @KayOnfire on X — one-tap profile card built for @kayonfire's event request | /snaps/follow-kayonfire | 0x84884130a7048673808b0131738759c95783b7e8 | 2026-04-11 | social, open_url, badge, event-mode, blue |
| 10 | pacman | Pac-Man game — 16×12 maze, eat dots, dodge 4 ghosts, power pellets flip the script. Per-FID state. Built for @rish. | /snaps/pacman | 0x535b32f6481781dd34b25356577541796b076295 | 2026-04-11 | game, cell_grid, submit, turso, stateful, amber, event-mode |
| 11 | mvr-showcase | Showcase of @mvr's hamst.art miniapps — HamScout + Tipopolis with descriptions and direct deeplinks. Built for @mvr. | /snaps/mvr-showcase | 0x9ae2207c5f20e6cc2f13ca366073ef28d0389796 | 2026-04-11 | showcase, item, open_mini_app, amber, event-mode, stateless |
| 12 | natal-chart | Birth chart generator — enter birth date and hour, get sun sign, approximate moon and rising signs with traits. Built for @statuette. | /snaps/natal-chart | 0x694d967cee000e51b6f3fe60a36341f17949f05a | 2026-04-11 | utility, input, separator, astrology, multi-page, purple, event-mode |
| 13 | natal-chart-v2 | Improved natal chart — adds birth city display and UTC offset for accurate sidereal-time rising sign. Rebuilt for @statuette. | /snaps/natal-chart-v2 | 0x5472ee4306f0684197524b57f3191b45e2d11124 | 2026-04-11 | utility, input, separator, astrology, multi-page, purple, event-mode |
| 14 | creature-summoner | Configure 4 trait switches (era, size, element, realm) and summon one of 16 unique wizard creatures | /snaps/creature-summoner | 0x86fbaa9d239ec697c697014194840efee7393286 | 2026-04-11 | absurd, switch, badge, separator, submit, stateless, gray, playful |
| 15 | raffle | Enter a list of names separated by commas, draw a random winner with confetti. Built for @dylsteck.eth. | /snaps/raffle | 0x26f6c6618675dc2eec0971461ebba36fbcf1e33d | 2026-04-11 | utility, input, submit, stateless, confetti, amber, event-mode |
| 16 | duo-do-song-quiz | "Which Dúo Dø song are you?" — 3-page mood quiz matching users to a song from the Tortoise catalog. Built for @duodomusica. | /snaps/duo-do-song-quiz | 0xc88ad2e025c67bc63209a5d123cc8588d75100be | 2026-04-12 | quiz, toggle_group, open_url, multi-page, stateless, pink, music, event-mode, tortoise |
| 17 | rug-floor-is-lava | Crypto survival platformer — jump platforms as red candle lava rises from the floor, HODL = instant death. Built for @sugarz.eth. | /snaps/rug-floor-is-lava | 0xd4e3c98e6e54a67ff48016c41728d2c5ef6265a0 | 2026-04-12 | game, cell_grid, submit, multi-page, stateless, red, crypto, event-mode, compose_cast |
| 18 | flappy-bird | Flappy Bird — tap to flap, survive the pipes. Fully stateless, state encoded in URL params. Built for @andrewrose. | /snaps/flappy-bird | 0x42350ce21344ed4a054d84f275da3aaff8065ff3 | 2026-04-12 | game, cell_grid, submit, stateless, amber, event-mode |
| 19 | tic-tac-toe | Tic-tac-toe with vs AI (minimax, unbeatable) or Pass & Play modes. Stateless, state URL-encoded. Built for @kruukruu. | /snaps/tic-tac-toe | 0xead3c1044fca48ee41354335a5026b367d84f8a0 | 2026-04-12 | game, button, toggle_group, submit, stateless, blue, ai, event-mode |

## Stats

- Total snaps built: 19
- Live snaps: 19
- Components used so far: stack, text, button, progress, toggle_group, bar_chart, slider, item_group, item, separator, input, cell_grid, badge, switch
- Actions used so far: open_url, submit, view_profile, compose_cast, open_mini_app
- Accent colors used: teal, purple, pink, red, blue, green, amber, gray
