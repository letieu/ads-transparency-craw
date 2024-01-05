import { PlaywrightHook } from "crawlee";

// if url not include query "hl=en", add it
export const addLangToQuery: PlaywrightHook = async ({ request }) => {
  request.url = _addLangToUrl(request.url);
}

function _addLangToUrl(url: string) {
  const urlObj = new URL(url);
  if (!urlObj.searchParams.get('hl')) {
    urlObj.searchParams.append('hl', 'en');
  }
  return urlObj.toString();
}
