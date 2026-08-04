'use strict';

const { sleep, gaussian } = require('../../src/bot/utils/sleep');

describe('sleep utility', () => {
  test('sleep resolves after delay', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  test('sleep with shouldStop aborts early', async () => {
    let stop = false;
    const start = Date.now();
    const promise = sleep(500, () => stop);
    setTimeout(() => { stop = true; }, 100);
    const result = await promise;
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(450);
    expect(result).toBe(false);
  });

  test('sleep without shouldStop completes normally', async () => {
    const result = await sleep(30);
    expect(result).toBe(true);
  });

  test('sleep with zero ms resolves immediately', async () => {
    const result = await sleep(0);
    expect(result).toBe(true);
  });
});

describe('gaussian', () => {
  test('returns numbers near mean over many samples', () => {
    const samples = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(gaussian(100, 10));
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(avg).toBeGreaterThan(95);
    expect(avg).toBeLessThan(105);
  });

  test('returns a number', () => {
    const val = gaussian(50, 5);
    expect(typeof val).toBe('number');
    expect(isNaN(val)).toBe(false);
  });
});
