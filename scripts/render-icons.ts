#!/usr/bin/env bun
/**
 * Renders assets/logo.svg (and assets/logo-small.svg for tiny sizes) into the PNG icons
 * Chrome needs. Run after changing the logo: `bun run icons`.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const SIZES = [16, 32, 48, 128] as const;
const OUT_DIR = 'assets/icons';

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const size of SIZES) {
  const source = size <= 32 ? 'assets/logo-small.svg' : 'assets/logo.svg';
  const svg = readFileSync(source, 'utf8');
  // Chrome Web Store asks for 96px artwork inside the 128px icon.
  const art = size === 128 ? 96 : size;
  const pad = (size - art) / 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${art}px;height:${art}px;margin:${pad}px}</style>${svg}`,
  );
  await page.screenshot({ path: `${OUT_DIR}/icon${size}.png`, omitBackground: true });
  console.log(`✓ ${OUT_DIR}/icon${size}.png (from ${source})`);
}

await browser.close();
