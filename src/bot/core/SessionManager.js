'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');
const SESSION_FILE = path.join(DATA_DIR, 'session.json');

class SessionManager {
  constructor(logger) {
    this.logger = logger;
    this._ensureDir();
  }

  _ensureDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      this.logger.warn(`⚠️ Cannot create data dir: ${err.message}`);
    }
  }

  async save(context) {
    try {
      const state = await context.storageState();
      fs.writeFileSync(SESSION_FILE, JSON.stringify(state, null, 2));
      this.logger.info('💾 Session saved.');
      return true;
    } catch (err) {
      this.logger.warn(`⚠️ Session save failed: ${err.message}`);
      return false;
    }
  }

  load() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        const state = JSON.parse(raw);
        this.logger.info('📂 Session loaded from disk.');
        return state;
      }
    } catch (err) {
      this.logger.warn(`⚠️ Session load failed: ${err.message}`);
    }
    return null;
  }

  clear() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        this.logger.info('🗑️ Session cleared.');
      }
    } catch (err) {
      this.logger.warn(`⚠️ Session clear failed: ${err.message}`);
    }
  }

  hasSession() {
    return fs.existsSync(SESSION_FILE);
  }
}

module.exports = { SessionManager };
