import { KeyValueStore, createPlaywrightRouter } from 'crawlee';
import { extractCreativesFromApiRespons, extractDate, extractFormat, extractIDs, getVariantFromElement, getVariantFromFrame } from './helper.js';
import { DB } from './database.js';

export enum HandlerLabel {
  ADS_DETAIL = 'ADS_DETAIL',
  ADV_PAGE = 'ADV_PAGE',
  SEARCH_PAGE = 'SEARCH_PAGE',
}

export type Creative = {
  previewImage: string | null;
  id: string;
  link: string;
  format: AdFormat;
  lastShow: Date;
  firstShow?: Date;
  advertiser: Advertiser;
  variants: CreativeVariant[];
  regions: string[];
  domain: string;
}

export type CreativeVariant = {
  iframeUrl: string;
  screenshot: string;
  html: string;
  medias: AdMedia[];
}

export type AdMedia = {
  type: string;
  url: string;
  clickUrl: string;
}

export type Advertiser = {
  id: string;
  name: string;
}

export enum AdFormat {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export const router = createPlaywrightRouter();

// ads detail page
router.addHandler(HandlerLabel.ADS_DETAIL, async ({ page, request, log }) => {
  const { advertiserID, creativeID } = extractIDs(request.url);

  // wait for network idle
  await page.waitForLoadState('networkidle');

  // wait for loading-pulse disappear
  await page.waitForSelector('.loading-pulse', { state: 'detached', timeout: 5000 });

  await page.waitForSelector('.advertiser-name > a', { timeout: 7000 });

  //0. get domain
  const domain = await KeyValueStore.getValue<string>(`${creativeID}.domain`) || '';

  //1. get advertiser name
  const advertiserName = await page.$('.advertiser-name > a').then((el) => el?.textContent()) || '';

  //2. get last shown date
  const lastShowText = await page.$('.properties .property:first-child').then((el) => el?.textContent()) || ''; // Last shown: Jan 3, 2024
  const lastShow = extractDate(lastShowText);

  //3. get format
  const formatText = await page.$('.properties .property:nth-child(2)').then((el) => el?.textContent()) || ''; // Format: Video
  const format = extractFormat(formatText);

  //3. get regions
  if (await page.isVisible('creative-region-filter')) {
    await page.click('creative-region-filter');
  }
  const regionsText = await page.$$('.region-select-dropdown .label').then((els) => Promise.all(els.map((el) => el.textContent()))) || [];

  //4. get variants
  let variants: CreativeVariant[] = [];

  const variantElements = await page.$$('creative.has-variation');

  log.debug(`variant count: ${variantElements.length}`);

  for await (const wrapper of variantElements) {
    // check if this variant is iframe
    const isIframe = !!(await wrapper.$('iframe'));

    let variant: CreativeVariant;

    if (isIframe) {
      variant = await getVariantFromFrame(wrapper, format);
    } else {
      variant = await getVariantFromElement(wrapper);
    }

    if (await page.isVisible('.right-arrow-container')) {
      await page.click('.right-arrow-container');
    }

    variants.push(variant);
  }

  const previewCreativeJson = await KeyValueStore.getValue<string>(`${creativeID}.creative`);
  const previewCreative: Creative = previewCreativeJson ? JSON.parse(previewCreativeJson) : null;

  if (previewCreative) {
    previewCreative.variants = variants;
    previewCreative.regions = regionsText?.map((text) => text?.trim() ?? '') || [];
    if (previewCreative.previewImage) {
      const previewImage = await KeyValueStore.getValue<string>(`${creativeID}.image`);
      previewCreative.previewImage = previewImage;
    }
    await DB.saveCreative(previewCreative);
  } else {
    const creative: Creative = {
      previewImage: await KeyValueStore.getValue<string>(`${creativeID}.image`),
      id: creativeID,
      link: request.url,
      format,
      lastShow,
      advertiser: {
        id: advertiserID,
        name: advertiserName,
      },
      domain: domain,
      variants: variants,
      regions: regionsText?.map((text) => text?.trim() ?? '') || [],
    };

    await DB.saveCreative(creative);
  }
});

// search page
router.addHandler(HandlerLabel.SEARCH_PAGE, async ({ page, crawler, log }) => {
  const urlQuery = new URL(page.url()).searchParams;
  const searchTerm = urlQuery.get('term');
  if (!searchTerm) {
    throw new Error('searchTerm not found');
  }

  await page.getByLabel('Search by advertiser or').click();
  await page.getByLabel('Search by advertiser or').fill(searchTerm);

  const isSearchByDomain = searchTerm.includes('.');

  if (isSearchByDomain) {
    await page.getByRole('option', { name: searchTerm, exact: true }).locator('div').first().click();
  } else {
    await page.getByRole('option', { name: searchTerm }).locator('div').first().click();
  }

  const url = new URL(page.url());
  const path = url.pathname;
  const isAdvPage = path.startsWith('/advertiser/');

  // Save ADV info
  if (isAdvPage) {
    await page.waitForSelector('.advertiser-name', { timeout: 5 * 1000 }); // 5s

    const advertiserID = path?.split('/').pop() || '';
    const advertiserName = await page.$('.advertiser-name').then((el) => el?.textContent()) || '';

    const advertiser: Advertiser = {
      id: advertiserID,
      name: advertiserName,
    };

    await DB.insertAdvertiser(advertiser);
  }

  const firstResponse = await page.waitForResponse(response => response.url().includes('/SearchService/SearchCreatives') && response.status() === 200);
  const creatives = extractCreativesFromApiRespons(await firstResponse.json(), isAdvPage ? searchTerm : undefined);
  creatives.forEach((creative) => {
    const creativeKey = `${creative.id}.creative`;
    KeyValueStore.setValue(creativeKey, JSON.stringify(creative));
  });

  // wait for the search results to appear.
  await page.waitForSelector('creative-grid', { timeout: 5 * 1000 }); // 5s
  await page.waitForSelector('creative-preview > a', { timeout: 5 * 1000 }); // 5s

  // wait 5s
  await page.waitForTimeout(3000);

  const loadMore = page.getByRole('button', { name: 'See all ads' });
  if (await loadMore.isVisible()) {
    await loadMore.click();
  }

  // loop through all ads and add request
  const linksLocator = await page.locator('creative-preview > a').all();

  log.info(`Found ${linksLocator.length} ads`);

  const creativeCodeRegex = /\/creative\/([A-Z0-9]+)/

  await Promise.all(linksLocator.map(async (link) => {
    const href = await link.getAttribute('href');
    if (!href) return;

    const creativeCode = creativeCodeRegex.exec(href)?.[1] || '';
    if (!creativeCode) return;

    try {
      // scroll down to load images
      await link.scrollIntoViewIfNeeded();

      // wait loading-pulse disappear
      await link.locator('img').waitFor({ state: 'visible', timeout: 20 * 1000 }) // 20s
      const img = link.locator('img').first();
      const src = await img.getAttribute('src');
      const imageKey = `${creativeCode}.image`;
      await KeyValueStore.setValue(imageKey, src);
    } catch (error) {
      console.error(error);
      log.warning(`Error while getting image for ${creativeCode}`);
    } finally {
      if (!isAdvPage) {
        const domainKey = `${creativeCode}.domain`;
        await KeyValueStore.setValue(domainKey, searchTerm);
      }

      const fullUrl = new URL(href, page.url()).toString();

      await crawler.addRequests([{
        url: fullUrl,
        label: HandlerLabel.ADS_DETAIL,
      }])
    }
  }));
});

// @Deprecated
// Use SEARCH_PAGE instead
router.addDefaultHandler(async ({ page, crawler, log }) => {
  const urlQuery = new URL(page.url()).searchParams;
  const domain = urlQuery.get('domain');
  if (!domain) {
    throw new Error('Domain not found');
  }

  await page.getByLabel('Search by advertiser or').click();
  await page.getByLabel('Search by advertiser or').fill(domain);
  await page.getByRole('option', { name: domain, exact: true }).locator('div').first().click();

  // wait for the search results to appear.
  await page.waitForSelector('creative-grid');
  await page.waitForSelector('creative-preview > a');

  // wait 5s
  await page.waitForTimeout(5000);

  const loadMore = page.getByRole('button', { name: 'See all ads' });
  if (await loadMore.isVisible()) {
    await loadMore.click();
  }

  // loop through all ads and add request
  const linksLocator = await page.locator('creative-preview > a').all();

  log.info(`Found ${linksLocator.length} ads`);

  const creativeCodeRegex = /\/creative\/([A-Z0-9]+)/

  await Promise.all(linksLocator.map(async (link) => {
    const href = await link.getAttribute('href');
    if (!href) return;

    const creativeCode = creativeCodeRegex.exec(href)?.[1] || '';
    if (!creativeCode) return;

    try {
      // scroll down to load images
      await link.scrollIntoViewIfNeeded();

      // wait loading-pulse disappear
      await link.locator('img').waitFor({ state: 'visible', timeout: 20 * 1000 })
      const img = link.locator('img').first();
      const src = await img.getAttribute('src');
      const imageKey = `${creativeCode}.image`;
      await KeyValueStore.setValue(imageKey, src);
    } catch (error) {
      log.warning(`Error while getting image for ${creativeCode}`);
    } finally {
      const domainKey = `${creativeCode}.domain`;
      await KeyValueStore.setValue(domainKey, domain);

      const fullUrl = new URL(href, page.url()).toString();

      await crawler.addRequests([{
        url: fullUrl,
        label: HandlerLabel.ADS_DETAIL,
      }])
    }
  }));
});
