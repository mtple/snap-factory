# Snap Ideas — The Wizard's Grimoire

This file is Snap Wizard's working reference for approved and candidate snap ideas. It has three sections:

1. **Queue** — Matt-approved ideas ready to build next. New approvals go at the top. Snap Wizard pulls from here first and must not build unapproved ideas.
2. **Categories** — high-level types of snaps with examples. Use these as ideation seeds only when proposing candidate ideas for Matt to approve.
3. **Dimensions** — the axes of variation to deliberately explore (components, actions, tone, topic, complexity).

Before pulling from the queue or proposing new candidate ideas, run `npm run scout-feed` and read `snap-feed-scout.md`. Use current Farcaster casts/channels to make the next snap feel timely, while still avoiding copycat prompts and respecting the hard music block.

Whenever the active approved queue has 5 or fewer buildable ideas, send Matt a numbered list of 20 concise, varied candidate ideas for approval. Do not add those candidates to this file until Matt explicitly approves them.

---

## Queue

_Approved ideas to build next. Matt approves and adds to the top. Snap Wizard pulls from here first and must not build unapproved ideas. If this list has 5 or fewer buildable ideas, propose 20 fresh candidates to Matt for approval._

- **b20-name-smith** (Matt, 2026-06-24) — Type a vibe, pick a tone, get a B20 token name + ticker + 32×16 snap-native logo grid. Creative, stateless, input + toggle_group + cell_grid. Inspired by /base B20-deploy feed signal. Non-music.
- **miniapp-mood** (Matt, 2026-06-24) — Pick the kind of mini app you want, get 3 curated recs from the cast feed + open_mini_app buttons. Discovery, stateless, toggle_group + item_group + open_mini_app. Underused `open_mini_app` action. Non-music.
- **thread-compass** (Matt, 2026-06-24) — Paste a thread URL or topic, get a "what kind of thread is this" reading (hot/cold/reply-bait/serendipity) + survival tip. Farcaster-native, stateless, input + badge + item_group. Non-music.
- **first-block-birthday** (Matt, 2026-06-24) — Auto-resolve the authed viewer's first cast via Neynar, stamp a personalized "X days on Farcaster" badge with a tiny shareable quote and view_profile button. Personalized, stateless, button + view_profile. Requires `NEYNAR_API_KEY` in Vercel env (same as trending-cast; verified working in prod). Non-music.


### Blocked — waiting on dependencies

- **Collaborative music collab** (from Matt) — 4-layer pass-the-snap music game. Layer 1: drums sequencer. Layer 2: bass sequencer (C major scale). Layer 3: harmony chord picker (C major chords). Layer 4: melody sequencer (C major scale). Each person adds a layer and shares via compose_cast, tagging all previous contributors. State + contributor FIDs encoded in URL. **BLOCKED: needs NEYNAR_API_KEY added to Vercel env vars** so the snap server can resolve FIDs to @usernames for tagging. Matt will add it — build this immediately when he confirms it's set.

---

## Categories

Each category lists example snaps that fit the pattern. These are seeds, not prescriptions — the wizard should riff on them, combine them, subvert them.

**Hard block:** Do not build music, audio, album, song, playlist, listening, venue, band, artist, Tortoise, soundcheck, setlist, radio, record/crate, or music-adjacent ideas unless Matt explicitly requests that exact snap in the current prompt.

### Games
Small, complete interactions with a clear win/loss or completion state.

- Rock paper scissors (single round, or best of 3 with state)
- Higher/lower number guessing
- Trivia question with multiple choice
- Guess the movie from emoji
- Tic-tac-toe against the wizard
- Coin flip with streak tracking
- Lightning round: 5 rapid questions
- Word association chain (each person adds one word)
- Memory match (flip cards in cell_grid)
- Would you rather (two options, see the split)

### Polls & Voting
Parallel choices with visible results. Tap-to-vote is the highest-engagement pattern.

- "This or that" between two options
- Daily mood poll
- "What's your [topic] right now" (vibe, book, coffee, weather)
- Ranked choice: pick your top 3 of 5
- Controversial take: agree/disagree/it's complicated
- Time-based: morning person vs night owl
- Community question: "what should I build tomorrow?"
- Preference matrix: hot takes on 5 topics

### Creative Tools
The user makes something. Low engagement bar, high satisfaction when it works.

- Collaborative pixel art (cell_grid with shared state)
- Word chain story (each person adds one word)
- Drawing game: each person adds one cell
- Haiku builder: pick from word options for each line
- Color palette: select moods to generate a theme
- Color palette picker
- Name generator with sliders (chaos, formality, length)
- "Design your perfect X" with toggles

### Utilities
Actually useful tools. Lower engagement but builds trust and repeat use.

- Countdown timer to an event
- Tip calculator
- Unit converter
- Simple calculator
- Pomodoro timer
- Dice roller (with d20, d6, d100 options)
- Coin toss
- Random picker (enter options, tap to shuffle)
- Name randomizer
- Password strength checker

### Social Experiments
Snaps that reveal something about the crowd. Reply-heavy, often surprising.

