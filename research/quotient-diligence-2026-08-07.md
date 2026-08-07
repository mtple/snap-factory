# Quotient diligence and FreeTurtle strategy

**Research date:** 2026-08-07 UTC  
**Decision:** whether FreeTurtle should focus on prediction markets, and how Matt's relationship with Quotient should change the build strategy  
**Important:** This is product and strategy research, not investment or legal advice.

## Bottom line

Quotient strongly validates the prediction-market thesis—but it also invalidates the idea of building a generic forecasting agent from scratch. Quotient already operates a broad forecasting system, publishes mispricing signals, exposes forecasts and evidence through a metered agent API, supports Bankr execution handoffs, tracks portfolios, and is extending the same intelligence into crude-oil and crypto perpetual strategies.[1][6][14]

The best FreeTurtle opportunity is therefore **not “compete with Quotient.”** It is:

> **Become the U.S.-regulated execution, verification, and public-accountability layer for Quotient intelligence—while separately contributing a genuinely independent specialist forecast stream.**

That wedge addresses several gaps Quotient explicitly leaves open: Quotient is an information publisher rather than a broker; it does not place trades or hold funds; its headline performance is hypothetical paper performance; its prediction-market workflow is Polymarket-centric; and its future contributor ensemble is still being designed.[1][2][16]

My recommendation is to pursue a founder-level pilot before building a standalone prediction engine.

## 1. What Quotient is today

### The core system

Quotient describes Q as an AI forecaster that forms probabilities independently of market prices. Its public product currently covers prediction markets and crude-oil perpetual futures, with broader market coverage planned.[1]

Its public Signals site says Q evaluated 153 markets and published 9 Signals in the preceding 24 hours at the time of retrieval. It describes a Signal as a forecast plus three trading-oriented attributes: a measured edge, a near-term catalyst for convergence, and a defined exit at Q's price or day seven.[2]

The public methodology says Q combines broad evidence with scored expert judgment. Quotient currently advertises more than 6,000 global sources and more than 1,000 ranked experts across geopolitics, technology, macroeconomics, and AI.[2]

### Products and monetization

Quotient has four visible product lines:

1. **Q Signals:** token-gated access to qualifying Signals, broader forecasts, signal context, and the complete track record.[2]
2. **Developer API:** metered access to markets, mispricing screens, full market intelligence, forecasts, evidence sources, trade signals, portfolio intelligence, narratives, Signal Score, oil signals, and multi-asset perp signals.[6][7]
3. **Research Lab:** public reports plus commissioned research for funds, foundations, and teams.[4]
4. **Future contributor ensemble:** Quotient says forecasting agents and specialists may contribute independent forecasts, be scored against outcomes, earn weight, and build reputation. Contribution and incentive mechanics are still being designed.[1]

The public Proof of Edge section preserves resolved case studies with forecasts, market prices, outcomes, and stated returns. Its Hormuz case also exposes the research timeline and says 268 distinct sources across 99 domains were reviewed.[3][13]

The Research Lab demonstrates useful structured-data capability beyond trade calls: its regulation study classified 879 active Polymarket geopolitics markets against a proposed CFTC rule and published its methodology.[12]

Current Q Signals access requires holding 10,000,000 $QUOTIENT. The official token is on Robinhood Chain; the published allocation is 85% liquidity, 3% founding team, 1% investors/incubators, and 11% ecosystem.[2][5]

The API supports prepaid keys or x402 pay-per-call. Public route prices range from $0.0025 for portfolio intelligence to $0.05 for the mispriced-market screen.[6][8] Quotient's pricing page presents x402 microtransactions and prepaid API credits as the two access paths.[24]

### Team

The public team page lists three founders:

- **CEO @amphib0ly:** forecasting system, product, and research; previously built risk-intelligence products at Kharon.
- **CMO @Shira_LES:** brand, product, go-to-market, and editorial direction; prior American Express, Citi, Byron+Five, and Snickerdoodle Labs experience.
- **COO @niftytime:** operations, partnerships, sales, and content; prior Samsung strategy, Cent growth/community, and Gemini partnerships.[1]

I did not find a reliable public funding history or corporate financial information in the sources checked. Matt's direct relationship with the founders is therefore more useful than public web diligence for commercial and runway questions.

## 2. Technical and agent surface

Quotient's OpenAPI document exposes fourteen GET routes covering:

- tracked and mispriced markets;
- market lookup, full intelligence, forecasts, and evidence;
- published trade signals and a featured signal;
- portfolio analysis;
- oil and multi-asset perp signals;
- narratives and Signal Score.[6][7]

The agent skill is unusually mature. It defines freshness, forecast deltas, convergence, conviction, crash-risk flags, near-touch capacity, trade status, and required order-book checks. It explicitly separates intelligence from execution and hands execution to an external provider such as Bankr or Polymarket tooling.[14][16]

Bankr independently announced its Quotient integration as live, with mispriced-market discovery, probability-gap analysis, and catalyst synthesis.[19]

Quotient has also expanded beyond event contracts. Its public agent documentation describes factor strategies for WTI, BTC, ETH, and natural gas, including clocks, target/stop exits, leverage frames, and backtest receipts.[15]

### Operational issues observed

- The OpenAPI document identifies version 5.1.0, while `llms.txt` already describes a 5.2 addition. The docs therefore appear to be moving faster than the published schema version.[7][17]
- The public website advertises 6,000+ sources, while the downloadable agent skill still says 1,600+ sources. This may be simple growth or documentation drift, but it should be clarified.[2][14]
- At 2026-08-07 01:37 UTC, the OpenAPI-advertised `q-api.quotient.social` host failed TLS negotiation from both curl/OpenSSL and Chromium in this environment. The older canonical Render gateway specified by the skill responded normally and returned the live pricing policy.[6][8][18]

These are fixable integration issues, not thesis killers—but FreeTurtle should pin a working endpoint, version its contract, and fail over rather than assume the marketing-domain gateway always works.

## 3. Performance diligence

### Current Q Signals track record

At retrieval, Quotient's current Signals page reported:

- 177 published Signals;
- 156 closed paper positions and 21 open;
- 67% win rate among closed paper positions;
- +18% average paper return per Signal.[2]

The defined measurement is clearer than most agent products: every published Signal with a measurable paper result is modeled with an equal $100 paper stake and marked from its published reference price to day seven, or to resolution when the market settles sooner. Open positions are marked to the current market price; win rate uses closed paper positions only.[2][21]

However, Quotient explicitly states that these are simulated paper returns and exclude fees, bid-ask spread, liquidity, slippage, taxes, other execution constraints, and actual fills. The numbers are therefore evidence of **forecast-and-timing promise**, not proof of executable portfolio returns.[2][22]

The public table is curated rather than a complete row-level ledger: the site exposes selected closed examples, while members receive the full record. Quotient also distinguishes all Q forecasts from the smaller subset promoted to Signals.[2][21]

Public case studies sometimes show a separate held-to-resolution return, while the headline track record is a seven-day-or-earlier-resolution metric. Those are different questions and should not be compared as if they were the same strategy.[21][23]

A Quotient cast from July 31 reported an earlier snapshot of +12.5% average return over 137 Signals using a seven-day-or-convergence rule. This is directionally consistent with the newer public record, but the sample and reported metric have changed as the product evolved.[20]

### Legacy narrative track record audit

The older public performance app reported 387 paper positions, 285 resolved, 102 open, a 73.1% win rate, and +11.76% paper return under a flat $100-per-position convention. Its UI states that fees, slippage, and sizing are not modeled.[9][10]

I downloaded the public `/api/performance` snapshot and audited the rows. Important findings:

- The 387 rows represented only **151 unique market IDs**. There were 236 repeated rows across previously covered markets.
- The public UI says one row per market and says it uses the earliest narrative when a market appears more than once, but the API snapshot contained as many as 18 rows for one market. That is an observable UI/API inconsistency.[9][10]
- Eighty rows contained “Hormuz” in the market question or narrative title. Those rows generated about **94.5% of the total paper P/L** in the snapshot.
- The top three unique markets generated about **65.3% of total paper P/L**.
- YES positions averaged approximately **−5.5%**, while NO positions averaged approximately **+15.4%**.
- Results were calculated as flat $100 entries per row. Repeated calls on one underlying event therefore create concentrated, correlated exposure that the headline average does not communicate.

These calculations are reproducible from the retrieved public API snapshot saved alongside this memo as `quotient-performance-snapshot.json`.[10]

This legacy audit does **not** prove the current 177-Signal system has the same concentration problem. The current Signals product uses a different publication and exit framework. It does show why FreeTurtle should require row-level data and event-cluster risk analysis rather than rely on an average return or win rate.

