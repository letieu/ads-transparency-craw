import { PlaywrightCrawler } from 'crawlee';
import { router } from './router.js';
import { addLangToQuery, setViewport } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';
import express from 'express';
import bodyParser from 'body-parser';

const crawler = new PlaywrightCrawler({
  keepAlive: true,
  requestHandler: router,
  maxRequestsPerCrawl: 100, // just for clean up, it will restart after 100 requests
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
// crawler.run(['https://adstransparency.google.com/?region=VN&format=VIDEO&domain=tiki.vn']);
// crawler.run(['https://adstransparency.google.com/?region=VN&format=IMAGE&domain=tiki.vn']);

// await crawler.run([{
//   url: 'https://adstransparency.google.com/advertiser/AR04357315858767282177/creative/CR03594951570225102849?authuser=0&region=VN&format=IMAGE',
//   // url: 'https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR02535221372653666305?region=VN',
//   label: HandlerLabel.ADS_DETAIL,
// }]);

// create an endpoint to start the crawl
const server = express();
server.use(bodyParser.json())

server.post('/crawl', async (req, res) => {
  try {
    const { region, format, domain } = req.body;

    if (!region || !format || !domain) {
      res.status(400).send('Missing required params');
      return;
    }

    if (['IMAGE', 'VIDEO', 'TEXT'].indexOf(format) === -1) {
      res.status(400).send('Invalid format');
      return;
    }

    const url = `https://adstransparency.google.com/?region=${region}&format=${format}&domain=${domain}`;

    // if not running, start the crawler
    console.log('Crawler is running: ', crawler.running);
    if (!crawler.running) {
      crawler.run([url]);
    } else {
      crawler.addRequests([url]);
    }

    res.send('Crawling started with url: ' + url);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

server.get('/stats', (_, res) => {
  res.json(crawler.stats);
});

server.listen(3000);
console.log('Server is listening on port 3000');

process.on('SIGINT', function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(0);
});
