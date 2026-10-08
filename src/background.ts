/**
 * Service worker. Only does install/update housekeeping:
 *  - migrates v1 settings and deletes the v1 keys that stored viewing info;
 *  - injects the scripts into Netflix tabs that were already open, so they work without a reload.
 */
import { migrateLegacySettings } from './shared/settings';

const NETFLIX_TABS = 'https://www.netflix.com/*';

async function injectIntoOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: NETFLIX_TABS });
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined || tab.discarded) return;
      const target = { tabId: tab.id };
      try {
        await chrome.scripting.executeScript({ target, files: ['bridge.js'], world: 'MAIN' });
        await chrome.scripting.executeScript({ target, files: ['content.js'] });
      } catch (error) {
        // Tabs on error pages or mid-navigation reject injection; the manifest covers them next load.
        console.debug('Titleflix: could not inject into tab', tab.id, error);
      }
    }),
  );
}

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    try {
      await migrateLegacySettings();
    } catch (error) {
      console.warn('Titleflix: settings migration failed', error);
    }
    if (details.reason === 'install' || details.reason === 'update') {
      await injectIntoOpenTabs();
    }
  })();
});
