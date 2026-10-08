/**
 * Titleflix content script (isolated world).
 *
 * Keeps the tab title of a Netflix /watch/ page set to what is playing:
 *  - figures out the title from Netflix's player data (via the main-world bridge), the player
 *    controls, the pause overlay or Media Session, keeping the best answer per video;
 *  - re-applies the title whenever Netflix overwrites it;
 *  - follows Netflix's client-side navigation (next episode, back to browse);
 *  - restores Netflix's own title when the user turns Titleflix off or leaves the watch page.
 */
import { createLogger } from '../shared/debug';
import { isGetStateRequest, TAKEOVER_EVENT, type TabState } from '../shared/messages';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged, type Settings } from '../shared/settings';
import {
  contentIdentity,
  formatTitle,
  MAX_RANK,
  SOURCE_RANK,
  watchIdFromPath,
  type TitleInfo,
} from '../shared/title';
import { readMediaSession, readPauseOverlay, readPlayerControls, readPlayerData } from './extract';

const TICK_MS = 500;
const DOM_CHECK_THROTTLE_MS = 250;
/** After navigating, DOM text identical to the previous video's is ignored for this long. */
const STALE_DOM_MS = 5000;
/** Re-apply at most this many times per window when the page keeps overwriting the title. */
const REAPPLY_LIMIT = 20;
const REAPPLY_WINDOW_MS = 2000;
const CACHE_SIZE = 50;

type NavigationLike = EventTarget;

const log = createLogger('content');

