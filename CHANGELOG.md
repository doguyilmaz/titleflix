# Changelog

## 2.0.0

A rewrite focused on reliability, plus a new look.

### Reliability
- Reads the title from Netflix's player data, so it works as soon as the video loads instead of only while the player controls are visible. The on-screen controls, the pause screen and Chrome's media controls are still used as fallbacks.
- Adds season numbers (`S1:E3`) when Netflix provides them.
- Puts the title back immediately when Netflix resets it, so the tab no longer flips back to "Netflix" for up to 3 seconds at a time.
- Detects in-app navigation (opening a title from Browse, next episode, back/forward). The old `history.pushState` hook ran in the content script's isolated world and never saw Netflix's navigation.
- Restores Netflix's own title when leaving a video or turning Titleflix off.
- No longer rejects titles that look like numbers or years ("1917", "1899", "300").
- Ignores the previous episode's title if Netflix briefly shows it after *Next episode*.
- Starts in already-open Netflix tabs after install or update, and retires the copy from the previous version cleanly.

### Settings and popup
- New popup, drawn as a small browser window: shows the exact title applied to the current tab and where it came from, with clear states (renaming, finding, ready, off, not Netflix). It keeps the same height in every state, so it never jumps.
- Turning Titleflix off or changing the format now applies live. It no longer reloads the tab and interrupts the video.
- New options: hide season/episode details, drop the " - Netflix" suffix.
- Settings are stored in `chrome.storage.sync`. v1 settings are migrated automatically.
- Removed the light/dark icon selector. The new icon works on both, and the popup follows the system theme.

### Security and privacy
- No longer stores what you're watching. v1's stored value is deleted on update.
- The popup renders titles as text only (v1 inserted them as HTML).
- Narrowed host access from `*://*.netflix.com/*` to `https://www.netflix.com/*` and dropped the unused `activeTab` permission. Added `scripting`, used only to start Titleflix in already-open Netflix tabs.
- Stricter extension Content Security Policy. Popup messages are accepted only from Titleflix itself.

### Brand
- Refined icon: the same red "T" on black as 1.x, now with a bookmark tail. One icon set that reads on light and dark toolbars.
- New store screenshots and promo tiles.

### Development
- Bun bundler build (`bun run build`), unit tests (`bun test`), and Playwright end-to-end tests that run the real extension against a simulated Netflix app (`bun run test:e2e`).
- GitHub Actions CI.
- Opt-in debug log for testing on real Netflix (`localStorage.setItem('titleflix:debug', '1')`).
- `bump-version` now tags the bump commit (it previously tagged the commit before it).

## 1.1.3 and earlier

See the git history.
