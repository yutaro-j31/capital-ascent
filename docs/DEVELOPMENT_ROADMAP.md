# CAPITAL ASCENT — Development Roadmap

Last audited: 2026-09-17

This document is the standing development roadmap and design contract for CAPITAL ASCENT. Always verify the actual repository state before acting on it.

## Current frontier

- Phase 0–8: COMPLETE baseline
- Phase 9: COMPLETE — management depth
- Phase 10: IN IMPLEMENTATION on PR #6 — CEO → capital allocator endgame
- Phase 11: PLANNED — long-horizon balance, progression, tutorial and UX completion
- Phase 12: PLANNED — release candidate / final QA / production completion

The game should continue to prefer **causal depth over feature breadth**.

Core loop:

`observe → decide → advance time → simulate → explain → decide again`

As the company grows, the player's job should become more abstract: owner-operator → multi-store operator → business-unit CEO → group CEO → capital allocator.

---

# Standing engineering gates

Every substantial gameplay change must preserve:

1. deterministic simulation
2. company / personal / PE-fund cash separation
3. save compatibility and migration
4. accounting invariants
5. no NaN / Infinity
6. bounded long-run state and save size
7. 10-year deterministic replay
8. 100-year / 5,200-week simulation
9. strategy-bot balance smoke when economics change
10. iPhone WebKit smoke for user-facing changes
11. published Pages smoke for release behavior

Do not weaken tests to make a feature pass.

---

# Phase 0 — Reliability foundation — COMPLETE

Implemented:

- deterministic Node VM harness
- Game CI
- 10-year replay
- 100-year simulation
- finite-state / NaN / Infinity checks
- save-size bound
- Save Schema V2 while preserving `capital_ascent_v1`
- rolling backups and recovery
- export / import
- iPhone WebKit smoke
- published Pages smoke

Standing rule: reliability is part of the game, not cleanup work.

---

# Phase 1 — City single source of truth — COMPLETE

Implemented:

- stable site identity
- persistent coordinates and district
- visible rivals and weekly economics using the same competition model
- property competition score linked to simulation
- leased-property coordinates preserved into the resulting store

Standing rule: the map is an economic board, not decorative UI.

---

# Phase 2 — Accounting and valuation — COMPLETE

Implemented:

- rolling normalized operating earnings
- sector multiples
- subsidiary equity value
- cash less debt
- cumulative-profit double-count removal
- credit-driven debt capacity and spread
- foundation assets excluded from personal net worth

Valuation contract:

`normalized operating earnings × sector multiple + subsidiary equity value + cash - debt`

---

# Phase 3 — Management Brief / explainability — COMPLETE BASELINE

Implemented:

- weekly revenue and profit snapshots
- prior-period deltas
- causal driver bridge
- competition / footfall / advertising / events / rent attribution
- risk flags

Standing rule: if a mechanic changes results, the player should be able to understand why.

---

# Phase 4 — Delayed projects and investment — COMPLETE BASELINE

Implemented:

- upfront cash commitment
- delayed quality / brand / efficiency / digital effects
- project lifecycle
- recent project history kept bounded

Standing rule: major investment should create a forecasting and liquidity decision, not an instant stat purchase.

---

# Phase 5 — Management and delegation — COMPLETE BASELINE

Progression:

- Owner Operator
- Store Manager
- Area Manager
- Business Unit Head
- COO

Implemented policy presets include Premium, Growth, Margin, Market Share and Cash Preservation.

Standing rule: a larger company should increase decision abstraction rather than repetitive taps.

---

# Phase 6 — Dynamic competitors and contextual events — COMPLETE BASELINE

Competitor actions include:

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
- cyber / system disruption

Player preparation changes event impact.

---

# Phase 7 — Strategy bots and balance simulation — COMPLETE BASELINE

Implemented strategy archetypes include:

- conservative
- low-price volume
- premium
- advertising
- efficiency
- expansion
- diversification
- leveraged expansion

CI measures survival, IPO rate, company value, cash, debt, stores and personal wealth.

Standing dominant-strategy gate: one strategy winning more than 80% of deterministic seed comparisons fails the smoke gate.

Latest Phase 9 calibration before Phase 10 work:

- Premium: 2 wins
- Advertising: 2 wins
- Expansion: 2 wins
- maximum dominance: 33.3%

---

# Phase 8 — M&A / PE causal baseline — COMPLETE

## Corporate M&A

Acquisitions create operating subsidiary objects with:

- revenue
- EBITDA
- debt
- growth
- enterprise value
- management quality
- synergy
- ownership

Subsidiary economics consolidate into company results.

## PE

Authoritative chain:

`deal sourcing → DD → entry multiple → leverage → operating performance → initiatives → debt amortization → exit multiple → realized return`

DD Quality / Risk affect leverage, operating results, initiative outcomes and downside behavior.

---

# Phase 9 — Management depth — COMPLETE

Phase 9 turns baseline management systems into a true operating-review layer.

Implemented:

## Executive Management Brief

- 4-week revenue / profit trend
- operating margin
- cash runway
- leverage
- top store movers
- project milestones
- event exposure
- deterministic 4-week outlook
- decision queue

## Management Organization

- persistent manager objects
- manager quality
- tenure
- Low / Medium / High autonomy
- Weekly / Monthly / Quarterly review cadence
- discretionary budget ceiling
- deterministic policy execution variance

## Competitor strategic memory

Competitors remember and respond to player signals such as:

- price attack
- ad blitz
- expansion
- premium positioning
- weakness

State changes occur in simulation at quarter boundaries, not during rendering.

## Capital Program

Implemented CAPEX types:

