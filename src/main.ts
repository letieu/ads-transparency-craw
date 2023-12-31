import { PlaywrightCrawler } from 'crawlee';
import { router } from './router';

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  maxRequestsPerCrawl: 3,
  headless: false,
});

// Add first URL to the queue and start the crawl.
await crawler.run(['https://adstransparency.google.com/?region=anywhere']);
