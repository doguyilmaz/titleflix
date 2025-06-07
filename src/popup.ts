interface StorageData {
  titleflixEnabled?: boolean;
  theme?: 'auto' | 'light' | 'dark';
  currentlyWatching?: string | null;
  isWatching?: boolean;
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusContent = document.getElementById('status-content');
  const enableToggle = document.getElementById('enableToggle');
  const themeAuto = document.getElementById('themeAuto');
  const themeLight = document.getElementById('themeLight');
  const themeDark = document.getElementById('themeDark');

  if (
    !statusElement ||
    !statusContent ||
    !enableToggle ||
    !themeAuto ||
    !themeLight ||
    !themeDark
  ) {
    console.error('Required elements not found');
    return;
  }

  // Load saved settings
  const settings = await loadSettings();

  // Detect and save system theme for background script
  await detectAndSaveSystemTheme();

  // Apply theme
  applyTheme(settings.theme || 'auto');
  updateThemeButtons(settings.theme || 'auto');

  // Check if we're on Netflix and get URL info
  let isNetflix = false;
  let isWatchPage = false;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      isNetflix = tab.url.includes('netflix.com');
      isWatchPage = tab.url.includes('/watch/');
    }
  } catch (error) {
    console.error('Error getting tab info:', error);
  }

  // Update enable toggle state and status
  updateToggleState(enableToggle, settings.titleflixEnabled !== false, isNetflix, true);
  updateStatus(
    statusElement,
    statusContent,
    isNetflix,
    isWatchPage,
    settings.titleflixEnabled !== false,
    settings
  );

  // Enable toggle click handler
  enableToggle.addEventListener('click', async () => {
    if (!isNetflix) return; // Don't allow toggle if not on Netflix

    const newState = !enableToggle.classList.contains('active');
    await chrome.storage.local.set({ titleflixEnabled: newState });

    updateToggleState(enableToggle, newState, isNetflix, false);
    const updatedSettings = await loadSettings();
    updateStatus(statusElement, statusContent, isNetflix, isWatchPage, newState, updatedSettings);

    // Reload the Netflix tab to apply changes
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url?.includes('netflix.com')) {
        chrome.tabs.reload(tab.id);
      }
    } catch (error) {
      console.error('Error reloading tab:', error);
    }
  });

  // Theme button handlers
  themeAuto.addEventListener('click', () => setTheme('auto'));
  themeLight.addEventListener('click', () => setTheme('light'));
  themeDark.addEventListener('click', () => setTheme('dark'));

  async function loadSettings(): Promise<StorageData> {
    try {
      return await chrome.storage.local.get([
        'titleflixEnabled',
        'theme',
        'currentlyWatching',
        'isWatching',
      ]);
    } catch {
      return {};
    }
  }

  function applyTheme(theme: 'auto' | 'light' | 'dark'): void {
    document.body.removeAttribute('data-theme');
    if (theme !== 'auto') {
      document.body.setAttribute('data-theme', theme);
    }
  }

  function updateThemeButtons(activeTheme: 'auto' | 'light' | 'dark'): void {
    [themeAuto, themeLight, themeDark].forEach((btn) => btn?.classList.remove('active'));

    switch (activeTheme) {
      case 'auto':
        themeAuto?.classList.add('active');
        break;
      case 'light':
        themeLight?.classList.add('active');
        break;
      case 'dark':
        themeDark?.classList.add('active');
        break;
    }
  }

  async function setTheme(theme: 'auto' | 'light' | 'dark'): Promise<void> {
    await chrome.storage.local.set({ theme });
    applyTheme(theme);
    updateThemeButtons(theme);

    // Notify background script to update icon
    try {
      await chrome.runtime.sendMessage({ type: 'THEME_CHANGED', theme });
    } catch (error) {
      console.error('Failed to notify background script:', error);
    }
  }

  async function detectAndSaveSystemTheme(): Promise<void> {
    try {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      await chrome.storage.local.set({ systemTheme: isDark ? 'dark' : 'light' });

      // Immediately update icon if we're on auto theme
      const settings = await loadSettings();
      if (!settings.theme || settings.theme === 'auto') {
        try {
          await chrome.runtime.sendMessage({ type: 'THEME_CHANGED', theme: 'auto' });
        } catch (error) {
          console.error('Failed to notify background script on init:', error);
        }
      }
    } catch (error) {
      console.error('Failed to detect system theme:', error);
    }
  }

  function updateToggleState(
    toggle: HTMLElement,
    enabled: boolean,
    onNetflix: boolean,
    isInitial = false
  ): void {
    if (isInitial) {
      // Prevent transition on initial load
      toggle.classList.add('no-transition');
      toggle.classList.toggle('active', enabled);
      toggle.classList.toggle('disabled', !onNetflix);

      // Re-enable transitions after a brief moment
      setTimeout(() => {
        toggle.classList.remove('no-transition');
      }, 50);
    } else {
      toggle.classList.toggle('active', enabled);
      toggle.classList.toggle('disabled', !onNetflix);
    }
  }

  function updateStatus(
    statusEl: HTMLElement,
    contentEl: HTMLElement,
    onNetflix: boolean,
    onWatchPage: boolean,
    enabled: boolean,
    settings: StorageData
  ): void {
    if (onNetflix) {
      if (enabled) {
        if (settings.isWatching && settings.currentlyWatching) {
          // Currently watching something
          statusEl.className = 'status status-active';
          contentEl.innerHTML = `
            <strong>✅ Active on Netflix</strong><br>
            <small><strong> ${settings.currentlyWatching}</strong> (Currently Watching)</small>
          `;
        } else if (onWatchPage) {
          // On watch page but no title yet
          statusEl.className = 'status status-active';
          contentEl.innerHTML = `
            <strong>✅ Active on Netflix</strong><br>
            <small>Loading episode information...</small>
          `;
        } else {
          // On Netflix but not watching
          statusEl.className = 'status status-active';
          contentEl.innerHTML = `
            <strong>✅ Ready on Netflix</strong><br>
            <small>Start watching to see enhanced titles</small>
          `;
        }
      } else {
        statusEl.className = 'status status-inactive';
        contentEl.innerHTML = `
          <strong>⏸️ Disabled on Netflix</strong><br>
          <small>Enable to enhance tab titles</small>
        `;
      }
    } else {
      statusEl.className = 'status status-inactive';
      contentEl.innerHTML = `
        <strong>🌐 Not on Netflix</strong><br>
        <small>Navigate to Netflix to use Titleflix</small>
      `;
    }
  }
});
