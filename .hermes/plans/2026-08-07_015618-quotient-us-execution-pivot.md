# Quotient × FreeTurtle U.S. Execution Pivot Plan

**Status:** Draft for Matt and Quotient founder alignment  
**Created:** 2026-08-07  
**Plan owner:** Matt / FreeTurtle  
**Initial venue:** Kalshi event contracts  
**Intelligence partner:** Quotient  
**Public distribution:** Farcaster-first, with a full web app  
**Authorization state:** **Research and planning only. No live trading is authorized by this document.**

## 1. Executive summary

FreeTurtle should pivot from “build another general forecasting agent” to a narrower and more defensible role:

> **Turn Quotient forecasts into independently verified, U.S.-eligible, execution-aware decisions on Kalshi—and publish an auditable distinction between model edge, executable edge, and realized results.**

Quotient already has the broad intelligence stack: evidence ingestion, forecasts, mispricing signals, source citations, trade-oriented exits, an agent API, and a public paper track record. Its public record is promising but does not prove live executable profitability because it excludes spreads, liquidity, slippage, fees, failed fills, and portfolio concentration.

FreeTurtle's product is therefore not “Q with a turtle avatar.” It is the missing operating layer:

1. **Eligibility:** Is the trade permitted for Matt and supported by a U.S.-regulated venue?
2. **Contract equivalence:** Does a Quotient/Polymarket question mean exactly the same thing as the Kalshi contract?
3. **Execution:** Was there a real, timely, sufficiently deep quote that could have filled?
4. **Risk:** Does the position fit portfolio and event-cluster limits?
5. **Accountability:** Was the decision committed before the outcome, and can the result be reproduced?
6. **Distribution:** Can the reasoning be explained publicly without leaking secrets or overstating performance?

The pivot proceeds in stages:

- **Stage 0:** Founder alignment and data rights.
- **Stage 1:** Read-only integration and immutable data ledger.
- **Stage 2:** Market mapping and shadow execution.
- **Stage 3:** Thirty-day forward validation.
- **Stage 4:** Tiny, approval-only live pilot.
- **Stage 5:** Public FreeTurtle desk and, later, selective automation.

Live trading is gated. The system must first prove data integrity, market-equivalence accuracy, cost-aware paper performance, operational safety, and complete auditability.

---

## 2. Strategic objective

### Objective

Build the best public evidence that Quotient-derived prediction-market intelligence can—or cannot—survive real U.S. execution constraints.

### Core value proposition

- **Quotient:** intelligence, forecasts, evidence, signal generation.
- **FreeTurtle:** U.S. venue mapping, execution, risk, audit, public operations.
- **Kalshi:** initial regulated execution venue.
- **Farcaster:** public distribution and accountable identity.

### What success means

Success is not a high screenshot win rate. Success is a system that can truthfully report:

- every received Quotient Signal;
- every market-mapping decision;
- every accepted and rejected trade;
- executable prices available after real latency;
- modeled and realized costs;
- fills, partial fills, cancellations, and failures;
- exposure by event cluster;
- paper and live P/L;
- calibration and benchmark performance;
- complete postmortems.

### Non-goals for the pilot

The pilot will not:

- rebuild Quotient's broad forecasting pipeline;
- execute on Polymarket from a U.S. account;
- use VPNs or technical workarounds to evade venue restrictions;
- run high-frequency market making;
- optimize for maximum trade count;
- use leverage;
- deploy public autonomous live trading;
- implement Kelly sizing;
- promise profitability;
- allow the public app to possess trading credentials;
- treat loosely similar contracts as interchangeable.

---

## 3. Key hypotheses

The pilot tests five hypotheses.

### H1 — Intelligence portability

A useful subset of Quotient's Polymarket-centered forecasts can be mapped exactly to Kalshi event contracts without changing the proposition, deadline, resolution criteria, or payout semantics.

### H2 — Executable edge

After real latency, bid/ask spread, fees, depth, and conservative slippage, some mapped Signals retain positive expected edge.

### H3 — Diversification

Performance is not dependent on one event family, repeated entries into the same market, or a persistent “buy NO” bias.

### H4 — Operational edge

Contract parsing, mapping discipline, abstention, and risk controls create value even when the underlying forecast is supplied by Quotient.

### H5 — Public product value

A transparent public character explaining accepted trades, rejected trades, and mistakes is more differentiated and trustworthy than a generic “AI trader.”

Each hypothesis gets a measured pass/fail result. The project can succeed as research even if the trading hypothesis fails.

---

## 4. Partnership prerequisites

No substantial implementation should begin until Matt has a founder conversation with Quotient covering the following.

### Required access

1. Quotient developer API key with pilot credits or a sandbox.
2. Stable documented gateway and versioning policy.
3. Historical export of the current Signal product, not only the legacy narrative product.
4. Current Signal fields:
   - stable signal ID;
   - market/condition ID and Polymarket slug;
   - question and resolution terms;
   - side;
   - Q probability at publication;
   - venue price at publication;
   - publication timestamp;
   - forecast-update timestamps;
   - Q target/convergence price;
   - status and retirement reason;
   - source/evidence references;
   - capacity and live-price metadata where available.
