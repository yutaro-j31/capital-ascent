import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'mobile.spec.mjs',
  timeout:30000,
  retries:1,
  use:{
    baseURL:'http://127.0.0.1:4173',
    viewport:{width:393,height:852},
    deviceScaleFactor:3,
    hasTouch:true
  },
  projects:[{name:'webkit',use:{browserName:'webkit'}}],
  webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:20000}
});
