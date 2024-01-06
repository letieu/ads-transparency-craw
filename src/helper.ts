import { ElementHandle, Frame, Page } from "playwright";
import { AdFormat } from "./router.js";
import { Log, log } from "crawlee";

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

export function extractDetailQuery(url: string) {
  const searchParams = new URL(url).searchParams;
  const format = searchParams.get('format');
  return {
    format: format ? stringToAdFormat(format) : null,
    domain: searchParams.get('domain'),
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

export function isAdFrame(frame: Frame) {
  const url = frame.url();
  return url.startsWith('https://tpc.googlesyndication.com/archive/sadbundle')
    || url.startsWith('https://adstransparency.google.com/adframe');
}

export async function getFrameSelector(el: ElementHandle) {
  const id = await el.getAttribute('id');
  if (id) {
    return `#${id}`;
  }

  const src = await el.getAttribute('src');
  if (src) {
    return `iframe[src="${src}"]`;
  }

  return null;
}

export async function getFrameContent(wrapper: ElementHandle, log: Log) {
  // wait iframe loaded
  await wrapper.waitForSelector('iframe').catch(() => {
    log.error('iframe not found');
  });

  const iframe = await wrapper.$('iframe');

  if (!iframe) {
    return null;
  }
  // get iframe link
  const iframeUrl = await iframe.getAttribute('src') || '';

  // take screenshot of iframe
  const base64 = (await iframe.screenshot()).toString('base64');
  const screenshot = `data:image/png;base64,${base64}`;

  await iframe.waitForElementState('stable');
  let frame = await iframe.contentFrame();

  // get click url
  const { clickUrls, imageUrls } = await getFrameContentRecursive(frame);

  // video
  // const videoUrls = await frame?.$$('lima-video').then((els) => Promise.all(els.map((el) => el.getAttribute('src')))) || [];

  return {
    iframeUrl,
    screenshot,
    clickUrls: clickUrls.filter((link) => !!link) as string[],
    imageUrls: imageUrls.filter((link) => !!link) as string[],
    videoUrls: ['asdf']
  }
}

export async function getFrameContentRecursive(frame: Frame | null) {
  if (!frame) {
    return {
      clickUrls: [],
      imageUrls: [],
    }
  }
  // click url
  const clickUrls = await frame?.$$('a').then((els) => Promise.all(els.map((el) => el.getAttribute('href')))) || [];

  // get image url
  const imageUrls = await frame?.$$('img').then((els) => Promise.all(els.map((el) => el.getAttribute('src')))) || [];
  // get all background image url
  const bgImages = await frame?.$$('.cropped-image-no-overflow-box, .thumb-overlay')
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
    imageUrls.push(...bgImages);
  }


  const childFrames = frame.childFrames();
  if (childFrames.length > 0) {
    for (const child of childFrames) {
      const result = await getFrameContentRecursive(child);
      clickUrls.push(...result.clickUrls);
      imageUrls.push(...result.imageUrls);
    }
  }

  return {
    clickUrls: clickUrls.filter((link) => !!link) as string[],
    imageUrls: imageUrls.filter((link) => !!link) as string[],
  }
}

// dump frame tree
export function dumpFrameTree(frame: Frame, indent: string) {
  const url = frame.url();
  if (url?.includes('about:')) {
    return;
  }
  log.info(`${indent}${frame.name()}`);
  for (const child of frame.childFrames()) {
    dumpFrameTree(child, indent + '  ');
  }
}
