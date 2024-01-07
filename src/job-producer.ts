import { DB } from "./database";
import "dotenv/config";

const cronicleHost = process.env.CRONICLE_HOST;
const cronicleApiKey = process.env.CRONICLE_API_KEY;
const crawlEventId = process.env.CRONICLE_CRAWL_EVENT_ID;
const selfHost = process.env.SELF_HOST;

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

type JobPayload = {
  domain: string;
  format: string;
};

export async function getCrawlJobPayloads() {
  const domains = await DB.getAllActiveDomains();
  const formats = ['TEXT', 'IMAGE', 'VIDEO'];

  const jobs = [];

  for (const domain of domains) {
    for (const format of formats) {
      jobs.push({
        domain: domain.domain,
        format,
      });
    }
  }

  return jobs;
}

export async function createJob(eventId: string, payload: JobPayload) {
  const url = `${cronicleHost}/api/app/run_event/v1?api_key=${cronicleApiKey}`;

  const body = {
    id: eventId,
    name: `${payload.domain}_${payload.format}`,
    params: {
      "method": "POST",
      "url": `${selfHost}/crawl`,
      "headers": "Content-Type: application/json",
      "data": JSON.stringify(payload),
      "timeout": "600", // 10 minutes
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

export async function submitJobs() {
  const payloads = await getCrawlJobPayloads()

  const res = [];

  for await (const payload of payloads) {
    const detail = await createJob(crawlEventId as string, payload);
    res.push(detail);
  }

  return res;
}
