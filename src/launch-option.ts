import { LaunchOptions } from "playwright";

export const playwrightLaunchOptions: LaunchOptions = {
  args: [
    // '--no-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--ignore-certifcate-errors',
    '--ignore-certifcate-errors-spki-list',
    '--disable-dev-shm-usage',
    '--disable-translate',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream',
    '--disable-blink-features',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
  ],
  ignoreDefaultArgs: [
    '--disable-extensions',
    '--enable-automation'
  ],
}