### What remains unproven publicly

Before using Q as a live-money input, request:

1. Full current Signal export with immutable publication timestamps and every update.
2. Best bid/ask and executable depth at publication—not only midpoint/reference price.
3. Fill-adjusted results at several order sizes.
4. Fees, spread, slippage, rejected orders, and unavailable-market handling.
5. Event-cluster and topic concentration, including repeated entries into one underlying event.
6. Maximum drawdown, concurrent capital usage, turnover, and time-weighted portfolio return.
7. Calibration curves, Brier score, and log loss by category, horizon, side, and probability bucket.
8. Benchmark comparisons against raw market probability, a base-rate model, and simple “buy NO/favorite” baselines.
9. A clear bridge between the legacy 387-row narrative record and the current 177-Signal record.
10. Out-of-sample or forward-locked results for the new perp strategies.

The Iran Expert Index is interesting evidence that Quotient maintains timestamped source and grading infrastructure, but it grades 541 expert statements against one resolved market using a bespoke score. It is not a broad calibration study of Q itself.[11]

## 4. Where Quotient overlaps FreeTurtle

The overlap is very high. Quotient already does nearly everything we had proposed for a generic FreeTurtle prediction engine:

- scans many prediction markets;
- gathers evidence and expert calls;
- creates independent probabilities;
- identifies market disagreement;
- publishes cited theses;
- updates forecasts;
- tracks convergence and paper results;
- exposes agent-friendly APIs;
- integrates with an execution agent;
- extends prediction intelligence into perps.[1][14][15]

Building the same broad system independently would waste Matt's relationship advantage and place FreeTurtle in direct competition with a more mature stack.

## 5. The differentiated FreeTurtle wedge

### Primary wedge: U.S.-regulated proof of execution

Quotient's public prediction workflow is Polymarket-centric, while Matt is U.S.-based. Quotient also explicitly does not execute trades or claim live fills.[2][14]

FreeTurtle can become the layer that answers:

> **Does a Quotient signal survive legal venue mapping, resolution-rule differences, real order books, timing delay, fees, slippage, and disciplined sizing on Kalshi?**

That is valuable to both sides:

- **Quotient gets:** independent execution validation, a U.S.-regulated distribution path, real fill data, and a public agent case study.
- **FreeTurtle gets:** a mature forecasting substrate, source-level intelligence, a unique partnership story, and a head start over generic Kalshi bots.
- **The audience gets:** an honest distinction between model edge, paper edge, executable edge, and realized P/L.

### Secondary wedge: independent specialist contributor

Quotient explicitly wants independent forecasting agents and specialists for its future ensemble.[1][4]

FreeTurtle could be a design partner specializing in one vertical where Matt has natural information proximity—for example AI/product-release markets, crypto policy and product events, or Farcaster/onchain ecosystem events.

There must be a strict independence boundary:

- **Contributor mode:** FreeTurtle timestamps its probability and evidence before reading Q's forecast.
- **Execution mode:** FreeTurtle may consume Q, but cannot present that forecast as an independent contribution.

Without that separation, FreeTurtle would add correlated restatement rather than ensemble value.

### Public persona and distribution

Quotient is building an intelligence product. FreeTurtle can be the accountable public character:

- posts the pre-trade thesis and probability;
- records Q price, market price, executable quote, size, and rejection reason;
- explains when it declines a signal;
- publishes postmortems and calibration;
- maintains a real-money ledger once shadow validation passes.

This is a stronger identity than either “Quotient wrapper” or “another autonomous prediction bot.”

## 6. Recommended partnership pilot

### Phase 1 — data agreement and shadow execution

Ask Quotient for:

- a developer API key and historical Signal export;
- permission to show selected Q probabilities and attribution publicly;
- stable API/version expectations;
- exact current track-record methodology;
- a market-mapping collaboration for Kalshi equivalents.

FreeTurtle then runs every qualifying Q Signal through:

1. U.S. eligibility check.
2. Exact resolution-rule comparison.
3. Kalshi equivalent-market mapping—or explicit “no equivalent.”
4. Live bid/ask and depth capture.
5. Latency-adjusted entry simulation.
6. Fixed risk and event-cluster caps.
7. Seven-day/convergence exit under Quotient's published rule.
8. Paper ledger containing all accepted and rejected signals.

### Phase 2 — blind independent forecasts

