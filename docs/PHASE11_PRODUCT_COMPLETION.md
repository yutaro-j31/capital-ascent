# CAPITAL ASCENT — Phase 11 Product Completion

Status: COMPLETE

Phase 11 turns the mechanically complete Phase 0–10 game into a legible long-form product. It does not add another disconnected finance mode.

## Objectives

1. Make the founder → CEO → Exit → PE → Fund II journey explicit.
2. Explain why important systems are locked and what measurable condition unlocks them.
3. Replace high-frequency prompt-driven capital actions with iPhone-native decision sheets.
4. Expand long-horizon automated cohorts without weakening existing deterministic and accounting gates.
5. Keep content density high while avoiding more taps and unrelated features.

## Progression Journey

Standing milestones:

- Found
- weekly profitability
- ¥80m company value
- Founder Exit
- Fund I
- first PE investment
- first PE realization
- Fund II

The UI shows the next incomplete milestone and factual gate. It does not choose the player's strategy.

## First-run guidance

The first-run guide teaches the loop:

advance time → read Management Brief → inspect business → inspect City → inspect capital market

It is inline, dismissible and persisted in the save. It does not block gameplay with a modal tutorial.

## Lock explanations

The game explains:

- Manager delegation: 3 stores
- IPO: company value >= ¥80m and current weekly profit > 0
- company sale: company value >= ¥120m and week >= 80
- PE: at least one Founder Exit
- Fund I: enough personal cash for the GP portion of the first capital call
- successor fund: DPI >= 1.20x, deployment >= 80%, LP Trust >= 45

## Native decision sheets

Phase 11 replaces prompt-heavy frequent flows with bottom sheets for:

- company borrowing
- debt repayment
- Microcap buy
- Microcap sell
- special dividend
- share buyback

## Long-horizon validation

Phase 11 adds 10-year, 30-year and 100-year cohort checkpoints.

Metrics include survival, bankruptcy, IPO and company-sale timing, PE unlock, Fund I / II reach, first PE investment and realization, company value, cash, debt, personal net worth, fund DPI / TVPI and progression gaps.

Difficulty presets are intentionally not added unless cohort evidence shows a progression problem that cannot be solved by calibration or clearer decision support.

## Exit gate

Phase 11 is complete only when:

- progression Journey is usable from a clean start
- lock explanations match actual simulation conditions
- first-run guide works on iPhone
- routine capital actions use native sheets
- long-horizon cohort tooling produces finite deterministic metrics
- existing 10-year deterministic replay remains green
- existing 100-year finite-state and save-size gate remains green
- strategy-bot dominance remains within the standing threshold
- Phase 10 PE / M&A / capital-allocation screens remain usable on iPhone
- published Pages smoke remains green after merge


## Completion evidence

Final Phase 11 implementation validation:

- simulation / invariant suite: PASS
- strategy balance smoke: PASS
- iPhone WebKit smoke: PASS
- long-horizon cohort: PASS
- Allocator Fund II milestone: W209
- Fund II reached inside the 10-year checkpoint
- 100-year allocator progression reached Fund III
- long-form allocator run completed 9 PE investments and 9 PE exits

The cohort originally failed because Fund I economics created a progression dead zone. Phase 11 fixed the underlying economics and capital-management behavior rather than lowering the Fund II eligibility thresholds.

Fund II eligibility remains:

- DPI >= 1.20x
- deployment >= 80%
- LP Trust >= 45
