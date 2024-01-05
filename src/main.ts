import { PlaywrightCrawler } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  maxRequestsPerCrawl: 3,
  headless: false,
  launchContext: {
    launchOptions: playwrightLaunchOptions,
  },
  preNavigationHooks: [
    addLangToQuery
  ],
});

// Add first URL to the queue and start the crawl.
// await crawler.run(['https://adstransparency.google.com/?region=VN&format=VIDEO&domain=tiki.vn']);

await crawler.run([{
  url: 'https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR11490653420935708673?region=VN&format=VIDEO&hl=en',
  label: HandlerLabel.ADS_DETAIL,
}]);
