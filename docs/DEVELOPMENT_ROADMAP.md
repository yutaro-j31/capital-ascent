# CAPITAL ASCENT — Development Roadmap

Last audited: 2026-09-17
Implementation status: **Phase 0–8 implemented on PR #2 and verified by Game CI**

This document is the standing development roadmap and design contract for CAPITAL ASCENT. Before starting substantial development work, verify the current repository state first, then compare proposed work against this document. Do not treat this document as a substitute for checking the actual code.

## Current implementation status

The original Phase 0–8 roadmap has now been implemented as an integrated gameplay pass.

Verified on the PR branch before merge:

- Game CI: green.
- Simulation/invariant tests: 13/13 passing.
- Deterministic 10-year replay: passing.
- 100-year / 5,200-week simulation: passing with finite state and bounded save size.
- Legacy `capital_ascent_v1` migration: passing.
- Rolling save backup recovery: passing.
- City property/rival/simulation consistency: passing.
- Delayed investment lifecycle: passing.
- Company valuation double-count invariant: passing.
- Foundation assets excluded from personal net worth: passing.
- M&A operating-subsidiary lifecycle: passing.
- PE DD → acquisition → initiative lifecycle: passing.
- Management delegation policy automation: passing.
- Strategy-bot balance smoke: passing.
- iPhone WebKit smoke: passing.

Latest calibrated 10-year strategy smoke used six deterministic seeds. No strategy exceeded the dominant-strategy gate; Premium, Advertising and Expansion each won two of six seed comparisons, for a maximum dominant share of 33.3%.

The roadmap is therefore no longer a list of missing baseline features. It is now the **maintenance and regression contract** for future development.

## Product direction

CAPITAL ASCENT should remain a management simulation where one decision propagates through multiple systems, not a collection of unrelated features.

Core loop:

1. Observe the business, city, competitors, cash and market conditions.
2. Make a management decision.
3. Advance time.
4. Simulate the consequences.
5. Explain why the outcome changed.
6. Make the next decision.

The design target remains: increase causal depth before adding more breadth.

## Design-principle audit — post implementation

| # | Principle | Status | Implementation |
|---|---|---|---|
| 1 | Decision → time → consequence | Implemented | Weekly simulation plus Management Brief. |
| 2 | Player role changes as company grows | Implemented baseline | Store-count management tiers and delegated business policies. |
| 3 | Preserve management friction, remove UI friction | Improved | Mobile-first UI retained; scale can be handled by policy. |
| 4 | Avoid one dominant strategy | Implemented gate | Deterministic strategy bots run in CI; >80% seed dominance fails CI. |
| 5 | Investments should have delayed effects | Implemented | Major business improvements are timed projects with upfront cash commitment. |
| 6 | Uncertainty should interact with decisions | Implemented baseline | Deterministic competitors/events with mitigation through prior investment. |
| 7 | Explain why results changed | Implemented baseline | Weekly revenue/profit deltas, causal drivers and risk flags. |
| 8 | Prevent soft locks and impossible states | Guarded/tested | State validation, finite-state checks and long-run simulation. |
| 9 | More depth should not mean more taps | Improved | Delegation/policy layer reduces later micromanagement. |
| 10 | Design for long-run play | Implemented gate | 100-year simulation and save-size bound run automatically. |
| 11 | Treat saves as a product feature | Implemented | Schema V2, migration, validation, rolling backups and export/import. |
| 12 | AI implements; design rules stay explicit | Implemented process | `AGENTS.md`, this roadmap and Game CI are standing development gates. |

## Phase 0 — Reliability foundation — COMPLETE

Implemented:

- deterministic Node VM test harness
- 10-year replay test
- 100-year / 5,200-week simulation
- NaN / Infinity and finite-state checks
- save-size bound
- Save Schema V2 migration while preserving `capital_ascent_v1`
- rolling backup saves and corrupted-primary recovery
- export/import support
- Game CI
- iPhone WebKit smoke
- inactive duplicate city runtime cleanup

Standing gate: all future changes must keep these tests green.

## Phase 1 — City single source of truth — COMPLETE

The city map is now an economic board rather than a visual-only layer.

Implemented:

- stable vacancy/site identity
- stable `x` / `y` / district data
- visible rivals and weekly economics use the same competition-pressure model
- leased property coordinates persist into the resulting store
- property competition score and weekly demand share the same rival inputs

Standing gate: UI competition pressure and simulation competition pressure must never diverge.

## Phase 2 — Accounting and valuation normalization — COMPLETE

Implemented:

- rolling normalized operating earnings
- sector multiples
- subsidiary equity value
- cash less debt
- cumulative-profit double-count removal
- credit-driven borrowing capacity
- credit spread added to borrowing cost
- donated foundation assets excluded from personal net worth

Target valuation contract:

