#!/usr/bin/env bun

import { $ } from 'bun';
import { readFileSync, writeFileSync } from 'fs';

type VersionType = 'patch' | 'minor' | 'major';

interface PackageJson {
  version: string;
  [key: string]: any;
}

interface ManifestJson {
  version: string;
  [key: string]: any;
}

const versionType: string = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

const validVersionType = versionType as VersionType;

try {
  console.log(`🚀 Bumping ${validVersionType} version...`);

  // Update package.json version using bun (which is compatible with npm versioning)
  await $`bun version ${validVersionType}`;

  // Read the new version from package.json
  const packageJson: PackageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const newVersion: string = packageJson.version;

  console.log(`📦 New version: ${newVersion}`);

  // Update manifest.json version
  const manifestJson: ManifestJson = JSON.parse(readFileSync('manifest.json', 'utf8'));
  manifestJson.version = newVersion;
  writeFileSync('manifest.json', JSON.stringify(manifestJson, null, 2) + '\n');

  console.log('✅ Updated manifest.json version');

  // Stage the manifest.json file (package.json is already staged by bun version)
  await $`git add manifest.json`;

  // Commit with version tag
  await $`git commit --amend -m "bump v${newVersion}"`;

  console.log(`🎉 Version bumped to v${newVersion} and committed!`);
  console.log(`📝 Next steps:`);
  console.log(`   git push`);
  console.log(`   git push --tags`);
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Error bumping version:', errorMessage);
  process.exit(1);
}