5. Clarification of current rate limits and expected polling cadence.

### Required rights

1. Permission to store Quotient responses for evaluation.
2. Permission to publish attributed Q probabilities and selected evidence.
3. Permission to publish transformed execution metrics and postmortems.
4. Rules for use of Quotient, Q, and $QUOTIENT branding.
5. Agreement on whether FreeTurtle may expose any Quotient-derived data through a public API.
6. Ownership of generated market mappings, fill data, evaluation results, and strategy improvements.

### Required methodology clarification

1. Complete current row-level Signal record.
2. Difference between the legacy narrative track record and current Signals record.
3. Handling of repeated Signals on one market or event cluster.
4. Current seven-day/convergence exit rule.
5. Calibration metrics and benchmark methodology.
6. Any available live-money or fill-adjusted results.
7. Treatment of revised, paused, flipped, retired, or unresolved Signals.

### Proposed partnership framing

Start as a **30-day design-partner pilot**, not an endorsement or performance partnership.

Possible economics after validation:

- sponsored API credits;
- paid design-partner work;
- subscription or API referral share;
- co-branded research sponsorship;
- external-contributor compensation;
- later strategic/token/equity discussion.

Do not use a performance fee or discretionary-management framing until counsel has reviewed the regulatory responsibilities.

---

## 5. Operating modes

The platform has explicit mutually exclusive modes.

### `RESEARCH_ONLY`

- Quotient and Kalshi public data reads only.
- No account credentials.
- No simulated orders.
- Used during connector development.

### `SHADOW`

- Authenticated Quotient reads.
- Kalshi production quotes and optional Kalshi demo-account actions.
- Simulated decisions and fills stored in the ledger.
- No production trading key loaded.

### `APPROVAL_LIVE`

- Production Kalshi order key loaded only in the private execution service.
- Every order requires a fresh, explicit Matt approval bound to a decision ID, price limit, side, size, and expiry.
- No approval reuse.

### `LIMITED_AUTO`

- Not part of the initial pilot.
- Can be considered only after a separate written approval, a successful live pilot, and legal/operational review.

### `HALTED`

- All writes disabled.
- Reads and reconciliation allowed.
- Triggered manually or automatically by a kill switch.

Default startup mode is `HALTED` unless explicitly configured otherwise. A mode change is an audited event.

---

## 6. Recommended system boundary

### Private execution system

Create a dedicated private repository rather than putting trading credentials inside Snap Factory or the public app:

```text
/home/ubuntu/freeturtle-execution/
  apps/
    worker/                    # scheduled ingestion, mapping, evaluation
    control-api/               # private approval and operator API
  packages/
    quotient-client/           # API key/x402 read client, schemas, retries
    kalshi-client/             # market data, demo/live order adapters
    market-registry/           # normalized contracts and venue mappings
    mapping-engine/            # candidate retrieval + deterministic comparison
    decision-policy/           # eligibility/edge/liquidity gates
    risk-engine/               # exposure, event clusters, stops, kill switches
    execution-engine/          # shadow fills and live order lifecycle
    ledger/                    # append-only events and database access
    evaluation/                # P/L, calibration, benchmarks, reports
    public-export/             # sanitized records for the public app
    observability/             # metrics, alerts, health checks
  db/
    migrations/
    seeds/
  config/
    policy.defaults.json
    market-clusters.json
  fixtures/
    quotient/
    kalshi/
  scripts/
    replay.ts
    reconcile.ts
    export-public.ts
    emergency-halt.ts
  tests/
    integration/
    replay/
  package.json
  pnpm-workspace.yaml
  README.md
  SECURITY.md
  RUNBOOK.md
```

Recommended stack:

- TypeScript/Node.js;
- PostgreSQL;
- Zod schemas at every external boundary;
- a simple persistent worker/cron loop for the pilot;
- Vitest for unit/integration tests;
- structured JSON logs;
- OpenTelemetry-compatible metrics if available;
- encrypted environment secrets supplied by deployment configuration.

Avoid Redis, Kafka, Kubernetes, or a complex message bus during the pilot. PostgreSQL can provide durable jobs and locking at this scale.

### Public app

Add a read-only full app later in App Factory:

```text
/home/ubuntu/app-factory/apps/freeturtle-desk/
  app/
    page.tsx
    decisions/[id]/page.tsx
    methodology/page.tsx
    track-record/page.tsx
    api/public-feed/route.ts     # optional cache/proxy, no private credentials
  lib/
    public-client.ts
    metrics.ts
    metadata.ts
    manifest.ts
  public/assets/
    icon.png
    splash.png
    embed.png
  tests/
  miniapp.config.ts
```

The public app receives only sanitized, delayed, read-only records. It never imports execution packages and never receives Quotient or Kalshi private credentials.

---

## 7. Component architecture

### 7.1 Quotient connector

Responsibilities:

- use API-key credits by default; no autonomous x402 spending during the pilot;
- poll published Signals and changed forecasts;
- validate every response against a pinned schema;
- preserve raw response, response hash, source URL, receive time, and provider timestamp;
- retry bounded transient failures;
- stop processing on unknown breaking schema changes;
- support a configured primary and explicitly approved failover host;
- never silently infer missing fields.

Required files:

```text
packages/quotient-client/src/client.ts
packages/quotient-client/src/schema.ts
packages/quotient-client/src/endpoints.ts
packages/quotient-client/src/version-policy.ts
packages/quotient-client/src/fixtures.ts
```

Acceptance criteria:

- fixture tests cover successful reads, 401, 402, 403, 429, timeout, malformed JSON, and unknown fields;
- the client cannot make paid x402 calls unless a separate spend policy is enabled;
- API keys never appear in logs or command arguments;
- duplicate Signal ingestion is idempotent.

### 7.2 Kalshi connector

Responsibilities:

- ingest open markets, series, events, order books, trades, and rules;
- stream or poll live quotes;
- use separate demo and production credentials;
- place, cancel, and reconcile limit orders only through the execution engine;
- expose account balances and positions to the risk engine;
- attach provider timestamps and local receive timestamps;
- detect stale order books and reconnect safely.

Required files:

```text
packages/kalshi-client/src/public-client.ts
packages/kalshi-client/src/trading-client.ts
packages/kalshi-client/src/websocket.ts
packages/kalshi-client/src/auth.ts
packages/kalshi-client/src/schema.ts
packages/kalshi-client/src/demo.ts
```

Acceptance criteria:

- public data works without trading credentials;
- demo and production base URLs cannot be mixed;
- order idempotency keys are deterministic per approved decision;
- a production order path refuses to load in `RESEARCH_ONLY` or `SHADOW`;
- cancellation and reconciliation are integration-tested in demo mode.

### 7.3 Normalized market registry

Every venue contract is normalized into a common representation:

```ts
type NormalizedContract = {
  venue: "quotient" | "polymarket" | "kalshi";
  venueMarketId: string;
  eventClusterId: string;
  proposition: string;
  positiveOutcome: string;
  negativeOutcome: string;
  openAt?: string;
  closeAt: string;
  expectedResolveAt?: string;
  resolutionSource: string[];
  resolutionRules: string;
  exclusions: string[];
  edgeCases: string[];
  priceConvention: "yes_probability";
  rawTermsHash: string;
  observedAt: string;
};
```

Store the raw venue terms and their hash. Any terms change invalidates an existing approved mapping until reviewed again.

### 7.4 Mapping engine

The mapping engine is the core proprietary component.

#### Candidate discovery

Use a combination of:

- entity/date/category filters;
- embeddings or an LLM for candidate retrieval;
- exact venue identifiers when Quotient supplies them;
- temporal and outcome constraints.

Do not use brittle keyword matching as the final mapping decision.

#### Deterministic comparison

For every candidate pair, compare:

1. proposition;
2. positive and negative outcome semantics;
3. deadline and timezone;
4. resolution source;
5. cancellation/invalid-market behavior;
6. exclusions;
7. treatment of ambiguous events;
8. close-versus-resolution timing;
9. multi-outcome versus binary structure;
10. price-side transformation.

#### Mapping statuses

- `EXACT`: same economic proposition and resolution semantics.
- `COMPATIBLE_REVIEWED`: bounded difference approved by a human; shadow only during pilot.
- `RELATED_NOT_EQUIVALENT`: useful for intelligence, never executable as the same trade.
- `NO_MATCH`: no suitable Kalshi contract.
- `STALE`: terms changed after approval.
- `REJECTED`: reviewed and explicitly unsafe to map.

Only `EXACT` mappings can become live candidates during the first pilot.

#### Human review

Every new `EXACT` mapping is manually reviewed once before it can enter shadow decisions. Repeat use is allowed only while both terms hashes remain unchanged.

Required files:

```text
packages/market-registry/src/types.ts
packages/market-registry/src/repository.ts
packages/mapping-engine/src/candidates.ts
packages/mapping-engine/src/compare.ts
packages/mapping-engine/src/rule-diff.ts
packages/mapping-engine/src/review.ts
```

### 7.5 Decision policy

The decision policy turns a mapped Quotient Signal into `ACCEPT`, `REJECT`, or `REVIEW`.

Required gates:

1. **Eligibility:** account, venue, and product allowed.
2. **Signal status:** active/actionable; not paused, flipped, retired, or stale.
3. **Mapping:** current `EXACT` mapping.
4. **Rule confidence:** no unresolved rule ambiguity.
5. **Freshness:** Q forecast and Kalshi quote within configured age limits.
6. **Direction:** Q side correctly transformed to Kalshi YES/NO.
7. **Edge:** net edge remains after costs and safety haircuts.
8. **Liquidity:** spread and near-touch depth within limits.
9. **Concentration:** event/topic/side exposure under limits.
10. **Execution:** valid limit price, expiry, and cancel path.
11. **Audit:** all required raw inputs persisted.

