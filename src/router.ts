import { Dataset, createPlaywrightRouter } from 'crawlee';
import { extractDate, extractFormat, extractIDs, getFrameSelector } from './helper';

export enum HandlerLabel {
  ADS_DETAIL = 'ADS_DETAIL',
}

export type Creative = {
  id: string;
  link: string;
  format: AdFormat;
  lastShow: Date;
  previewUrl: string;
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

  // wait iframe loaded
  await page.waitForSelector('.creative-container creative > .creative-container iframe');
  const iframes = await page.$$('.creative-container creative > .creative-container iframe')

  for await (const iframe of iframes) {
    // get iframe link
    const iframeUrl = await iframe.getAttribute('src') || '';

    // take screenshot of iframe
    const base64 = (await iframe.screenshot()).toString('base64');
    const screenshot = `data:image/png;base64,${base64}`;

    const frame = await iframe.contentFrame();
    // get click url
    const clickLinks = await frame?.$$('a').then((els) => Promise.all(els.map((el) => el.getAttribute('href')))) || [];
    // get image url
    const imageLinks = await frame?.$$('img').then((els) => Promise.all(els.map((el) => el.getAttribute('src')))) || [];
    // get video url
    const videoLinks = await frame?.$$('video').then((els) => Promise.all(els.map((el) => el.getAttribute('src')))) || [];
    // get all background image url
    const bgImages = await frame?.$$('.cropped-image-no-overflow-box')
      .then((els) => Promise.all(
        els.map((el) => {
          return el.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const background = style.backgroundImage;
            const url = background.replace(/url\((['"])?(.*?)\1\)/gi, '$2').split(',')[0];
            return url;
          });
        }))
      );

    if (bgImages) {
      imageLinks.push(...bgImages);
    }

    if (await page.isVisible('.right-arrow-container')) {
      await page.click('.right-arrow-container');
    }

    variants.push({
      iframeUrl,
      screenshot,
      clickUrls: clickLinks.filter((link) => !!link) as string[],
      imageUrls: imageLinks.filter((link) => !!link) as string[],
      videoUrls: videoLinks.filter((link) => !!link) as string[],
    });
  }

  const creative: Creative = {
    id: creativeID,
    link: request.url,
    format,
    lastShow,
    previewUrl: '',
    advertiser: {
      id: advertiserID,
      name: advertiserName,
    },
    variants: variants,
    regions: regionsText?.map((text) => text?.trim() ?? '') || [],
  };

  await Dataset.pushData(creative);
});

router.addDefaultHandler(async ({ request, page, enqueueLinks, log }) => {
  await page.waitForSelector('.search-input-searchable-center');

  // Get the search input element.
  const searchInput = await page.$('.search-input-searchable-center input');

  if (!searchInput) {
    throw new Error('Search input not found');
  }

  // Type the search query.
  await searchInput.type('tiki.vn');

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
