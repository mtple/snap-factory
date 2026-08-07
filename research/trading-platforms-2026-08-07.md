# FreeTurtle Agentic Trading Platform Research

**Research date:** 2026-08-07 UTC  
**Operator assumption:** U.S.-based retail user  
**Objective:** find the best legal and technically automatable venues for building a public agentic trader and a serious trading-intelligence system.

> This is platform and systems research, not legal advice or a claim that any strategy will be profitable. “Consistent profit” is an engineering target, not a promise. Live trading should begin only after account eligibility, current terms, fees, and API permissions are checked directly with the venue.

## Executive conclusion

The new research changes the earlier ranking in one important way:

1. **Best proprietary information-edge venue: Kalshi event contracts.** Kalshi has production REST and WebSocket endpoints plus explicit API-trader infrastructure.[1][2]
   It also provides historical market/trade/candlestick endpoints and a demo environment.[4][5]
   It is the best place to turn disciplined external research—weather ensembles, economic nowcasts, official-data monitoring, structured rule parsing—into independent probability estimates.
2. **Best execution venue for a plausibly repeatable, lower-directionality system: Coinbase Advanced Trade U.S. spot + regulated futures/perpetual-style products.** Coinbase’s consumer Advanced Trade API explicitly supports U.S. derivatives order management, market data, and futures-specific endpoints.[10][11] Its public API returned 99 futures products during this research, including BTC and ETH perpetual-style contracts, and exposed volume, open interest, funding, index price, and margin fields.[12]
3. **Best public-character and Farcaster-native venue: Base onchain.** Base publishes an agent token-swap workflow, while 0x and Uniswap support programmatic routing on Base.[14][15][31] This is the strongest identity fit but not the strongest consistency fit because token quality, MEV, smart-contract risk, and liquidity fragmentation dominate outcomes.
4. **Best high-velocity degen research surface: Solana/Jupiter.** Jupiter exposes developer infrastructure for swaps, token discovery, pricing, and related services.[16] The opportunity surface is large, but execution speed, adverse selection, scams, and crowding make stable returns harder.
5. **Strong secondary regulated venues:** Kraken U.S. perpetuals are more mature and agent-ready than the first pass suggested. Kraken advertises 16 CFTC-regulated U.S. perpetual contracts, and its derivatives docs cover REST, WebSocket, FIX, API keys, orders, account risk, historical data, and a production-equivalent demo environment.[18][32]
   Kraken spot and Robinhood Crypto also provide API pathways.[17][25]
   Gemini, Binance.US, and Alpaca do too.[27][29][30]
   None offers a clearer combined data/execution/edge proposition than Coinbase for this project.
6. **Emerging regulated perps:** Kalshi Perps are live rather than merely conceptual. Its public margin API returned 16 markets, with nonzero open interest and 24-hour volume in most of the snapshot, but production access remains member-by-member.[6][36]
7. **Watchlist, not initial deployment:** ForecastEx/IBKR products are real.[8][9]
   Bitnomial/Botanical products are documented too.[19][20]
   Ordinary-retail API mapping for ForecastEx and current Bitnomial liquidity/onboarding are less certain than Coinbase Advanced Trade or Kalshi event contracts.
8. **Do not use for Matt’s U.S. live account:** Polymarket, Hyperliquid, and dYdX. Their public restriction materials make them unsuitable for U.S. execution; Polymarket can still be a valuable read-only probability source.[21][22][23]

## Recommended system: two serious sleeves plus one capped public sleeve

The best design is not a single all-in directional bot.

### Sleeve A — Coinbase market-neutral carry and relative value

Use Coinbase spot and U.S. futures/perpetual-style contracts to scan continuously for:

- net funding carry after spot hedge costs;
- futures/spot basis after fees, slippage, and margin cost;
- term-structure dislocations across expiries;
- temporary index/last-price divergence;
- cross-product relative value with strict beta-neutrality;
- liquidation and margin-health risk.

