'use strict';

// Phase 7 calibration: weekly advertising is a company-level budget, so delegated
// policies must remain viable at the first (3-store) management unlock.
if(typeof POLICY_PRESETS!=='undefined'){
  POLICY_PRESETS.premium.adSpend=120000;
  POLICY_PRESETS.growth.adSpend=200000;
  POLICY_PRESETS.margin.adSpend=40000;
  POLICY_PRESETS.share.adSpend=300000;
  POLICY_PRESETS.cash.adSpend=0;
}
