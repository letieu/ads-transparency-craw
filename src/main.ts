import express from 'express';
import bodyParser from 'body-parser';
import { submitJobs } from './job-producer.js';
import "dotenv/config";
import { crawlUrl } from './crawler.js';

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

    const stats = await crawlUrl(url);
    res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// For test
server.post('/crawl-url', async (req, res) => {
  try {
    const url = req.body.url;
    const label = req.body.label

    if (!url) {
      res.status(400).send('Missing required params');
      return;
    }

    const stats = await crawlUrl(url, label, {
      maxRequestsPerCrawl: 3,
    });

    res.status(200).json(stats);
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