This is the best candidate for **repeatability**, because the system can require a positive expected return after known costs and avoid making a large directional forecast. Coinbase documents futures balances, margin health, intraday margin settings, separate regulated futures accounts, and API order/market-data support.[11] During the live check, the public products API returned 99 futures products; 69 had nonzero reported 24-hour volume, and the ten highest-volume products accounted for about 81.8% of reported contract volume.[12] That concentration means the first strategy should stay in the most liquid contracts rather than treating the full catalog as equally tradable.

### Sleeve B — Kalshi specialist probability engine

Choose one repeatable vertical where external data is stronger than crowd narrative. Build a calibrated model that emits:

- independent probability;
- market-implied probability;
- expected edge after fees and spread;
- uncertainty interval;
- settlement-rule confidence;
- recommended size;
- explicit “do not trade” reason.

Kalshi’s historical tier includes markets, trades, fills, candlesticks, orders, and positions, while the demo environment provides mock funds and separate credentials.[4][5] That makes disciplined walk-forward testing and paper execution practical. The public bot ecosystem is already nontrivial—GitHub’s search returned hundreds of “Kalshi trading bot” repositories, including AI and weather systems—but repository descriptions are not proof of profitability.[24]

**Best first verticals:**

1. **Economic releases:** CPI, payrolls, Fed decisions, GDP and similar contracts where scheduled official data, nowcasting, revisions, and release mechanics can be modeled.
2. **Weather:** strong structured-data fit and easy settlement verification, but already visibly crowded by public bots.
3. **Cross-market consistency:** detect logically inconsistent probabilities across related markets and dates.
4. **Selective passive liquidity provision:** only after measuring fill toxicity, queue behavior, spread capture, and adverse selection.

Avoid beginning with politics, sports parlays, or generic LLM news sentiment. Those areas are noisy, crowded, and difficult to backtest honestly.

### Sleeve C — capped Base social-alpha sandbox

Use Base only for a small, explicitly risk-capped experimental sleeve:

- Farcaster mention and social-velocity monitoring;
- deployer and wallet-history screening;
- liquidity additions/removals;
- holder-concentration changes;
- contract-risk checks;
- route and slippage simulation;
- hard daily loss and token-exposure limits.

Base and 0x provide direct programmatic swap pathways.[14][15] The edge is cultural proximity and faster interpretation of Farcaster-native launches—not merely having an agent wallet. This sleeve is best for the FreeTurtle character and public content, but it should not be marketed internally as the reliable-profit engine.

## Venue matrix

Scores use a five-point qualitative scale. They compare suitability for this specific U.S.-based project, not absolute venue quality.

| Venue | U.S. live access | Retail API certainty | Data/backtest | Market quality | Hard-work edge | Operational safety | FreeTurtle fit | Decision |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| **Kalshi event contracts** | 5 | 5 | 5 | 3 | 5 | 4 | 4 | Primary information-alpha venue |
| **Coinbase spot + U.S. futures** | 5 | 5 | 5 | 5 | 3 | 5 | 3 | Primary repeatability/carry venue |
| **Base DEX routing** | 4 | 5 | 4 | 3 | 4 | 2 | 5 | Capped public/social-alpha sleeve |
| **Solana/Jupiter** | 4 | 5 | 4 | 4 | 4 | 2 | 3 | Later high-velocity research sleeve |
| **Kraken spot** | 5 | 5 | 4 | 4 | 2 | 5 | 2 | Good backup CEX |
| **Kraken U.S. perpetuals** | 5 | 5 | 4 | 3 | 3 | 4 | 2 | Strong regulated secondary; prove account-level API order |
| **Robinhood Crypto API** | 5 | 4 | 3 | 4 | 2 | 5 | 1 | Easy execution, weak differentiated edge |
| **Gemini ActiveTrader** | 5 | 4 | 3 | 3 | 2 | 5 | 1 | Backup venue |
| **Binance.US** | 4 | 4 | 4 | 3 | 2 | 3 | 1 | State/access diligence required |
| **Alpaca crypto** | 5 | 4 | 3 | 3 | 2 | 4 | 1 | Unified brokerage convenience |
| **ForecastEx via IBKR** | 5 | 2 | 3 | 2 | 4 | 4 | 2 | Watch; verify contract API support |
| **Bitnomial/Botanical** | 5 | 4 | 3 | 2 | 3 | 3 | 2 | Watch; direct API exists, liquidity/onboarding need validation |
| **Kalshi Perps** | 4 | 5 | 3 | 3 | 4 | 3 | 3 | Live emerging venue; access still gated |
| **Nadex** | 5 | 1 | 3 | 2 | 2 | 4 | 1 | Regulated but automation-poor |
| **Polymarket** | 1 | 5 | 5 | 5 | 5 | 1 | 5 | Data source only for U.S. operator |
| **Hyperliquid** | 1 | 5 | 5 | 5 | 4 | 1 | 4 | No U.S. execution |
| **dYdX** | 1 | 5 | 4 | 4 | 3 | 1 | 2 | No U.S. execution |

