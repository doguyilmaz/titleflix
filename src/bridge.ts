/**
 * Runs in the page's MAIN world so it can read Netflix's player state, which the isolated
 * content script cannot see. It only answers synchronous queries from the content script and
 * never touches the page otherwise. It has no access to chrome.* APIs.
 */
import { readPlayerInfo } from './shared/metadata';
import { BRIDGE_REQUEST, BRIDGE_RESPONSE, type BridgeRequest, type BridgeResponse } from './shared/messages';

const GLOBAL_KEY = '__titleflixBridge';

type BridgeHandle = { dispose: () => void };
const win = window as unknown as Record<string, BridgeHandle | undefined>;

// Re-injection after an extension update: retire the previous copy first.
try {
  win[GLOBAL_KEY]?.dispose();
} catch {
  // A broken previous handle must not stop this copy from installing.
}

function onRequest(event: Event): void {
  const detail = (event as CustomEvent<unknown>).detail;
  if (typeof detail !== 'string' || detail.length > 200) return;

  let request: BridgeRequest;
  try {
    request = JSON.parse(detail) as BridgeRequest;
  } catch {
    return;
  }
  if (typeof request.nonce !== 'string' || typeof request.videoId !== 'string') return;
  if (!/^\d{1,15}$/.test(request.videoId)) return;

  const info = readPlayerInfo(window, request.videoId);
  const response: BridgeResponse = { nonce: request.nonce, videoId: request.videoId, ...info };
  document.dispatchEvent(new CustomEvent(BRIDGE_RESPONSE, { detail: JSON.stringify(response) }));
}

document.addEventListener(BRIDGE_REQUEST, onRequest);

Object.defineProperty(window, GLOBAL_KEY, {
  configurable: true,
  enumerable: false,
  value: { dispose: () => document.removeEventListener(BRIDGE_REQUEST, onRequest) },
});
