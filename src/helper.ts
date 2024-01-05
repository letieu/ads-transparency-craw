import { ElementHandle, Frame } from "playwright";
import { AdFormat } from "./router.js";

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
