# CAPITAL ASCENT — Development Roadmap

Last audited: 2026-09-18

This is the standing product and engineering roadmap for CAPITAL ASCENT. Before substantial work, always verify the actual repository state, `AGENTS.md`, this roadmap, relevant implementation files, tests and CI. Repository state overrides stale chat summaries.

## Current frontier

- **Phase 0–8: COMPLETE** — reliability, city/economy, accounting, explainability, delayed investment, delegation, competitors, balance harness, M&A/PE causal baseline.
- **Phase 9: COMPLETE** — executive operating review, management organization, competitor memory and CAPEX portfolio.
- **Phase 10: COMPLETE** — CEO → capital allocator endgame, including fund-level LP economics, portfolio construction, PMI and public-company capital allocation.
- **Phase 11: COMPLETE** — long-horizon balance, progression clarity, tutorial, native decision sheets and mobile UX completion.
- **Phase 12: COMPLETE** — release candidate, final QA and production-completion gate. Phase 0–12 now defines the first formal completed release.

The product rule remains:

**Prefer causal depth over feature breadth.**

Core loop:

`observe → decide → advance time → simulate → explain → decide again`

Player-role progression:

`owner-operator → multi-store operator → business-unit CEO → group CEO → capital allocator`

---

# Standing engineering gates

Every substantial gameplay change must preserve or extend:

1. deterministic simulation
2. explicit company / personal / PE-fund money separation
3. save compatibility and migration
4. accounting and ownership invariants
5. no NaN / Infinity
6. bounded long-run state and save size
7. 10-year deterministic replay
8. 100-year / 5,200-week simulation
9. strategy-bot balance smoke when economics change
10. iPhone WebKit smoke for user-facing changes
11. GitHub Pages / published smoke for release behavior

Do not weaken tests merely to make a change pass.

---

# Phase 0 — Reliability foundation — COMPLETE

Implemented:

- deterministic Node VM test harness
- Game CI
- 10-year deterministic replay
- 100-year / 5,200-week simulation
- finite-state / NaN / Infinity checks
- save-size bound
- Save Schema V2 while preserving public key `capital_ascent_v1`
- additive migration
- rolling backups and corrupted-primary recovery
- export / import
- iPhone WebKit smoke
- published Pages smoke

Standing rule: reliability is part of the game design, not post-release cleanup.

---

# Phase 1 — City single source of truth — COMPLETE

Implemented:

- stable site identity
- persistent coordinates and district
- visible rivals and weekly economics using the same competition inputs
- property competition score linked to simulation
- leased property coordinates preserved into the resulting store

Standing rule: the city is an economic board, not decorative UI.

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

- weekly revenue / profit snapshots
- prior-period deltas
- causal driver bridge
- competition, footfall, advertising, events and rent attribution
- risk flags

Standing rule: if a mechanic materially changes results, the player should be able to understand why.

---

# Phase 4 — Delayed projects and investment — COMPLETE BASELINE

Implemented:

- upfront cash commitment
- delayed quality / brand / efficiency / digital effects
- project lifecycle
- bounded project history

Standing rule: major investment creates a forecasting and liquidity decision rather than an instant stat purchase.

---

# Phase 5 — Management and delegation — COMPLETE BASELINE

Management ladder:

- Owner Operator
- Store Manager
- Area Manager
- Business Unit Head
- COO

Policy presets include Premium, Growth, Margin, Market Share and Cash Preservation.

Standing rule: company growth should increase decision abstraction, not repetitive taps.

---

# Phase 6 — Dynamic competitors and contextual events — COMPLETE BASELINE

Competitor actions include:

- price cut
- brand push
- renovation
- expansion
- steady operation

External events include raw-material inflation, labor shortage, station redevelopment, social-media demand shocks and cyber/system disruption.

Player preparation changes event impact.

---

# Phase 7 — Strategy bots and balance simulation — COMPLETE BASELINE

Implemented strategy archetypes include conservative, low-price volume, premium, advertising, efficiency, expansion, diversification and leveraged expansion.

CI measures survival, IPO rate, company value, cash, debt, store count and personal wealth.

Standing dominant-strategy gate: one strategy winning more than 80% of deterministic seed comparisons fails the smoke gate.

