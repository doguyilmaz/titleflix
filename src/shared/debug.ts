/**
 * Opt-in diagnostics for testing on real Netflix. Enable in the Netflix tab's console with
 *   localStorage.setItem('titleflix:debug', '1')
 * and reload. Logs never include anything beyond what is already on the page.
 */
const KEY = 'titleflix:debug';

function enabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function createLogger(scope: string): (...args: unknown[]) => void {
  const on = enabled();
  return (...args) => {
    if (on) console.info(`[Titleflix ${scope}]`, ...args);
  };
}
