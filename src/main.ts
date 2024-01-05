import { PlaywrightCrawler } from 'crawlee';
import { HandlerLabel, router } from './router';
import { addLangToQuery } from './hook';
import { playwrightLaunchOptions } from './launch-option';

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
  // url: 'https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR09760256314793000961?region=VN&format=IMAGE',
  // url: 'https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR07395426980650287105?region=VN&format=IMAGE',
  // url: "https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR00398328220652404737?region=VN&", // Text
  // url: "https://adstransparency.google.com/advertiser/AR04357315858767282177/creative/CR17445490749226352641?region=VN", // video
  url: "https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR09760256314793000961?region=VN", // image with click able
  label: HandlerLabel.ADS_DETAIL,
}]);
