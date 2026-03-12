import type { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;
let launcherPromise: Promise<{ launch: typeof import('puppeteer').launch }> | null = null;

async function getLauncher() {
  if (!launcherPromise) {
    launcherPromise = (async () => {
      const puppeteer = await import('puppeteer');

      try {
        const puppeteerExtra = (await import('puppeteer-extra')).default;
        const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
        puppeteerExtra.use(StealthPlugin());
        return puppeteerExtra as unknown as { launch: typeof puppeteer.launch };
      } catch (error) {
        console.warn('Failed to enable puppeteer-extra stealth. Falling back to plain Puppeteer.', error);
        return puppeteer;
      }
    })();
  }

  return launcherPromise;
}

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const launcher = await getLauncher();

  browserInstance = await launcher.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
    ],
  });
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
