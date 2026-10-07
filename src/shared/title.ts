/**
 * Pure helpers for turning raw Netflix text/metadata into a tab title.
 * No DOM or chrome.* access here so everything is unit-testable.
 */

/** Where a title came from, ordered from least to most trustworthy. */
export type TitleSource = 'media-session' | 'pause-overlay' | 'player-controls' | 'player-data';

export const SOURCE_RANK: Record<TitleSource, number> = {
  'media-session': 1,
  'pause-overlay': 1,
  'player-controls': 2,
  'player-data': 3,
};

export const MAX_RANK = SOURCE_RANK['player-data'];

export interface TitleInfo {
  /** Show or movie name. */
  title: string;
  season?: number;
  episode?: number;
  /** Free-form episode label when numbers are unknown (e.g. "E3", "B3", "Ep. 3"). */
  episodeLabel?: string;
  episodeTitle?: string;
  source: TitleSource;
}

export interface FormatOptions {
  showEpisode: boolean;
  appendSuffix: boolean;
}

export const SUFFIX = ' - Netflix';
const MAX_TITLE_LENGTH = 200;

// C0/C1 control characters plus zero-width / line-separator chars that render as junk in a tab.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b\u2028\u2029\ufeff]/g;

/** Collapse whitespace, strip control characters and cap the length. */
export function cleanText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const text = raw.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…` : text;
}

// Deliberately does not reject plain numbers: "1899", "1917" and "300" are real titles.
const JUNK_PATTERNS: RegExp[] = [
  /^netflix$/i,
  /^rated\s+\S+$/i, // "RATED 18+"
  /^\d{1,2}\s*\+$/, // "16+"
  /^(tv-[a-z0-9]+|pg(-\d+)?|r|nc-17|g|u|uc|12a)$/i, // maturity ratings
  /^(\d+\s*h(ours?)?)?\s*(\d+\s*m(in(utes?)?)?)?$/i, // "1h 32m", "45 min"
  /^[^\p{L}\p{N}]+$/u, // only symbols/punctuation
  /^(you'?re watching|paused|playing|loading|buffering|skip intro|skip recap|next episode|back to browse|episodes|audio (&|and) subtitles)$/i,
];

/** True when text is UI chrome (ratings, durations, player labels) rather than a title. */
export function isJunkText(raw: string): boolean {
  const text = stripSuffix(cleanText(raw));
  if (text.length < 1) return true;
  return JUNK_PATTERNS.some((re) => re.test(text));
}

/** Remove a trailing " - Netflix" / " | Netflix" so we never double it up. */
export function stripSuffix(text: string): string {
  return text.replace(/\s*[-–|·]\s*Netflix$/i, '').trim();
}

/** Recognise "S1:E3", "S1 E3", "E3", "Ep. 3", "Episode 3" style labels. */
export function parseEpisodeLabel(raw: string): { season?: number; episode?: number } | null {
  const text = cleanText(raw);
  const m =
    /^(?:s(?:eason)?\s*(\d{1,3})\s*[:.,]?\s*)?(?:e|ep\.?|episode)\s*(\d{1,4})$/i.exec(text);
  if (!m) return null;
  const result: { season?: number; episode?: number } = { episode: Number(m[2]) };
  if (m[1] !== undefined) result.season = Number(m[1]);
  return result;
}

function episodeCode(info: TitleInfo): string {
  if (info.episode !== undefined) {
    return info.season !== undefined ? `S${info.season}:E${info.episode}` : `E${info.episode}`;
  }
  return info.episodeLabel ?? '';
}

/**
 * Build the tab title, e.g. "Dark: S1:E2 Lies - Netflix".
 * Returns null when there is nothing meaningful to show.
 */
export function formatTitle(info: TitleInfo | null | undefined, opts: FormatOptions): string | null {
  if (!info) return null;
  const title = stripSuffix(cleanText(info.title));
  if (!title || isJunkText(title)) return null;

  let result = title;
  if (opts.showEpisode) {
    const code = cleanText(episodeCode(info));
    const episodeTitle = cleanText(info.episodeTitle);
    const detail = [code, episodeTitle && episodeTitle !== title ? episodeTitle : '']
      .filter(Boolean)
      .join(' ');
    if (detail) result = `${title}: ${detail}`;
  }

  result = cleanText(result);
  return opts.appendSuffix ? `${result}${SUFFIX}` : result;
}

/** Extract the numeric video id from a Netflix watch URL path ("/watch/80057281"). */
export function watchIdFromPath(pathname: string): string | null {
  const m = /^\/watch\/(\d{1,15})(?:[/?#]|$)/.exec(pathname);
  return m?.[1] ?? null;
}

/**
 * Which piece of content a TitleInfo points at, ignoring episode numbering (which differs by
 * source). Used to spot the previous video's title lingering in the page after navigation.
 */
export function contentIdentity(info: TitleInfo | null): string | null {
  if (!info) return null;
  const title = stripSuffix(cleanText(info.title)).toLowerCase();
  if (!title) return null;
  return `${title}\n${cleanText(info.episodeTitle).toLowerCase()}`;
}
