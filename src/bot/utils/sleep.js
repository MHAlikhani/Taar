'use strict';

async function sleep(ms, shouldStop) {
  if (ms <= 0) return true;
  if (!shouldStop) {
    return new Promise(resolve => setTimeout(() => resolve(true), ms));
  }
  const chunkMs = 100;
  let remaining = ms;
  while (remaining > 0) {
    if (shouldStop()) return false;
    const wait = Math.min(chunkMs, remaining);
    await new Promise(r => setTimeout(r, wait));
    remaining -= wait;
  }
  return !shouldStop();
}

function gaussian(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
}

module.exports = { sleep, gaussian };
