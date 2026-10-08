import { defineConfig } from '@playwright/test';

// Renders Chrome Web Store images (bun run store:images). Not part of the test suite.
export default defineConfig({
  testDir: '.',
  testMatch: '*.store.ts',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
});