Each rejection stores a machine-readable reason code and plain-English explanation.

Provisional shadow defaults, to be approved before implementation:

- minimum net modeled edge: 5 percentage points after all haircuts;
- maximum observed spread: 5 cents;
- simulated order size: lower of $100 or 10% of near-touch depth;
- one concurrent position per exact market;
- no more than one new accepted decision per event cluster per signal cycle;
- no trade when quote or book data is stale;
- no trade when resolution terms changed after mapping approval.

These are pilot safeguards, not claims that the thresholds are optimal. They may change only prospectively, with policy-version logging—never retroactively to improve results.

### 7.6 Risk engine

Risk is evaluated before approval, before order submission, after every fill, and continuously while positions remain open.

Risk dimensions:

- maximum loss per position;
- total open maximum loss;
- event-cluster exposure;
- correlated topic exposure;
- venue exposure;
- directional YES/NO imbalance;
- maturity concentration;
- unresolved/settlement exposure;
- API/data-health state;
- drawdown;
- repeated operational errors.

Initial live limits are not set in this document because Matt has not approved a bankroll. Recommended limit formulas for the approval document:

- per-trade maximum loss: lower of a fixed dollar cap and 0.25% of approved pilot bankroll;
- event-cluster maximum loss: 1% of bankroll;
- total open maximum loss: 2% of bankroll;
- daily new-risk stop: 0.5% of bankroll;
- weekly drawdown halt: 1% of bankroll;
- no leverage;
- no averaging down;
- no market orders;
- no size increase during the initial live pilot.

A separate live-capital authorization must specify the bankroll and exact dollar caps.

### 7.7 Shadow execution engine

Two paper models run side by side.

#### Comparable paper model

- flat $100 stake per accepted Signal;
- follows Quotient's documented seven-day/convergence framework;
- useful for comparison with Quotient's paper results.

#### Executable paper model

- starts at FreeTurtle receive time, not Quotient publication time;
- uses the Kalshi ask for buys and bid for exits;
- limits size by observed depth;
- models fees and conservative slippage;
- handles partial or absent fills;
- cancels after the configured timeout;
- tracks order latency;
- uses actual Kalshi resolution for settlement.

The gap between these models is a primary product metric: **paper-to-executable decay**.

### 7.8 Live execution engine

The live engine is disabled until Stage 4.

Order lifecycle:

1. Generate immutable decision ID.
2. Capture fresh order book.
3. Generate proposed limit order and maximum loss.
4. Run risk gates.
5. Send approval request with expiry.
6. Receive Matt approval bound to exact parameters.
7. Re-read book and risk immediately before submission.
8. Reject if price moved beyond approval tolerance.
9. Submit idempotent limit order.
10. Monitor fills.
11. Cancel unfilled remainder at timeout.
12. Reconcile order, fills, position, and balance.
13. Record public-safe summary after fill/cancel.

Approval must include:

- decision ID;
- venue ticker;
- side;
- contract count or maximum dollar loss;
- limit price;
- approval expiry;
- current spread/depth summary;
- event-cluster exposure after fill.

A vague “yes” cannot authorize an order whose parameters changed.

### 7.9 Ledger and database

Use append-only event records plus current-state projections.

Core tables:

```text
raw_provider_messages
quotient_signals
quotient_forecasts
venue_markets
market_term_versions
market_mappings
mapping_reviews
quote_snapshots
orderbook_snapshots
decisions
decision_gate_results
risk_snapshots
approvals
orders
fills
positions
settlements
performance_snapshots
publications
incidents
policy_versions
mode_changes
```

Every decision must be reproducible from immutable inputs and a specific policy version.

### 7.10 Evaluation engine

Report at least:

- signal count received;
- exact-match rate;
- accepted/rejected/review counts;
- rejection reasons;
- receive latency;
- quote latency;
- comparable paper return;
- executable paper return;
- paper-to-executable decay;
- fill rate and partial-fill rate;
- fees and modeled slippage;
- win rate, but never alone;
- expected value per decision;
- Brier score and log loss;
- calibration by probability bucket;
- performance by category, side, maturity, and edge bucket;
- event-cluster concentration;
- top-market contribution to P/L;
- maximum drawdown;
- capital utilization;
- benchmark comparisons.

Benchmarks:

1. Kalshi market probability at FreeTurtle receive time.
2. Always-NO/favorite baseline.
3. Equal-weight accepted Signal strategy.
4. No-mapping/abstention baseline where relevant.
5. Quotient's stated entry price versus FreeTurtle executable entry.

---

## 8. Public product design

### Product name

Working name: **FreeTurtle Desk**.

### Public promise

“Forecasts are easy. Fills are real. FreeTurtle shows the difference.”

### Main screens

#### Desk

- current system mode;
- recent decisions;
- accepted, rejected, and under-review Signals;
- aggregate shadow/live status;
- data freshness;
- methodology link.

#### Decision detail

