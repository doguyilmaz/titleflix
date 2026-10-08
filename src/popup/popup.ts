import type { GetStateRequest, TabState } from '../shared/messages';
import { loadSettings, saveSettings, type Settings } from '../shared/settings';
import { formatTitle, SUFFIX, type TitleInfo, type TitleSource } from '../shared/title';

type ViewState = 'loading' | 'live' | 'searching' | 'idle' | 'off' | 'not-netflix' | 'unreachable';

const REFRESH_MS = 1000;
const REPO = 'https://github.com/doguyilmaz/titleflix';
const EXAMPLE: TitleInfo = { title: 'Dark', season: 1, episode: 2, episodeTitle: 'Lies', source: 'player-data' };

const SOURCE_LABEL: Record<TitleSource, string> = {
  'player-data': 'from player data',
  'player-controls': 'from player controls',
  'pause-overlay': 'from pause screen',
};

const STATUS_LABEL: Record<ViewState, string> = {
  loading: 'Checking',
  live: 'Renaming this tab',
  searching: 'Finding the title',
  idle: 'Ready',
  off: 'Off',
  'not-netflix': 'Not on Netflix',
  unreachable: 'Not running here',
};

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const ui = {
  version: $('version'),
  now: $('now'),
  tabText: $('tabText'),
  label: $('statusLabel'),
  source: $('source'),
  titleMain: $('titleMain'),
  titleSuffix: $('titleSuffix'),
  hint: $('hint'),
  action: $<HTMLButtonElement>('actionBtn'),
  report: $<HTMLAnchorElement>('reportLink'),
  settings: $('settings'),
  example: $('example'),
  pane: document.querySelector<HTMLElement>('.pane')!,
  toggles: {
    enabled: $<HTMLInputElement>('enabled'),
    showEpisode: $<HTMLInputElement>('showEpisode'),
    appendSuffix: $<HTMLInputElement>('appendSuffix'),
  } satisfies Record<keyof Settings, HTMLInputElement>,
};

const version = chrome.runtime.getManifest().version;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let tabId: number | undefined;
let injectionTried = false;
let last: { key: string; view: ViewState; tabText: string } | null = null;

function isNetflixUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname === 'www.netflix.com';
  } catch {
    return false;
  }
}

async function activeNetflixTab(): Promise<{ id: number } | 'other'> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // tab.url is only visible for sites we have host permission for, i.e. Netflix.
  if (tab?.id === undefined || !isNetflixUrl(tab.url)) return 'other';
  return { id: tab.id };
}

async function requestState(id: number): Promise<TabState | null> {
  try {
    const request: GetStateRequest = { type: 'titleflix:get-state' };
    const state = (await chrome.tabs.sendMessage(id, request)) as TabState | undefined;
    return state ?? null;
  } catch {
    return null;
  }
}

/** Start Titleflix in a tab that was open before install and couldn't be injected then. */
async function tryInject(id: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ['bridge.js'], world: 'MAIN' });
    await chrome.scripting.executeScript({ target: { tabId: id }, files: ['content.js'] });
  } catch {
    // Falls through to the "reload" prompt.
  }
}

