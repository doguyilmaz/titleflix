/**
 * Readers for the different places a Netflix watch page exposes what is playing.
 * Each returns null when its source is missing; the controller keeps the best result per video.
 */
import {
  BRIDGE_REQUEST,
  BRIDGE_RESPONSE,
  type BridgeRequest,
  type BridgeResponse,
} from '../shared/messages';
import { cleanText, isJunkText, parseEpisodeLabel, stripSuffix, type TitleInfo } from '../shared/title';

function text(el: Element | null | undefined): string {
  return stripSuffix(cleanText(el?.textContent ?? ''));
}

function usable(value: string): boolean {
  return value.length > 0 && !isJunkText(value);
}

/**
 * Player controls (visible while the mouse moves over the player):
 *   <div data-uia="video-title"><h4>Show</h4><span>E3</span><span>Episode title</span></div>
 * Movies have only the <h4>, or plain text.
 */
export function readPlayerControls(root: ParentNode): TitleInfo | null {
  const container = root.querySelector('[data-uia="video-title"]');
  if (!container) return null;

  const heading = container.querySelector('h1, h2, h3, h4');
  const title = text(heading);
  if (!usable(title)) {
    // Some layouts render the movie name as bare text with no heading.
    const whole = text(container);
    return !heading && usable(whole) ? { title: whole, source: 'player-controls' } : null;
  }

  const info: TitleInfo = { title, source: 'player-controls' };
  const parts: string[] = [];
  for (const span of Array.from(container.querySelectorAll('span'))) {
    // Only leaf spans, so nested wrappers don't duplicate text.
    if (span.querySelector('span')) continue;
    const part = text(span);
    if (part && part !== title && !parts.includes(part)) parts.push(part);
  }

  const [first, ...rest] = parts;
  const parsed = first !== undefined ? parseEpisodeLabel(first) : null;
  if (parsed) {
    if (parsed.season !== undefined) info.season = parsed.season;
    if (parsed.episode !== undefined) info.episode = parsed.episode;
    if (rest.length) info.episodeTitle = rest.join(' ');
  } else if (first !== undefined && /^\p{L}{1,3}\.?\s?\d{1,4}$/u.test(first)) {
    // Localised short labels like "B3" (Turkish) or "F3" (German).
    info.episodeLabel = first;
    if (rest.length) info.episodeTitle = rest.join(' ');
  } else if (parts.length) {
    info.episodeTitle = parts.join(' ');
  }
  return info;
}

/** Overlay shown after the video has been paused for a while: "You're watching <h2>Show</h2>". */
export function readPauseOverlay(root: ParentNode): TitleInfo | null {
  const overlay =
    root.querySelector('[data-uia="evidence-overlay"]') ??
    root.querySelector('.watch-video--evidence-overlay-container');
  if (!overlay) return null;
  const title = text(overlay.querySelector('h2') ?? overlay.querySelector('h3'));
  return usable(title) ? { title, source: 'pause-overlay' } : null;
}

/**
 * Ask the main-world bridge for Netflix's player metadata. Event dispatch is synchronous, so the
 * answer (if any) has arrived by the time dispatchEvent returns.
 */
export function readPlayerData(videoId: string, doc: Document = document): TitleInfo | null {
  const nonce = crypto.randomUUID();
  let response: BridgeResponse | null = null;

  const onResponse = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (typeof detail !== 'string' || detail.length > 4000) return;
    try {
      const parsed = JSON.parse(detail) as BridgeResponse;
      if (parsed.nonce === nonce && parsed.videoId === videoId) response = parsed;
    } catch {
      // Ignore malformed responses.
    }
  };

  doc.addEventListener(BRIDGE_RESPONSE, onResponse);
  try {
    const request: BridgeRequest = { nonce, videoId };
    doc.dispatchEvent(new CustomEvent(BRIDGE_REQUEST, { detail: JSON.stringify(request) }));
  } finally {
    doc.removeEventListener(BRIDGE_RESPONSE, onResponse);
  }

  return toTitleInfo(response);
}

function toTitleInfo(response: BridgeResponse | null): TitleInfo | null {
  if (!response) return null;
  const title = stripSuffix(cleanText(response.title));
  if (!title || /^netflix$/i.test(title)) return null;
  const info: TitleInfo = { title, source: 'player-data' };
  const episodeTitle = cleanText(response.episodeTitle);
  if (episodeTitle) info.episodeTitle = episodeTitle;
  if (Number.isInteger(response.season) && response.season! >= 0) info.season = response.season;
  if (Number.isInteger(response.episode) && response.episode! >= 0) info.episode = response.episode;
  return info;
}
