import { PlaywrightCrawler } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery, setViewport } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  maxRequestsPerCrawl: 3,
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
  url: 'https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR03481908580750196737?region=VN&format=TEXT',
  label: HandlerLabel.ADS_DETAIL,
}]);
