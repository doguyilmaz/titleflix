# Testing on real Netflix

The automated tests run against a simulated Netflix. This is the check against the real site, with your own account. You can do it by hand or hand it to Claude in Chrome.

## Setup

```bash
bun install
bun run build
```

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick the `dist` folder.
   If the store version of Titleflix is installed, turn it off first so the two don't both run.
2. Open `https://www.netflix.com/browse` and pick a profile.
3. Turn on the debug log: open DevTools (F12) → Console, run the line below, then reload the tab.

   ```js
   localStorage.setItem('titleflix:debug', '1')
   ```

   Every decision Titleflix makes is now logged to the console with a `[Titleflix content]` or `[Titleflix bridge]` prefix. Turn it off with `localStorage.removeItem('titleflix:debug')`.

## Checklist

| # | Do | Expect |
| --- | --- | --- |
| 1 | Play an episode of a series. Don't touch the mouse. | Within about a second the tab reads `Show: S1:E3 Episode name - Netflix`. Console: `player data has video …` and `title for video … from player-data`. |
| 2 | Use *Next Episode*, or skip to the end and let autoplay continue. | The title moves to the next episode right away. |
| 3 | Press the browser's Back button. | The title follows back to the previous episode. |
| 4 | Pause for a minute, then resume. | The title doesn't change. |
| 5 | Play a movie. | `Movie name - Netflix`, no episode part. |
| 6 | Go back to Home/Browse. | Netflix's own title (for example `Home - Netflix`). |
| 7 | Open the Titleflix popup on a playing video. | *Renaming this tab*, the same title, and *from player data*. |
| 8 | In the popup, switch *Rename Netflix tabs* off, then on. | The title switches back and forth. The video keeps playing. |
| 9 | Turn off *Season, episode and episode name*. | The title becomes `Show - Netflix`. |

## If something fails

- **Step 1 only works after moving the mouse.** Netflix's player data didn't match what Titleflix expects, so it fell back to the on-screen title. Wait ~5 seconds after the video starts and copy the console line `[Titleflix bridge] player data still has no match for video …` together with the object under it. That object lists key names only (no titles or account data) and shows how Netflix structures the data today.
- **Nothing happens at all.** Check `chrome://extensions` for errors on Titleflix, and that the tab URL starts with `https://www.netflix.com/watch/`.
- **The title flickers.** Copy the `Netflix set the title to …` lines.

Paste those lines into an issue or into the chat, and the fix is usually a one-line change in `src/shared/metadata.ts`.

## Prompt for Claude in Chrome

Load the extension and turn on the debug log first (Setup above), then give Claude this:

```
I'm testing my Chrome extension Titleflix on Netflix. It renames the tab title to what's playing. It's already loaded, and its debug log is on (console lines start with "[Titleflix").

In a new tab, go through these steps on https://www.netflix.com. After each one, report document.title and every new console line that starts with "[Titleflix":

1. Start an episode of any series. Don't move the mouse over the player. Wait 3 seconds.
   Expected title: "<Show>: S<n>:E<n> <Episode name> - Netflix".
2. Click "Next Episode" (hover the player to reveal it). Wait 3 seconds. Expected: the next episode's title.
3. Go back with the browser's Back button. Expected: the previous episode's title.
4. Pause, wait 60 seconds, resume. Expected: no title change.
5. Open any movie and play it. Expected: "<Movie> - Netflix".
6. Go to the Netflix home page. Expected: Netflix's own title, like "Home - Netflix".

Don't change any account or profile settings. If a step doesn't match, note what you saw and continue with the next step. At the end, give me a pass/fail table and paste any "[Titleflix bridge] player data still has no match" line with the object logged under it.
```
