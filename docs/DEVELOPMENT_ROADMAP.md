# CAPITAL ASCENT — Development Roadmap

Last audited: 2026-09-17
Baseline: `main` at `f83d76992fc4bc0502f034cba0fce739593ad99d`

This document is the standing development roadmap for CAPITAL ASCENT. Before starting substantial development work, verify the current repository state and then compare the proposed work against this roadmap. Do not treat this document as a substitute for checking the actual code.

## Product direction

CAPITAL ASCENT should become a management simulation where one decision propagates through multiple systems, not a collection of unrelated features.

Core loop:

1. Observe the business, city, competitors, cash and market conditions.
2. Make a management decision.
3. Advance time.
4. Simulate the consequences.
5. Explain why the outcome changed.
6. Make the next decision.

The design target is to increase causal depth before adding more breadth.

## Current strengths

The repository already has several strong foundations:

- Weekly progression and deterministic hash-based noise.
- Separate company cash, personal cash and PE fund cash.
- Five businesses with different economics rather than simple reskins.
- IPO, company sale, public-market investing, borrowing, M&A and PE progression.
- Mobile-first navigation and per-business management screens.
- Property selection, city maps and rival visibility.
- Deterministic state suitable for automated simulation testing.

## Design-principle audit

| # | Principle | Status | Main gap |
|---|---|---|---|
| 1 | Decision → time → consequence | Partial | Results are shown but causes are not sufficiently explained. |
| 2 | Player role changes as company grows | Partial | New modes unlock, but store-level micromanagement remains. |
| 3 | Preserve management friction, remove UI friction | Partial | Mobile UI is good; some actions still rely on prompt/alert. |
| 4 | Avoid one dominant strategy | Unverified | No strategy-bot or balance simulation exists. |
| 5 | Investments should have delayed effects | Missing | Most investments increase stats immediately. |
| 6 | Uncertainty should interact with decisions | Good base | Deterministic noise exists; event layer is still thin. |
| 7 | Explain why results changed | Missing | No revenue/profit/demand bridge. |
| 8 | Prevent soft locks and impossible states | Partial | Guard checks exist but are not covered by systematic tests. |
| 9 | More depth should not mean more taps | Partial | Risk grows as the store count increases. |
| 10 | Design for long-run play | Partial | No 30/100-year automated validation yet. |
| 11 | Treat saves as a product feature | Missing | Single localStorage save, no migration or backup generations. |
| 12 | AI implements; design rules stay explicit | Partial | Repository lacks a durable test/balance specification layer. |

## Important implementation findings

### A. City logic is not yet a single source of truth

`index.html` currently loads `07-map-flow.js` and `08-city-world.js`, but does not load `08-city-map.js` or `09-city-economics.js`.

This creates a maintenance risk: logic can exist in the repository without being active in the shipped game.

The intended model should be:

- A vacancy has one stable location and one stable site identity.
- Rival locations visible on the city map are the same rivals used by the economy.
- Property competition scores are derived from the same rival model used in weekly demand calculations.
- After leasing a property, the resulting store remains at the same site/location.
- The same competition pressure shown in UI is the pressure used by simulation.

### B. Company valuation risks double-counting historical profit

`companyValue()` currently combines cash, debt, annualized latest profit and cumulative profit. Because prior profit has already flowed into company cash, cumulative profit should not also be treated as a separate operating asset.

Target model:

`normalized operating earnings × sector multiple + subsidiary value + cash - debt`

Use a rolling earnings window rather than one latest week. Keep cumulative profit as a historical statistic rather than valuation input.

### C. M&A is currently too abstract

Current M&A mainly changes a subsidiary count. Acquired companies should become economic objects with their own performance and ownership characteristics.

Target subsidiary fields include:

- revenue
- EBITDA / operating profit
- debt
- growth
- business / sector
- acquisition EV
- ownership
- management quality
- synergy state

### D. PE due diligence is not sufficiently connected to ownership outcomes

DD currently reveals quality/risk, but these values should materially affect post-acquisition performance.

Target connections:

- quality → organic growth / margin / initiative execution
- risk → downside probability / volatility / debt capacity
- entry valuation + leverage + operating improvement + exit multiple → realized return

### E. Save architecture is too fragile for a long-form simulation

Current save architecture is a single `localStorage` JSON save with a strict version equality check.

Target Save V2:

- schema versioning
- `migrateState()`
- schema validation
- primary save + rolling backups
- export/import
- recovery path after corrupted or incompatible data

## Roadmap

### Phase 0 — Reliability foundation

Goal: make it possible to change the game without silently breaking deterministic simulation, accounting or saves.

#### PR 0-1 — `test/simulation-foundation`

Add:

- deterministic replay test
- NaN / Infinity scan
- cash-partition invariants
- company/personal/fund accounting invariants
- browser boot smoke
- iPhone-size smoke
- 10-year deterministic simulation

Acceptance:

- Same initial state + same actions produce the same terminal state.
- No non-finite numeric values.
- Cash cannot move between company/personal/PE buckets except through explicit defined transactions.

#### PR 0-2 — `feat/save-v2`

Add:

- migration pipeline
- validation
- primary + rolling backup saves
- export/import
- compatibility test for existing `capital_ascent_v1`

#### PR 0-3 — `refactor/city-runtime-cleanup`

Resolve inactive/dead city implementation files.

- Either merge the required logic from `08-city-map.js` / `09-city-economics.js` into the active runtime or delete obsolete variants.
- At the end, there should be one authoritative city simulation path.

### Phase 1 — City single source of truth

Goal: make the city map an economic game board rather than a visual layer.

Store and site identity should include stable location data such as:

- `siteId`
- `x`
- `y`
- `district`

Competition pressure should be derived from visible rivals using factors such as:

- distance
- rival strength
- rival price aggression
- local density

Acceptance:

- Leasing a visible vacancy creates the store at that exact location.
- Property competition and weekly demand use the same pressure function.
- Strong nearby rivals visibly and economically matter.
- Deterministic replay remains exact.

### Phase 2 — Accounting and valuation normalization

Goal: make long-run company economics internally consistent.

Work:

- replace latest-week valuation with rolling normalized earnings
- remove cumulative-profit double counting
- connect credit score to borrowing capacity and borrowing cost
- review all company/personal/fund transfers
- exclude donated foundation assets from personal net worth if they are no longer personally owned

Add accounting invariants before changing balance values.

### Phase 3 — Weekly Management Brief

Goal: make causality visible to the player.

Extend simulation results so each store/business/company can expose a breakdown rather than only revenue/cost/units.

Example breakdown categories:

- price effect
- footfall/location effect
- competitor pressure
- advertising effect
- quality effect
- brand effect
- operating-hours effect
- cannibalization
- labor/fixed/rent/interest cost

Create a weekly brief showing:

- revenue change
- profit change
- top positive drivers
- top negative drivers
- risks
- opportunities

The brief should teach the game model without exposing raw formulas unnecessarily.

### Phase 4 — Delayed investment / project system

Goal: make capital allocation and timing meaningful.

Replace immediate stat jumps for major investments with projects:

`planned → in_progress → completed`

Possible durations:

- quality improvement: several weeks
- renovation: several weeks
- DX: several weeks
- new product: several weeks
- large capex: longer

Cash is committed before the benefit fully arrives.

### Phase 5 — Management and delegation

Goal: change the player's job as the company grows.

Progression target:

- early: owner-operator
- growth: multi-store operator
- mid: business-unit CEO
- late: group CEO
- endgame: capital allocator

Possible unlocks:

- store manager
- area manager
- business-unit head
- COO / policy management

At scale, replace repetitive store controls with policy controls such as:

- Premium Pricing
- Growth
- Margin
- Market Share
- Cash Preservation

The player should not manually set every store forever.

### Phase 6 — Dynamic competitors and contextual events

Goal: make the world react.

Competitor actions may include:

- price changes
- renovation
- openings
- closures
- brand investment

External events may include:

- raw-material inflation
- labor shortage
- rate increases
- station redevelopment
- local demand shifts
- social-media demand shocks

Events should interact with prior player decisions. Avoid pure random punishment.

### Phase 7 — Strategy bots and balance simulation

Goal: identify dominant strategies instead of balancing by intuition alone.

Create deterministic player strategies such as:

- low-price volume
- premium
- advertising-heavy
- capex-heavy
- expansion-heavy
- cash-conservative
- leveraged
- diversification
- M&A
- capital allocator

Measure across many seeds:

- survival rate
- bankruptcy rate
- time to IPO
- enterprise value
- cash
- leverage
- store count
- personal net worth
- PE unlock rate
- drawdown
- long-run save size
- NaN / Infinity count

Do not force all strategies to have equal outcomes. Give each strategy a distinct risk/return profile.

### Phase 8 — Deepen existing endgame systems

Goal: connect existing systems causally before adding more systems.

Priorities:

1. M&A object model
2. PE underwriting and DD consequences
3. leverage and debt service
4. value-creation initiatives
5. exit mechanics
6. capital allocation between company, public markets and PE

For PE, the intended chain is:

`deal sourcing → DD → entry price → leverage → operating performance → initiatives → exit multiple → realized return`

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

If the feature does not connect to the decision → simulation → explanation loop, it should normally be deferred.

## Immediate priority order

Until the reliability foundation is complete, avoid adding new business types or financial products.

Recommended sequence:

1. `test/simulation-foundation`
2. `refactor/city-runtime-cleanup`
3. `fix/city-single-source-of-truth`
4. `feat/save-v2`
5. accounting / valuation normalization
6. Weekly Management Brief
7. delayed projects
8. delegation
9. world dynamics
10. strategy-bot balance validation
11. deepen M&A / PE

## Standing design rule

**Breadth is not the current bottleneck. Causality is.**

Prefer one existing system influencing three other systems over three new isolated features.
