# CAPITAL ASCENT — Phase 10 Capital Allocator

Status: implementation candidate on `phase10-capital-allocator`

Phase 10 completes the transition from operating-company CEO to capital allocator. It deepens existing M&A and PE systems rather than adding unrelated financial modes.

## Product objective

The late game should move the player from deciding how to operate one business toward deciding:

- where company capital should go
- which companies should be owned
- how acquired companies should be integrated or divested
- how much LP capital should be called and deployed
- how a PE portfolio should be constructed
- when returns are realized and distributed
- whether performance justifies raising the next fund

The intended loop is:

`observe capital position → allocate → wait / operate → measure value creation → distribute / recycle → raise larger pool of capital`

## 1. PE fund economics

A fund is no longer treated as if all commitments are cash on day one.

Fund state includes:

- total commitments
- GP commitment
- LP commitment
- paid-in / called capital
- uncalled commitment
- GP contribution
- LP contribution
- fund cash
- management fees
- NAV
- distributions
- DPI
- TVPI
- deployment
- reserve ratio
- carry
- GP distributions

Fund I starts with a 10% first-close capital call. Additional capital calls occur when acquisitions or fees require liquidity. GP calls come from personal cash; LP contributions enter only the PE-fund bucket.

Standing accounting rule: LP money must never appear in company cash or personal cash.

## 2. Fund sequencing

Fund I remains the entry fund.

The next fund is gated by the prior fund rather than by elapsed time alone.

Baseline gate:

- DPI >= 1.20x
- deployment >= 80%
- LP Trust >= 45

Successor fund size responds to prior TVPI and LP Trust. This makes fundraising a consequence of realized investing performance.

## 3. Portfolio construction / Investment Committee

Acquisition decisions now consider the fund portfolio, not only whether cash is available.

Baseline constraints:

- one deal cannot consume more than 45% of fund commitments
- after the first investment, one sector cannot exceed 60% of invested equity
- portfolio slot limits still apply
- acquisition liquidity can trigger a capital call

The Deal Book should expose IC constraints before acquisition where practical.

## 4. PE value realization

The existing chain remains authoritative:

`deal sourcing → DD → acquisition → initiatives → operating performance → debt paydown → exit`

Phase 10 adds fund-level realization around that chain:

`exit proceeds → gross distribution → preferred-return hurdle → carry → GP economics → DPI/TVPI → next-fund eligibility`

Management fees accumulate in a separate GP management-company cash bucket. Moving GP-company cash to personal cash is explicit.

## 5. Corporate M&A and PMI

Company acquisitions must create a post-close decision rather than ending at `acquired`.

Integration modes:

- Stand-alone
- Synergy Capture
- Turnaround
- Full Integration

PMI commits company cash up front, takes time, creates temporary integration drag and has deterministic execution risk. Completion changes synergy, management quality, margin and/or growth.

Subsidiaries can be divested individually.

## 6. Capital Allocation Office

The company-market screen should expose the group CEO decision layer:

- company cash
- debt capacity
- active project commitments
- subsidiary count
- M&A access
- public-company shareholder returns

Public companies gain explicit special-dividend and buyback decisions.

Dividend accounting:

- company pays the full dividend
- only the founder-owned portion enters personal cash
- the external shareholder portion leaves the controlled system

Buyback accounting:

- company cash funds the repurchase
- public float falls
- founder ownership increases mechanically because founder shares are not sold

## 7. Determinism and save compatibility

Phase 10 remains additive to Save Schema V2 and preserves the public `capital_ascent_v1` key.

All execution outcomes use deterministic hashes / existing deterministic mechanics. No `Math.random()` or time-based gameplay randomness is allowed.

Long-run histories introduced by Phase 10 must be bounded.

## 8. Completion gates

Phase 10 is complete only when all are true:

1. Fund I uses commitments and capital calls rather than full day-one funding.
2. Company / personal / PE-fund money remains separated.
3. Capital calls cannot exceed commitments.
4. DPI, TVPI, NAV and deployment remain finite.
5. The next-fund gate is enforced.
6. PE exits update fund distributions and GP economics.
7. Corporate PMI has delayed effects.
8. Public-company dividend and buyback accounting is tested.
9. Existing 10-year deterministic replay remains green.
10. Existing 100-year finite-state / save-size gate remains green.
11. Strategy balance smoke remains within the standing dominance gate.
12. iPhone WebKit exposes the Capital Allocation and Phase 10 PE surfaces without horizontal overflow or page errors.
