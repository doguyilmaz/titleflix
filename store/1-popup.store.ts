/**
 * Captures the real popup, driven by the built extension against the simulated Netflix,
 * in every state and both color schemes. Output: store/build/popup-<state>-<scheme>.png
 * (2x, via TITLEFLIX_SCALE=2 set by the store:images script).
 */
import { mkdirSync } from 'node:fs';
import { expect, test, type FakeNetflixConfig, type Settings } from '../tests/e2e/fixtures';

const OUT = 'store/build';
mkdirSync(OUT, { recursive: true });

const STATES: [state: string, path: string | null, config: FakeNetflixConfig, settings: Partial<Settings>][] = [
  ['live', '/watch/80077210', {}, {}],
  ['searching', '/watch/80077210', { playerData: false }, {}],
  ['idle', '/browse', {}, {}],
  ['off', '/watch/80077210', {}, { enabled: false }],
  ['not-netflix', null, {}, {}],
];

for (const scheme of ['dark', 'light'] as const) {
  for (const [state, path, config, settings] of STATES) {
    test(`popup ${state} ${scheme}`, async ({ context, openNetflix, serviceWorker, extensionId, setSettings }) => {
      await setSettings(settings);
      let popup;
      if (path) {
        const page = await openNetflix(path, config);
        if (state === 'live') await expect(page).toHaveTitle(/Stranger Things/);
        const pagePromise = context.waitForEvent('page');
        await serviceWorker.evaluate(async (url) => {
          const [tab] = await chrome.tabs.query({ url: 'https://www.netflix.com/*' });
          await chrome.tabs.create({ url, active: false, windowId: tab!.windowId });
        }, `chrome-extension://${extensionId}/popup.html`);
        popup = await pagePromise;
      } else {
        popup = await context.newPage();
        await popup.goto(`chrome-extension://${extensionId}/popup.html`);
      }
      await popup.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await popup.setViewportSize({ width: 360, height: 700 });
      await expect(popup.locator('#now')).toHaveAttribute('data-state', state);
      await popup.waitForTimeout(400);
      const box = (await popup.locator('body').boundingBox())!;
      await popup.screenshot({
        path: `${OUT}/popup-${state}-${scheme}.png`,
        clip: { x: 0, y: 0, width: 360, height: Math.ceil(box.height) },
      });
    });
  }
}
