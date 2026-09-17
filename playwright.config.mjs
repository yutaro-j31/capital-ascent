import {defineConfig} from '@playwright/test';

const external=process.env.PLAYWRIGHT_BASE_URL;
const publishedBaseURL=external?`${external.replace(/\/+$/,'')}/`:null;
const localBaseURL='http://127.0.0.1:4173/';

export default defineConfig({
  testDir:'./tests',
  testMatch:'mobile.spec.mjs',
  timeout:30000,
  retries:1,
  use:{
    baseURL:publishedBaseURL||localBaseURL,
    viewport:{width:393,height:852},
    deviceScaleFactor:3,
    hasTouch:true
  },
  projects:[{name:'webkit',use:{browserName:'webkit'}}],
  webServer:publishedBaseURL?undefined:{
    command:'python3 -m http.server 4173 --bind 127.0.0.1',
    url:localBaseURL,
    reuseExistingServer:true,
    timeout:20000
  }
});
