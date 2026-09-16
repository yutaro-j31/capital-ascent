'use strict';
const SAVE_KEY = 'capital_ascent_v1';
const VERSION = 1;
const PILLARS = {
  ramen:{name:'ラーメン',icon:'🍜',price:920,unitCost:300,storeCost:1700000,fixed:67500,wage:52500,baseDemand:500,desc:'価格・品質・話題性・同一県カニバリを読む店舗型ビジネス。'},
  conveni:{name:'コンビニ',icon:'🏪',price:540,unitCost:335,storeCost:4300000,fixed:97500,wage:48750,baseDemand:625,desc:'品揃え・廃棄・PB比率・ドミナント出店のバランス。'},
  gym:{name:'ジム',icon:'🏋️',price:7800,unitCost:0,storeCost:14000000,fixed:230000,wage:120000,baseDemand:130,desc:'会員ストック型。入会・退会・混雑・プラン戦略を管理。'},
  realEstateAgency:{name:'不動産仲介',icon:'🏢',price:85000,unitCost:18000,storeCost:4800000,fixed:135000,wage:115000,baseDemand:34,desc:'案件パイプライン型。成約週に大きく稼ぐlumpyな収益。'},
  productVentures:{name:'IT企業',icon:'💻',price:980,unitCost:120,storeCost:0,fixed:180000,wage:220000,baseDemand:0,desc:'非店舗型。認知→登録→MAU→有料化のプロダクトファネル。'}
};
const REGIONS=['東京','神奈川','千葉','埼玉','大阪','愛知','福岡','北海道'];
const MICROCAPS = [
  {id:'speculative',p:.55,trend:-.003,vol:.08,per:0,label:'赤字'},
  {id:'steady',p:.28,trend:.0015,vol:.08,per:14,label:'黒字'},
  {id:'quality',p:.12,trend:.006,vol:.13,per:9,label:'黒字'},
  {id:'breakout',p:.05,trend:.011,vol:.18,per:7,label:'黒字'}
];
const ENDINGS=[
  ['listed_founder','上場企業創業者',s=>s.company.public],
  ['conglomerate','コングロマリット王',s=>s.company.subsidiaries>=5],
  ['global_tycoon','世界的タイクーン',s=>companyValue(s)>=1e12],
  ['capital_king','資本の王',s=>personalNetWorth(s)>=1e12],
  ['philanthropist','社会的レガシー',s=>s.legacy.foundationRating>=80&&s.legacy.foundationFund>=1e9],
  ['serial_founder','連続起業家',s=>s.career.exitRecords.length>=2&&s.career.companySerial>=3]
];
let state=null, tab='overview', selectedFounding='ramen';
const app=document.getElementById('app');

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function hash32(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function u01(key){return hash32(key)/4294967295;}
function noise(key,amp=1){return (u01(key)*2-1)*amp;}
function yen(n){const a=Math.abs(n); if(a>=1e12)return `${(n/1e12).toFixed(2)}兆`; if(a>=1e8)return `${(n/1e8).toFixed(2)}億`; if(a>=1e4)return `${Math.round(n/1e4).toLocaleString()}万`; return `¥${Math.round(n).toLocaleString()}`;}
function pct(n,d=1){return `${(n*100).toFixed(d)}%`;}
function uid(prefix,key){return `${prefix}_${hash32(key).toString(36)}`;}
function log(msg,type=''){state.news.unshift({week:state.week,msg,type});state.news=state.news.slice(0,30);}
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
function load(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(x&&x.version===VERSION)return x;}catch(e){}return null;}
function freshState(name='ASCENT HOLDINGS',pillar='ramen',region='東京'){
  const s={version:VERSION,seed:hash32(`${name}|${pillar}|${region}`),week:1,year:1,season:1,macro:{cycle:0,rate:.012,inflation:.02,realEstate:0},
    player:{name},company:{cash:8000000,debt:0,credit:60,reputation:12,public:false,founderOwnership:1,shares:10000,subsidiaries:0,businesses:{},stores:[],lastWeekRevenue:0,lastWeekProfit:0,cumulativeProfit:0},
    personal:{cash:2000000,debt:0,stocks:{}},career:{companySerial:1,exitRecords:[],titles:[]},pe:{unlocked:false,funds:[],deals:[],portfolio:[],trackScore:0,lpTrust:50,nextFundNo:1,network:0},
    market:{listings:[],nextMicrocapWeek:10+Math.floor(u01(`mc:${name}`)*9)},legacy:{foundationRating:0,foundationFund:0},news:[],settings:{speed:1},
    ui:{foundingPillar:pillar,region},gameOver:false};
  s.company.businesses[pillar]=baseBusiness(pillar);
  if(pillar==='productVentures'){
    s.company.businesses[pillar].product={stage:'released',awareness:1200,registrations:220,mau:100,paid:18,techDebt:6,serverCapacity:800};
    s.company.cash-=1800000;
  }else openInitialStore(s,pillar,region);
  s.news.push({week:1,msg:`${name} を創業。${PILLARS[pillar].name}事業から開始した。`,type:'major'});
  return s;
}
function baseBusiness(id){const p=PILLARS[id];return {id,quality:50,brand:45,efficiency:35,digital:20,price:p.price,adSpend:0,focus:'balanced',pbRatio:0,gymStrategy:'standard',menuBuzz:50,rnd:0};}
function openInitialStore(s,id,region){const p=PILLARS[id];const traffic=.9+u01(`traffic:${s.seed}:${id}`)*.35;const rent=Math.round(p.fixed*(.65+.45*u01(`rent:${s.seed}:${id}`)));const deposit=rent*6;let needed=p.storeCost+deposit;
  if(id==='gym'&&s.company.cash<needed+2000000){const loan=Math.min(12000000,needed+2000000-s.company.cash);s.company.debt+=loan;s.company.cash+=loan;}
  s.company.cash-=needed;
  s.company.stores.push({id:uid('store',`${s.seed}:${id}:1`),businessID:id,region,name:`${region}1号店`,traffic,rent,deposit,priceOverride:null,operatingHours:12,members:id==='gym'?55:0,capacity:id==='gym'?380:0,pipeline:id==='realEstateAgency'?[]:null,lastRevenue:0,lastProfit:0,lastUnits:0});
}
function companyValue(s){const base=Math.max(0,s.company.lastWeekProfit*52*8)+Math.max(0,s.company.cumulativeProfit*1.2)+s.company.cash-s.company.debt;const brand=1+Object.values(s.company.businesses).reduce((a,b)=>a+b.brand,0)/2500;return Math.max(10000000,base*brand);}
function personalNetWorth(s){let stocks=0;for(const [id,pos] of Object.entries(s.personal.stocks)){const l=state.market.listings.find(x=>x.id===id);if(l)stocks+=pos.qty*l.price;}return s.personal.cash-s.personal.debt+stocks+s.legacy.foundationFund;}
function macroStep(s){s.macro.cycle=.6*Math.sin(s.week/38)+.25*Math.sin(s.week/101);s.macro.rate=clamp(.012+s.macro.cycle*.004+noise(`rate:${s.seed}:${s.week}`,.0015),.001,.045);s.macro.inflation=clamp(.02+noise(`infl:${s.seed}:${Math.floor(s.week/13)}`,.008),-.005,.06);s.macro.realEstate=.8*Math.sin(s.week/53);}
