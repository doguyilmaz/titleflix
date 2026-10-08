import { expect, expectTitleToStay, test } from './fixtures';

const EP1 = 'Stranger Things: S1:E1 Chapter One: The Vanishing of Will Byers - Netflix';
const EP2 = 'Stranger Things: S1:E2 Chapter Two: The Weirdo on Maple Street - Netflix';
const EP3 = 'Stranger Things: S1:E3 Chapter Three: Holly, Jolly - Netflix';

test.describe('reading the title', () => {
  test('uses Netflix player data even when the controls are hidden', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077210');
    await expect(page).toHaveTitle(EP2);
    await expect(page.locator('[data-uia="video-title"]')).toHaveCount(0);
  });

  test('finds seasons beyond the first', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80117800');
    await expect(page).toHaveTitle('Stranger Things: S2:E1 Chapter One: MADMAX - Netflix');
  });

  test('handles movies whose title looks like a number', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80211627');
    await expect(page).toHaveTitle('1917 - Netflix');
  });

  test('falls back to the player controls and keeps the title after they hide', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077210', { playerData: false });
    await expectTitleToStay(page, 'Netflix', 800);

    await page.evaluate(() => (window as any).__fake.showControls());
    const fromControls = 'Stranger Things: E2 Chapter Two: The Weirdo on Maple Street - Netflix';
    await expect(page).toHaveTitle(fromControls);

    await page.evaluate(() => (window as any).__fake.hideControls());
    await expectTitleToStay(page, fromControls);
  });

  test('falls back to the pause overlay', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077210', { playerData: false, overlay: true });
    await expect(page).toHaveTitle('Stranger Things - Netflix');
  });

  test('upgrades from a weaker source once player data arrives', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077210', { overlay: true, playerDataDelayMs: 2500 });
    await expect(page).toHaveTitle('Stranger Things - Netflix');
    await expect(page).toHaveTitle(EP2);
  });

  test('leaves non-watch pages alone', async ({ openNetflix }) => {
    const page = await openNetflix('/browse');
    await expectTitleToStay(page, 'Home - Netflix', 1200);
  });
});

test.describe('writing the title', () => {
  test('wins when Netflix keeps resetting the title, without flicker', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077209', { titleFight: true });
    await expect(page).toHaveTitle(EP1);
    await expectTitleToStay(page, EP1, 2500);
  });

  test('re-applies after a one-off overwrite', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077209');
    await expect(page).toHaveTitle(EP1);
    await page.evaluate(() => (window as any).__fake.setTitle('Netflix'));
    await expectTitleToStay(page, EP1, 500);
  });
});

test.describe('navigation inside the Netflix app', () => {
  test('browse -> watch -> next episode -> back to browse', async ({ openNetflix }) => {
    const page = await openNetflix('/browse');
    await expect(page).toHaveTitle('Home - Netflix');

    await page.getByTestId('ep-80077209').click();
    await expect(page).toHaveTitle(EP1);

    await page.evaluate(() => (window as any).__fake.nextEpisode());
    await expect(page).toHaveTitle(EP2);

    await page.evaluate(() => (window as any).__fake.nextEpisode());
    await expect(page).toHaveTitle(EP3);

    await page.goBack();
    await expect(page).toHaveTitle(EP2);

    await page.evaluate(() => (window as any).__fake.navigate('/browse'));
    await expect(page).toHaveTitle('Home - Netflix');
    await expectTitleToStay(page, 'Home - Netflix', 1200);
  });

  test('switches to the next episode before the next frame', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077209');
    await expect(page).toHaveTitle(EP1);
    const titleRightAfter = await page.evaluate(() => {
      (window as any).__fake.nextEpisode();
      return new Promise<string>((resolve) => setTimeout(() => resolve(document.title), 0));
    });
    expect(titleRightAfter).toBe(EP2);
  });

  test('restores the page title on leaving even if Netflix does not set one', async ({ openNetflix }) => {
    const page = await openNetflix('/browse');
    await page.getByTestId('ep-80077209').click();
    await expect(page).toHaveTitle(EP1);
    // Leave without the app touching document.title.
    await page.evaluate(() => history.pushState({}, '', '/browse'));
    await expect(page).toHaveTitle('Netflix');
  });

  test('ignores the previous episode still showing in the controls', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80077209', { playerData: false, controls: 'visible', staleControlsMs: 1500 });
    const ep1 = 'Stranger Things: E1 Chapter One: The Vanishing of Will Byers - Netflix';
    await expect(page).toHaveTitle(ep1);

    await page.evaluate(() => (window as any).__fake.nextEpisode());
    // During the stale window the tab must not claim episode 1 is playing on episode 2's URL.
    const sampled = await page.evaluate(async () => {
      const titles = new Set<string>();
      for (let i = 0; i < 50; i++) {
        titles.add(document.title);
        await new Promise((r) => setTimeout(r, 20));
      }
      return [...titles];
    });
    expect(sampled).not.toContain(ep1);
    await expect(page).toHaveTitle('Stranger Things: E2 Chapter Two: The Weirdo on Maple Street - Netflix');
  });

  test('ignores the previous show still on screen while the new one loads', async ({ openNetflix }) => {
    const page = await openNetflix('/watch/80100174', {
      controls: 'visible',
      staleControlsMs: 1500,
      playerDataDelayMs: 2500,
    });
    await expect(page).toHaveTitle('Dark: S1:E2 Lies - Netflix');

    await page.evaluate(() => (window as any).__fake.navigate('/watch/80077209'));
    const sampled = await page.evaluate(async () => {
      const titles = new Set<string>();
      for (let i = 0; i < 60; i++) {
        titles.add(document.title);
        await new Promise((r) => setTimeout(r, 20));
      }
      return [...titles];
    });
    expect(sampled.filter((t) => t.startsWith('Dark'))).toEqual([]);
    await expect(page).toHaveTitle('Stranger Things: E1 Chapter One: The Vanishing of Will Byers - Netflix');
    await expect(page).toHaveTitle(EP1);
  });
});

