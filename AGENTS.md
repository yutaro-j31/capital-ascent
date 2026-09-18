# CAPITAL ASCENT — Agent Instructions

These instructions apply to every substantial development task in this repository.

## Before changing code

1. Read `docs/DEVELOPMENT_ROADMAP.md`.
2. Read `docs/REFERENCE_NOTES.md`.
3. Inspect the current repository state. At minimum verify the current `main`/base commit, runtime-loaded files, relevant implementation files, current tests and relevant GitHub Actions state.
4. Do not treat old chat summaries, roadmap snapshots or handoff notes as source of truth when they conflict with the current repository.
5. Identify which design principle and current roadmap frontier the proposed change serves.

## Product rule

Prefer causal depth over feature breadth.

A feature should normally participate in this loop:

`observe → decide → advance time → simulate → explain → decide again`

Before adding a new system, ask whether an existing system can be made more meaningful by connecting it to other systems.

The Phase 0–11 roadmap baseline has been implemented. Phase 12 is the current release-candidate frontier. Future work should preserve and validate those systems rather than recreating them or adding disconnected breadth.

## Engineering rules

- Preserve deterministic simulation. Do not introduce `Math.random()` or time-dependent randomness into gameplay.
- Preserve explicit separation between company, personal and PE-fund money.
- Do not silently break existing saves. Any schema change requires an explicit compatibility/migration plan.
- Validate accounting and state invariants when money or ownership moves between buckets.
- Do not leave alternative gameplay implementations in the repository without making clear which implementation is authoritative.
- Treat UI labels and displayed causal information as part of the simulation contract: if the UI says a factor affects economics, the simulation should use the same underlying value.
- Mobile/iPhone behavior is a primary target, not an afterthought.

## Verification rule

Implementation is not complete when code has merely been written.

For substantive changes:

- run focused tests or add them if missing
- preserve the 10-year deterministic replay gate
- preserve the 100-year / 5,200-week finite-state and save-size gate for economy/state-growth changes
- verify no NaN/Infinity or invalid state is introduced
- verify save compatibility if state shape changes
- run strategy-bot balance smoke when balance is affected
- verify the relevant iPhone WebKit flow for user-facing changes
- verify deployment/CI when the task touches release behavior

Do not weaken or remove tests solely to make a change pass.

## Roadmap discipline

Current priorities and completion status are defined in `docs/DEVELOPMENT_ROADMAP.md`.

The Phase 0–11 baseline is complete. The default priority is now Phase 12 release-candidate QA across:

- Management Brief/explainability
- manager and delegation UX
- competitor strategic behavior
- delayed project/capex depth
- acquisition integration and divestiture
- PE fund-level economics and portfolio construction
- long-horizon balance calibration
- mobile-native UI in places still relying on prompt/alert

Do not add new business types or unrelated financial products merely to increase feature count unless the project owner explicitly changes priority.

When a major design decision or roadmap phase materially changes, update `docs/DEVELOPMENT_ROADMAP.md` in the same workstream so future agents inherit the new state.

## External reference discipline

The project owner has designated the references in `docs/REFERENCE_NOTES.md` as standing development references. Use their principles when relevant, but verify current external facts before relying on time-sensitive details.
