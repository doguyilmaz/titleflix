/** User preferences, stored in chrome.storage.sync so they follow the user's Chrome profile. */
export interface Settings {
  enabled: boolean;
  showEpisode: boolean;
  appendSuffix: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enabled: true,
  showEpisode: true,
  appendSuffix: true,
});

const KEY = 'settings';

/** Accept only known boolean keys; anything else falls back to defaults. */
export function normalizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      const value = (raw as Record<string, unknown>)[key];
      if (typeof value === 'boolean') out[key] = value;
    }
  }
  return out;
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEY);
  return normalizeSettings(stored[KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await loadSettings()), ...patch });
  await chrome.storage.sync.set({ [KEY]: next });
  return next;
}

export function onSettingsChanged(callback: (settings: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'sync' && KEY in changes) callback(normalizeSettings(changes[KEY]?.newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

/**
 * One-time migration from v1 (chrome.storage.local, flat keys) to v2.
 * Also deletes the v1 "currently watching" keys, which stored viewing info on disk.
 */
export async function migrateLegacySettings(): Promise<void> {
  const legacyKeys = ['titleflixEnabled', 'theme', 'systemTheme', 'currentlyWatching', 'isWatching'];
  const legacy = await chrome.storage.local.get(legacyKeys);
  const existing = await chrome.storage.sync.get(KEY);
  if (!(KEY in existing)) {
    const enabled = legacy.titleflixEnabled !== false;
    await chrome.storage.sync.set({ [KEY]: normalizeSettings({ ...DEFAULT_SETTINGS, enabled }) });
  }
  await chrome.storage.local.remove(legacyKeys);
}