- question and venue;
- Quotient probability with attribution;
- Kalshi market probability at receipt;
- contract-equivalence status;
- modeled costs;
- final FreeTurtle decision;
- order/fill status;
- exit rule;
- result and postmortem;
- timestamped evidence links where licensed.

#### Track record

- comparable paper model;
- executable paper model;
- live results only when available;
- closed versus open separation;
- gross versus net separation;
- event-cluster concentration;
- calibration;
- complete row export.

#### Methodology

- mapping rules;
- acceptance gates;
- cost model;
- risk model;
- version history;
- limitations and disclosures.

### Publication policy

- Commit the decision internally before public commentary.
- During shadow mode, publish after the simulated decision is recorded.
- During live mode, publish only after fill, cancellation, or approval expiry to avoid self-induced execution problems.
- Never publish wallet balances, credentials, exact security controls, or unfilled live order parameters.
- Show size tiers publicly unless Matt explicitly approves exact size disclosure.
- Publish losses and rejected trades with the same cadence as wins.
- Clearly label `SHADOW`, `LIVE`, `OPEN`, `CLOSED`, and `UNFILLED`.

### Farcaster app requirements

If built in App Factory, the app must include:

- full web experience first;
- Farcaster SDK readiness;
- domain manifest;
- `fc:miniapp`, Open Graph, and Twitter metadata;
- PNG icon, splash, and 3:2 embed assets;
- share cards for individual decisions and postmortems;
- no public trading controls during the pilot.

---

## 9. Security model

### Credential separation

- Quotient key: read-only intelligence service.
- Kalshi public data: no key where possible.
- Kalshi demo key: worker secret.
- Kalshi production trading key: live executor only.
- Public app: no private keys.
- Database roles: worker write, evaluator read, public exporter sanitized read.

### Secret handling

- Store secrets only in deployment secret stores or protected local environment files.
- Never pass keys to coding agents.
- Never place secrets in prompts, logs, URLs, command arguments, Git, or Telegram.
- Redact provider headers and signatures from raw logs.
- Rotate a key after suspected disclosure.

### Network and API controls

- Explicit allowlist for Quotient and Kalshi hosts.
- TLS verification required.
- Timeouts and bounded retries.
- Schema pinning and fail-closed behavior.
- No dynamic host supplied by fetched content.
- Production order endpoint unavailable from public deployments.

### Approval security

- Approval tokens are single-use and expire quickly.
- Approval parameters are cryptographically hashed with the decision.
- Any size/price/side/ticker change invalidates approval.
- Live submission logs the approver and exact timestamp.

### Kill switches

Immediate `HALTED` transition on:

- stale or divergent venue data;
- unexpected schema change;
- account reconciliation mismatch;
- duplicate order uncertainty;
- inability to cancel;
- drawdown limit;
- three consecutive operational errors;
- key compromise suspicion;
- terms or eligibility uncertainty;
- manual Matt halt.

---

## 10. Compliance and communications

This is not legal advice. Before live or public launch, obtain a targeted review of:

- Kalshi account and API terms;
- automated order requirements;
- whether co-branded forecasts create CTA, adviser, solicitation, or endorsement concerns;
- compensation arrangements with Quotient;
- performance-result presentation;
- hypothetical-versus-live disclosures;
- public use of Quotient data and trademarks;
- record-retention obligations;
- token-related disclosures if $QUOTIENT is mentioned.

Public language must avoid:

- “guaranteed,” “safe,” or “consistent profit”;
- presenting paper results as real fills;
- implying Quotient endorsed a trade without agreement;
- hiding losses or unfilled orders;
- implying FreeTurtle is acting for other people's accounts;
- instructing users to evade venue restrictions.

---

## 11. Delivery phases

### Stage 0 — Founder alignment and written pilot brief

**Duration:** 3–5 working days after meeting  
**Mode:** planning

Deliverables:

- agreed problem statement;
- API/sandbox access;
- data and attribution rights;
- current Signal sample/export;
- partnership boundary;
- named technical and business contacts;
- written 30-day pilot terms;
- unresolved compliance questions list.

Exit gate `G0`:

- stable access available;
- legal U.S. execution path remains plausible;
- rights permit private evaluation;
- Quotient understands this is an independent execution audit, not guaranteed promotion.

If `G0` fails, build a Quotient-independent Kalshi specialist system or stop the pivot.

### Stage 1 — Read-only foundation

**Duration:** 1 week  
**Mode:** `RESEARCH_ONLY`

Deliverables:

- repository and CI;
- PostgreSQL schema;
- Quotient connector with fixtures;
- Kalshi public data connector;
- raw append-only ledger;
- provider health dashboard;
- replay command;
- seven days of uninterrupted ingestion.

Exit gate `G1`:

- no duplicate Signal records;
- provider messages reproducibly parse;
- at least 99% scheduled poll completion excluding provider outages;
- all failures visible and retried/finalized deterministically;
- secrets absent from logs and repo.

### Stage 2 — Mapping and shadow execution

**Duration:** 1–2 weeks  
**Mode:** `SHADOW`

Deliverables:

