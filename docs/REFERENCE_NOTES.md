# CAPITAL ASCENT — Standing Development References

This file records external references that should influence development decisions. Treat external articles as guidance, not as source-of-truth for repository state.

## 1. Management simulation design principles

Standing internal reference:

- `docs/DEVELOPMENT_ROADMAP.md`

The roadmap incorporates lessons extracted from:

- Coffee Inc 2 developer notes
- DX management-game development series
- Patent Tycoon development logs
- Pro baseball GM simulation development logs

Recurring principles:

- Make the core loop decision → time → consequence → explanation.
- Increase causal depth before feature count.
- Avoid one dominant strategy.
- Give investments delayed effects.
- Make uncertainty interact with preparation and prior decisions.
- Explain why numbers changed.
- Change the player's managerial role as the organization grows.
- Design saves and long-run performance as first-class systems.
- Use automated simulation to test balance.

## 2. @29meat_ai article supplied by project owner

Original URL:

https://x.com/29meat_ai/status/2096415124143972582?s=46&t=odelyJT7kkSDMu_bu-N0_w

Indexed title/date confirmed on 2026-09-17:

- Title: `Codexガチ開発者に学ぶGPT-6 Astraの最強設定5選`
- Author: にく / `@29meat_ai`
- Publication timestamp corresponds to 2026-09-06 09:48 JST.

The X page itself was not directly retrievable by the research environment. Search indexing confirms the title and opening theme, which discusses reducing coding-agent failures through durable working instructions such as reading required material, testing, and checking relevant state before work.

### How to apply this reference to CAPITAL ASCENT

Use repository-resident instructions rather than relying on chat memory alone:

1. Read `AGENTS.md` before substantial development work.
2. Read `docs/DEVELOPMENT_ROADMAP.md` before planning or implementing a feature.
3. Verify current `main`, runtime-loaded files, current tests and deployment state before trusting old handoff text.
4. Convert important development rules into executable tests where practical.
5. Require tests/verification for substantive changes instead of accepting code generation as completion.
6. Keep standing instructions short and stable; put detailed product planning in the roadmap rather than continuously expanding agent prompts.
7. Distinguish confirmed repository facts from hypotheses and proposed designs.

### Important limitation

Do not invent the article's unverified details. If a future task depends on the article's exact five settings or exact wording, retrieve the original/archived article again before citing or implementing those specifics.

## 3. Human/AI division of responsibility

For this project:

- Human/project owner decides what game should be, what is fun, and major product priorities.
- ChatGPT acts as architect/reviewer: verify repository state, define implementation constraints, review changes and maintain the roadmap.
- Coding agents implement, test, fix and produce isolated changes.
- Automated tests should enforce deterministic simulation, accounting constraints, save compatibility and browser behavior wherever possible.

The implementation agent is not the source of truth for game design. The repository, explicit design decisions, tests and observed behavior are.