## Platform findings

### 1. Kalshi event contracts

**What is confirmed**

- Kalshi documents a production Trade API with REST and WebSocket endpoints specifically recommended for external API traders.[1][2]
- Rate limits are explicit and tiered; higher tiers increase read/write capacity, while the entry tier is enough for research and modest execution rather than high-frequency market making.[3]
- Historical endpoints cover settled markets, candlesticks, trades, fills, orders, and positions; the target live-data window is three months before older records move to historical endpoints.[4]
- A separate demo environment supports mock-fund testing, with separate credentials from production.[5]
- Public open-market data is accessible without trading credentials.[7]

**Edge thesis**

Kalshi offers the best chance to convert niche research into price-independent forecasts. The defensible advantage is not an LLM reading headlines; it is a vertical data pipeline, calibrated forecasting, exact settlement-rule parsing, and disciplined abstention.

**Main constraints**

- Liquidity is uneven, and a raw count of open markets overstates usable capacity.
- Fees and bid/ask spread must be modeled contract by contract.
- Many markets are correlated; naive Kelly sizing can create hidden concentration.
- API availability does not by itself resolve every account-, jurisdiction-, or strategy-specific term question.

### 2. Coinbase Advanced Trade spot and U.S. derivatives

**What is confirmed**

- The consumer Advanced Trade API supports market and limit orders plus additional order controls.[10]
- Coinbase explicitly states that the Advanced Trade API supports U.S. derivatives products offered through Coinbase Financial Markets, including order management, market data, and futures-specific endpoints.[11]
- Coinbase describes CFM as an NFA member and CFTC-regulated futures commission merchant; futures balances are held separately from spot balances.[11]
- The public products API exposed 99 futures products in the research snapshot, including perpetual-style and dated contracts, and product details included funding interval/rate, index price, open interest, and margin fields.[12]
- Coinbase for Agents provides agent-oriented CLI/MCP infrastructure, although our futures implementation should rely on the documented Advanced Trade API unless Coinbase explicitly confirms derivatives support in the agent product itself.[13]

**Edge thesis**

Do not compete on raw directional prediction against professional crypto firms. Build a **cost-aware carry scanner** that enters only when expected funding/basis exceeds every modeled cost and risk buffer. This is boring compared with memecoins, but boring is useful if the target is repeatability.

**Main constraints**

- Funding can reverse rapidly.
- A nominally hedged position still has liquidation, basis, execution, and operational risk.
- Introductory fee terms can change; fetch the account’s actual fee tier before every backtest assumption.[11]
- Liquidity is concentrated in a minority of products.[12]

### 3. Base / 0x / Uniswap

