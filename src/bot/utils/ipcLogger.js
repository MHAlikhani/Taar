'use strict';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class IpcLogger {
  constructor(level = 'info') {
    this.minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  }

  _emit(level, text) {
    if (LOG_LEVELS[level] < this.minLevel) return;

    if (process.send) {
      try {
        process.send({ type: 'log', text });
      } catch {
      }
      return;
    }

    const prefix = level === 'error' ? '[err]' : '[log]';
    const out = level === 'error' ? process.stderr : process.stdout;
    out.write(`${prefix} ${text}\n`);
  }

  info(text)  { this._emit('info', text); }
  warn(text)  { this._emit('warn', text); }
  error(text) { this._emit('error', text); }
  debug(text) { this._emit('debug', text); }

  progress(stats) {
    if (process.send) {
      try {
        process.send({ type: 'progress', stats });
      } catch {}
    }
  }
}

module.exports = { IpcLogger };
