/**
 * Reads show/episode info out of Netflix's player metadata.
 *
 * Netflix keeps the response of its `metadata?movieid=` call in the player state
 * (`netflix.appContext.state.playerApp.getState().videoPlayer.videoMetadata`). Its shape is
 * internal and can change at any time, so everything here is defensive: unknown shapes return
 * null and the content script falls back to reading the page.
 */

export interface PlayerInfo {
  title: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}

type Obj = Record<string, unknown>;

const MAX_SEASONS = 200;
const MAX_EPISODES = 5000;

function asObj(value: unknown): Obj | null {
  return value !== null && typeof value === 'object' ? (value as Obj) : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function sameId(value: unknown, id: string): boolean {
  return (typeof value === 'number' || typeof value === 'string') && String(value) === id;
}

/** Netflix wraps the API response differently across player versions; try the known wrappers. */
function videoCandidates(entry: unknown): Obj[] {
  const e = asObj(entry);
  if (!e) return [];
  const meta = asObj(e._metadata) ?? asObj(e.metadata);
  return [asObj(meta?.video), asObj(e._video), asObj(e.video), e].filter(
    (v): v is Obj => v !== null && typeof v.title === 'string',
  );
}

/** Match one metadata `video` object against the id in the /watch/ URL. */
export function matchVideo(video: Obj, videoId: string): PlayerInfo | null {
  const title = str(video.title);
  if (!title) return null;

  const seasons = Array.isArray(video.seasons) ? video.seasons.slice(0, MAX_SEASONS) : [];
  let scanned = 0;
  for (const rawSeason of seasons) {
    const season = asObj(rawSeason);
    const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
    for (const rawEpisode of episodes) {
      if (++scanned > MAX_EPISODES) return null;
      const episode = asObj(rawEpisode);
      if (!episode) continue;
      if (sameId(episode.id, videoId) || sameId(episode.episodeId, videoId)) {
        const hideNumbers = video.hiddenEpisodeNumbers === true || season?.hiddenEpisodeNumbers === true;
        const info: PlayerInfo = { title };
        const episodeTitle = str(episode.title);
        if (episodeTitle) info.episodeTitle = episodeTitle;
        if (!hideNumbers) {
          const seasonSeq = num(season?.seq);
          const episodeSeq = num(episode.seq);
          if (seasonSeq !== undefined) info.season = seasonSeq;
          if (episodeSeq !== undefined) info.episode = episodeSeq;
        }
        return info;
      }
    }
  }

  // Movies match on the top-level id. A show opened by its own id plays `currentEpisode`.
  if (sameId(video.id, videoId)) {
    const current = video.currentEpisode;
    if ((typeof current === 'number' || typeof current === 'string') && !sameId(current, videoId)) {
      const episodeInfo = matchVideo(video, String(current));
      if (episodeInfo) return episodeInfo;
    }
    return { title };
  }
  return null;
}

/** Search every cached metadata entry for the video currently in the URL. */
export function findPlayerInfo(videoMetadata: unknown, videoId: string): PlayerInfo | null {
  const container = asObj(videoMetadata);
  if (!container) return null;

  // Prefer the entry keyed by the id itself, then scan the rest (episodes are often keyed by show).
  const entries = [container[videoId], ...Object.values(container)];
  for (const entry of entries.slice(0, 100)) {
    for (const video of videoCandidates(entry)) {
      const info = matchVideo(video, videoId);
      if (info) return info;
    }
  }
  return null;
}

/** Read Netflix's player state from the page's `window`. Main world only. */
export function readPlayerInfo(win: unknown, videoId: string): PlayerInfo | null {
  try {
    const netflix = asObj(asObj(win)?.netflix);
    const playerApp = asObj(asObj(asObj(netflix?.appContext)?.state)?.playerApp);
    const getState = playerApp?.getState;
    if (typeof getState !== 'function') return null;
    const state = asObj(getState.call(playerApp));
    return findPlayerInfo(asObj(state?.videoPlayer)?.videoMetadata, videoId);
  } catch {
    return null;
  }
}

/**
 * Key names (never values) along the player-data path, for the debug log. Lets a tester report
 * how Netflix's structure looks today when findPlayerInfo() doesn't match it.
 */
export function describePlayerState(win: unknown): Record<string, unknown> {
  const report: Record<string, unknown> = {};
  try {
    const netflix = asObj(asObj(win)?.netflix);
    report.netflix = netflix ? Object.keys(netflix).slice(0, 20) : 'missing';
    const playerApp = asObj(asObj(asObj(netflix?.appContext)?.state)?.playerApp);
    report.playerApp = playerApp ? Object.keys(playerApp).slice(0, 20) : 'missing';
    if (typeof playerApp?.getState !== 'function') return report;
    const state = asObj(playerApp.getState.call(playerApp));
    report.state = state ? Object.keys(state).slice(0, 20) : 'missing';
    const videoPlayer = asObj(state?.videoPlayer);
    report.videoPlayer = videoPlayer ? Object.keys(videoPlayer).slice(0, 20) : 'missing';
    const container = asObj(videoPlayer?.videoMetadata);
    report.videoMetadataIds = container ? Object.keys(container).slice(0, 10) : 'missing';
    const first = asObj(container ? Object.values(container)[0] : null);
    if (first) {
      report.entry = Object.keys(first).slice(0, 20);
      const meta = asObj(first._metadata) ?? asObj(first.metadata);
      if (meta) report.entryMetadata = Object.keys(meta).slice(0, 20);
      const video = asObj(meta?.video) ?? asObj(first._video) ?? asObj(first.video);
      if (video) report.video = Object.keys(video).slice(0, 40);
    }
  } catch (error) {
    report.error = String(error);
  }
  return report;
}
