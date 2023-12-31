import { createPlaywrightRouter } from 'crawlee';

enum HandlerLabel {
  DETAIL = 'DETAIL',
}

export const router = createPlaywrightRouter();

router.addHandler(HandlerLabel.DETAIL, async ({ page, enqueueLinks, request, log }) => {
  log.debug(`Processing detail page: ${request.url}`);
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
    label: HandlerLabel.DETAIL,
  });
});
