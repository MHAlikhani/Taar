'use strict';

const {
  resolveNodePath, resetCache,
  resolveBunPath, verifyBunVersion
} = require('../../src/runtime/nodeResolver');

describe('nodeResolver', () => {
  beforeEach(() => {
    resetCache();
  });

  test('returns a string path', () => {
    const result = resolveNodePath();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('caches result on second call', () => {
    const first = resolveNodePath();
    const second = resolveNodePath();
    expect(first).toBe(second);
  });

  test('resetCache clears cache', () => {
    const first = resolveNodePath();
    resetCache();
    const second = resolveNodePath();
    // Values should be same (same node), but cache was cleared
    expect(first).toBe(second);
  });
});

describe('bunResolver', () => {
  beforeEach(() => {
    resetCache();
  });

  test('returns a path or null (portable across machines)', () => {
    const result = resolveBunPath();
    if (result === null) {
      expect(result).toBeNull();
    } else {
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  test('caches result on second call', () => {
    const first = resolveBunPath();
    const second = resolveBunPath();
    expect(first).toBe(second);
  });

  test('verifyBunVersion accepts a working bun (1.1+ for IPC)', () => {
    const bunPath = resolveBunPath();
    if (!bunPath) {
      // Bun not installed on this machine — nothing to verify
      return;
    }
    expect(verifyBunVersion(bunPath)).toBe(true);
  });

  test('verifyBunVersion rejects a nonexistent binary', () => {
    const isWindows = process.platform === 'win32';
    const fake = isWindows ? 'C:\\definitely\\not\\real\\bun.exe' : '/definitely/not/real/bun';
    expect(verifyBunVersion(fake)).toBe(false);
  });
});
