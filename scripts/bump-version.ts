#!/usr/bin/env bun
/**
 * Bumps the version in package.json and manifest.json, commits, and tags the commit.
 *   bun scripts/bump-version.ts [patch|minor|major]
 */
import { $ } from 'bun';
import { readFileSync, writeFileSync } from 'node:fs';

type VersionType = 'patch' | 'minor' | 'major';

export function bumpVersion(currentVersion: string, type: VersionType): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);
  if (!match) throw new Error(`Unsupported version "${currentVersion}" (expected x.y.z)`);
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updateVersion(path: string, version: string): void {
  const json = JSON.parse(readFileSync(path, 'utf8')) as { version: string };
  json.version = version;
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
}

if (import.meta.main) {
  const versionType = process.argv[2] ?? 'patch';
  if (versionType !== 'patch' && versionType !== 'minor' && versionType !== 'major') {
    console.error('❌ Invalid version type. Use: patch, minor, or major');
    process.exit(1);
  }

  try {
    const status = await $`git status --porcelain`.text();
    if (status.trim()) throw new Error('Working tree is not clean; commit or stash first.');

    const current = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
    const next = bumpVersion(current, versionType);
    console.log(`📦 Version: ${current} → ${next}`);

    updateVersion('package.json', next);
    updateVersion('manifest.json', next);

    await $`git add package.json manifest.json`;
    await $`git commit -m ${`bump v${next}`}`;
    // Tag after committing so the tag points at the bump commit.
    await $`git tag v${next}`;

    console.log(`🎉 Bumped to v${next}. Next: git push && git push --tags`);
  } catch (error: unknown) {
    console.error('❌ Error bumping version:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
