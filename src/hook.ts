import { PlaywrightHook } from "crawlee";

// if url not include query "hl=en", add it
export const addLangToQuery: PlaywrightHook = async ({ request }) => {
  request.url = _addLangToUrl(request.url);
}

export const setViewport: PlaywrightHook = async ({ page }) => {
  await page.setViewportSize({
    width: 1350,
    height: 750,
  });
}

function _addLangToUrl(url: string) {
  const urlObj = new URL(url);
  if (!urlObj.searchParams.get('hl')) {
    urlObj.searchParams.append('hl', 'en');
  }
  return urlObj.toString();
}