- normalized contract registry;
- candidate discovery;
- rule-diff interface;
- manual mapping review queue;
- decision and risk policy v1;
- comparable and executable paper engines;
- Kalshi demo order lifecycle;
- daily internal report.

Exit gate `G2`:

- 100% manual precision on a reviewed sample of `EXACT` mappings;
- zero automatic trades from `RELATED_NOT_EQUIVALENT` mappings;
- all paper decisions reproducible;
- demo orders/cancels/reconciliation pass end to end;
- policy versions immutable.

### Stage 3 — Forward shadow pilot

**Duration:** minimum 30 calendar days  
**Mode:** `SHADOW`

Target sample:

- at least 50 independent mapped decisions;
- at least 20 closed/resolved decisions;
- no single event cluster treated as independent repeated evidence;
- multiple categories and both YES/NO sides where available.

If natural matching produces fewer decisions, extend the clock. Do not weaken mapping standards to hit sample size.

Deliverables:

- complete decision ledger;
- weekly Quotient/FreeTurtle review;
- public app private preview;
- final shadow evaluation report;
- live-capital recommendation or rejection.

Exit gate `G3` requires all of:

1. positive executable paper expectancy after conservative costs;
2. executable performance not dependent on one event cluster;
3. top three markets contribute less than 50% of total positive P/L, or a documented reason to extend the sample;
4. no severe mapping or settlement incident;
5. acceptable drawdown under proposed limits;
6. 100% audit completeness;
7. paper-to-executable decay measured and understood;
8. no unresolved legal/terms blocker;
9. Matt and Quotient review the result.

A failed `G3` means extend shadow mode, narrow the strategy, or stop. It does not justify live trading.

### Stage 4 — Tiny approval-only live pilot

**Duration:** 4–8 weeks  
**Mode:** `APPROVAL_LIVE`

Prerequisites:

- separate signed live-capital authorization;
- approved bankroll and dollar limits;
- Kalshi production API order/cancel smoke test;
- live runbook and incident drill;
- reconciliation verified;
- public disclosures reviewed.

Deliverables:

- approval workflow;
- live limit orders only;
- daily reconciliation;
- weekly live-versus-shadow report;
- complete fills and failure record.

Exit gate `G4`:

- zero unauthorized orders;
- zero unreconciled positions;
- realized costs within modeled bounds or model updated prospectively;
- no operational loss outside approved market risk;
- sufficient sample to decide whether continued live testing is rational.

### Stage 5 — Public launch and selective automation

Public launch can occur after shadow results if clearly labeled. Live automation is a separate later decision.

Deliverables:

- FreeTurtle Desk public deployment;
- Farcaster app integration;
- public methodology and track record;
- decision/postmortem share cards;
- delayed sanitized feed;
- incident/status page.

`LIMITED_AUTO` requires a new plan and explicit approval. It is not automatically unlocked by `G4`.

---

## 12. Testing strategy

### Unit tests

- schema validation;
- probability/side conversion;
- rule normalization;
- terms hashing;
- fee and cost calculations;
- edge haircuts;
- event-cluster limits;
- approval expiry;
- order idempotency;
- P/L and calibration metrics.

### Contract tests

Record sanitized provider fixtures and test:

- Quotient v5.1/v5.2-compatible responses;
- missing/renamed fields;
- Kalshi market and order-book payloads;
- changed resolution terms;
- HTTP 401/402/403/429/5xx;
- TLS/host failure;
- pagination and cursors.

### Mapping tests

Create adversarial pairs:

- same wording, different deadline;
- same event, different resolution source;
- “announced” versus “released”;
- “before” versus “by”;
- local timezone versus UTC;
- invalid/cancel treatment differences;
- binary versus multi-outcome;
- overlapping but non-equivalent events.

Expected result: no false `EXACT` classification.

### Replay tests

Use historical raw messages to verify:

- same policy version produces the same decision;
- later data is not visible to earlier decisions;
- receive-time quote, not retrospective best price, is used;
- terms changes invalidate mapping;
- repeated Signals respect cluster limits.

### Demo integration tests

- authenticate;
- place limit order;
- receive partial/full/no fill;
- cancel;
- reconnect WebSocket;
- reconcile position and balance;
- survive restart without duplicate order.

### Security tests

- secret scanning;
- log redaction;
- public API cannot reach trading code;
- mode prevents production writes;
- approval replay fails;
- changed parameters invalidate approval;
- kill switch blocks submissions.

### Public app tests

- track-record totals match sanitized export;
- paper/live labels cannot disappear;
- open and closed positions remain separate;
- source attribution renders;
- Farcaster metadata and manifest validate;
- no private fields appear in HTML, client bundles, or API responses.

### Required CI commands

