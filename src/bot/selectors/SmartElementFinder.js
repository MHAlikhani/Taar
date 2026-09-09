'use strict';

const { CONNECT_SELECTORS } = require('./patterns');
const { SelectorMemory } = require('./selectorMemory');

class SmartElementFinder {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
    this.memory = new SelectorMemory();
    this.patterns = CONNECT_SELECTORS;
  }

  async findConnectButtons() {
    const ranked = this.memory.getRankedOrder(this.patterns.length);

    for (const idx of ranked) {
      const pattern = this.patterns[idx];
      try {
        const locator = this.page.locator(pattern.selector);
        const count = await locator.count();
        if (count > 0) {
          this.memory.recordSuccess(idx);
          this.logger.info(`🔍 Found ${count} button(s) via "${pattern.desc}"`);
          return locator;
        }
      } catch (err) {
        this.logger.debug(`Pattern "${pattern.id}" errored: ${err.message}`);
      }
    }

    this.logger.warn('⚠️ No primary patterns matched. Trying combined fallback.');
    let combined = this.page.locator(this.patterns[0].selector);
    for (let i = 1; i < this.patterns.length; i++) {
      combined = combined.or(this.page.locator(this.patterns[i].selector));
    }
    const count = await combined.count();
    if (count > 0) {
      this.logger.info(`🔍 Fallback found ${count} button(s).`);
      return combined;
    }

    ranked.forEach(i => this.memory.recordFailure(i));
    this.logger.warn('⚠️ No connect buttons found on this page.');
    return combined; // empty locator
  }

  async findNextPageButton() {
    const candidates = [
      this.page.getByRole('button', { name: /next/i }),
      this.page.getByRole('link', { name: /next/i }),
      this.page.locator('button[aria-label*="Next" i]'),
      this.page.locator('button[data-test-pagination-next]')
    ];
    for (const locator of candidates) {
      try {
        if (await locator.count() > 0) {
          const disabled = await locator.first().getAttribute('disabled');
          if (disabled === null) return locator.first();
        }
      } catch {}
    }
    return null;
  }

  getMemoryStats() {
    return {
      lastSuccessful: this.memory.getLastSuccessful(),
      successCount: { ...this.memory.state.successCount },
      failureCount: { ...this.memory.state.failureCount }
    };
  }
}

module.exports = { SmartElementFinder };
