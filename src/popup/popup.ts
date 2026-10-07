import type { GetStateRequest, TabState } from '../shared/messages';
import { loadSettings, saveSettings, type Settings } from '../shared/settings';
import type { TitleSource } from '../shared/title';

type ViewState = 'loading' | 'live' | 'searching' | 'idle' | 'off' | 'not-netflix' | 'unreachable';

const REFRESH_MS = 1000;
const REPO = 'https://github.com/doguyilmaz/titleflix';
const SOURCE_LABEL: Record<TitleSource, string> = {
  'player-data': "Netflix's player data",
  'player-controls': 'the on-screen player title',
  'pause-overlay': 'the pause screen',
  'media-session': "Chrome's media controls",
};

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const ui = {
  version: $('version'),
  now: $('now'),
  label: $('statusLabel'),
  hint: $('statusHint'),
  preview: $('preview'),
  previewTitle: $('previewTitle'),
  reload: $<HTMLButtonElement>('reloadBtn'),
  report: $<HTMLAnchorElement>('reportLink'),
  settings: document.querySelector<HTMLElement>('.settings')!,
  toggles: {
    enabled: $<HTMLInputElement>('enabled'),
    showEpisode: $<HTMLInputElement>('showEpisode'),
    appendSuffix: $<HTMLInputElement>('appendSuffix'),
  } satisfies Record<keyof Settings, HTMLInputElement>,
};

const version = chrome.runtime.getManifest().version;
let tabId: number | undefined;
let injectionTried = false;

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

function render(view: ViewState, state: TabState | null): void {
  ui.now.dataset.state = view;
  ui.reload.hidden = view !== 'unreachable';
  const title = view === 'live' ? state?.appliedTitle : null;
  ui.preview.hidden = !title;
  ui.previewTitle.textContent = title ?? '';
  ui.previewTitle.title = title ?? '';

  switch (view) {
    case 'loading':
      ui.label.textContent = 'Checking this tab…';
      ui.hint.textContent = '';
      break;
    case 'live': {
      ui.label.textContent = 'Renaming this tab';
      const source = state?.source ? SOURCE_LABEL[state.source] : null;
      const shortcut = /Mac/i.test(navigator.userAgent) ? '⌘D' : 'Ctrl+D';
      ui.hint.textContent = `${source ? `Found via ${source}. ` : ''}Press ${shortcut} to bookmark it.`;
      break;
    }
    case 'searching':
      ui.label.textContent = 'Looking for the title…';
      ui.hint.textContent =
        "This normally takes a moment. If nothing shows up, move your mouse over the video so Netflix shows the player controls.";
      break;
    case 'idle':
      ui.label.textContent = 'Ready';
      ui.hint.textContent = 'Start watching something and this tab will be renamed.';
      break;
    case 'off':
      ui.label.textContent = 'Paused';
      ui.hint.textContent = "Netflix's own titles are shown. Turn renaming back on below.";
      break;
    case 'not-netflix':
      ui.label.textContent = 'Not a Netflix tab';
      ui.hint.textContent = 'Titleflix only runs on netflix.com.';
      break;
    case 'unreachable':
      ui.label.textContent = 'Not running in this tab yet';
      ui.hint.textContent = 'Reload the Netflix tab to start Titleflix.';
      break;
  }

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

function applySettings(settings: Settings): void {
  for (const key of Object.keys(ui.toggles) as (keyof Settings)[]) {
    ui.toggles[key].checked = settings[key];
    ui.toggles[key].setAttribute('aria-checked', String(settings[key]));
  }
  ui.toggles.showEpisode.disabled = !settings.enabled;
  ui.toggles.appendSuffix.disabled = !settings.enabled;
  ui.settings.classList.toggle('is-disabled', !settings.enabled);
}

async function main(): Promise<void> {
  ui.version.textContent = `v${version}`;
  document.body.classList.add('no-motion');
  applySettings(await loadSettings());
  requestAnimationFrame(() => document.body.classList.remove('no-motion'));

  for (const key of Object.keys(ui.toggles) as (keyof Settings)[]) {
    ui.toggles[key].addEventListener('change', async () => {
      const next = await saveSettings({ [key]: ui.toggles[key].checked });
      applySettings(next);
      await refresh();
    });
  }

  ui.reload.addEventListener('click', async () => {
    if (tabId === undefined) return;
    await chrome.tabs.reload(tabId);
    window.close();
  });

  render('loading', null);
  await refresh();
  window.setInterval(() => void refresh(), REFRESH_MS);
}

void main();
