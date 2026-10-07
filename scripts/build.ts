#!/usr/bin/env bun
/**
 * Builds the extension into dist/.
 *   bun scripts/build.ts          build once
 *   bun scripts/build.ts --watch  rebuild on changes in src/ and assets/
 *   bun scripts/build.ts --zip    build, then create titleflix-v<version>.zip for the Web Store
 */
import { $ } from 'bun';
import { cpSync, mkdirSync, readFileSync, rmSync, watch, writeFileSync } from 'node:fs';

const DIST = 'dist';
const args = new Set(process.argv.slice(2));

// Each entry is bundled into one classic script: content scripts can't be ES modules.
const ENTRIES = {
  'background.js': 'src/background.ts',
  'content.js': 'src/content/index.ts',
  'bridge.js': 'src/bridge.ts',
  'popup.js': 'src/popup/popup.ts',
};

const STATIC: Record<string, string> = {
  'popup.html': 'src/popup/popup.html',
  'popup.css': 'src/popup/popup.css',
  'icons/logo.svg': 'assets/logo.svg',
  'icons/icon16.png': 'assets/icons/icon16.png',
  'icons/icon32.png': 'assets/icons/icon32.png',
  'icons/icon48.png': 'assets/icons/icon48.png',
  'icons/icon128.png': 'assets/icons/icon128.png',
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

async function build(): Promise<string> {
  const pkg = readJson<{ version: string }>('package.json');
  const manifest = readJson<{ version: string }>('manifest.json');
  if (pkg.version !== manifest.version) {
    throw new Error(`Version mismatch: package.json ${pkg.version} vs manifest.json ${manifest.version}`);
  }

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(`${DIST}/icons`, { recursive: true });

  for (const [out, entry] of Object.entries(ENTRIES)) {
    const result = await Bun.build({
      entrypoints: [entry],
      format: 'iife',
      target: 'browser',
      minify: false, // Readable output makes Web Store review and bug reports easier.
      sourcemap: 'none',
    });
    if (!result.success) {
      for (const log of result.logs) console.error(log);
      throw new Error(`Failed to bundle ${entry}`);
    }
    const [artifact] = result.outputs;
    if (!artifact) throw new Error(`No output for ${entry}`);
    writeFileSync(`${DIST}/${out}`, await artifact.text());
  }

  for (const [out, src] of Object.entries(STATIC)) cpSync(src, `${DIST}/${out}`);
  writeFileSync(`${DIST}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

  return pkg.version;
}

const started = performance.now();
const version = await build();
console.log(`✓ Built Titleflix v${version} into ${DIST}/ in ${Math.round(performance.now() - started)}ms`);

if (args.has('--zip')) {
  const zip = `titleflix-v${version}.zip`;
  rmSync(zip, { force: true });
  await $`cd ${DIST} && zip -qr ../${zip} .`;
  console.log(`✓ Packaged ${zip}`);
}

if (args.has('--watch')) {
  let timer: Timer | undefined;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build()
        .then(() => console.log(`↻ Rebuilt at ${new Date().toLocaleTimeString()}`))
        .catch((error: unknown) => console.error(error));
    }, 100);
  };
  for (const dir of ['src', 'assets']) watch(dir, { recursive: true }, rebuild);
  watch('manifest.json', rebuild);
  console.log('Watching src/, assets/ and manifest.json…');
}
