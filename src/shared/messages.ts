import type { TitleSource } from './title';

/** Popup -> content script. */
export interface GetStateRequest {
  type: 'titleflix:get-state';
}

export type PageKind = 'watch' | 'other';

/** Content script -> popup. Never persisted anywhere. */
export interface TabState {
  version: string;
  enabled: boolean;
  page: PageKind;
  /** The title Titleflix is applying to the tab, or null when it is not overriding. */
  appliedTitle: string | null;
  /** The tab's current document.title. */
  currentTitle: string;
  source: TitleSource | null;
}

export function isGetStateRequest(message: unknown): message is GetStateRequest {
  return (
    !!message &&
    typeof message === 'object' &&
    (message as { type?: unknown }).type === 'titleflix:get-state'
  );
}

/**
 * DOM event names shared by the isolated-world content script and the main-world bridge.
 * Event details are JSON strings because objects do not cross JS worlds.
 */
export const BRIDGE_REQUEST = 'titleflix:bridge-request';
export const BRIDGE_RESPONSE = 'titleflix:bridge-response';
export const TAKEOVER_EVENT = 'titleflix:takeover';

export interface BridgeRequest {
  nonce: string;
  videoId: string;
}

export interface BridgeResponse {
  nonce: string;
  videoId: string;
  title?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
}
