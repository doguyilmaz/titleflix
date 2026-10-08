import { beforeEach, describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS, migrateLegacySettings, normalizeSettings } from '../../src/shared/settings';

type Area = Record<string, unknown>;

function fakeArea(data: Area) {
  return {
    data,
    async get(keys: string | string[]) {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    async set(items: Area) {
      Object.assign(data, items);
    },
    async remove(keys: string | string[]) {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
    },
  };
}

let local: ReturnType<typeof fakeArea>;
let sync: ReturnType<typeof fakeArea>;

beforeEach(() => {
  local = fakeArea({});
  sync = fakeArea({});
  (globalThis as { chrome?: unknown }).chrome = { storage: { local, sync } };
});

describe('normalizeSettings', () => {
  test('fills defaults and ignores unknown or mistyped values', () => {
    expect(normalizeSettings(undefined)).toEqual({ ...DEFAULT_SETTINGS });
    expect(normalizeSettings({ enabled: false, showEpisode: 'no', evil: true })).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: false,
    });
  });
});

describe('migrateLegacySettings', () => {
  test('carries over a disabled v1 toggle and deletes v1 keys', async () => {
    Object.assign(local.data, {
      titleflixEnabled: false,
      theme: 'dark',
      systemTheme: 'dark',
      currentlyWatching: 'Some Show: E1',
      isWatching: true,
    });
    await migrateLegacySettings();
    expect(sync.data.settings).toEqual({ ...DEFAULT_SETTINGS, enabled: false });
    expect(local.data).toEqual({});
  });

  test('fresh installs get defaults', async () => {
    await migrateLegacySettings();
    expect(sync.data.settings).toEqual({ ...DEFAULT_SETTINGS });
  });

  test('never overwrites v2 settings', async () => {
    sync.data.settings = { enabled: true, showEpisode: false, appendSuffix: false };
    local.data.titleflixEnabled = false;
    await migrateLegacySettings();
    expect(sync.data.settings).toEqual({ enabled: true, showEpisode: false, appendSuffix: false });
  });
});
