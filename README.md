# CAPITAL ASCENT

日本を舞台に、起業から企業成長、IPO・M&A、公開市場投資、PEファンド運営までを週次で進めるスタンドアロンのブラウザ経営シミュレーションです。

## 起動

`index.html` をブラウザで開くだけでプレイできます。静的ファイルだけで構成されているため、GitHub Pagesなどでも配信できます。

## 主なゲームシステム

- 5本柱: ramen / conveni / gym / productVentures / realEstateAgency
- 週次進行、景気・金利・インフレ・不動産サイクル
- 会社現金 / 個人現金 / PEファンド資金の分離
- 複数店舗、新規事業、価格、広告、品質、ブランド、効率、DX投資
- gym会員ストック、不動産仲介案件パイプライン、ITファネル、コンビニPB/調達、ramenカニバリ
- 銀行借入・返済、M&Aによる子会社取得・売却
- IPO / 会社売却 / Exit記録 / PEモード解禁
- Fund I組成、GP出資、DD、LBO取得、価値向上、Exit、DPI
- Microcap: 8〜18週ごとの小型株上場、4アーキタイプ、売買時の価格インパクト
- 6種類のエンディング称号
- 決定論的ハッシュベースの市場ノイズ

## セーブ

ブラウザの `localStorage` を使用します。専用キーは `capital_ascent_v1` です。

## 構成

- `index.html` — エントリポイント
- `styles.css` — UI
- `01-core.js` ～ `06-ui-extra.js` — ゲームロジック

このリポジトリは既存の `capitalism-tycoon-web` とは独立しています。
