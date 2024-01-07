import { ElementHandle, Frame, Page } from "playwright";
import { AdFormat, AdMedia, CreativeVariant } from "./router.js";
import { log } from "crawlee";

const advertiserRegex = /advertiser\/([A-Z0-9]+)/;
const creativeRegex = /creative\/([A-Z0-9]+)/;

/**
  * Extract advertiser and creative IDs from a URL.
  * @param url URL to extract IDs from.
  * @returns Object containing advertiserID and creativeID.
  * @example
  * // return { advertiserID: 'AR06152299239998226433', creativeID: 'CR17479077530920026113' }
  * extractIDs('https://adstransparency.google.com/advertiser/AR06152299239998226433/creative/CR17479077530920026113?region=VN')
  */
export function extractIDs(url: string) {
  const advertiserMatch = url.match(advertiserRegex);
  const creativeMatch = url.match(creativeRegex);

  if (advertiserMatch && creativeMatch) {
    const advertiserID = advertiserMatch[1];
    const creativeID = creativeMatch[1];
    return { advertiserID, creativeID };
  } else {
    return { advertiserID: '', creativeID: '' };
  }
}

export function stringToAdFormat(format: string) {
  switch (format) {
    case 'VIDEO':
      return AdFormat.VIDEO;
    case 'IMAGE':
      return AdFormat.IMAGE;
    case 'TEXT':
      return AdFormat.TEXT;
    default:
      return AdFormat.TEXT;
  }
}

/**
  * @param formatText Text to extract format from.
  * @returns Format of the ad.
  * @example
  *  // return 'video'
  *  extractFormat('Format: Video')
  */
export function extractFormat(formatText: string) {
  if (formatText.toLowerCase().includes('video')) {
    return AdFormat.VIDEO;
  } else if (formatText.toLowerCase().includes('text')) {
    return AdFormat.TEXT;
  } else if (formatText.toLowerCase().includes('image')) {
    return AdFormat.IMAGE;
  } else {
    return AdFormat.TEXT;
  }
}

/**
  * @param text Text to extract date from.
  * @returns Date of the ad.
  * @example
  * extractDate('Last shown: Jan 3, 2024')
  */
export function extractDate(text: string): Date {
  const dateString = text.split(':')[1];

  const date = new Date(dateString?.trim() || '');
  return date;
}

export async function getVariantFromFrame(wrapper: ElementHandle, format: AdFormat): Promise<CreativeVariant> {
  // wait iframe loaded
  await wrapper.waitForSelector('iframe', { timeout: 2000 }).catch(() => {
    log.error('iframe not found');
  });

  const iframe = await wrapper.$('iframe');
  if (!iframe) {
    throw new Error('iframe not found after wait');
  }

  // get iframe link
  const iframeUrl = await iframe.getAttribute('src') || '';

  await iframe.waitForElementState('stable');
  let frame = await iframe.contentFrame();

  const isText = format === AdFormat.TEXT;
  const medias = isText ? [] : await getFrameContentRecursive(frame);

  const isVideo = format === AdFormat.VIDEO;
  const html = isVideo ? '' : await frame?.content();

  await frame?.waitForLoadState('networkidle');
  await frame?.waitForTimeout(500);
  const base64 = (await iframe.screenshot()).toString('base64');
  const screenshot = `data:image/png;base64,${base64}`;

  return {
    iframeUrl,
    screenshot,
    html: html || '',
    medias,
  }
}

export async function getFrameContentRecursive(frame: Frame | null): Promise<AdMedia[]> {
  if (!frame) {
    return [];
  }

  log.debug(`frame url: ${frame.url()}`);
  if (isYoutubeFrame(frame)) {
    return [{
      type: 'video',
      url: frame.url(),
      clickUrl: frame.url(),
    }]
  }

  const foundItems = [];

  // get image url
  const imgs: AdMedia[] = await frame?.$$('img').then((els) => Promise.all(els.map((el) => {
    return el.evaluate((el) => {
      const src = el.getAttribute('src');

      let clickUrl = '';
      const parentLink = el.parentElement?.closest('a');

      if (parentLink) {
        clickUrl = parentLink.getAttribute('href') || '';
      } else {
        const innerLink = el.querySelector('a');
        clickUrl = innerLink?.getAttribute('href') || '';
      }

      return {
        type: 'image',
        url: src || '',
        clickUrl,
      };
    });
  })));

  foundItems.push(...imgs);

  const bgImages: AdMedia[] = await frame?.$$('.cropped-image-no-overflow-box, .thumb-overlay')
    .then((els) => Promise.all(
      els.map((el) => {
        return el.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const background = style.backgroundImage;
          const imageUrl = background.replace(/url\((['"])?(.*?)\1\)/gi, '$2').split(',')[0];

          let clickUrl = '';
          const parentLink = el.parentElement?.closest('a');

          if (parentLink) {
            clickUrl = parentLink.getAttribute('href') || '';
          } else {
            const innerLink = el.querySelector('a');
            clickUrl = innerLink?.getAttribute('href') || '';
          }

          return {
            type: 'image',
            url: imageUrl,
            clickUrl,
          };
        });
      }))
    )

  foundItems.push(...bgImages);

  const childFrames = frame.childFrames();
  if (childFrames.length > 0) {
    for (const child of childFrames) {
      const result = await getFrameContentRecursive(child);
      foundItems.push(...result);
    }
  }

  return foundItems;
}

export async function getVariantFromElement(el: ElementHandle): Promise<CreativeVariant> {
  const creativeContainer = await el.$('.creative-container') || el;

  // take screenshot of Element
  const base64 = (await creativeContainer.screenshot()).toString('base64');
  const screenshot = `data:image/png;base64,${base64}`;

  // extract images
  const imgs: AdMedia[] = await creativeContainer?.$$('img').then((els) => Promise.all(els.map((el) => {
    return el.evaluate((el) => {
      const src = el.getAttribute('src');

      let clickUrl = '';
      const parentLink = el.parentElement?.closest('a');

      if (parentLink) {
        clickUrl = parentLink.getAttribute('href') || '';
      } else {
        const innerLink = el.querySelector('a');
        clickUrl = innerLink?.getAttribute('href') || '';
      }

      return {
        type: 'image',
        url: src || '',
        clickUrl,
      };
    });
  })));

  return {
    iframeUrl: '',
    html: '',
    screenshot,
    medias: [
      ...imgs,
    ],
  }
}

function isYoutubeFrame(frame: Frame) {
  const url = frame.url();
  return url.includes('youtube.com/embed');
}
