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

function bumpVersion(currentVersion: string, type: VersionType): string {
  const parts = currentVersion.split('.').map(Number);
  const [major, minor, patch] = parts;

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
}

const versionType: string = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

const validVersionType = versionType as VersionType;

try {
  console.log(`🚀 Bumping ${validVersionType} version...`);

  // Read current version from package.json
  const packageJson: PackageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const currentVersion = packageJson.version;
  const newVersion = bumpVersion(currentVersion, validVersionType);

  console.log(`📦 Version: ${currentVersion} → ${newVersion}`);

  // Update package.json version
  packageJson.version = newVersion;
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');

  // Update manifest.json version
  const manifestJson: ManifestJson = JSON.parse(readFileSync('manifest.json', 'utf8'));
  manifestJson.version = newVersion;
  writeFileSync('manifest.json', JSON.stringify(manifestJson, null, 2) + '\n');

  console.log('✅ Updated package.json and manifest.json versions');

  // Stage both files
  await $`git add package.json manifest.json`;

  // Create git tag
  await $`git tag v${newVersion}`;

  // Commit with version tag
  await $`git commit -m "bump v${newVersion}"`;

  console.log(`🎉 Version bumped to v${newVersion} and committed!`);
  console.log(`📝 Next steps:`);
  console.log(`   git push`);
  console.log(`   git push --tags`);
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Error bumping version:', errorMessage);
  process.exit(1);
}
