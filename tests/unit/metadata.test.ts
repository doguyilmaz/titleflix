import { describe, expect, test } from 'bun:test';
import { findPlayerInfo, matchVideo, readPlayerInfo } from '../../src/shared/metadata';

const show = {
  type: 'show',
  title: 'Stranger Things',
  id: 80057281,
  currentEpisode: 80077209,
  seasons: [
    {
      seq: 1,
      episodes: [
        { id: 80077209, episodeId: 80077209, seq: 1, title: 'Chapter One: The Vanishing of Will Byers' },
        { id: 80077210, episodeId: 80077210, seq: 2, title: 'Chapter Two: The Weirdo on Maple Street' },
      ],
    },
    { seq: 2, episodes: [{ id: 80117800, seq: 1, title: 'Chapter One: MADMAX' }] },
  ],
};

const movie = { type: 'movie', title: 'The Irishman', id: 80175798 };

/** The shape Netflix's player state is known to use. */
function playerState(videoMetadata: unknown) {
  return {
    netflix: {
      appContext: {
        state: {
          playerApp: {
            getState: () => ({ videoPlayer: { videoMetadata } }),
          },
        },
      },
    },
  };
}

describe('matchVideo', () => {
  test('finds an episode by id', () => {
    expect(matchVideo(show, '80077210')).toEqual({
      title: 'Stranger Things',
      season: 1,
      episode: 2,
      episodeTitle: 'Chapter Two: The Weirdo on Maple Street',
    });
  });

  test('finds an episode in a later season', () => {
    expect(matchVideo(show, '80117800')).toMatchObject({ season: 2, episode: 1, episodeTitle: 'Chapter One: MADMAX' });
  });

  test('a show opened by its own id resolves to the current episode', () => {
    expect(matchVideo(show, '80057281')).toMatchObject({ season: 1, episode: 1 });
  });

  test('matches a movie', () => {
    expect(matchVideo(movie, '80175798')).toEqual({ title: 'The Irishman' });
  });

  test('hides numbers when Netflix hides them', () => {
    const limited = { ...show, hiddenEpisodeNumbers: true };
    expect(matchVideo(limited, '80077210')).toEqual({
      title: 'Stranger Things',
      episodeTitle: 'Chapter Two: The Weirdo on Maple Street',
    });
  });

  test('returns null for an unrelated id', () => {
    expect(matchVideo(show, '1')).toBeNull();
    expect(matchVideo(movie, '1')).toBeNull();
  });
});

describe('findPlayerInfo', () => {
  test.each([
    ['_metadata.video', { _metadata: { video: show } }],
    ['metadata.video', { metadata: { video: show } }],
    ['_video', { _video: show }],
    ['video', { video: show }],
    ['bare', show],
  ])('understands the %s wrapper', (_name, entry) => {
    expect(findPlayerInfo({ 80057281: entry }, '80077210')).toMatchObject({ episode: 2 });
  });

  test('scans entries keyed by something else', () => {
    const container = { 80175798: { _metadata: { video: movie } }, 80057281: { _metadata: { video: show } } };
    expect(findPlayerInfo(container, '80117800')).toMatchObject({ season: 2 });
  });

  test('tolerates junk input', () => {
    for (const junk of [null, undefined, 42, 'x', [], {}, { a: null }, { a: { title: 5 } }]) {
      expect(findPlayerInfo(junk, '80077210')).toBeNull();
    }
  });
});

describe('readPlayerInfo', () => {
  test('reads Netflix player state', () => {
    const win = playerState({ 80057281: { _metadata: { video: show } } });
    expect(readPlayerInfo(win, '80077209')).toMatchObject({ title: 'Stranger Things', season: 1, episode: 1 });
  });

  test('returns null when Netflix globals are missing or throw', () => {
    expect(readPlayerInfo({}, '1')).toBeNull();
    expect(readPlayerInfo(null, '1')).toBeNull();
    const throwing = {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getState: () => {
                throw new Error('boom');
              },
            },
          },
        },
      },
    };
    expect(readPlayerInfo(throwing, '1')).toBeNull();
    const getter = {
      get netflix(): never {
        throw new Error('nope');
      },
    };
    expect(readPlayerInfo(getter, '1')).toBeNull();
  });
});