`normalized operating earnings × sector multiple + subsidiary equity value + cash - debt`

Standing gate: historical profit is a statistic, not a second asset after it has already flowed into cash.

## Phase 3 — Weekly Management Brief — COMPLETE BASELINE

Implemented:

- weekly revenue and profit snapshots
- deltas from the prior period
- causal driver bridge
- risk flags
- location/footfall effect
- competitor pressure
- advertising contribution
- event contribution
- rent burden

Future additions should extend this explanation layer instead of creating hidden mechanics.

## Phase 4 — Delayed investment / project system — COMPLETE BASELINE

Major business investments now use a project lifecycle instead of instant stat jumps.

Current lifecycle:

`in_progress → completed`

Cash is committed before the benefit arrives. Quality, brand, efficiency and digital improvements have deterministic completion delays.

Future capex, renovation and product-development systems should reuse the same project architecture.

## Phase 5 — Management and delegation — COMPLETE BASELINE

Implemented store-count management tiers and policy-driven operation.

Progression target remains:

- early: owner-operator
- growth: multi-store operator
- mid: business-unit CEO
- late: group CEO
- endgame: capital allocator

Current policy presets include variants such as Premium, Growth, Margin, Market Share and Cash Preservation.

Standing rule: a larger company should increase decision abstraction, not simply increase repetitive taps.

## Phase 6 — Dynamic competitors and contextual events — COMPLETE BASELINE

Implemented deterministic quarterly competitor behavior and contextual external events.

Competitor actions include variants such as:

- price cut
- brand push
- renovation
- expansion
- steady operation

External events include:

- raw-material inflation
- labor shortage
- station redevelopment
- social-media demand shocks
- cyber/system disruption

Event severity is modified by prior player investment such as efficiency, digital capability and brand strength.

Standing rule: avoid pure random punishment; prior management decisions should alter the outcome.

## Phase 7 — Strategy bots and balance simulation — COMPLETE BASELINE

Implemented deterministic strategy bots including:

- conservative
- low-price volume
- premium
- advertising
- efficiency
- expansion
- diversification
- leveraged expansion

CI measures survival, IPO rate, company value, cash, debt, store count and personal wealth across deterministic seeds.

The CI dominant-strategy gate fails if one strategy wins more than 80% of seed comparisons.

Latest calibrated smoke result before merge:

- Premium: 2 wins
- Advertising: 2 wins
- Expansion: 2 wins
- dominant share: 33.3%

This is a regression signal, not a requirement that every strategy remain equally strong.

## Phase 8 — Deepen existing endgame systems — COMPLETE BASELINE

### M&A

Acquisitions now create operating subsidiary objects rather than only incrementing a counter.

Subsidiaries carry economic characteristics including revenue, EBITDA/operating performance, debt, growth, enterprise value, management quality, synergy and ownership.

Their operating results flow into consolidated company economics.

### PE

The PE chain now connects:

`deal sourcing → DD → entry multiple → leverage → operating performance → initiatives → debt amortization → exit multiple → realized return`

DD Quality/Risk now survives acquisition and affects post-acquisition economics, leverage, initiative outcomes and downside behavior.

Standing rule: new endgame features should deepen this causal chain before adding unrelated financial modes.

## Development gates

Before adding a feature, answer:

1. What new decision does this create?
2. What state does the player observe before deciding?
3. What trade-off makes the decision non-trivial?
4. How does time affect the result?
5. How will the game explain the result afterward?
6. Can this create a dominant strategy or soft lock?
7. What deterministic test proves it works?
8. Does this increase depth, or only add another screen/stat?

If a feature does not connect to the decision → simulation → explanation loop, it should normally be deferred.

## Required validation for future work

Every meaningful gameplay change should preserve or extend:

1. deterministic simulation tests
2. save migration / recovery tests
3. accounting and finite-state invariants
4. city-economy consistency where relevant
5. strategy-bot balance smoke where balance is affected
6. iPhone WebKit smoke for user-facing changes
7. 100-year simulation for state-growth or economy changes

## Next product-development frontier

The original roadmap is complete at baseline level. Future work should focus on **depth and presentation quality**, not a new wave of disconnected systems.

Highest-value follow-up areas:

1. richer Management Brief attribution and charts
2. stronger manager/area-manager/COO UX rather than only policy presets
3. deeper competitor memory and strategic response
4. richer project/capex pipeline using the existing delayed-project engine
5. acquisition integration, synergy and divestiture choices
6. PE fund-level LP economics, fund sequencing and portfolio construction
7. longer-horizon balance calibration across more seeds/player archetypes
8. replacing remaining prompt/alert flows with native mobile UI where practical

## Standing design rule

**Breadth is not the current bottleneck. Causality is.**

Prefer one existing system influencing three other systems over three new isolated features.