Base publishes an agent flow for token swaps, and 0x plus Uniswap expose programmatic routing on supported chains.[14][15][31] This is the strongest distribution and narrative match because FreeTurtle already lives near Farcaster culture.

The defensible system is a **risk and flow intelligence layer**, not a generic swap bot. It should evaluate contract provenance, deployer behavior, wallet clusters, holder concentration, liquidity durability, routing quality, and social acceleration before proposing a trade.

Main risks are MEV, sandwiching, malicious contracts, fake social momentum, thin exit liquidity, compromised keys, and self-generated public attention moving the market.

### 4. Solana / Jupiter

Jupiter’s developer platform provides a mature programmatic path into Solana trading and related data services.[16] Solana has a larger high-velocity launch culture than Base, but FreeTurtle has less native informational proximity there.

Use only after Base tooling is stable. The edge must come from launch detection, route-quality comparison, wallet/deployer history, and flow classification. Pure speed is unlikely to be durable without specialized infrastructure.

### 5. Regulated crypto APIs: Kraken, Robinhood, Gemini, Binance.US, Alpaca

- **Kraken spot:** mature authenticated order API and published fees.[25][26] Strong operational backup; weaker unique edge than Coinbase’s combined spot/futures surface.
- **Robinhood Crypto:** documented U.S.-only crypto trading API with authenticated order execution.[17] Operationally simple, but its practical advantage is convenience rather than differentiated data or market structure.
- **Gemini:** documented REST trading API and ActiveTrader fee schedule.[27][28] Viable backup, but likely less attractive breadth/liquidity than the leading venue for this project.
- **Binance.US:** maintains public API documentation.[29] Eligibility and product availability should be checked state by state before reliance.
- **Alpaca:** exposes crypto trading within a broader brokerage API.[30] Good if the future system spans equities and crypto; not the strongest standalone crypto-alpha venue.

### 6. ForecastEx / IBKR

IBKR's current Prediction Markets interface aggregates ForecastEx, Kalshi, and CME Group contracts in one funded account and says its order algorithm identifies the best available price inclusive of fees.[33] The live interface displayed broad categories and substantial visible market totals, while ForecastEx separately publishes its market surface.[9] This creates a potentially valuable cross-venue relative-value and routing layer.

The remaining blocker is whether ordinary IBKR users can programmatically discover and trade these specific event contracts through the standard IBKR APIs with the same clarity as Kalshi. Until a concrete contract lookup and paper-account test order are proven, treat it as an important intelligence/routing source rather than a primary execution dependency.

### 7. U.S. perpetual/futures venues

- **Bitnomial/Botanical:** Bitnomial publishes exchange API documentation, and Botanical presents U.S.-regulated perpetual-futures access.[19][20] Direct exchange API capability looks real, but retail onboarding, liquidity, minimums, and the exact account path require hands-on validation.
- **Kraken U.S. perpetuals:** Kraken markets 16 CFTC-regulated U.S. perpetual contracts on Kraken Pro.[18] Its derivatives documentation covers REST, WebSocket, FIX, full-access trading keys, order and position management, historical data, and a demo environment with production-equivalent endpoints.[32] This is a serious regulated secondary venue, although the first live deployment must still prove that Matt's specific U.S. account and the displayed FCM products map to the documented trading endpoints.
- **Kalshi Perps:** Kalshi publishes separate perps REST/WebSocket/FIX documentation and production access is rolling out member-by-member.[6] Its live public margin endpoint returned 16 markets; 13 showed nonzero open interest and 24-hour volume in the research snapshot, including active BTC, ETH, XRP, BCH, and HYPE contracts.[36] This is an emerging live venue, not merely a future product announcement.

Kraken, Kalshi Perps, Bitnomial, and Coinbase should feed the same cross-venue funding/basis scanner. Coinbase remains the first execution adapter because its retail U.S.-derivatives API and live public product schema were independently verified together; Kraken is now the strongest second adapter. No venue should receive real capital until an account-level API order and cancel are proven.

