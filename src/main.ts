import { PlaywrightCrawler } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery, setViewport } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  maxRequestsPerCrawl: 10,
  maxRequestRetries: 3,
  maxRequestsPerMinute: 5,
  headless: false,
  launchContext: {
    launchOptions: playwrightLaunchOptions,
  },
  preNavigationHooks: [
    addLangToQuery,
    setViewport,
  ],
});

// Add first URL to the queue and start the crawl.
// await crawler.run(['https://adstransparency.google.com/?region=VN&format=VIDEO&domain=tiki.vn']);

await crawler.run([{
  url: 'https://adstransparency.google.com/advertiser/AR04357315858767282177/creative/CR03594951570225102849?authuser=0&region=VN&format=IMAGE',
  // url: 'https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR02535221372653666305?region=VN',
  label: HandlerLabel.ADS_DETAIL,
}]);
