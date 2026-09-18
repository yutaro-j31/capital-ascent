# CAPITAL ASCENT

**Release baseline: v1.0.0 / Phase 0–12 product-complete**

日本を舞台に、小さな事業の創業から企業成長、IPO・M&A、公開市場投資、PEファンド運営、資本配分までを週次で進めるブラウザ経営シミュレーションです。

## ゲームの進行

プレイヤーの役割は会社の成長に合わせて変化します。

`Owner Operator → Store / Area Management → CEO → Exited Founder → Capital Allocator → Institutional GP`

基本ループは次の通りです。

`Observe → Decide → Advance Time → Simulate → Explain → Decide Again`

ホームの Progression Journey では、黒字化、企業価値、Exit、Fund I、LBO、PE Exit、Fund II までの現在地と次の解禁条件を確認できます。

## 主なゲームシステム

### 事業運営
- 5事業: ramen / conveni / gym / productVentures / realEstateAgency
- 週次の売上・費用・利益
- 価格、広告、品質、ブランド、効率、DX
- 複数店舗とCity Map
- 競合企業の戦略記憶と四半期反応
- 外部イベントと事前準備による影響差
- Renovation / Capacity / Automation / Product Development の遅延CAPEX
- Manager品質、Autonomy、Review cadence、委任policy
- Executive Management Brief と4週outlook

### Corporate Finance / M&A
- 会社現金と個人現金の分離
- 銀行借入・返済
- IPO / 会社売却
- 実体を持つ子会社M&A
- Post-Merger Integration
- 子会社Divestiture
- 特別配当・自社株買い
- Capital Allocation Office

### PE Fund
- Founder Exit後にPE解禁
- Fund commitments / GP commitment / LP commitment
- Capital Call / Paid-in / Uncalled
- Management Fee / GP Management Company
- DD / Quality / Risk / leverage / entry multiple
- Portfolio Construction / Investment Committee
- Value Creation initiatives
- EBITDA成長 / downside / debt paydown
- Exit / preferred return / carry
- NAV / DPI / TVPI / deployment
- LP Trust
- Fund I → Fund II → successor funds

### 個人資産・Legacy
- Microcap公開市場投資
- Exit Record
- Founder個人純資産
- Foundation
- Career titles / endings
- Save export / import

## セーブ

ブラウザの `localStorage` を使用します。

- public save key: `capital_ascent_v1`
- public version: `1`
- internal schema: V2
- rolling backup: 2世代
- V1-compatible save migration
- JSON export / import
- corrupted-primary recovery

会社資金、個人資金、PEファンド資金は別バケットとして管理されます。

## 起動

静的ファイルだけで構成されています。ローカルでは `index.html` を配信するか、GitHub Pagesからプレイできます。

## Verification

Node 22を使用します。

```bash
npm test
npm run balance
npm run cohort
npm run release:audit
npm run test:mobile
```

CIでは以下をrelease gateとして確認します。

- simulation / accounting invariants
- 10-year deterministic replay
- 100-year / 5,200-week finite-state simulation
- save size < 5 MB
- strategy balance
- 10 / 30 / 100-year progression cohort
- clean-start → IPO → PE → Fund I → LBO → Exit → Fund II end-to-end
- Save V1 / V2 compatibility and backup recovery
- company / personal / PE-fund accounting isolation
- iPhone WebKit major-route smoke
- GitHub Pages deployment
- published Pages iPhone WebKit smoke

## アーキテクチャ

ゲームは依存ライブラリなしのブラウザJavaScriptで構成し、ロード順にsimulationとUI layerを積み上げています。

- `01-core.js` ～ `04-finance.js` — core economics / operations / markets / finance
- `05-ui-core.js` ～ `08-city-world.js` — primary UI / City
- `10-foundation.js` ～ `15-balance-calibration.js` — save reliability / simulation depth / balance
- `16-phase9-management.js` — management depth
- `17-phase10-capital-allocator.js` — fund economics / PMI / capital allocation
- `18-phase11-product-completion.js` — progression clarity / mobile decision UX
- `tools/release-candidate-audit.cjs` — Phase 12 release audit

開発上のsource of truthは `AGENTS.md` と `docs/DEVELOPMENT_ROADMAP.md` です。

このリポジトリは `capitalism-tycoon-web` とは独立しています。
