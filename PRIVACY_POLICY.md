# Privacy Policy for Titleflix

**Last updated: October 2026** (applies to version 2.0.0 and later)

Titleflix is a Chrome extension that renames Netflix browser tabs to the show or movie being played, so that bookmarks and tab lists are meaningful.

## Summary

**Titleflix does not collect, transmit, sell or share any data.** It runs entirely inside your browser, only on `www.netflix.com`, and makes no network requests.

## What Titleflix reads

On `www.netflix.com` pages, Titleflix reads information that is already in the page to work out what is playing:

- the show or movie title, season, episode number and episode title from Netflix's player data, which Netflix has already loaded in the page;
- the title shown in the player controls or on the pause screen;
- the media information Netflix provides to Chrome's media controls.

This information is used only to set the tab's title. It is kept in the tab's memory while the tab is open and is never written to storage, sent anywhere, or shared with anyone.

## What Titleflix stores

Titleflix stores three preferences using Chrome's `storage.sync` area:

- whether tab renaming is on;
- whether to include season and episode details;
- whether to add " - Netflix" to the end of titles.

If you have Chrome Sync turned on, Google syncs these preferences between your own devices as part of Chrome Sync. Titleflix has no server and never receives them.

Version 1.x kept the title of the video you were watching in local extension storage. Version 2.0 no longer does this and deletes that stored value when it is installed or updated.

## Permissions

| Permission | Purpose |
| --- | --- |
| Host access to `https://www.netflix.com/*` | Read what's playing and set the tab title on Netflix. Titleflix cannot see or change any other website. |
| `storage` | Save the three preferences listed above. |
| `scripting` | When Titleflix is installed or updated, start it in Netflix tabs that are already open, so they work without a reload. It only runs Titleflix's own bundled files, and only on Netflix tabs. |

## Reporting problems

The popup's **Report a problem** link opens a new GitHub issue form, pre-filled with the Titleflix version, your browser's user-agent string, and the popup's status. It does not include what you are watching. Nothing is sent unless you choose to submit the issue on GitHub, where GitHub's privacy policy applies.

## Third parties

Titleflix uses no analytics, advertising, tracking, crash reporting or remote code.

## Children

Titleflix collects no information from anyone, including children under 13.

## Removing Titleflix

Remove it from `chrome://extensions`. Chrome deletes its stored preferences.

## Changes to this policy

Changes will be published in this file in the [GitHub repository](https://github.com/doguyilmaz/titleflix) with a new "Last updated" date, and noted in the release notes.

## Contact

- Email: hello@doguyilmaz.com
- Issues: https://github.com/doguyilmaz/titleflix/issues

Titleflix is an independent project and is not affiliated with or endorsed by Netflix, Inc.
