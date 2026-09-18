'use strict';

// Final presentation layer: Japanese-first UI labels.
// This file changes display text only; gameplay state, accounting and simulation remain untouched.
const _jaOverview=overview,_jaOperations=operations,_jaMarket=market,_jaPeView=peView,_jaLegacy=legacy;
const _jaTopbar=topbar,_jaNav=nav;
const _jaCityEntitySheet=typeof cityEntitySheet==='function'?cityEntitySheet:null;

const JA_UI_PAIRS=[
  ['CEO Command Center','CEO経営司令室'],
  ['BUILD · ACQUIRE · OPERATE · ALLOCATE','創業・買収・経営・資本配分'],
  ['ENTERPRISE VALUE','企業価値'],
  ['Weekly Profit','週次利益'],
  ['PERFORMANCE','業績'],
  ['Executive Metrics','経営指標'],
  ['Enterprise Value','企業価値'],
  ['Company Cash','会社現金'],
  ['Debt Capacity','借入余力'],
  ['Debt Outstanding','有利子負債'],
  ['Debt','負債'],
  ['ROIC','ROIC（投下資本利益率）'],
  ['ACTION REQUIRED','要対応'],
  ['CEO Inbox','CEO受信箱'],
  ['PRIORITY','件重要'],
  ['BRIEF','経営報告'],
  ['COMPETITION','競合'],
  ['P&L','損益'],
  ['MACRO','外部環境'],
  ['CAPITAL','資本政策'],
  ['DEAL','案件'],
  ['FUND','ファンド'],
  ['STABLE','安定'],
  ['Management Brief','経営報告'],
  ['Deal Book','案件一覧'],
  ['deployable capital','投資可能資金'],
  ['Deployment','投資進捗'],
  ['OPERATING PORTFOLIO','事業ポートフォリオ'],
  ['Business Units','事業部門'],
  ['UNITS','部門'],
  ['locations','拠点'],
  ['weekly profit','週次利益'],
  ['manual','手動'],
  ['13W','13週'],
  ['Quarter Advance','四半期進行'],
  ['OPS','事業'],
  ['Operations','事業運営'],
  ['Capital','資本政策'],
  ['Deal Office','案件室'],
  ['Organic CAPEX · 52W','成長投資・直近52週'],
  ['M&A + PMI · 52W','M&A・統合費用・直近52週'],
  ['Shareholder Return · LTD','株主還元・累計'],
  ['Cash Reserve','現金余力'],
  ['CAPITAL OFFICE','資本政策'],
  ['Capital Allocation Office','資本配分室'],
  ['Capital Allocation','資本配分'],
  ['ACTUAL','実績'],
  ['Balance Sheet','貸借対照表'],
  ['Open Capital Allocation Office','資本配分画面を開く'],
  ['BOARD CALENDAR','経営カレンダー'],
  ['This Quarter','今四半期'],
  ['BOARD','取締役会'],
  ['Quarter Close / Operating Review','四半期締め・経営レビュー'],
  ['Subsidiary','子会社'],
  ['integration milestone','統合マイルストーン'],
  ['Synergy / margin / management quality','シナジー / 利益率 / 経営品質'],
  ['Investment Period End','投資期間終了'],
  ['Fund Term End','ファンド期間終了'],
  ['reserve','準備資金'],
  ['distributions','分配'],
  ['NOW','現在'],
  ['NEXT SUMMIT','次の到達点'],
  ['Operate the business. Allocate the capital. Compound the advantage.','事業を経営し、資本を配分し、優位性を積み上げる。'],
  ['Career & Legacy','キャリアと実績'],
  ['BOARD PAPERS','経営会議資料'],
  ['Operating Review','経営レビュー'],
  ['CEO OFFICE','CEO室'],
  ['Overview','概要'],
  ['Market','市場'],
  ['Legacy','実績'],
  ['Owner Operator','創業経営者'],
  ['Exited Founder','Exit後の創業者'],
  ['Capital Allocator','資本配分責任者'],
  ['Institutional GP','機関投資家型GP'],
  ['FIRST-RUN GUIDE','初回ガイド'],
  ['Founder Launch Guide','創業者ガイド'],
  ['FOUND','創業'],
  ['PROFIT','黒字化'],
  ['SCALE','成長'],
  ['REALIZE','回収'],
  ['FOUNDER → CAPITAL ALLOCATOR','創業者 → 資本配分責任者'],
  ['Progression Journey','成長ロードマップ'],
  ['READY','達成'],
  ['LOCKED','未達'],
  ['NEXT DECISION','次の目標'],
  ['JOURNEY COMPLETE','主要ロードマップ完了'],
  ['WHY PE IS LOCKED','PE未解禁の理由'],
  ['PE Unlock Path','PE解禁条件'],
  ['Founder Exit','創業者Exit'],
  ['NEXT FUND GATE','次号ファンド条件'],
  ['DECISION SUPPORT','意思決定支援'],
  ['Capital Constraints','資本制約'],
  ['PUBLIC','上場'],
  ['PRIVATE','非上場'],
  ['LONG-FORM PROGRESS','長期進捗'],
  ['Career Progress','キャリア進捗'],
  ['Journey','進捗'],
  ['Role','現在の役割'],
  ['Exits','Exit回数'],
  ['Highest Fund','最高到達ファンド'],
  ['DECISION SHEET','意思決定'],
  ['Microcap','小型株'],
  ['Ownership','持株比率'],
  ['Public float','流通株比率'],
  ['Founder ownership','創業者持株比率'],
  ['Executive Management Brief','経営報告'],
  ['OPERATING REVIEW','業績レビュー'],
  ['Revenue','売上'],
  ['Operating Margin','営業利益率'],
  ['Cash Runway','資金余力'],
  ['Profitable','黒字'],
  ['Cash','現金'],
  ['Leverage','レバレッジ'],
  ['Performance Bridge','業績変動要因'],
  ['Top Store Movers','変動の大きい店舗'],
  ['4W Revenue Outlook','4週売上見通し'],
  ['Projects completing','完成予定プロジェクト'],
  ['Active events','進行中イベント'],
  ['Decision Queue','要判断事項'],
  ['Management Organization','経営組織'],
  ['Manager','責任者'],
  ['QUALITY','能力'],
  ['Autonomy','裁量'],
  ['Review','レビュー頻度'],
  ['Policy','方針'],
  ['Execution speed','実行速度'],
  ['Budget ceiling','予算上限'],
  ['Tenure','在任期間'],
  ['Capital Program','設備投資計画'],
  ['Project Capacity','同時進行枠'],
  ['CAPEX','設備投資'],
  ['STRATEGY','戦略'],
  ['Player signal','プレイヤー動向'],
  ['Momentum','勢い'],
  ['Project capacity','プロジェクト枠'],
  ['Manual','手動'],
  ['M&A Target','M&A候補'],
  ['Subsidiaries','子会社'],
  ['Underwriting Monitor','投資審査モニター'],
  ['Equity MOIC','自己資本MOIC'],
  ['Save Safety','セーブ保護'],
  ['Projects','プロジェクト'],
  ['active','進行中'],
  ['Phase 10 — Fund Economics','ファンド運営'],
  ['Fund Economics','ファンド収益'],
  ['Commitment','出資約束額'],
  ['Called','払込済'],
  ['Uncalled','未払込'],
  ['Status','状態'],
  ['INVESTING','投資期間'],
  ['HARVESTING','回収期間'],
  ['MATURE','満期'],
  ['NAV','NAV（純資産価値）'],
  ['DPI','DPI（分配倍率）'],
  ['TVPI','TVPI（総価値倍率）'],
  ['Top Sector','最大投資セクター'],
  ['GP Management Company','GP運営会社'],
  ['Management Cash','運営会社現金'],
  ['Track Score','実績スコア'],
  ['Network / LP','ネットワーク / LP'],
  ['Network','ネットワーク'],
  ['LP Trust','LP信頼度'],
  ['Investment Committee / Deal Book','投資委員会 / 案件一覧'],
  ['IC CONSTRAINT','投資委員会制約'],
  ['Acquire','買収'],
  ['Portfolio Construction','ポートフォリオ構築'],
  ['Age','保有期間'],
  ['Quality/Risk','品質/リスク'],
  ['Talent','人材強化'],
  ['Channel','販路拡大'],
  ['Fund I First Close','Fund I 初回募集'],
  ['First Close','初回募集'],
  ['Capital Call','資金払込'],
  ['Post-Merger Integration','買収後統合'],
  ['Synergy Capture','シナジー獲得'],
  ['Turnaround','再建'],
  ['Full Integration','完全統合'],
  ['Stand-alone','独立運営'],
  ['Divest','売却']
];

