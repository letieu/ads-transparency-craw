import { Configuration, PlaywrightCrawler, PlaywrightCrawlerOptions } from 'crawlee';
import { HandlerLabel, router } from './router.js';
import { addLangToQuery, setViewport } from './hook.js';
import { playwrightLaunchOptions } from './launch-option.js';
import { MemoryStorage } from '@crawlee/memory-storage'
import fs from 'fs';
import "dotenv/config";

const options: PlaywrightCrawlerOptions = {
  requestHandler: router,
  maxRequestsPerCrawl: 50,
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

export async function crawlUrl(url: string, label?: HandlerLabel, overwriteOptions?: Partial<PlaywrightCrawlerOptions>) {
  const localDataDirectory = `./storage/${Date.now()}`;

  const storageClient = new MemoryStorage({
    localDataDirectory: localDataDirectory,
  });

  const config: Configuration = new Configuration({
    storageClient,
  });

  const crawler = new PlaywrightCrawler({
    ...options,
    ...overwriteOptions,
  }, config);

  let crawlError: unknown;

  try {
    if (label) {
      await crawler.run([{
        url,
        label,
      }]);
    } else {
      await crawler.run([url]);
    }
  } catch (error) {
    console.error(error);
    crawlError = error;
  } finally {
    await crawler.teardown();
    await storageClient.purge();
    fs.rmSync(localDataDirectory, { recursive: true });
  }

  return {
    stats: crawler.stats,
    error: crawlError,
  }
}
