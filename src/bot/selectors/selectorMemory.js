'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'selector-memory.json');

const DEFAULT_STATE = {
  lastSuccessfulPattern: 0,
  successCount: {},
  failureCount: {}
};

class SelectorMemory {
  constructor() {
    this.state = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf8');
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SelectorMemory] load error:', err.message);
    }
    return { ...DEFAULT_STATE };
  }

  _save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.state, null, 2));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[SelectorMemory] save error:', err.message);
    }
  }

  getLastSuccessful() {
    return typeof this.state.lastSuccessfulPattern === 'number'
      ? this.state.lastSuccessfulPattern
      : 0;
  }

  recordSuccess(index) {
    const key = String(index);
    this.state.successCount[key] = (this.state.successCount[key] || 0) + 1;
    this.state.lastSuccessfulPattern = index;
    this._save();
  }

  recordFailure(index) {
    const key = String(index);
    this.state.failureCount[key] = (this.state.failureCount[key] || 0) + 1;
    this._save();
  }

  getRankedOrder(totalPatterns) {
    const indices = Array.from({ length: totalPatterns }, (_, i) => i);
    const scores = indices.map(i => {
      const s = this.state.successCount[String(i)] || 0;
      const f = this.state.failureCount[String(i)] || 0;
      const lastBonus = i === this.state.lastSuccessfulPattern ? 1000 : 0;
      return { i, score: s - f + lastBonus };
    });
    scores.sort((a, b) => b.score - a.score);
    return scores.map(s => s.i);
  }
}

module.exports = { SelectorMemory };