Private execution repo:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm replay:verify
```

Public app:

```bash
pnpm validate:miniapp freeturtle-desk
pnpm --filter freeturtle-desk test
pnpm --filter freeturtle-desk typecheck
pnpm --filter freeturtle-desk build
pnpm catalog
```

---

## 13. Observability and operations

### Health metrics

- last successful Quotient poll;
- last Kalshi market/quote update;
- WebSocket connection state;
- queue backlog;
- parse failures;
- stale mappings;
- decisions by state;
- approval age;
- unreconciled orders/positions;
- database latency;
- public export freshness.

### Alerts

Immediate alert:

- production order uncertainty;
- position mismatch;
- stale data during an approved decision;
- kill switch;
- credential/auth failure;
- schema incompatibility;
- database write failure.

Daily summary:

- Signals received;
- matches found;
- accepted/rejected/reviewed;
- paper fills;
- open exposure;
- closed results;
- system health.

### Runbooks

`RUNBOOK.md` must cover:

- start/stop;
- mode changes;
- connector outage;
- stale data;
- duplicate-order uncertainty;
- failed cancel;
- position mismatch;
- settlement dispute;
- key rotation;
- emergency halt;
- database restore;
- public correction.

Conduct an emergency-halt and reconciliation drill before live authorization.

---

## 14. Data retention and reproducibility

Retain:

- raw provider payloads;
- normalized records;
- terms versions;
- quotes/order books used for decisions;
- policy and code version;
- approvals;
- orders/fills/cancels;
- public posts;
- outcomes and corrections.

For every decision, generate a reproducibility bundle containing:

```text
bundle/<decision-id>/
  quotient-signal.json
  quotient-forecast.json
  polymarket-terms.txt
  kalshi-terms.txt
  mapping.json
  quote.json
  orderbook.json
  policy.json
  gate-results.json
  risk.json
  approval.json          # live only, sanitized for archives
  execution.json
  outcome.json
  README.md