- "What % of people agree with this?" (predict, then see)
- Collaborative leaderboard: everyone contributes a number
- Voting with revealed tallies (live bar chart)
- "Guess the median answer"
- Cumulative counter: everyone adds 1, see the total
- Prediction markets (lightweight)
- "How many [thing] do you [action]?" slider with distribution
- Stats about the Farcaster crowd: habits, timing, builder preferences

### Blocked Topics
Music/Tortoise ideas are blocked by default. Do not build song, album, playlist, listening, venue, band, artist, soundcheck, setlist, radio, record/crate, or Tortoise-linking snaps unless Matt explicitly asks for one in the current request.

### Absurd / Playful
Low-stakes weirdness. These tend to over- or under-perform — high variance.

- "Ask the wizard" (random wisdom generator)
- Magic 8-ball
- Fortune cookie
- "The wizard reads your aura" (pick options → get a reading)
- Random wizard advice
- "Summon a creature" (cell_grid fills with symbols)
- Weather report for a fake place
- Daily tarot (single card pull)

### Feedback & Connection
Snaps that create a relationship between Snap Wizard and the community.

- "What should the wizard build?" (poll with 4 options, build the winner tomorrow)
- Weekly stats snap: "here's what I built this week"
- "Roast my snap" (Matt's feedback inbox)
- Idea submission form (typed input → logged to ideas file)
- "Vote for next week's theme"

---

## Dimensions (variety axes)

Every snap has coordinates on these axes. Deliberately vary them so the factory doesn't produce the same shape of thing repeatedly. Check `snap-catalog.md` to see which dimensions you've been hitting recently and push into unused corners.

### Components used
- **Field types:** input, slider, switch, toggle_group, cell_grid (selectable)
- **Display:** text, button, badge, icon, image, item, progress, separator, bar_chart, cell_grid (non-selectable)
- **Container:** stack, item_group

Track which you've used in the last 2 weeks. If you haven't used `slider` or `switch` lately, design something around them.

### Actions used
- submit (almost always)
- open_url
- open_mini_app
- view_cast
- view_profile
- compose_cast
- view_token
- send_token
- swap_token

Most snaps use `submit`. Try to work in `compose_cast`, `view_profile`, and the token actions occasionally — they're underused and create different interactions.

### Interaction depth
- **Single-page:** one screen, one action, done. (Countdown, tip calculator, fortune.)
- **Two-page:** initial + result. (Polls, games with a result screen.)
- **Multi-page:** 3+ pages with navigation. (Trivia, multi-round games, quizzes.)
- **Stateful:** remembers data across sessions via Turso KV. (Leaderboards, cumulative counters, collaborative art.)

Bias toward simpler snaps — single-page or two-page. Save multi-page and stateful for specific ideas that really need it. Complexity for its own sake rarely performs.

### Tone
- Playful (most of your work)
- Useful (utilities)
- Thoughtful (prompts that make people reflect)
- Absurd (wizard lore, random weirdness)
- Competitive (games with scores/leaderboards)
- Collaborative (things people build together)

### Topic
- Music (/tortoise channel strength)
- Farcaster culture (meta)
- Internet culture (general)
- Daily life (universal)
- The wizard's own lore
- Current events in the Farcaster ecosystem

### Duration of interest
- **One-shot:** fun once, then done. (Trivia, games.)
- **Daily:** worth checking again tomorrow. (Daily polls, countdowns, fortunes.)
- **Recurring:** part of a series. (Weekly this-or-that, daily trivia.)

Recurring snaps are valuable because they build audience habits. A "daily trivia" snap that updates every day is worth more than 7 one-shot trivia snaps.

---

## Generation techniques

When the queue is empty and you need to come up with something, use one of these techniques. Mix them over time.

### 1. Pull from a category
Pick a category you haven't used recently. Pick 2-3 examples from it. Riff on them, combine them, or subvert them.

### 2. Constraint prompt
Pick an underused component and design a snap around it. "I haven't used `slider` in 5 snaps. What's the simplest fun slider-based snap I could make right now?"

### 3. Action prompt
Same idea, with actions. "I've never used `compose_cast` as a button action. What snap would make sense with that?"

### 4. Cross-pollination
Take one idea from two different categories and mash them together. Trivia + collaborative = "collaborative trivia where the wrong answer gets added to a taboo list." Poll + music = "what's the most overrated album of 2026?"

### 5. Seasonal / contextual
What's happening right now? Is there a Farcaster event this week? A hackathon? A holiday? A music festival? A viral cast? A snap that references what's currently in the air will land harder.

### 6. Riff on Farcaster culture
What's the Farcaster ecosystem talking about right now? What's a meme, an inside joke, a recurring topic? Snaps that reference shared context land harder than snaps that exist in a vacuum.

### 7. The inversion
Take a snap you've built that did well and invert one dimension. If "pick between two options" worked, try "rank all 5 options." If "collaborative" worked, try "adversarial."

### 8. The extreme
Go extremely simple or extremely weird. Either side beats the middle. "What's the dumbest snap I could possibly make that would still work?" is a better question than "what's a reasonable snap to make?"

---

## Notes from previous builds

_Snap Wizard updates this section over time with patterns it notices._

(empty — will fill in as you build)