Latest Phase 9 calibration before Phase 10 work:

- Premium: 2 wins
- Advertising: 2 wins
- Expansion: 2 wins
- maximum dominance: 33.3%

---

# Phase 8 — M&A / PE causal baseline — COMPLETE

## Corporate M&A

Acquisitions create operating subsidiary objects with revenue, EBITDA, debt, growth, enterprise value, management quality, synergy and ownership. Subsidiary economics consolidate into company results.

## PE

Authoritative deal chain:

`deal sourcing → DD → entry multiple → leverage → operating performance → initiatives → debt amortization → exit multiple → realized return`

DD Quality / Risk affect leverage, operating results, initiative outcomes and downside behavior.

---

# Phase 9 — Management depth — COMPLETE

Phase 9 turned the baseline management systems into an operating-review layer.

## Executive Management Brief

Implemented:

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

Implemented:

- persistent manager objects
- manager quality and tenure
- Low / Medium / High autonomy
- Weekly / Monthly / Quarterly review cadence
- discretionary budget ceiling
- deterministic policy-execution variance

## Competitor strategic memory

Competitors remember and respond to player signals such as price attack, ad blitz, expansion, premium positioning and weakness. State changes occur in simulation at quarter boundaries, not during rendering.

## Capital Program

CAPEX types:

- Renovation
- Capacity Expansion
- Automation
- Product Development

Projects have upfront cost, delayed completion, deterministic execution risk and management-capacity constraints.

Phase 9 verification includes operating-review tests, manager/autonomy determinism, competitor-memory quarter-boundary tests, CAPEX delayed-effect tests and iPhone WebKit coverage.

---

# Phase 10 — CEO → Capital Allocator — COMPLETE

Detailed contract: `docs/PHASE10_CAPITAL_ALLOCATOR.md`

Phase 10 completes the late-game transition from operating-company CEO to allocator of company and LP capital.

## 10.1 PE fund-level economics

Implemented fund state and economics:

- total commitments
- GP commitment
- LP commitment
- paid-in / called capital
- uncalled commitment
- GP and LP contribution tracking
- deterministic capital calls
- management fees
- GP management-company cash
- NAV
- distributions
- DPI
- TVPI
- deployment
- reserve ratio
- preferred return
- carry
- GP distributions

Fund I uses a partial first-close capital call instead of receiving the full commitment as cash on day one.

Accounting contract:

**LP contributions remain in the PE-fund bucket. They never become company cash or personal cash.**

## 10.2 Fund sequencing

Next-fund gate:

- DPI >= 1.20x
- deployment >= 80%
- LP Trust >= 45

Successor fund size responds to prior TVPI and LP Trust, so fundraising is a consequence of realized investment performance.

## 10.3 Portfolio construction / Investment Committee

Implemented controls:

- single deal <= 45% of fund commitments
- after the first investment, one sector <= 60% of invested equity
- portfolio-slot limits
- acquisition liquidity can trigger a capital call
- Deal Book surfaces IC constraints

The player must construct a portfolio rather than merely collect individually attractive deals.

## 10.4 PE realization and GP economics

Exit now connects:

`equity proceeds → fund distribution → preferred-return hurdle → carry → GP economics → DPI / TVPI → next-fund eligibility`

Management fees accumulate in a separate GP management-company bucket and transfer to personal cash only through an explicit distribution action.

## 10.5 Corporate M&A / PMI

Integration modes implemented in the Phase 10 engine:

- Stand-alone
- Synergy Capture
- Turnaround
- Full Integration

PMI:

- commits company cash up front
- takes time
- creates temporary integration drag
- has deterministic execution risk
- changes synergy / management quality / margin / growth after completion

Subsidiaries can be divested individually.

## 10.6 Capital Allocation Office

Group-CEO view exposes company cash, debt capacity, active projects, subsidiaries, M&A and shareholder returns.

For public companies:

- special dividends reduce full company cash while only the founder-owned portion enters personal cash
- buybacks reduce company cash and public float, mechanically increasing founder ownership when founder shares are retained

## Phase 10 verification

PR #6 passed the Phase 10 completion gates on its final implementation head before the completion-status documentation update:

