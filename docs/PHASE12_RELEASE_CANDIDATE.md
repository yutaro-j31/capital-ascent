# CAPITAL ASCENT — Phase 12 Release Candidate

Status: implementation on phase12-release-candidate

Phase 12 is the product-completion gate. It adds no new gameplay mode.

## Release contract

A release candidate is acceptable only when all of the following are true:

1. A deterministic clean-start automated player can progress through:
   - operating company
   - IPO or company sale
   - PE unlock
   - Fund I
   - PE acquisition
   - value creation
   - realization
   - Fund II
2. Save V1-compatible input migrates to Schema V2.
3. Schema V2 export/import round-trips successfully.
4. Corrupted primary save recovers from rolling backup.
5. Company, personal and PE-fund money remain isolated.
6. Existing deterministic 10-year replay remains green.
7. Existing 100-year / 5,200-week finite-state and save-size gate remains green.
8. Strategy balance and Phase 11 long-horizon cohort remain green.
9. Major iPhone routes have no blocking runtime errors or horizontal overflow.
10. GitHub Pages deploys and the published iPhone WebKit smoke passes.

## Phase 12 release audit

The dedicated release audit starts from the normal fresh-state balance with no company-cash injection. It must reach Fund II within 520 weeks using only actions exposed by the shipped game.

The accounting audit explicitly checks:

- GP capital calls reduce personal cash and increase fund cash without touching company cash.
- LP capital remains in the fund bucket.
- corporate dividends reduce company cash and credit only the founder-owned share to personal cash.
- corporate M&A uses company cash and does not consume personal or PE-fund cash.

## Completion

After every Phase 12 gate is green on the final main SHA and the published Pages build, CAPITAL ASCENT can be labeled the first formal completed release.
