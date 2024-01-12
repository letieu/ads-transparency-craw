import express from 'express';
import bodyParser from 'body-parser';
import { createJobsForDomain, createJobsForSavedDomains, createJobsForSearch } from './job-producer.js';
import "dotenv/config";
import { crawlUrl } from './crawler.js';
import { sendWebhook } from './webhooks.js';
import { HandlerLabel } from './router.js';

const server = express();
server.use(bodyParser.json())

// crawl domain
server.post('/crawl', async (req, res) => {
  try {
    const { format, domain, webhook, webhookMethod } = req.body;
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
    if (webhook) {
      await sendWebhook(webhook, { domain, format, stats }, webhookMethod);
    }
    res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

// crawl adv
server.post('/crawl-adv', async (req, res) => {
  try {
    const { format, term, webhook, webhookMethod } = req.body;
    const region = 'anywhere'

    console.log('Crawling by search', region, format, term);

    if (!region || !format || !term) {
      res.status(400).send('Missing required params');
      return;
    }

    if (['IMAGE', 'VIDEO', 'TEXT'].indexOf(format) === -1) {
      res.status(400).send('Invalid format');
      return;
    }

    const url = `https://adstransparency.google.com/?region=${region}&format=${format}&term=${term}`;

    const stats = await crawlUrl(url, HandlerLabel.SEARCH_PAGE);
    if (webhook) {
      await sendWebhook(webhook, {
        name: term,
        format,
        stats,
      }, webhookMethod);
    }
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

server.post('/create-crawl-jobs/domain', async (req, res) => {
  console.log('create-crawl-jobs/domain')
  const { domain, webhook, webhookMethod } = req.body;
  if (!domain) {
    res.status(400).send('Missing domain');
    return;
  }

  try {
    const detail = await createJobsForDomain(domain, webhook, webhookMethod);
    console.log(`Created ${detail.length} jobs for ${domain}`)
    res.status(200).json(detail);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

server.post('/create-crawl-jobs/advertiser', async (req, res) => {
  console.log('create-crawl-jobs/search')
  const { name, webhook, webhookMethod } = req.body;
  if (!name) {
    res.status(400).send('Missing name');
    return;
  }

  try {
    const detail = await createJobsForSearch(name, webhook, webhookMethod);
    console.log(`Created ${detail.length} jobs for ${name}`)
    res.status(200).json(detail);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});

server.post('/create-crawl-jobs', async (_, res) => {
  console.log('create-crawl-jobs')
  try {
    const detail = await createJobsForSavedDomains();
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
