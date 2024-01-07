import { Configuration, PlaywrightCrawler, PlaywrightCrawlerOptions } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery, setViewport } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';
import express from 'express';
import bodyParser from 'body-parser';
import { MemoryStorage } from '@crawlee/memory-storage'
import fs from 'fs';
import { submitJobs } from './job-producer.js';
import "dotenv/config";

const options: PlaywrightCrawlerOptions = {
  requestHandler: router,
  maxRequestsPerCrawl: 30,
  maxRequestRetries: 3,
  maxRequestsPerMinute: 10,
  headless: process.env.HEADLESS === 'true',
  launchContext: {
    launchOptions: playwrightLaunchOptions,
  },
  preNavigationHooks: [
    addLangToQuery,
    setViewport,
  ],
}

// ----
// const crawler = new PlaywrightCrawler(options);
// await crawler.run([{
//   label: HandlerLabel.ADS_DETAIL,
//   url: "https://adstransparency.google.com/advertiser/AR04084632027276509185/creative/CR01769191621582127105?region=anywhere&format=IMAGE&hl=en&domain=shopee.vn"
// }]);
// process.exit(0);
// -----

const server = express();
server.use(bodyParser.json())

server.post('/crawl', async (req, res) => {
  try {
    const { format, domain } = req.body;
    const region = 'anywhere'

    console.log('Crawling', region, format, domain);

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
    console.error(error);
    res.status(500).send(error);
  }
});

server.post('/create-crawl-jobs', async (_, res) => {
  try {
    const detail = await submitJobs();
    console.log(`Created ${detail.length} jobs`)
    res.status(200).json(detail);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

server.get('/health', async (_, res) => {
  res.status(200).send('OK');
});

server.listen(3000);

process.on('SIGINT', function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(0);
});

console.log('Server is listening on port 3000');
