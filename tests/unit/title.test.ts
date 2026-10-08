import { describe, expect, test } from 'bun:test';
import {
  cleanText,
  contentIdentity,
  formatTitle,
  isJunkText,
  parseEpisodeLabel,
  stripSuffix,
  watchIdFromPath,
  type TitleInfo,
} from '../../src/shared/title';

const ALL = { showEpisode: true, appendSuffix: true };

describe('cleanText', () => {
  test('collapses whitespace and strips control characters', () => {
    expect(cleanText('  Stranger\n\tThings\u0000 ​ ')).toBe('Stranger Things');
  });

  test('rejects non-strings', () => {
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(42)).toBe('');
    expect(cleanText({ toString: () => 'x' })).toBe('');
  });

  test('caps very long text', () => {
    const result = cleanText('a'.repeat(1000));
    expect(result.length).toBe(200);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('isJunkText', () => {
  test.each([
    'Netflix',
    'RATED 18+',
    '16+',
    'TV-MA',
    'PG-13',
    'NC-17',
    '1h 32m',
    '45 min',
    '○ △ □',
    "You're watching",
    'Skip Intro',
    'Next Episode',
    '',
    '   ',
    '18+ - Netflix',
  ])('%p is junk', (text) => {
    expect(isJunkText(text)).toBe(true);
  });

  test.each(['Stranger Things', '1899', '1917', '300', '9', 'Us', 'Hours', 'Love, Death & Robots', 'Ç'])(
    '%p is a real title',
    (text) => {
      expect(isJunkText(text)).toBe(false);
    },
  );
});

describe('stripSuffix', () => {
  test.each([
    ['Wednesday - Netflix', 'Wednesday'],
    ['Wednesday | Netflix', 'Wednesday'],
    ['Wednesday – Netflix', 'Wednesday'],
    ['Netflix Nation', 'Netflix Nation'],
  ])('%p -> %p', (input, expected) => {
    expect(stripSuffix(input)).toBe(expected);
  });
});

describe('parseEpisodeLabel', () => {
  test.each([
    ['E3', { episode: 3 }],
    ['S2:E10', { season: 2, episode: 10 }],
    ['S2 E10', { season: 2, episode: 10 }],
    ['Ep. 4', { episode: 4 }],
    ['Episode 12', { episode: 12 }],
    ['Season 3: Episode 1', { season: 3, episode: 1 }],
  ])('%p', (label, expected) => {
    expect(parseEpisodeLabel(label)).toEqual(expected);
  });

  test.each(['The Pollywog', 'B3', 'Chapter One', '2016'])('%p is not an episode label', (label) => {
    expect(parseEpisodeLabel(label)).toBeNull();
  });
});

describe('formatTitle', () => {
  const episode: TitleInfo = {
    title: 'Stranger Things',
    season: 1,
    episode: 3,
    episodeTitle: 'Holly, Jolly',
    source: 'player-data',
  };

  test('show with season and episode', () => {
    expect(formatTitle(episode, ALL)).toBe('Stranger Things: S1:E3 Holly, Jolly - Netflix');
  });

  test('respects showEpisode and appendSuffix', () => {
    expect(formatTitle(episode, { showEpisode: false, appendSuffix: true })).toBe('Stranger Things - Netflix');
    expect(formatTitle(episode, { showEpisode: true, appendSuffix: false })).toBe(
      'Stranger Things: S1:E3 Holly, Jolly',
    );
  });

  test('episode number without season (player controls)', () => {
    const info: TitleInfo = { title: 'Devil May Cry', episode: 1, episodeTitle: 'Inferno', source: 'player-controls' };
    expect(formatTitle(info, ALL)).toBe('Devil May Cry: E1 Inferno - Netflix');
  });

  test('localised episode label', () => {
    const info: TitleInfo = { title: 'Kuroko', episodeLabel: 'B26', episodeTitle: 'En İyi Hediye', source: 'player-controls' };
    expect(formatTitle(info, ALL)).toBe('Kuroko: B26 En İyi Hediye - Netflix');
  });

  test('movie', () => {
    expect(formatTitle({ title: '1917', source: 'player-data' }, ALL)).toBe('1917 - Netflix');
  });

  test('never doubles the suffix', () => {
    expect(formatTitle({ title: 'Dark - Netflix', source: 'pause-overlay' }, ALL)).toBe('Dark - Netflix');
  });

  test('drops an episode title equal to the show title', () => {
    const info: TitleInfo = { title: 'Dark', episodeTitle: 'Dark', source: 'player-controls' };
    expect(formatTitle(info, ALL)).toBe('Dark - Netflix');
  });

  test('returns null for missing or junk titles', () => {
    expect(formatTitle(null, ALL)).toBeNull();
    expect(formatTitle({ title: 'RATED 18+', source: 'player-controls' }, ALL)).toBeNull();
    expect(formatTitle({ title: '   ', source: 'player-controls' }, ALL)).toBeNull();
    expect(formatTitle({ title: 'Netflix', source: 'pause-overlay' }, ALL)).toBeNull();
  });

  test('output is plain text even for markup-like titles', () => {
    const info: TitleInfo = { title: '<img src=x onerror=alert(1)>', source: 'player-controls' };
    expect(formatTitle(info, { showEpisode: true, appendSuffix: false })).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('watchIdFromPath', () => {
  test.each([
    ['/watch/80057281', '80057281'],
    ['/watch/80057281/', '80057281'],
    ['/watch/80057281?trackId=1', '80057281'],
  ])('%p -> %p', (path, id) => {
    expect(watchIdFromPath(path)).toBe(id);
  });

  test.each(['/browse', '/title/80057281', '/watch/', '/watch/abc', '/tr/watch/123'])('%p -> null', (path) => {
    expect(watchIdFromPath(path)).toBeNull();
  });
});

describe('contentIdentity', () => {
  test('ignores numbering and source so stale on-screen text matches player data', () => {
    const fromPlayer: TitleInfo = { title: 'Dark', season: 1, episode: 2, episodeTitle: 'Lies', source: 'player-data' };
    const fromControls: TitleInfo = { title: 'Dark', episode: 2, episodeTitle: 'Lies', source: 'player-controls' };
    expect(contentIdentity(fromPlayer)).toBe(contentIdentity(fromControls));
  });

  test('distinguishes episodes and shows', () => {
    const a: TitleInfo = { title: 'Dark', episodeTitle: 'Lies', source: 'player-controls' };
    const b: TitleInfo = { title: 'Dark', episodeTitle: 'Past and Present', source: 'player-controls' };
    const show: TitleInfo = { title: 'Dark', source: 'pause-overlay' };
    expect(contentIdentity(a)).not.toBe(contentIdentity(b));
    expect(contentIdentity(a)).not.toBe(contentIdentity(show));
    expect(contentIdentity(null)).toBeNull();
  });
});
