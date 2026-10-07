# Chrome Web Store release guide

How to publish a new version of Titleflix.

## 1. Prepare the release

```bash
bun install
bun run check          # type-check, unit tests, end-to-end tests
bun run bump:minor     # or bump:patch / bump:major: updates package.json + manifest.json, commits, tags
bun run package        # creates titleflix-v<version>.zip from dist/
git push && git push --tags
```

Before uploading, load `dist/` unpacked and run the **manual check on real Netflix** from the README. The automated tests use a simulated Netflix, so this is the only check against the live site.

## 2. Upload

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) and select Titleflix.
2. **Package** → *Upload new package* → choose `titleflix-v<version>.zip`.
3. Update the store listing and privacy tabs if anything below changed, then **Submit for review**.

## Store listing

**Name:** Titleflix

**Summary (132 characters max):**
> Gives Netflix tabs and bookmarks the real name of what you're watching, like "Dark: S1:E2 Lies".

**Category:** Productivity

**Description:**

```
Every Netflix tab is called "Netflix", so every Netflix bookmark is called "Netflix". Titleflix renames the tab to what is actually playing.

BEFORE: Netflix
AFTER:  Stranger Things: S1:E3 Chapter Three: Holly, Jolly - Netflix

FEATURES
• Show, season, episode and episode title, or just the title for movies
• Follows next episode, autoplay and back/forward instantly
• Keeps the title when Netflix tries to reset it, with no flicker
• Settings apply live, without interrupting your video
• Works in tabs that were already open when you install it

SETTINGS
• Turn renaming on or off
• Include or hide season and episode details
• Add or drop the " - Netflix" suffix

PRIVATE BY DESIGN
• Runs only on www.netflix.com
• No data collection, analytics or network requests
• Stores only your three settings
• Open source: https://github.com/doguyilmaz/titleflix

Titleflix is an independent project and is not affiliated with or endorsed by Netflix, Inc.
```

### Brand notes

Titleflix 2.0 has its own identity: an amber "T" with a bookmark tail on a dark tile. To stay clear of impersonation rules, listing graphics should not use the Netflix logo, Netflix red (#E50914) or Netflix's typeface. Show real tab titles and bookmarks instead.

### Images

- Icon: `assets/icons/icon128.png` (96px artwork with 16px padding, as the store requires).
- Screenshots (1280×800): the popup in light and dark mode, a bookmarks bar before and after, and a tab strip with renamed tabs.
- Small promo tile (440×280): logo plus "Real names for your Netflix tabs".

## Privacy tab

- **Single purpose:** Renames Netflix tabs to the title of the show or movie being played so bookmarks and tabs are identifiable.
- **Data usage:** Does not collect or use user data. Tick all three certifications (no selling, no unrelated use, no creditworthiness use).
- **Remote code:** No, all code is in the package.
- **Privacy policy URL:** https://github.com/doguyilmaz/titleflix/blob/main/PRIVACY_POLICY.md

### Permission justifications

**Host permission `https://www.netflix.com/*`:**
> Needed to read the title of the video playing on Netflix and set the browser tab's title. The extension does not run on any other site.

**storage:**
> Saves the user's three preferences (renaming on/off, include episode details, add suffix). No browsing or viewing data is stored.

**scripting:**
> Used only when the extension is installed or updated, to start the extension's own bundled content script in Netflix tabs that are already open, so users don't have to reload a video that is playing.

## Common review issues

- **Netflix branding in graphics:** use Titleflix's own logo and colors only.
- **Permission justifications:** keep them matching the wording above; reviewers check them against the manifest.
- **Description claims:** avoid saying "official" or implying a Netflix partnership.
