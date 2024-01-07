import { Configuration, PlaywrightCrawler, PlaywrightCrawlerOptions, purgeDefaultStorages } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery, setViewport } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';
import express from 'express';
import bodyParser from 'body-parser';
import { MemoryStorage } from '@crawlee/memory-storage'
import fs from 'fs';

const options: PlaywrightCrawlerOptions = {
  requestHandler: router,
  maxRequestsPerCrawl: 30,
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
}

// Test
// const crawler = new PlaywrightCrawler(options);
// await crawler.run([{
//   url: 'https://adstransparency.google.com/advertiser/AR04357315858767282177/creative/CR00791531170931146753?region=VN&format=VIDEO',
//   label: HandlerLabel.ADS_DETAIL,
// }]);
// process.exit(0);
//
// Test

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

    const localDataDirectory = `./storage/${region}-${format}-${domain}-${Date.now()}`;

    const storageClient = new MemoryStorage({
      localDataDirectory: localDataDirectory,
    });
    const config: Configuration = new Configuration({
      storageClient,
    });

    const crawler = new PlaywrightCrawler(options, config);
    await crawler.run([url]);

    // remove storage after crawl
    await storageClient.purge();
    // remove folder after purge
    fs.rmSync(localDataDirectory, { recursive: true });

    res.status(200).json(crawler.stats);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

server.listen(3000);

process.on('SIGINT', function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(0);
});

console.log('Server is listening on port 3000');