- focused fund-accounting tests: PASS
- existing simulation / invariant suite: PASS
- 10-year deterministic replay: PASS
- 100-year / 5,200-week finite-state and save-size gate: PASS
- strategy balance smoke: PASS
- iPhone WebKit Phase 10 surface smoke: PASS

The final documentation-only head must also remain green before merge.

---

# Phase 11 — Long-horizon game and UX completion — COMPLETE

Detailed contract: `docs/PHASE11_PRODUCT_COMPLETION.md`

Phase 11 converted the mechanically complete Phase 0–10 game into a legible long-form product.

## 11.1 Long-horizon balance

Implemented deterministic cohort validation at 10-year, 30-year and 100-year checkpoints.

Measured:

- survival / bankruptcy
- IPO and company-sale timing
- PE unlock
- Fund I / II reach
- PE investment and realization
- company value / cash / debt
- personal net worth
- DPI / TVPI
- deployment
- progression gaps

The cohort surfaced and fixed two real soft locks rather than weakening the gate:

1. legacy GP commitment economics made Fund I inaccessible after a credible Founder Exit;
2. deal ticket size and GP liquidity management made the 80% deployment gate structurally difficult to reach.

Phase 11 calibration now uses a 1.0–1.5% GP commitment range, fund-size-aware deal tickets and explicit recycling of GP management-company fee cash into GP capital commitments when the allocator chooses that action.

Latest completion cohort:

- Allocator IPO: W53
- Fund I: W53
- first PE investment: within the investment period
- first PE realization: achieved
- Fund II: W209
- Fund II is reached inside 10 years
- 100-year allocator result reaches Fund III
- 9 PE investments / 9 PE exits in the long-form allocator run
- no non-finite long-horizon metric

Difficulty presets were not added because the progression issue was solved by economic calibration and clearer decision support rather than artificial difficulty scaling.

## 11.2 Progression clarity

Implemented:

- Founder → CEO → Exit → Fund I → LBO → PE Exit → Fund II Journey
- current role label
- next incomplete milestone
- factual unlock conditions
- PE / IPO / delegation / next-fund lock explanations
- inline Founder Launch Guide
- long-form career progress summary

The UI explains constraints without choosing the player's strategy.

## 11.3 Mobile UX completion

Replaced routine prompt-heavy flows with iPhone-native bottom decision sheets for:

- borrowing
- debt repayment
- Microcap buy
- Microcap sell
- special dividend
- share buyback

Added Capital Constraints decision support and verified the Journey, City, Capital Allocation and PE surfaces in iPhone WebKit.

## 11.4 Phase 11 verification

Final implementation head before documentation completion passed:

- simulation / invariant suite: PASS
- 10-year deterministic replay: PASS
- 100-year finite-state / save-size gate: PASS
- strategy balance smoke: PASS
- Phase 11 10/30/100-year cohort: PASS
- Fund I investment-realization loop: PASS
- Fund II within 30 years gate: PASS
- iPhone WebKit smoke: PASS

The final documentation-only head must remain green before merge.

---

# Phase 12 — Release Candidate / final QA — COMPLETE

Phase 12 is the product-completion gate.

Detailed contract: `docs/PHASE12_RELEASE_CANDIDATE.md`

Completion evidence from the Phase 12 release-candidate branch:

- clean start with no company-cash injection
- IPO: W196
- PE unlock / Fund I: W196
- first PE acquisition: W222
- first PE realization: W326
- Fund II: W339
- final release-audit save: 476,422 bytes
- validation errors: 0
- simulation / invariants: PASS
- strategy balance: PASS
- Phase 11 10/30/100-year cohort: PASS
- Phase 12 release audit: PASS
- major-route iPhone WebKit: PASS

Required final verification:

- clean start → operating company → IPO or company sale → PE unlock → Fund I → deal → value creation → exit end-to-end
- successor-fund progression
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
- no known blocker or soft lock
- roadmap and player-facing documentation match shipped behavior

Phase 12 has passed its release-candidate gates. The merged main SHA must also pass Game CI, GitHub Pages deployment and published iPhone WebKit smoke; after those publication gates are green, CAPITAL ASCENT is the first formal completed release.

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
