'use strict';

const { SelectorMemory } = require('../../src/bot/selectors/selectorMemory');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'selector-memory.json');

describe('SelectorMemory', () => {
  beforeEach(() => {
    try {
      if (fs.existsSync(MEMORY_FILE)) fs.unlinkSync(MEMORY_FILE);
    } catch {}
  });

  afterEach(() => {
    try {
      if (fs.existsSync(MEMORY_FILE)) fs.unlinkSync(MEMORY_FILE);
    } catch {}
  });

  test('returns default state when no file exists', () => {
    const mem = new SelectorMemory();
    expect(mem.getLastSuccessful()).toBe(0);
  });

  test('records success and updates last successful', () => {
    const mem = new SelectorMemory();
    mem.recordSuccess(2);
    expect(mem.getLastSuccessful()).toBe(2);

    // Reload
    const mem2 = new SelectorMemory();
    expect(mem2.getLastSuccessful()).toBe(2);
  });

  test('records failure', () => {
    const mem = new SelectorMemory();
    mem.recordFailure(1);
    expect(mem.state.failureCount['1']).toBe(1);
  });

  test('getRankedOrder prioritizes last successful', () => {
    const mem = new SelectorMemory();
    mem.recordSuccess(2);
    const ranked = mem.getRankedOrder(4);
    expect(ranked[0]).toBe(2); // last successful first
    expect(ranked.length).toBe(4);
  });

  test('getRankedOrder orders by success - failure', () => {
    const mem = new SelectorMemory();
    mem.recordSuccess(0);
    mem.recordSuccess(0);
    mem.recordFailure(1);
    mem.recordFailure(1);
    const ranked = mem.getRankedOrder(3);
    // Index 0 has 2 success + 1000 (last) bonus
    // Index 1 has 2 failures
    expect(ranked[0]).toBe(0);
  });
});
