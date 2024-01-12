import { DB } from "./database.js";
import "dotenv/config";

const cronicleHost = process.env.CRONICLE_HOST;
const cronicleApiKey = process.env.CRONICLE_API_KEY;
const crawlEventId = process.env.CRONICLE_CRAWL_EVENT_ID;
const crawlDomainEventId = process.env.CRONICLE_CRAWL_DOMAIN_EVENT_ID;
const crawlSearchEventId = process.env.CRONICLE_CRAWL_SEARCH_EVENT_ID;
const selfHost = process.env.SELF_HOST;
const supportFormats = process.env.SUPPORT_FORMATS?.split(',') || ['TEXT', 'IMAGE', 'VIDEO'];

if (!cronicleHost) {
  throw new Error('Missing CRONICLE_HOST env');
}
if (!cronicleApiKey) {
  throw new Error('Missing CRONICLE_API_KEY env');
}
if (!crawlEventId) {
  throw new Error('Missing CRONICLE_CRAWL_EVENT_ID env');
}
if (!selfHost) {
  throw new Error('Missing SELF_HOST env');
}

type CrawlDomainJobPayload = {
  domain: string;
  format: string;
  webhook?: string;
  webhookMethod?: string;
};

type CrawlSearchPayload = {
  term: string;
  format: string;
  webhook?: string;
  webhookMethod?: string;
};

export async function getCrawlDomainJobPayloads(domainUrls: string[]) {
  const jobs = [];

  for (const url of domainUrls) {
    for (const format of supportFormats) {
      jobs.push({
        domain: url,
        format,
      });
    }
  }

  return jobs;
}

export async function createJob(eventId: string, payload: CrawlDomainJobPayload | CrawlSearchPayload) {
  const url = `${cronicleHost}/api/app/run_event/v1?api_key=${cronicleApiKey}`;

  const jobName = (payload as CrawlDomainJobPayload).domain || (payload as CrawlSearchPayload).term;

  const body = {
    id: eventId,
    name: jobName,
    params: {
      "method": "POST",
      "url": `${selfHost}/crawl`,
      "headers": "Content-Type: application/json",
      "data": JSON.stringify(payload),
      "timeout": "1800", // 18 minutes
      "follow": 0,
      "ssl_cert_bypass": 0,
      "success_match": "",
      "error_match": ""
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    console.error(await res.text());
    throw new Error('Failed to run job')
  }

  const data = await res.json();

  if (data.code !== 0) {
    console.error(data);
    throw new Error('Failed to run job with code: ' + data.code);
  }

  return data;
}

export async function createJobsForSavedDomains() {
  const domains = await DB.getAllActiveDomains();
  const urls = domains.map((domain) => domain.domain);
  const payloads = await getCrawlDomainJobPayloads(urls);

  const res = [];

  for await (const payload of payloads) {
    const detail = await createJob(crawlEventId as string, payload);
    res.push(detail);
  }

  return res;
}

export async function createJobsForDomain(domainUrl: string, webhook?: string, webhookMethod?: string) {
  const payloads = await getCrawlDomainJobPayloads([domainUrl]);

  const res = [];

  for await (const payload of payloads) {
    const detail = await createJob(crawlDomainEventId as string, {
      ...payload,
      webhook,
      webhookMethod,
    });
    res.push(detail);
  }

  return res;
}

export async function createJobsForSearch(term: string, webhook?: string, webhookMethod?: string) {
  const res = [];

  for await (const format of supportFormats) {
    const detail = await createJob(crawlSearchEventId as string, {
      format,
      term,
      webhook,
      webhookMethod,
    });
    res.push(detail);
  }

  return res;
}
