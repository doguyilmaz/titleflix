# Google Analytics Setup Guide

This extension is integrated with Google Analytics 4 (GA4). Follow the steps below to activate analytics.

## Steps

### 1. Get Your Google Analytics 4 Measurement ID

1. Sign in to [Google Analytics](https://analytics.google.com/)
2. Select the relevant property and data stream
3. Go to **Admin** > **Data Streams**
4. Select your web data stream
5. Copy the **Measurement ID** value (format: `G-XXXXXXXXXX`)

### 2. Add Measurement ID to Extension

Open `src/analytics.ts` and find this line:

```typescript
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

Replace `G-XXXXXXXXXX` with your own measurement ID:

```typescript
const GA4_MEASUREMENT_ID = 'G-ABC123XYZ'; // Example
```

### 3. (Optional) Add API Secret

For enhanced measurement security, you can add an API Secret:

1. In Google Analytics, go to **Admin** > **Data Streams** > **Web stream** > **Measurement Protocol API secrets**
2. Click **Create**
3. Copy the generated secret
4. Add it to the `GA4_API_SECRET` variable in `src/analytics.ts`:

```typescript
const GA4_API_SECRET = 'your-api-secret-here';
```

### 4. Rebuild the Extension

```bash
bun run build
```

### 5. Test

1. Load/reload the extension in Chrome
2. Check the **Realtime** report in Google Analytics
3. Use the extension (toggle on/off, change theme, etc.)
4. Verify that events appear within a few seconds

## Tracked Events

The extension tracks the following events:

- **extension_installed**: When the extension is first installed
- **extension_toggled**: When the extension is enabled/disabled
- **theme_changed**: When theme is changed (auto/light/dark)
- **title_updated**: When a title is updated on Netflix
- **popup_opened**: When the extension popup is opened

## Important Notes

- Analytics is **enabled by default**
- For user privacy, full title text is not sent, only length information
- Analytics code does not affect extension functionality (fails silently on errors)
- Client ID is stored on the user's device and is unique

## Disabling Analytics

If you want to completely disable analytics:

1. Leave `GA4_MEASUREMENT_ID` empty or set it to `'G-XXXXXXXXXX'` in `src/analytics.ts`
2. Or set the `enabled` property to `false`

## Troubleshooting

**Analytics not working:**
- Make sure the measurement ID is correct
- Check for error messages in Chrome DevTools Console
- Ensure `https://www.google-analytics.com/*` and `https://www.googletagmanager.com/*` permissions are in the manifest
- Verify that the data stream is active in Google Analytics

**Data not appearing:**
- There may be a 24-48 hour delay in standard reports (use Realtime for immediate testing)
- Make sure the measurement ID is correct
- Ensure the Chrome extension has been reloaded
- Check the browser console for debug messages (we've added logging)
