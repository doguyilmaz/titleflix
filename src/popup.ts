interface StorageData {
  titleflixEnabled?: boolean;
  theme?: 'auto' | 'light' | 'dark';
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusContent = document.getElementById('status-content');
  const enableToggle = document.getElementById('enableToggle');
  const themeAuto = document.getElementById('themeAuto');
  const themeLight = document.getElementById('themeLight');
  const themeDark = document.getElementById('themeDark');

  if (!statusElement || !statusContent || !enableToggle || !themeAuto || !themeLight || !themeDark) {
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

  // Check if we're on Netflix
  let isNetflix = false;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      isNetflix = tab.url.includes('netflix.com');
    }
  } catch (error) {
    console.error('Error getting tab info:', error);
  }

  // Update enable toggle state and status
  updateToggleState(enableToggle, settings.titleflixEnabled !== false, isNetflix, true);
  updateStatus(statusElement, statusContent, isNetflix, settings.titleflixEnabled !== false);

  // Enable toggle click handler
  enableToggle.addEventListener('click', async () => {
    if (!isNetflix) return; // Don't allow toggle if not on Netflix
    
    const newState = !enableToggle.classList.contains('active');
    await chrome.storage.local.set({ titleflixEnabled: newState });
    
    updateToggleState(enableToggle, newState, isNetflix, false);
    updateStatus(statusElement, statusContent, isNetflix, newState);
    
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
      return await chrome.storage.local.get(['titleflixEnabled', 'theme']);
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
    [themeAuto, themeLight, themeDark].forEach(btn => btn?.classList.remove('active'));
    
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

  function updateToggleState(toggle: HTMLElement, enabled: boolean, onNetflix: boolean, isInitial = false): void {
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
    enabled: boolean
  ): void {
    if (onNetflix) {
      if (enabled) {
        statusEl.className = 'status status-active';
        contentEl.innerHTML = `
          <strong>✅ Active on Netflix</strong><br>
          <small>Tab titles are being enhanced</small>
        `;
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