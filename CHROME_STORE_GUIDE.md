# Chrome Web Store release guide

How to publish a new version of Titleflix.

## 1. Prepare the release

```bash
bun install
bun run check          # type-check, unit tests, end-to-end tests
bun run store:images   # only if the popup or store images changed
bun run bump:minor     # or bump:patch / bump:major: updates package.json + manifest.json, commits, tags
bun run package        # creates titleflix-v<version>.zip from dist/
git push && git push --tags
```

Before uploading, run the checklist in [docs/testing-on-netflix.md](docs/testing-on-netflix.md) with the unpacked `dist/` build. The automated tests use a simulated Netflix, so this is the only check against the live site.

## 2. Upload

1. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) and select Titleflix.
2. **Package** → *Upload new package* → choose `titleflix-v<version>.zip`.
3. **Store listing**: paste the text from [store/listing.md](store/listing.md) and upload the images from [store/images/](store/images/).
4. **Privacy**: single purpose, permission justifications and data usage are also in [store/listing.md](store/listing.md).
5. **Submit for review**.

## Notes for review

- The 2.0 package drops `activeTab`, narrows host access to `https://www.netflix.com/*`, and adds `scripting`. Removing permissions doesn't prompt existing users. `scripting` doesn't show a warning either, because it only works on sites the extension already has host access to.
- Keep the justification wording in sync with the manifest; reviewers compare them.
- Store graphics may use red and the word "Netflix" to describe what the extension works with. Don't use Netflix's logo, its "N" mark or its wordmark, and don't call Titleflix "official".