```

Hash the bundle and store the hash in the ledger. A later public transparency feature could publish hashes without exposing private data.

---

## 15. Work breakdown by implementation task

### Epic A — Project foundation

1. Create private repository and workspace.
2. Add TypeScript, lint, typecheck, tests, CI.
3. Add PostgreSQL and migrations.
4. Implement structured logging and secret redaction.
5. Implement system modes and kill switch.
6. Write `SECURITY.md` and `RUNBOOK.md` skeletons.

### Epic B — Quotient ingestion

1. Define pinned schemas.
2. Implement API-key authentication.
3. Implement Signal/forecast pagination.
4. Store raw and normalized records.
5. Add idempotency and update history.
6. Add rate-limit/backoff behavior.
7. Add gateway/version health checks.
8. Build fixtures from a sanctioned sample.

### Epic C — Kalshi market data

1. Ingest events, series, markets, and terms.
2. Capture quotes and order books.
3. Add WebSocket reconnect and stale-state detection.
4. Store terms versions and hashes.
5. Implement demo account integration.
6. Add order and position reconciliation.

### Epic D — Mapping

1. Build normalized contract schema.
2. Implement candidate retrieval.
3. Implement deterministic rule diff.
4. Build manual review queue.
5. Store mapping versions and approvals.
6. Add terms-change invalidation.
7. Build adversarial mapping fixture suite.

### Epic E — Decision and risk

1. Implement gate interface and reason codes.
2. Implement configurable policy versions.
3. Implement cost/edge model.
4. Implement event clustering.
5. Implement concentration limits.
6. Add shadow decision service.
7. Add kill-switch triggers.

### Epic F — Shadow execution and evaluation

1. Build comparable $100 model.
2. Build capacity-aware executable model.
3. Model partial/no fills.
4. Implement exits and settlement.
5. Build benchmarks and calibration.
6. Generate daily and weekly reports.
7. Add replay verification.

### Epic G — Live approval and execution

1. Write separate live-capital authorization.
2. Build approval request and expiry.
3. Bind approvals to immutable order parameters.
4. Implement fresh pre-submit checks.
5. Implement limit-order lifecycle.
6. Reconcile account state after every action.
7. Drill halt/cancel/recovery.

### Epic H — Public FreeTurtle Desk

1. Define sanitized public schema.
2. Build delayed export.
3. Build desk, detail, track-record, and methodology pages.
4. Add Farcaster integration and share cards.
5. Add paper/live/open/closed labeling tests.
6. Deploy privately for review.
7. Run live metadata/public-access verification.
8. Launch only after Matt approval.

---

## 16. Suggested timeline

Assuming Quotient access is available promptly:

| Week | Focus | Exit |
|---|---|---|
| 0 | Founder meeting, data/rights/pilot brief | `G0` |
| 1 | Repo, database, Quotient + Kalshi read-only ingestion | foundation |
| 2 | Mapping engine and manual review | mapping alpha |
| 3 | Shadow execution, demo orders, risk v1 | `G2` |
| 4–7 | Minimum 30-day forward shadow pilot | sample accrual |
| 6–7 | Public app private preview in parallel | review link |
| 8 | Shadow evaluation and live recommendation | `G3` |
| 9–12+ | Tiny approval-only live pilot, if approved | `G4` |
| Later | Public launch and possible limited automation | separate approval |

Calendar time expands automatically if there are insufficient exact matches or closed decisions.

---

## 17. First ten working days

### Day 1

- Matt meets Quotient founders.
- Confirm pilot intent, API access, rights, and contacts.
- Obtain sanitized sample payloads.

### Day 2

- Write one-page signed pilot brief.
- Decide private repository name and deployment target.
- Confirm no legal/terms blocker for shadow research.

### Day 3

- Create repository, CI, database, schemas, and modes.
- Add secret scanning and structured logs.

### Day 4

- Implement Quotient connector and fixtures.
- Capture raw/normalized Signals.

### Day 5

- Implement Kalshi market/terms ingestion.
- Capture quote and order-book snapshots.

### Day 6

- Build normalized contract registry and terms hashing.
- Produce first candidate matches.

### Day 7

- Build rule-diff and manual review workflow.
- Review initial mappings with Matt.

### Day 8

- Implement decision gates, cost model, and rejection reasons.
- Add event-cluster taxonomy.

### Day 9

- Implement two shadow execution models.
- Add Quotient-versus-executable comparison.

### Day 10

- Run end-to-end replay.
- Produce first daily report.
- Decide whether the system is ready to begin the formal 30-day shadow clock.

---

## 18. Decision log required before implementation

Matt must approve or answer:

1. **Partnership:** Is Quotient willing to run the pilot?
2. **Repository:** Create a new private `freeturtle-execution` repo?
3. **Venue:** Kalshi only for the first pilot?
4. **Signal universe:** all Quotient Signals or one category first?
5. **Public timing:** private shadow first or public-in-shadow from day one?
6. **Brand:** co-branded Quotient × FreeTurtle or attributed but independent?
7. **Data rights:** what may be stored and displayed?
8. **Approval channel:** private control UI, Telegram, or both?
9. **Deployment:** dedicated service and database provider?
10. **Live capital:** explicitly deferred until `G3`.

Recommended defaults:

- new private repo;
- Kalshi only;
- all Signals ingested, exact-match subset evaluated;
- private first two weeks, then public shadow preview;
- attributed but operationally independent branding;
- private web approval plus Telegram notification;
- live capital deferred.

---

## 19. Go/no-go criteria

### Go

Continue if:

- Quotient grants practical data access and evaluation rights;
- exact Kalshi matches occur often enough to study;
- mappings can be reviewed reliably;
- executable paper edge remains after costs;
- performance is not one-event concentration;
- operations remain auditable and safe;
- the public product has a truthful differentiated story.

### Narrow

Narrow the strategy if:

- matches cluster in one category;
- signal latency destroys edge broadly but not in a subset;
- only one side or maturity bucket works;
- rule mismatches are common;
- capacity supports only very small orders.

### Stop

Stop or redesign if:

- Quotient cannot provide stable data or needed rights;
- U.S. execution eligibility is unclear;
- mapping errors cannot be driven near zero;
- apparent edge disappears after execution costs;
- performance is dominated by a few correlated events;
- live operational risk cannot be bounded;
- public claims would exceed the evidence.

---

## 20. Definition of done for the pivot pilot

The pivot pilot is complete when FreeTurtle can produce one reproducible report answering:

1. How many Quotient Signals were received?
2. How many had exact Kalshi equivalents?
3. How many were rejected, and why?
4. What price was actually available when FreeTurtle could act?
5. What would have filled under conservative assumptions?
6. What were gross and net results?
7. How did results compare with Quotient's reference prices?
8. Was performance calibrated and diversified?
9. What operational failures occurred?
10. Is a tiny live pilot justified?

The report must include every row, not only winners.

---

## 21. Source material

Internal research:

- `research/quotient-diligence-2026-08-07.md`
- `research/quotient-performance-snapshot.json`
- `research/trading-platforms-2026-08-07.md`

Primary external references:

- Quotient: https://www.quotient.social/
- Quotient Signals: https://signal.quotient.social/
- Quotient API docs: https://dev.quotient.social/docs
- Quotient OpenAPI: https://dev.quotient.social/openapi.json
- Quotient agent skill: https://dev.quotient.social/skill/skill.md
- Kalshi API: https://docs.kalshi.com/welcome
- Kalshi environments: https://docs.kalshi.com/getting_started/api_environments
- Kalshi demo: https://docs.kalshi.com/getting_started/demo_env
- Kalshi historical data: https://docs.kalshi.com/getting_started/historical_data

---

## 22. Immediate next action

Matt should send the Quotient founders the following concise proposal:

> FreeTurtle is exploring a U.S.-regulated execution and verification layer for Quotient Signals. The pilot would map exact Quotient/Polymarket propositions to Kalshi, capture the real executable book after latency, apply conservative risk and cost gates, and publish every accepted and rejected decision. We would run a private 30-day shadow pilot first, with no live capital, and share the resulting execution-decay, calibration, concentration, and fill analysis with Quotient. If useful, FreeTurtle could also test as an independent specialist contributor to the future ensemble. Are you interested in scoping API access, data/publication rights, and a small design-partner pilot?

No code or live trading should start until the Stage 0 founder/data-rights gate is resolved.