### 8. Nadex

Nadex is U.S.-organized and CFTC-regulated, and its current schedule charges $0.02 per event contract on entry or pre-expiration exit with no event-contract settlement fee.[34][35] It publishes end-of-day market data, but no public retail trading API surfaced in this research. That makes it a useful regulated comparison venue, not a practical FreeTurtle execution target.

### 9. Restricted venues

- Polymarket’s geoblock documentation identifies the United States as blocked for order placement.[23]
- Hyper Foundation’s terms treat U.S. persons as prohibited.[21]
- dYdX’s terms restrict U.S. access.[22]

Do not use VPNs, alternate wallets, or technical workarounds to evade venue restrictions. Polymarket remains useful as a read-only signal for probability comparisons and crowd positioning.

## What “consistently profitable” must mean operationally

A legitimate intelligence system should optimize for **positive net expectancy with bounded drawdown**, not a high win rate or entertaining screenshots.

Every candidate trade should pass:

1. **Eligibility gate:** venue/account/product is permitted.
2. **Data-quality gate:** sources are current, redundant, and timestamped.
3. **Rule/instrument gate:** settlement, contract multiplier, funding, expiry, and margin are machine-parsed and independently checked.
4. **Edge gate:** expected edge exceeds fees, spread, slippage, financing/funding uncertainty, model error, and a safety buffer.
5. **Liquidity gate:** expected market impact and exit capacity are acceptable.
6. **Portfolio gate:** factor, event, token, and venue concentration remain below limits.
7. **Execution gate:** order type, price limit, timeout, idempotency key, and cancel path are defined.
8. **Kill-switch gate:** stale data, API divergence, unexpected fills, account drawdown, or key compromise halts writes.
9. **Audit gate:** signal snapshot, model version, sources, decision, order, fill, and post-trade attribution are logged.

## Validation plan before real money

### Phase 1 — data and replay

- Ingest Kalshi live and historical markets, trades, rules, and candlesticks.
- Ingest Coinbase spot/futures products, order books, trades, funding, open interest, index price, and account fee tier.
- Store point-in-time snapshots so backtests cannot leak later information.
- Build deterministic cost and settlement engines before any predictive model.

### Phase 2 — paper execution

- Use Kalshi’s demo environment while also shadowing real production quotes.[5]
- Run Coinbase signals in paper/shadow mode because a synthetic fill model must account for queue position and slippage.
- Require at least hundreds of independent decisions across multiple market regimes; do not treat repeated correlated bets as independent observations.

### Phase 3 — tiny live capital

- Start with fixed tiny maximum loss per trade and daily loss limits.
- Use limit orders by default; log every partial fill and cancel failure.
- Compare realized vs simulated slippage, funding, fees, and settlement.
- Expand only if live net expectancy remains positive after costs and confidence intervals.

### Phase 4 — public FreeTurtle layer

Publish decision cards after the system commits internally:

- market and venue;
- FreeTurtle probability or carry estimate;
- market price;
- size tier, never wallet balance;
- key evidence;
- invalidation condition;
- later result and attribution.

Keep private API keys, exact execution timing, exploitable wallet details, and security controls private. Public personality should explain conviction without leaking the operational edge.

## Final recommendation

Build **one intelligence core with four venue adapters**, in this order:

1. **Coinbase Advanced Trade:** spot + U.S. futures data, shadow carry scanner, then tiny market-neutral trades.
2. **Kraken U.S. perpetuals:** connect the demo API, compare funding/basis with Coinbase, and prove the U.S. account-to-API product mapping before live execution.
3. **Kalshi:** historical dataset, vertical probability model, demo execution, then tiny live event-contract trades.
4. **Base:** read-only social/onchain risk scoring first; add a tightly capped execution wallet only after the regulated systems have reliable logging and kill switches.

If forced to pick only one venue:

- Pick **Kalshi** to maximize the chance that research skill becomes proprietary alpha.
- Pick **Coinbase spot + U.S. futures** to maximize operational cleanliness and the chance of a repeatable market-neutral process.
- Pick **Kraken U.S. perpetuals** as the strongest regulated crypto-native second execution venue, subject to an account-level API test.
- Pick **Base** only if the primary objective is a compelling public FreeTurtle character rather than stable returns.

The strongest overall FreeTurtle strategy is therefore **Coinbase plus Kraken for cross-venue carry/execution, Kalshi for differentiated intelligence, and Base for personality—sharing one risk engine but separate capital limits.**

## Sources

[1] https://docs.kalshi.com/welcome — Kalshi API Introduction
[2] https://docs.kalshi.com/getting_started/api_environments — Kalshi API Environments
[3] https://docs.kalshi.com/getting_started/rate_limits — Kalshi API Rate Limits
[4] https://docs.kalshi.com/getting_started/historical_data — Kalshi Historical Data
[5] https://docs.kalshi.com/getting_started/demo_env — Kalshi Demo Environment
[6] https://docs.kalshi.com/margin — Kalshi Perps API Overview
[7] https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=1000 — Kalshi Open Markets API
[8] https://www.interactivebrokers.com/predictionmarkets/en/home.php — IBKR ForecastTrader
[9] https://forecastex.com/markets — ForecastEx Markets
[10] https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/orders — Coinbase Advanced Trade Order Management
[11] https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/futures — Coinbase Advanced Trade US Derivatives
[12] https://api.coinbase.com/api/v3/brokerage/market/products?product_type=FUTURE — Coinbase Public Futures Products API
[13] https://docs.cdp.coinbase.com/coinbase-for-agents/overview — Coinbase for Agents
[14] https://docs.base.org/agents/guides/swap-tokens — Base Agent Token Swap Guide
[15] https://0x.org/docs/developer-resources/supported-chains — 0x Supported Chains
[16] https://dev.jup.ag/docs — Jupiter Developer Platform
[17] https://docs.robinhood.com/crypto/trading — Robinhood Crypto Trading API
[18] https://www.kraken.com/features/futures — Kraken US Perpetual Futures
[19] https://bitnomial.com/exchange/docs/api/overview — Bitnomial Exchange API
[20] https://botanical.finance — Botanical US Perpetual Futures
[21] https://hyperfoundation.org/termsOfService — Hyper Foundation Terms
[22] https://www.dydx.xyz/legal/terms-of-use — dYdX Terms of Use
[23] https://docs.polymarket.com/api-reference/geoblock — Polymarket Geographic Restrictions
[24] https://github.com/search?q=kalshi+trading+bot&type=repositories — GitHub Kalshi Trading Bot Search
[25] https://docs.kraken.com/api-reference/trading/add-order — Kraken Spot Add Order API
[26] https://www.kraken.com/features/fee-schedule — Kraken Fee Schedule
[27] https://docs.gemini.com/rest-api — Gemini REST API
[28] https://www.gemini.com/fees/activetrader-fee-schedule — Gemini ActiveTrader Fees
[29] https://docs.binance.us — Binance.US API Documentation
[30] https://docs.alpaca.markets/us/docs/crypto-trading — Alpaca Crypto Trading
[31] https://raw.githubusercontent.com/Uniswap/docs/main/content/trading/swapping-api/supported-chains.mdx — Uniswap API Supported Chains
[32] https://docs.kraken.com/exchange/guides/futures/introduction — Kraken Derivatives API Introduction
[33] https://www.interactivebrokers.com/predictionmarkets/app — IBKR Prediction Markets App
[34] https://www.nadex.com/pricing — Nadex Pricing
[35] https://www.nadex.com/company — Nadex Company and US Regulatory Status
[36] https://external-api.kalshi.com/trade-api/v2/margin/markets — Kalshi Perps Live Markets API
