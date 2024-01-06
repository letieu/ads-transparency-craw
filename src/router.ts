import { Dataset, createPlaywrightRouter } from 'crawlee';
import { extractDate, extractFormat, extractIDs, getVariantFromElement, getVariantFromFrame } from './helper.js';

export enum HandlerLabel {
  ADS_DETAIL = 'ADS_DETAIL',
}

export type Creative = {
  id: string;
  link: string;
  format: AdFormat;
  lastShow: Date;
  advertiser: Advertiser;
  variants: CreativeVariants[];
  regions: string[];
}

export type CreativeVariants = {
  iframeUrl: string;
  screenshot: string;
  clickUrls: string[];
  videoUrls: string[];
  imageUrls: string[];
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

router.addHandler(HandlerLabel.ADS_DETAIL, async ({ page, request, log }) => {
  const { advertiserID, creativeID } = extractIDs(request.url);

  // wait for network idle
  await page.waitForLoadState('networkidle');

  // wait for loading-pulse disappear
  await page.waitForSelector('.loading-pulse', { state: 'detached', timeout: 5000 });

  await page.waitForSelector('.advertiser-name > a');

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
  let variants: CreativeVariants[] = [];

  const variantElements = await page.$$('creative.has-variation');

  log.debug(`variant count: ${variantElements.length}`);

  for await (const wrapper of variantElements) {
    // check if this variant is iframe
    const isIframe = !!(await wrapper.$('iframe'));

    let variant: CreativeVariants;

    if (isIframe) {
      variant = await getVariantFromFrame(wrapper);
    } else {
      variant = await getVariantFromElement(wrapper);
    }

    if (await page.isVisible('.right-arrow-container')) {
      await page.click('.right-arrow-container');
    }

    variants.push(variant);
  }

  const creative: Creative = {
    id: creativeID,
    link: request.url,
    format,
    lastShow,
    advertiser: {
      id: advertiserID,
      name: advertiserName,
    },
    variants: variants,
    regions: regionsText?.map((text) => text?.trim() ?? '') || [],
  };

  await Dataset.pushData(creative); // TODO: move to mysql
});

router.addDefaultHandler(async ({ page, enqueueLinks, log }) => {
  const urlQuery = new URL(page.url()).searchParams;
  const domain = urlQuery.get('domain');
  if (!domain) {
    throw new Error('Domain not found');
  }

  await page.waitForSelector('.search-input-searchable-center');
  // Get the search input element.
  const searchInput = await page.$('.search-input-searchable-center input');

  if (!searchInput) {
    throw new Error('Search input not found');
  }

  // Type the search query.
  await searchInput.type(domain);

  // wait for suggestions to appear.
  await page.waitForSelector('.search-suggestions-wrapper');

  // Get the first suggestion.
  const firstSuggestion = await page.$('.search-suggestions-wrapper material-select-item:first-child');

  if (!firstSuggestion) {
    throw new Error('First suggestion not found');
  }

  // Get the text content of the first suggestion.
  const firstSuggestionText = await firstSuggestion.textContent();
  log.debug(`First suggestion: ${firstSuggestionText}`);

  // Click on the first suggestion.
  await firstSuggestion.click();

  // wait for the search results to appear.
  await page.waitForSelector('creative-grid');
  await page.waitForSelector('creative-preview > a');

  await enqueueLinks({
    selector: 'creative-preview > a',
    label: HandlerLabel.ADS_DETAIL,
  });
});