test.describe('settings', () => {
  test('turning off restores the Netflix title live, without a reload', async ({ openNetflix, setSettings }) => {
    const page = await openNetflix('/watch/80077209');
    await expect(page).toHaveTitle(EP1);
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => navigations.push(frame.url()));

    await setSettings({ enabled: false });
    await expect(page).toHaveTitle('Netflix');
    await expectTitleToStay(page, 'Netflix', 1200);

    await setSettings({ enabled: true });
    await expect(page).toHaveTitle(EP1);
    expect(navigations).toEqual([]);
  });

  test('format options apply live', async ({ openNetflix, setSettings }) => {
    const page = await openNetflix('/watch/80077209');
    await expect(page).toHaveTitle(EP1);

    await setSettings({ showEpisode: false });
    await expect(page).toHaveTitle('Stranger Things - Netflix');

    await setSettings({ appendSuffix: false });
    await expect(page).toHaveTitle('Stranger Things');

    await setSettings({ showEpisode: true });
    await expect(page).toHaveTitle('Stranger Things: S1:E1 Chapter One: The Vanishing of Will Byers');
  });
});

test.describe('extension lifecycle', () => {
  test('re-injection (extension update) leaves exactly one working instance', async ({
    openNetflix,
    serviceWorker,
  }) => {
    const page = await openNetflix('/watch/80077209', { titleFight: true });
    await expect(page).toHaveTitle(EP1);

    // What background.ts does for already-open tabs after an update.
    await serviceWorker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.netflix.com/*' });
      await chrome.scripting.executeScript({ target: { tabId: tab!.id! }, files: ['bridge.js'], world: 'MAIN' });
      await chrome.scripting.executeScript({ target: { tabId: tab!.id! }, files: ['content.js'] });
    });

    await expectTitleToStay(page, EP1, 1500);
    await page.evaluate(() => (window as any).__fake.nextEpisode());
    await expect(page).toHaveTitle(EP2);
    await expectTitleToStay(page, EP2, 1000);
  });

  test('debug log explains what happened when enabled', async ({ openNetflix, context }) => {
    await context.addInitScript(() => localStorage.setItem('titleflix:debug', '1'));
    const logs: string[] = [];
    context.on('console', (msg) => logs.push(msg.text()));
    const page = await openNetflix('/watch/80077209', { titleFight: true });
    await expect(page).toHaveTitle(EP1);
    await expect.poll(() => logs.join('\n')).toContain('[Titleflix bridge] player data has video 80077209');
    const all = logs.join('\n');
    expect(all).toContain('[Titleflix content] watching video 80077209');
    expect(all).toContain('[Titleflix content] title for video 80077209 from player-data');
    expect(all).toContain(`[Titleflix content] tab title -> "${EP1}"`);
    expect(all).toContain('[Titleflix content] Netflix set the title to "Netflix", putting ours back');
  });

  test('debug log reports the player-data shape when it does not match', async ({ openNetflix, context }) => {
    await context.addInitScript(() => localStorage.setItem('titleflix:debug', '1'));
    const logs: string[] = [];
    context.on('console', async (msg) => logs.push(msg.text()));
    await openNetflix('/watch/80077209', { playerData: false });
    await expect.poll(() => logs.join('\n'), { timeout: 8000 }).toContain(
      '[Titleflix bridge] player data still has no match for video 80077209',
    );
  });

  test('stays silent without the debug flag', async ({ openNetflix, context }) => {
    const logs: string[] = [];
    context.on('console', (msg) => logs.push(msg.text()));
    const page = await openNetflix('/watch/80077209');
    await expect(page).toHaveTitle(EP1);
    expect(logs.filter((l) => l.includes('[Titleflix'))).toEqual([]);
  });

  test('no errors on Netflix pages', async ({ openNetflix, extensionErrors }) => {
    const page = await openNetflix('/browse');
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.getByTestId('ep-80077209').click();
    await expect(page).toHaveTitle(EP1);
    await page.evaluate(() => (window as any).__fake.navigate('/browse'));
    await expect(page).toHaveTitle('Home - Netflix');
    expect(pageErrors).toEqual([]);
    expect(extensionErrors).toEqual([]);
  });
});

test.describe('popup', () => {
  async function openPopupFor(
    context: import('@playwright/test').BrowserContext,
    serviceWorker: import('@playwright/test').Worker,
    extensionId: string,
  ) {
    // Open the popup as a background tab in the Netflix tab's window, so "the active tab" is Netflix.
    const pagePromise = context.waitForEvent('page');
    await serviceWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.netflix.com/*' });
      await chrome.tabs.create({ url, active: false, windowId: tab!.windowId });
    }, `chrome-extension://${extensionId}/popup.html`);
    const popup = await pagePromise;
    await popup.waitForLoadState();
    return popup;
  }

  test('shows the live title and turns renaming off', async ({ context, openNetflix, serviceWorker, extensionId }) => {
    const page = await openNetflix('/watch/80077209');
    await expect(page).toHaveTitle(EP1);

    const popup = await openPopupFor(context, serviceWorker, extensionId);
    await expect(popup.locator('#now')).toHaveAttribute('data-state', 'live');
    await expect(popup.locator('#title')).toHaveText(EP1);
    await expect(popup.locator('#titleSuffix')).toHaveText(' - Netflix');
    await expect(popup.locator('#tabText')).toHaveText(EP1);
    await expect(popup.locator('#source')).toHaveText('from player data');
    await expect(popup.locator('#version')).toHaveText(/^v\d+\.\d+\.\d+$/);
    await expect(popup.locator('#example')).toHaveText('Dark: S1:E2 Lies - Netflix');

    await popup.locator('label[for="enabled"]').click();
    await expect(page).toHaveTitle('Netflix');
    await expect(popup.locator('#now')).toHaveAttribute('data-state', 'off');
    await expect(popup.locator('#title')).toHaveText('Netflix');
    await expect(popup.locator('#showEpisode')).toBeDisabled();

    await popup.locator('label[for="enabled"]').click();
    await expect(page).toHaveTitle(EP1);
    await expect(popup.locator('#now')).toHaveAttribute('data-state', 'live');

    await popup.locator('label[for="showEpisode"]').click();
    await expect(page).toHaveTitle('Stranger Things - Netflix');
    await expect(popup.locator('#example')).toHaveText('Dark - Netflix');
    await expect(popup.locator('#title')).toHaveText('Stranger Things - Netflix');
  });

  test('renders titles as text, never as HTML', async ({ context, openNetflix, serviceWorker, extensionId }) => {
    const page = await openNetflix('/watch/80000666');
    await expect(page).toHaveTitle('<img src=x onerror="window.__xss=1"> - Netflix');

    const popup = await openPopupFor(context, serviceWorker, extensionId);
    await expect(popup.locator('#title')).toHaveText('<img src=x onerror="window.__xss=1"> - Netflix');
    await expect(popup.locator('#tabText')).toHaveText('<img src=x onerror="window.__xss=1"> - Netflix');
    await expect(popup.locator('img:not(.brand-mark)')).toHaveCount(0);
    expect(await popup.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test('says when the current tab is not Netflix', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('#now')).toHaveAttribute('data-state', 'not-netflix');
    await expect(popup.locator('#actionBtn')).toHaveText('Open Netflix');
  });

  test('reports "searching" on a watch page before the title is known', async ({
    context,
    openNetflix,
    serviceWorker,
    extensionId,
  }) => {
    await openNetflix('/watch/80077209', { playerData: false });
    const popup = await openPopupFor(context, serviceWorker, extensionId);
    await expect(popup.locator('#now')).toHaveAttribute('data-state', 'searching');
  });
});
