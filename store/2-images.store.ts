/**
 * Renders every .frame in store/images.html to store/images/<id>.png at its exact pixel size.
 * Runs after 1-popup.store.ts, whose popup captures the frames embed.
 */
import { chromium, expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = 'store/images';

test('store images', async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve('store/images.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('img').first()).toBeVisible();

  const frames = await page.locator('.frame').evaluateAll((els) => els.map((el) => el.id));
  for (const id of frames) {
    const frame = page.locator(`#${id}`);
    const box = (await frame.boundingBox())!;
    expect([Math.round(box.width), Math.round(box.height)]).toEqual(sizeFor(id));
    await frame.screenshot({ path: `${OUT}/${id}.png` });
    console.log(`✓ ${OUT}/${id}.png`);
  }
  await browser.close();
});

function sizeFor(id: string): [number, number] {
  if (id.startsWith('promo-small')) return [440, 280];
  if (id.startsWith('promo-marquee')) return [1400, 560];
  return [1280, 800];
}
