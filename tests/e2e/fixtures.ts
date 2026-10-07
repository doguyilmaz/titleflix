import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface FakeNetflixConfig {
  playerData?: boolean;
  playerDataDelayMs?: number;
  controls?: 'hidden' | 'visible';
  overlay?: boolean;
  titleFight?: boolean;
  mediaSession?: boolean;
  staleControlsMs?: number;
}

export interface Settings {
  enabled: boolean;
  showEpisode: boolean;
  appendSuffix: boolean;
}

const EXTENSION_DIR = path.resolve(process.env.TITLEFLIX_EXTENSION_DIR || 'dist');
const FAKE_NETFLIX = readFileSync(path.resolve('tests/e2e/fixtures/fake-netflix.html'), 'utf8');

type Fixtures = {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  openNetflix: (path: string, config?: FakeNetflixConfig) => Promise<Page>;
  setSettings: (settings: Partial<Settings>) => Promise<void>;
  extensionErrors: string[];
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    // Serve the simulated Netflix app for every www.netflix.com URL; nothing reaches the network.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'www.netflix.com' && route.request().resourceType() === 'document') {
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FAKE_NETFLIX });
      }
      return url.protocol === 'chrome-extension:' ? route.continue() : route.abort();
    });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },

  extensionErrors: async ({ context }, use) => {
    const errors: string[] = [];
    context.on('weberror', (error) => errors.push(String(error.error())));
    await use(errors);
  },

  openNetflix: async ({ context, serviceWorker }, use) => {
    // Settings are written by onInstalled; make sure they exist before pages load.
    await serviceWorker.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        if ((await chrome.storage.sync.get('settings')).settings) return;
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    await use(async (urlPath, config = {}) => {
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`[page error] ${msg.text()}`);
      });
      await page.addInitScript((cfg) => {
        (window as unknown as { __FAKE_NETFLIX__: unknown }).__FAKE_NETFLIX__ = cfg;
      }, config);
      await page.goto(`https://www.netflix.com${urlPath}`);
      return page;
    });
  },

  setSettings: async ({ serviceWorker }, use) => {
    await use(async (patch) => {
      await serviceWorker.evaluate(async (p) => {
        const { settings } = await chrome.storage.sync.get('settings');
        await chrome.storage.sync.set({ settings: { ...(settings as object), ...p } });
      }, patch);
    });
  },
});

export { expect } from '@playwright/test';

/** Assert the title never deviates from `expected` while sampling for `ms`. */
export async function expectTitleToStay(page: Page, expected: string, ms = 1500): Promise<void> {
  const seen = await page.evaluate(
    async ({ ms }) => {
      const titles = new Set<string>();
      const end = performance.now() + ms;
      while (performance.now() < end) {
        titles.add(document.title);
        await new Promise((r) => setTimeout(r, 20));
      }
      return [...titles];
    },
    { ms },
  );
  if (seen.length !== 1 || seen[0] !== expected) {
    throw new Error(`Title changed while sampling. Expected only "${expected}", saw: ${JSON.stringify(seen)}`);
  }
}
