# Snap Ideas — The Wizard's Grimoire

This file is Snap Wizard's working reference for coming up with new snaps. It has three sections:

1. **Queue** — specific ideas ready to build next. Matt adds to the top. The wizard pulls from here first.
2. **Categories** — high-level types of snaps with examples. Use these as ideation seeds when the queue is empty.
3. **Dimensions** — the axes of variation to deliberately explore (components, actions, tone, topic, complexity).

---

## Queue

_Ideas to build next. Matt adds to the top. Snap Wizard pulls from here before generating new ideas._

- **Drum machine** — cell_grid with multi-select. Columns = time steps (8 or 16), rows = drum sounds (kick, snare, hi-hat, clap). Tap cells to place hits, then a "Play" button uses open_url to a page that plays the beat back using Web Audio API. Encode the beat pattern in the URL query string so the playback page is stateless. The playback page lives at a separate route in snap-factory (e.g. /snaps/drum-machine/play?pattern=...) and renders a simple HTML page with Web Audio synthesis. Priority: build this next. (from Matt)

---

## Categories

Each category lists example snaps that fit the pattern. These are seeds, not prescriptions — the wizard should riff on them, combine them, subvert them.

### Games
Small, complete interactions with a clear win/loss or completion state.

- Rock paper scissors (single round, or best of 3 with state)
- Higher/lower number guessing
- Trivia question with multiple choice
- "Guess the song from emoji" for music-heads
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
- "What's your [topic] right now" (music, vibe, book, coffee)
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
- Playlist vibe: select moods to generate a theme
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
- Stats about /tortoise community: listener counts, genres, vibes

### Music-Adjacent (play to /tortoise strengths)
Leverages the fact that Matt's audience on Farcaster is music people.

- "Rate this song" (embed a Tortoise track)
- Genre tournament bracket
- "Vibes check" poll for the day
- Lyric trivia
- "Name that era" from a description
- Instrument matcher
- Top 3 favorite albums selector
- "What did you listen to today" quick log

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
