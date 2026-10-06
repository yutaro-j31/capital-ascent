# CAPITAL ASCENT — Next Generation Product Contract

Status: IMPLEMENTATION ACTIVE
Base: main @ e4bf46e1840f02a17fdb2bac99db4b08950ebb5d

## Product thesis
Build one browser management simulation that combines:
- owner-operator growth and physical business expansion;
- multi-industry corporate competition and delegation;
- deep public markets, control transactions, M&A, LBO, PE/VC and capital allocation.

The game must remain a single causal simulation rather than separate minigames.

## Player progression
Founder → Operator → Multi-site CEO → Group CEO → Public-company CEO → Capital Allocator → PE/VC GP → Conglomerate Chair.

The abstraction level must rise with scale. Early play focuses on a store and people; late play focuses on portfolio and capital-allocation decisions.

## Required complete-game systems

### 1. Operating business
Each operating unit has products/services, capacity, inventory or service capacity, employees, schedules, wages, customer demand, price, marketing, quality, supplier exposure and physical sites where applicable.

Player decisions:
- site selection and lease/buy
- opening hours/capacity
- hiring, compensation and staffing
- product/menu assortment
- pricing
- marketing channel and budget
- procurement/supplier choice
- capex, renovation, automation and maintenance
- close/sell/relocate site

### 2. Supply chain
Supplier → inventory/input → site/warehouse → customer.
Lead times, minimum orders, working capital, stockouts, waste, supplier concentration and logistics capacity have real economic effects.

### 3. City and real estate
Sites are economic assets, not decorative markers. District footfall, rent, labor pool, competition, logistics and redevelopment feed the simulation. Player can lease or own operating properties and investment real estate.

### 4. Organization
Store manager → area manager → BU head → CXO → group CEO.
Delegation policies have budgets, authority limits, targets and review cadence. Managers make deterministic decisions under mandates.

### 5. Multi-industry economy
Industries share macro inputs: rates, inflation, wages, consumer demand, commercial rent, credit conditions and input costs. Cross-business synergies must be explicit and measurable.

### 6. Competitor companies
AI companies have cash, debt, sites, products, management, ownership and strategy memory. Decisions use deterministic candidate → score → stable tie-break → execute architecture.

### 7. Public markets
A persistent company universe supports:
- equity ownership and dilution
- valuation based on operating fundamentals
- dividends and buybacks
- primary/secondary issuance
- IPO
- block purchases
- activist/control stakes
- tender offers
- hostile/friendly acquisition
- merger consideration using cash/debt/equity
- spin-offs and divestitures
- bankruptcy/delisting/restructuring

### 8. Corporate M&A
Target screening → indication → DD → financing → bid → close → PMI → hold/divest.
Synergy must not be instant. Integration costs cash/time and can fail partially.

### 9. VC
Sourcing → diligence → term sheet → ownership/dilution → board support → follow-on → IPO/M&A/write-off.
Portfolio-company performance must connect to the same economy.

### 10. PE/LBO
Fundraising → DDQ/LPs → fund close → sourcing → IC → LBO financing → operating plan → debt paydown → exit → waterfall/carry → successor fund.

### 11. Capital allocation
Company cash can compete among:
- organic growth
- capex
- R&D
- M&A
- debt reduction
- dividends
- buybacks
- liquidity reserve.
Late-game score is long-run per-share and personal wealth creation, not raw revenue.

### 12. Personal balance sheet
Personal cash, founder equity, public securities, real estate, GP economics and philanthropy remain distinct from company/fund assets.

## Simulation contract
- weekly authoritative tick
- deterministic gameplay; no Math.random()
- one source of truth for economics shown in UI
- company/personal/fund money isolation
- bounded histories
- no NaN/Infinity
- explicit transaction ledger for material money/ownership moves
- save migration, backups, import/export
- 100-year simulation target

## UX contract
Mobile-first, iPhone Safari primary.
Primary navigation:
1. Command
2. Business
3. City
4. Markets
5. Deals
6. Portfolio

Every major screen answers:
- What changed?
- Why?
- What can I decide?
- What will it cost?
- When will the result arrive?
- What risk am I taking?

No essential workflow may depend on prompt()/confirm() in the final generation.

## Release gates
A release is not complete until all are green:
1. clean start playable
2. first business can survive and scale
3. multi-site delegation works
4. second industry can be entered
5. IPO works with accounting invariants
6. public-market ownership/control path works
7. corporate M&A + PMI works
8. VC lifecycle works
9. PE Fund I lifecycle works
10. successor fund works
11. real estate works
12. 10-year deterministic replay
13. 100-year finite-state simulation
14. save < 5 MB
15. no NaN/Infinity
16. company/personal/fund isolation
17. iPhone WebKit all major routes
18. GitHub Pages deploy
19. published Pages WebKit smoke

## Implementation order
NG-0 architecture/migration harness
NG-1 people/inventory/supply-chain operating model
NG-2 city/property/logistics
NG-3 competitor-company universe
NG-4 public markets/control transactions
NG-5 M&A/PMI/restructuring
NG-6 VC
NG-7 PE/LBO integration
NG-8 group capital allocation/synergies
NG-9 mobile UX replacement
NG-10 balance, long-horizon, release audit

Do not declare the next-generation game complete before NG-0 through NG-10 and all release gates pass.
