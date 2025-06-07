interface IconPaths {
  [size: string]: string;
}

const ICONS = {
  light: {
    '16': 'icons/titleflix16_light.png',
    '32': 'icons/titleflix32_light.png',
    '48': 'icons/titleflix48_light.png',
    '128': 'icons/titleflix128_light.png'
  } as IconPaths,
  dark: {
    '16': 'icons/titleflix16_dark.png',
    '32': 'icons/titleflix32_dark.png',
    '48': 'icons/titleflix48_dark.png',
    '128': 'icons/titleflix128_dark.png'
  } as IconPaths
};

async function updateIcon(theme?: 'auto' | 'light' | 'dark'): Promise<void> {
  try {
    let iconSet: IconPaths;
    let isDark = false;
    
    if (!theme || theme === 'auto') {
      // Auto-detect system theme
      isDark = await matchesSystemDarkMode();
      iconSet = isDark ? ICONS.dark : ICONS.light;
    } else {
      isDark = theme === 'dark';
      iconSet = theme === 'dark' ? ICONS.dark : ICONS.light;
    }
    
    await chrome.action.setIcon({ path: iconSet });
    console.log('Icon updated to:', theme || 'auto', isDark ? 'dark' : 'light');
  } catch (error) {
    console.error('Failed to update icon:', error);
  }
}

async function matchesSystemDarkMode(): Promise<boolean> {
  try {
    // In a service worker, we can't directly access window.matchMedia
    // So we'll use the stored system theme from popup
    const settings = await chrome.storage.local.get(['systemTheme']);
    return settings.systemTheme === 'dark';
  } catch {
    return true; // Default to dark if detection fails
  }
}

// Listen for theme changes from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'THEME_CHANGED') {
    updateIcon(message.theme);
    sendResponse({ success: true });
  }
});

// Listen for storage changes (when theme is updated)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.theme) {
    updateIcon(changes.theme.newValue);
  }
});

// Set initial icon when extension starts
chrome.runtime.onStartup.addListener(async () => {
  const settings = await chrome.storage.local.get(['theme']);
  updateIcon(settings.theme || 'auto');
});

// Set initial icon when extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get(['theme']);
  updateIcon(settings.theme || 'auto');
});