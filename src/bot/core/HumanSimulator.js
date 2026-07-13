'use strict';

const { gaussian, sleep } = require('../utils/sleep');

const PERSONAS = [
  { name: 'steady', delayScale: 1.0, pauseChance: 0.15, typoChance: 0.03 },
  { name: 'brisk', delayScale: 0.72, pauseChance: 0.09, typoChance: 0.02 },
  { name: 'careful', delayScale: 1.4, pauseChance: 0.22, typoChance: 0.045 }
];

class HumanSimulator {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  }

  async delay(meanMs, stdDevMs, shouldStop) {
    const std = stdDevMs || (meanMs * 0.25);
    const ms = Math.max(50, Math.round(gaussian(meanMs, std)));
    return sleep(ms, shouldStop);
  }

  async delayRange(minMs, maxMs, shouldStop) {
    const k = this.persona.delayScale;
    minMs = Math.round(minMs * k);
    maxMs = Math.round(maxMs * k);
    const mean = (minMs + maxMs) / 2;
    const std = (maxMs - minMs) / 6;
    const raw = gaussian(mean, std);
    const ms = Math.max(minMs, Math.min(maxMs, Math.round(raw)));
    return sleep(ms, shouldStop);
  }

  async type(locator, text, shouldStop) {
    await locator.click();
    await this.delayRange(100, 300, shouldStop);

    for (let i = 0; i < text.length; i++) {
      if (shouldStop && shouldStop()) return;

      const char = text[i];

      if (Math.random() < this.persona.typoChance && /[a-zA-Z]/.test(char)) {
        const offset = Math.random() < 0.5 ? 1 : -1;
        const typoChar = String.fromCharCode(char.charCodeAt(0) + offset);
        await locator.pressSequentially(typoChar, { delay: 0 });
        await this.delayRange(120, 250, shouldStop);
        await this.page.keyboard.press('Backspace');
        await this.delayRange(150, 300, shouldStop);
      }

      await locator.pressSequentially(char, { delay: 0 });
      await this.delayRange(40, 140, shouldStop);

      if (Math.random() < 0.04) {
        await this.delayRange(400, 900, shouldStop);
      }
    }
  }

  async moveMouseTo(locator) {
    try {
      const box = await locator.boundingBox({ timeout: 2000 });
      if (!box) return;
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;

      const viewport = this.page.viewportSize();
      const startX = Math.random() * (viewport?.width || 800);
      const startY = Math.random() * (viewport?.height || 600);

      const steps = 15 + Math.floor(Math.random() * 10);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const eased = t < 0.5
          ? 2 * t * t
          : -1 + (4 - 2 * t) * t;
        const x = startX + (targetX - startX) * eased;
        const y = startY + (targetY - startY) * eased;
        await this.page.mouse.move(x, y);
        await sleep(8 + Math.random() * 12);
      }
    } catch (err) {
      this.logger.debug(`moveMouseTo failed: ${err.message}`);
    }
  }

  async scroll(minPx = 200, maxPx = 500) {
    const amount = Math.round(gaussian((minPx + maxPx) / 2, 80));
    const clamped = Math.max(minPx, Math.min(maxPx, amount));
    await this.page.mouse.wheel(0, clamped);
  }

  async maybeReadingPause(shouldStop) {
    if (Math.random() < this.persona.pauseChance) {
      return this.delayRange(5000, 20000, shouldStop);
    }
    return true;
  }
}

module.exports = { HumanSimulator };
