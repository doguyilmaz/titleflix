import { expect, test } from 'bun:test';
import { bumpVersion } from '../../scripts/bump-version';

test('bumps semver parts', () => {
  expect(bumpVersion('1.1.3', 'patch')).toBe('1.1.4');
  expect(bumpVersion('1.1.3', 'minor')).toBe('1.2.0');
  expect(bumpVersion('1.1.3', 'major')).toBe('2.0.0');
});

test('rejects malformed versions', () => {
  expect(() => bumpVersion('1.2', 'patch')).toThrow();
});