function jaUiText(html){
  let out=String(html||'');
  for(const pair of JA_UI_PAIRS.slice().sort(function(a,b){return b[0].length-a[0].length;}))out=out.split(pair[0]).join(pair[1]);
  out=out
    .replace(/\b(\d+) business units\b/g,'$1事業')
    .replace(/\b(\d+) locations\b/g,'$1拠点')
    .replace(/\b(\d+) UNITS\b/g,'$1部門')
    .replace(/\b\+(\d+)W\b/g,'+$1週')
    .replace(/\bW(\d+)\b/g,'第$1週')
    .replace(/\bY(\d+)\b/g,'$1年目')
    .replace(/\bQuarter\b/g,'四半期')
    .replace(/\b complete\b/g,' 完了')
    .replace(/\b ends\b/g,' 終了')
    .replace(/\bInvestment Committee\b/g,'投資委員会')
    .replace(/\bfundraising\b/g,'資金募集')
    .replace(/\brealized performance\b/g,'実現リターン')
    .replace(/\bFirst Close\b/g,'初回募集')
    .replace(/\bGP call\b/g,'GP払込')
    .replace(/\bFounder\b/g,'創業者')
    .replace(/\bManagement Brief\b/g,'経営報告');
  return out;
}

overview=function(){return jaUiText(_jaOverview());};
operations=function(){return jaUiText(_jaOperations());};
market=function(){return jaUiText(_jaMarket());};
peView=function(){return jaUiText(_jaPeView());};
legacy=function(){return jaUiText(_jaLegacy());};
topbar=function(){return jaUiText(_jaTopbar());};
nav=function(){return jaUiText(_jaNav());};
if(_jaCityEntitySheet)cityEntitySheet=function(businessID,entity){return jaUiText(_jaCityEntitySheet(businessID,entity));};

if(state)render();