/** Split "Show - Netflix" into the part that matters and the dimmed suffix. */
function splitSuffix(title: string): [string, string] {
  return title.endsWith(SUFFIX) ? [title.slice(0, -SUFFIX.length), SUFFIX] : [title, ''];
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function animate(el: HTMLElement, keyframes: Keyframe[], duration: number): void {
  if (!reducedMotion && !document.body.classList.contains('no-motion')) {
    el.animate(keyframes, { duration, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
}

function hintFor(view: ViewState): (string | Node)[] {
  switch (view) {
    case 'live': {
      const key = document.createElement('kbd');
      key.textContent = /Mac/i.test(navigator.userAgent) ? '⌘D' : 'Ctrl+D';
      return ['Press ', key, ' to bookmark it.'];
    }
    case 'searching':
      return ['If this takes more than a few seconds, move the mouse over the video.'];
    case 'idle':
      return ['Play something and this tab gets renamed.'];
    case 'off':
      return ["Netflix's own title is showing."];
    case 'not-netflix':
      return ['Titleflix only works on netflix.com.'];
    case 'unreachable':
      return ['Reload the tab to start Titleflix.'];
    case 'loading':
      return [];
  }
}

function render(view: ViewState, state: TabState | null): void {
  const applied = view === 'live' ? (state?.appliedTitle ?? '') : '';
  const current = state?.currentTitle || 'Netflix';
  const tabText = view === 'live' ? applied : view === 'not-netflix' ? 'Another site' : current;
  const titleText =
    view === 'live'
      ? applied
      : view === 'not-netflix'
        ? 'Open Netflix to use Titleflix'
        : view === 'unreachable'
          ? 'Netflix'
          : current;
  const source = view === 'live' && state?.source ? SOURCE_LABEL[state.source] : '';

  const key = JSON.stringify([view, tabText, titleText, source]);
  if (key === last?.key) return;
  const viewChanged = view !== last?.view;
  const tabChanged = tabText !== last?.tabText;
  last = { key, view, tabText };

  ui.now.dataset.state = view;
  setText(ui.label, STATUS_LABEL[view]);
  setText(ui.source, source);
  setText(ui.tabText, tabText);
  ui.tabText.title = tabText;

  const [main, suffix] = view === 'live' ? splitSuffix(titleText) : [titleText, ''];
  setText(ui.titleMain, main);
  setText(ui.titleSuffix, suffix);
  ui.titleMain.parentElement!.title = titleText;

  ui.hint.replaceChildren(...hintFor(view));

  const action = view === 'unreachable' ? 'Reload tab' : view === 'not-netflix' ? 'Open Netflix' : '';
  ui.action.hidden = !action;
  setText(ui.action, action);
  ui.action.dataset.action = view;

  if (viewChanged) {
    animate(ui.pane, [{ opacity: 0.35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], 220);
  } else if (tabChanged) {
    animate(ui.pane, [{ opacity: 0.5 }, { opacity: 1 }], 180);
  }
  if (tabChanged) animate(ui.tabText, [{ opacity: 0 }, { opacity: 1 }], 200);

  updateReportLink(view, state);
}

function viewFor(state: TabState): ViewState {
  if (!state.enabled) return 'off';
  if (state.appliedTitle) return 'live';
  return state.page === 'watch' ? 'searching' : 'idle';
}

function updateReportLink(view: ViewState, state: TabState | null): void {
  // Diagnostics only; deliberately excludes the title being watched.
  const body = [
    '**What happened?**',
    '',
    '',
    '---',
    `Titleflix ${version}`,
    `Browser: ${navigator.userAgent}`,
    `Popup state: ${view}`,
    `Title source: ${state?.source ?? 'none'}`,
  ].join('\n');
  const params = new URLSearchParams({ labels: 'bug', body });
  ui.report.href = `${REPO}/issues/new?${params.toString()}`;
}

async function refresh(): Promise<void> {
  const tab = await activeNetflixTab().catch(() => 'other' as const);
  if (tab === 'other') {
    tabId = undefined;
    render('not-netflix', null);
    return;
  }
  tabId = tab.id;

  let state = await requestState(tab.id);
  if (!state && !injectionTried) {
    injectionTried = true;
    await tryInject(tab.id);
    state = await requestState(tab.id);
  }
  render(state ? viewFor(state) : 'unreachable', state);
}

function renderExample(settings: Settings): void {
  const [main, suffix] = splitSuffix(formatTitle(EXAMPLE, settings) ?? '');
  const tail = document.createElement('span');
  tail.className = 'example-suffix';
  tail.textContent = suffix;
  ui.example.replaceChildren(main, tail);
}

function applySettings(settings: Settings): void {
  for (const key of Object.keys(ui.toggles) as (keyof Settings)[]) {
    ui.toggles[key].checked = settings[key];
  }
  ui.toggles.showEpisode.disabled = !settings.enabled;
  ui.toggles.appendSuffix.disabled = !settings.enabled;
  ui.settings.classList.toggle('is-off', !settings.enabled);
  renderExample(settings);
}

async function main(): Promise<void> {
  ui.version.textContent = `v${version}`;
  applySettings(await loadSettings());

  for (const key of Object.keys(ui.toggles) as (keyof Settings)[]) {
    ui.toggles[key].addEventListener('change', async () => {
      const next = await saveSettings({ [key]: ui.toggles[key].checked });
      applySettings(next);
      await refresh();
    });
  }

  ui.action.addEventListener('click', async () => {
    if (ui.action.dataset.action === 'not-netflix') {
      await chrome.tabs.create({ url: 'https://www.netflix.com/browse' });
    } else if (tabId !== undefined) {
      await chrome.tabs.reload(tabId);
    }
    window.close();
  });

  await refresh();
  // Enable transitions only after the first real state is on screen.
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-motion')));
  window.setInterval(() => void refresh(), REFRESH_MS);
}

void main();