function extensionAlive(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

class TitleflixTab {
  private readonly instanceId = crypto.randomUUID();
  private readonly version = chrome.runtime.getManifest().version;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private settingsReady = false;
  private alive = true;

  /** Empty so the first check() picks up the current URL. */
  private href = '';
  private videoId: string | null = null;
  private info: TitleInfo | null = null;
  private readonly cache = new Map<string, TitleInfo>();
  /** contentIdentity() of the video we just left. */
  private previousIdentity: string | null = null;
  private navigatedAt = 0;

  /** The title we are currently enforcing, or null when Netflix's own title is shown. */
  private applied: string | null = null;
  /** The last title Netflix itself set, restored when we stop overriding. */
  private pageTitle = document.title;

  private reapplyCount = 0;
  private reapplyWindowStart = 0;
  private domCheckTimer: number | null = null;
  private tickTimer: number | null = null;
  private titleObserver: MutationObserver | null = null;
  private domObserver: MutationObserver | null = null;
  private readonly cleanups: (() => void)[] = [];

  start(): void {
    // Retire any copy left behind by a previous version of the extension (it restores the
    // page title synchronously, so `pageTitle` below is Netflix's, not a stale override).
    document.dispatchEvent(new CustomEvent(TAKEOVER_EVENT, { detail: this.instanceId }));
    this.pageTitle = document.title;

    this.listen(document, TAKEOVER_EVENT, (event) => {
      if ((event as CustomEvent<unknown>).detail !== this.instanceId) this.destroy();
    });
    this.listen(window, 'popstate', () => this.check());
    this.listen(document, 'visibilitychange', () => this.check());
    const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;
    if (navigation) this.listen(navigation, 'currententrychange', () => this.check());

    this.observeTitle();
    this.listenForPopup();
    this.tickTimer = window.setInterval(() => this.check(), TICK_MS);

    loadSettings()
      .catch(() => ({ ...DEFAULT_SETTINGS })) // Storage hiccup: run with defaults.
      .then((settings) => {
        this.settings = settings;
        this.settingsReady = true;
        this.check();
      });

    try {
      this.cleanups.push(
        onSettingsChanged((settings) => {
          this.settings = settings;
          this.render();
        }),
      );
    } catch {
      this.destroy();
      return;
    }

    this.check();
  }

  /** Main loop: follow navigation, look for a better title, and apply it. */
  private check(): void {
    if (!this.alive) return;
    if (!extensionAlive()) {
      this.destroy();
      return;
    }
    this.syncLocation();
    this.resolve();
    this.render();
  }

  private syncLocation(): void {
    if (location.href === this.href) return;
    this.href = location.href;
    const nextId = watchIdFromPath(location.pathname);
    if (nextId === this.videoId) return;

    this.previousIdentity = contentIdentity(this.info);
    this.navigatedAt = Date.now();
    this.videoId = nextId;
    this.info = nextId ? (this.cache.get(nextId) ?? null) : null;
    this.updateDomObserver();
    log(nextId ? `watching video ${nextId}` : 'not on a watch page', location.pathname);
  }

  /** Read every available source and keep the most trustworthy answer for this video. */
  private resolve(): void {
    const videoId = this.videoId;
    if (!videoId) return;
    const currentRank = this.info ? SOURCE_RANK[this.info.source] : 0;
    if (currentRank >= MAX_RANK) return;

    const fromPlayer = readPlayerData(videoId);
    if (fromPlayer) {
      this.remember(videoId, fromPlayer);
      return;
    }

    const recentlyNavigated = Date.now() - this.navigatedAt < STALE_DOM_MS;
    const candidates = [readPlayerControls(document), readPauseOverlay(document), readMediaSession()];
    for (const candidate of candidates) {
      if (!candidate || SOURCE_RANK[candidate.source] < currentRank) continue;
      // Right after "next episode", the controls may still show the previous episode.
      if (recentlyNavigated && contentIdentity(candidate) === this.previousIdentity) continue;
      this.remember(videoId, candidate);
      return;
    }
  }

  private remember(videoId: string, info: TitleInfo): void {
    if (contentIdentity(info) !== contentIdentity(this.info) || info.source !== this.info?.source) {
      log(`title for video ${videoId} from ${info.source}:`, info);
    }
    this.info = info;
    this.cache.delete(videoId);
    this.cache.set(videoId, info);
    if (this.cache.size > CACHE_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }

  private desiredTitle(): string | null {
    if (!this.settingsReady || !this.settings.enabled || !this.videoId) return null;
    return formatTitle(this.info, this.settings);
  }

  private render(): void {
    if (!this.alive) return;
    const desired = this.desiredTitle();
    if (desired) {
      if (desired !== this.applied) log(`tab title -> "${desired}"`);
      this.applied = desired;
      if (document.title !== desired) document.title = desired;
    } else {
      this.restorePageTitle();
    }
  }

  private restorePageTitle(): void {
    if (this.applied !== null && document.title === this.applied) {
      document.title = this.pageTitle;
      log(`restored Netflix's title "${this.pageTitle}"`);
    }
    this.applied = null;
  }

  /** Netflix rewrites document.title on its own; put ours back immediately (within a budget). */
  private observeTitle(): void {
    this.titleObserver = new MutationObserver(() => {
      if (!this.alive) return;
      const current = document.title;
      if (current === this.applied) return;
      // Anything that isn't our title was set by Netflix; remember it for restoring later.
      this.pageTitle = current;
      // Netflix changes the title right after navigating, so this is the fastest navigation signal.
      if (location.href !== this.href) {
        this.check();
        return;
      }
      if (this.applied === null || !this.withinReapplyBudget()) return; // Next tick catches up.
      log(`Netflix set the title to "${current}", putting ours back`);
      this.render();
    });
    this.titleObserver.observe(document.head ?? document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private withinReapplyBudget(): boolean {
    const now = Date.now();
    if (now - this.reapplyWindowStart > REAPPLY_WINDOW_MS) {
      this.reapplyWindowStart = now;
      this.reapplyCount = 0;
    }
    return ++this.reapplyCount <= REAPPLY_LIMIT;
  }

  /** Only watch the player DOM while on a watch page that still lacks player data. */
  private updateDomObserver(): void {
    const wanted = this.videoId !== null;
    if (wanted && !this.domObserver && document.body) {
      this.domObserver = new MutationObserver(() => this.scheduleDomCheck());
      this.domObserver.observe(document.body, { childList: true, subtree: true });
    } else if (!wanted && this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
  }

  private scheduleDomCheck(): void {
    if (this.domCheckTimer !== null) return;
    if (this.info && SOURCE_RANK[this.info.source] >= MAX_RANK) return;
    this.domCheckTimer = window.setTimeout(() => {
      this.domCheckTimer = null;
      this.check();
    }, DOM_CHECK_THROTTLE_MS);
  }

  private listenForPopup(): void {
    const listener = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: TabState) => void,
    ) => {
      if (sender.id !== chrome.runtime.id || !isGetStateRequest(message)) return;
      this.check();
      sendResponse(this.state());
    };
    chrome.runtime.onMessage.addListener(listener);
    this.cleanups.push(() => chrome.runtime.onMessage.removeListener(listener));
  }

  private state(): TabState {
    return {
      version: this.version,
      enabled: this.settings.enabled,
      page: this.videoId ? 'watch' : 'other',
      appliedTitle: this.applied,
      currentTitle: document.title,
      source: this.applied && this.info ? this.info.source : null,
    };
  }

  private listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler);
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }

  destroy(): void {
    if (!this.alive) return;
    log('stopping this copy (extension reloaded, updated or disabled)');
    this.alive = false;
    this.restorePageTitle();
    this.titleObserver?.disconnect();
    this.domObserver?.disconnect();
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    if (this.domCheckTimer !== null) clearTimeout(this.domCheckTimer);
    for (const cleanup of this.cleanups.splice(0)) {
      try {
        cleanup();
      } catch {
        // chrome.* listeners throw once the extension context is gone; nothing left to undo.
      }
    }
  }
}

new TitleflixTab().start();