For a selected vertical, FreeTurtle commits a signed/timestamped forecast before Q is revealed. Quotient scores whether it improves the ensemble after controlling for correlation.

### Phase 3 — tiny live-money execution

Only after a forward shadow sample demonstrates positive performance after realistic costs:

- use limit orders;
- cap loss per market and per event cluster;
- publish fills and failures;
- never infer profitability from unfilled paper quotes;
- increase size only after capacity and drawdown evidence.

## 7. Founder conversation agenda

The first meeting should answer these questions:

### Product and data

1. Can FreeTurtle receive a complete historical and live Signal stream through an API key?
2. Are publication timestamps immutable and externally verifiable?
3. Can Q's Polymarket markets be mapped to Kalshi or ForecastEx contracts?
4. Can the API become venue-neutral rather than using Polymarket slugs as canonical IDs?
5. What redistribution and attribution rights would FreeTurtle have publicly?

### Performance

6. Why do the legacy performance app and current Signals site use different populations and metrics?
7. Does the current Signal dataset contain repeat entries into the same event or highly correlated clusters?
8. Has any strategy traded meaningful live capital with recorded fills?
9. What happens to results after spread, depth, latency, fees, and rejected fills?
10. Can they provide Brier/log scores and benchmark-relative calibration—not only trading returns?

### Partnership

11. Would Quotient want FreeTurtle as its first U.S.-regulated execution-validation agent?
12. Would Quotient want FreeTurtle as an external ensemble contributor?
13. Could the collaboration become a public “model forecast → regulated execution → audited outcome” case study?
14. Who owns resulting fill data, strategy improvements, and public content?
15. Is the relationship API customer, design partner, revenue share, token grant, or a deeper strategic arrangement?

Commercial structures worth discussing explicitly are API-credit sponsorship, subscription/referral revenue share, a paid design-partner pilot, co-branded research, or contributor compensation. Do not use a performance fee until legal and regulatory responsibilities have been reviewed.

### Technical cleanup

16. Which gateway is canonical: `q-api.quotient.social` or the Render gateway?
17. Is the current public contract v5.1 or v5.2?
18. Is current evidence coverage 1,600+ or 6,000+ sources?
19. What is the compatibility/deprecation policy for agent integrations?
20. Can they provide a sandbox or free-credit account for a no-spend integration test?

## 8. Decision

**Proceed with prediction markets, but change the build thesis.**

Do not spend months rebuilding Quotient's broad forecasting pipeline. First attempt a Quotient partnership centered on **U.S.-regulated execution proof, independent auditing, and public accountability**.

If Quotient provides stable data access, reasonable public-use rights, and row-level historical records, this is a compelling unfair advantage. If they cannot provide those, FreeTurtle should still focus on prediction markets—but should specialize narrowly and treat Quotient only as an external benchmark.

The immediate next action is a founder conversation, followed by a 30-day forward shadow pilot—not live trading.

## Sources

[1] https://www.quotient.social
[2] https://signal.quotient.social
[3] https://www.quotient.social/proof-of-edge
[4] https://www.quotient.social/research
[5] https://www.quotient.social/token
[6] https://dev.quotient.social/docs
[7] https://dev.quotient.social/openapi.json
[8] https://quotient-api-gateway.onrender.com/api/public/pricing
[9] https://app.quotient.social/performance
[10] https://app.quotient.social/api/performance
[11] https://www.quotient.social/reports/experts-index/iran-coverage-held-up
[12] https://www.quotient.social/reports/cftc-prediction-markets
[13] https://www.quotient.social/proof-of-edge/hormuz
[14] https://dev.quotient.social/skill/skill.md
[15] https://dev.quotient.social/skill/references/perps-signals.md
[16] https://dev.quotient.social/skill/references/workflows.md
[17] https://dev.quotient.social/llms.txt
[18] https://q-api.quotient.social/api/public/pricing
[19] https://farcaster.xyz/bankr/0x567cb4cca6e3af4b1cefdbc34940d4a802e73bc1
[20] https://farcaster.xyz/quotient/0xcfff4fda9ea1c47efed8ff1aa2a59c445dd0a8bc
[21] https://signal.quotient.social/performance
[22] https://signal.quotient.social/signals/d265104e-2b6e-4346-b387-a1527d9e374a
[23] https://www.quotient.social/proof-of-edge/unfreeze-assets
[24] https://dev.quotient.social/pricing
