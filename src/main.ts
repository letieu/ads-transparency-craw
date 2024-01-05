import { PlaywrightCrawler } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  maxRequestsPerCrawl: 10,
  headless: false,
  launchContext: {
    launchOptions: playwrightLaunchOptions,
  },
  preNavigationHooks: [
    addLangToQuery
  ],
});

// Add first URL to the queue and start the crawl.
// await crawler.run(['https://adstransparency.google.com/?region=anywhere']);
await crawler.run([{
  // url: 'https://adstransparency.google.com/advertiser/AR04357315858767282177/creative/CR03529297531907342337?region=VN',
  url: 'https://adstransparency.google.com/advertiser/AR04357315858767282177/creative/CR17896343293172645889?region=VN&format=VIDEO',
  // url: "https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR09760256314793000961?region=VN", // image with click able
  label: HandlerLabel.ADS_DETAIL,
}]);
