# CAPITAL ASCENT — Phase 9 Implementation Spec

Status: implementation in progress
Baseline main: `59a1ffd02532d42c3862ce654b8f1c548aadf07b`

Phase 9 deepens the management simulation without adding disconnected breadth.

## Pillar A — Executive Management Brief

Upgrade the weekly brief from a short delta card into an operating review that answers:

- What changed this week?
- Which stores/businesses drove the change?
- What is the current operating margin and cash runway?
- What risks require action now?
- Which opportunity deserves management attention next?
- Which projects or external events are likely to change the next four weeks?

Required state/output:

- 4-week revenue/profit trend
- operating margin
- cash runway estimate
- leverage ratio
- top store movers
- active project milestones
- active-event exposure
- decision queue / opportunities
- deterministic 4-week outlook band

## Pillar B — Management Organization / Delegation

Move delegation beyond a single policy dropdown.

Each business unit receives a management object with:

- manager quality
- manager tenure
- autonomy: low / medium / high
- review cadence: weekly / monthly / quarterly
- policy mandate
- weekly discretionary budget ceiling

Management quality affects how quickly delegated controls converge toward the chosen policy. Higher autonomy increases execution speed but also increases the magnitude of manager-driven deviations. Results remain deterministic.

Unlock ladder remains based on company scale:

- Tier 0 — Owner Operator
- Tier 1 — Store Manager
- Tier 2 — Area Manager
- Tier 3 — Business Unit Head
- Tier 4 — COO

## Pillar C — Competitor Memory / Strategic Response

Competitors should react to the player's observed strategy rather than selecting an isolated quarterly action.

Persist per-rival memory:

- previous action
- strategic posture
- momentum
- last response week
- player signal observed

Player signals include:

- aggressive pricing
- advertising intensity
- rapid local expansion
- premium quality/brand positioning
- weak profitability / retrenchment

Competitor response remains deterministic and is updated only at quarter boundaries so rendering the map cannot mutate simulation state.

## Pillar D — Capex / Project Portfolio

Expand the delayed-project engine into a small capital-allocation pipeline.

New project types:

- renovation
- capacity
- automation
- product development

Each project carries:

- cost
- duration
- expected effect
- execution risk
- status
- progress

Projects can overlap across businesses, but total concurrent projects are limited by management capacity. Larger organizations can execute more concurrent projects.

## Completion gates

Phase 9 is complete only when:

1. all new state is additive and old saves still load;
2. deterministic replay remains exact;
3. 100-year finite-state/save-size test remains green;
4. executive brief is populated after weekly simulation;
5. delegated execution differs by manager quality/autonomy but stays deterministic;
6. competitors persist and react to player signals across quarters;
7. capex projects respect management capacity and complete with delayed effects;
8. mobile UI exposes the new management/brief/project information without horizontal overflow;
9. strategy balance smoke remains green;
10. published GitHub Pages iPhone WebKit smoke remains green.