- Renovation
- Capacity Expansion
- Automation
- Product Development

Projects have upfront cost, delayed completion, deterministic execution risk and management-capacity constraints.

Verification added:

- Phase 9 operating-review tests
- manager/autonomy determinism
- competitor-memory quarter-boundary gate
- CAPEX capacity / delayed completion gate
- iPhone WebKit coverage

---

# Phase 10 — CEO → Capital Allocator — IN IMPLEMENTATION / PR #6

Detailed contract: `docs/PHASE10_CAPITAL_ALLOCATOR.md`

Phase 10 completes the late-game transition from operating-company CEO to allocator of company and LP capital.

## 10.1 PE fund-level economics

Target / implemented on PR #6:

- commitments
- GP commitment
- LP commitment
- paid-in / called capital
- uncalled commitment
- deterministic capital calls
- management fees
- GP management-company cash
- NAV
- distributions
- DPI
- TVPI
- deployment
- reserve ratio
- carry
- GP distributions

Fund I begins with a partial first-close call instead of having the entire commitment as cash on day one.

Standing accounting rule: LP contributions stay in the PE-fund bucket. They must never become company or personal cash.

## 10.2 Fund sequencing

Baseline next-fund gate:

- DPI >= 1.20x
- deployment >= 80%
- LP Trust >= 45

Successor fund size responds to prior TVPI and LP trust.

## 10.3 Portfolio construction / Investment Committee

Baseline controls:

- single deal <= 45% of commitments
- sector concentration <= 60% after the first investment
- existing portfolio-slot limits
- acquisition liquidity can trigger capital calls

The game should make the player choose a portfolio, not only a collection of individually attractive deals.

## 10.4 PE waterfall / realization

Exit should connect:

`equity proceeds → distributions → hurdle → carry → GP economics → DPI/TVPI → fundraising`

This turns exit quality into the input for the next fund rather than an isolated score.

## 10.5 Corporate M&A / PMI

Integration choices:

- Stand-alone
- Synergy Capture
- Turnaround
- Full Integration

PMI should:

- cost company cash up front
- take time
- create temporary integration drag
- carry deterministic execution risk
- change synergy / quality / margin / growth after completion

Subsidiaries should be individually divestable.

## 10.6 Capital Allocation Office

Group-CEO view should expose:

- company cash
- debt capacity
- active projects
- subsidiaries
- M&A
- shareholder returns

For public companies:

- special dividends reduce full company cash while only founder ownership share enters personal cash
- buybacks reduce company cash and public float, mechanically increasing founder ownership

### Phase 10 completion gate

Phase 10 is complete only when:

1. focused fund accounting tests pass
2. capital calls never exceed commitments
3. company / personal / fund money remains separated
4. DPI / TVPI / NAV / deployment remain finite
5. next-fund gate is enforced
6. PE exit updates distribution and GP economics
7. PMI is delayed and deterministic
8. dividend / buyback accounting is tested
9. 10-year replay remains deterministic
10. 100-year simulation remains finite and bounded
11. strategy balance smoke remains inside standing gate
12. iPhone WebKit exposes Phase 10 UI without errors / horizontal overflow

---

# Phase 11 — Long-horizon game and UX completion — PLANNED

Phase 11 is not about adding another finance mode. It turns the existing game into a complete long-form product.

Planned work:

## Balance / progression

- 10-year, 30-year and 100-year calibration across more seeds
- multiple player archetypes
- bankruptcy and recovery rates
- IPO timing distribution
- Fund I / II / III reach rates
- M&A and PE return distributions
- capital-allocation strategy comparisons
- difficulty presets if evidence supports them

## Progression clarity

- clearer milestones from founder → CEO → allocator
- tutorial / first-run explanation
- unlock explanation
- decision-support hints without solving choices for the player

## Mobile UX completion

- replace remaining prompt / alert heavy flows with native sheets / controls
- reduce deep scrolling
- make late-game PE / M&A information dense but low-tap
- verify every major flow at iPhone viewport

## Content density

- more varied but system-connected company names / deal profiles / events
- no disconnected feature-count expansion

### Phase 11 exit gate

- no severe dominant strategy
- no progression dead zones
- no soft lock in tested long-run archetypes
- tutorial / unlock path usable on iPhone
- late-game screens remain manageable on mobile

---

# Phase 12 — Release Candidate / final QA — PLANNED

Phase 12 is the product-completion gate.

Required final verification:

- clean start → operating company → IPO / sale → PE unlock → fund raise → deal → exit end-to-end
- Save V1 / V2 compatibility
- corrupted-save recovery
- company / personal / fund accounting audit
- 100-year production simulation
- no NaN / Infinity
- save < 5 MB target
- deterministic replay
- all major iPhone WebKit routes
- GitHub Pages deployment
- published Pages iPhone smoke
- no known blocker / soft lock
- roadmap and player-facing documentation aligned with shipped behavior

After Phase 12 passes, CAPITAL ASCENT can be treated as the first formal completed release rather than an implementation baseline.

---

# Development decision checklist

Before adding or changing a feature, answer:

1. What new decision does this create?
2. What does the player observe before deciding?
3. What trade-off makes the choice non-trivial?
4. How does time affect the outcome?
5. How will the game explain the result?
6. Does it preserve deterministic simulation?
7. Does it preserve accounting boundaries?
8. Could it create a dominant strategy or soft lock?
9. What automated test proves it works?
10. Does it deepen an existing causal chain, or merely add another screen/stat?

## Standing design rule

**Breadth is not the bottleneck. Causality, progression and presentation quality are.**

Prefer one decision influencing multiple systems over several isolated features.
