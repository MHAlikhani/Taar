'use strict';

const { spawn } = require('child_process');
const path = require('path');
const {
  resolveNodePath, verifyNodeVersion,
  resolveBunPath, verifyBunVersion
} = require('./nodeResolver');

const INIT_TIMEOUT_MS = 45000;

class BotProcessManager {
  constructor(uiSend) {
    this._uiSend = uiSend;
    this.process = null;
    this.initResolve = null;
    this.initTimer = null;
    this.ready = false;
    this.lastSeen = Date.now();
    this._stallTimer = null;
  }

  isRunning() {
    return this.process !== null && !this.process.killed;
  }

  isReady() {
    return this.isRunning() && this.ready;
  }

  getPid() {
    return this.process ? this.process.pid : null;
  }

  start() {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, '..', 'bot', 'index.js');

      const bunPath = process.env.BOT_RUNTIME === 'node' ? null : resolveBunPath();
      let exePath;
      let runtimeName;
      if (bunPath && verifyBunVersion(bunPath)) {
        exePath = bunPath;
        runtimeName = 'Bun';
      } else {
        const nodePath = resolveNodePath();
        if (!verifyNodeVersion(nodePath)) {
          return reject(new Error(`System Node.js (${nodePath}) is below v20. Please upgrade.`));
        }
        exePath = nodePath;
        runtimeName = 'Node.js';
      }

      try {
        this.process = spawn(exePath, [scriptPath], {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          env: {
            ...process.env,
            NODE_ENV: process.env.NODE_ENV || 'production'
          },
          windowsHide: false
        });
      } catch (err) {
        return reject(new Error(`Failed to spawn bot process: ${err.message}`));
      }

      this._send('bot-log', `⚙️ Bot process running on ${runtimeName}`);

      this.initResolve = { resolve, reject };

      const heartbeatTimer = setInterval(() => {
        this._send('bot-log', '⏳ Still loading browser... please wait');
      }, 10000);

      this.initTimer = setTimeout(() => {
        clearInterval(heartbeatTimer);
        if (this.initResolve) {
          this.initResolve.reject(new Error('Bot initialization timed out (45s). Browser may be slow to start.'));
          this.initResolve = null;
          this.kill();
        }
      }, INIT_TIMEOUT_MS);

      this._heartbeatTimer = heartbeatTimer;

      this._wireEvents();
      this._startStallWatch();

      this.process.send({ type: 'init' });
    });
  }

  send(msg) {
    if (!this.isRunning()) {
      throw new Error('Bot process is not running');
    }
    this.process.send(msg);
  }

  kill() {
    clearInterval(this._stallTimer);
    this._stallTimer = null;
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }, 3000);
      } catch {}
    }
    this.process = null;
    this._clearInit();
  }

  _wireEvents() {
    const proc = this.process;

    // Without these, a pipe failure surfaces as an uncaught EPIPE
    proc.stdout.on('error', () => {});
    proc.stderr.on('error', () => {});
    proc.on('pipe', () => {});

    proc.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) console.log(`[bot:out] ${text}`);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) console.error(`[bot:err] ${text}`);
      this._send('bot-error', text);
    });

    proc.on('message', (msg) => this._handleMessage(msg));
    proc.on('error', (err) => this._handleError(err));
    proc.on('exit', (code, signal) => this._handleExit(code, signal));
  }

  _startStallWatch() {
    clearInterval(this._stallTimer);
    this._stallTimer = setInterval(() => this._checkStall(), 30000);
    this._stallTimer.unref?.();
  }

  _checkStall() {
    if (!this.isRunning() || !this.ready) return;
    if (Date.now() - this.lastSeen <= 90000) return;
    this._send('bot-log', '⚠️ Bot stopped responding — recovering session...');
    this.kill();
  }

  _handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    this.lastSeen = Date.now();

    switch (msg.type) {
      case 'ready':
        if (this._heartbeatTimer) {
          clearInterval(this._heartbeatTimer);
          this._heartbeatTimer = null;
        }
        this.ready = true;
        this._completeInit(null);
        break;
      case 'log':
        this._send('bot-log', msg.text);
        break;
      case 'progress':
        this._send('bot-progress', msg.stats);
        break;
      case 'complete':
        this._send('bot-complete', msg.text);
        break;
      case 'stopped':
        this._send('bot-stopped', msg.stats);
        break;
      case 'error':
        this._send('bot-error', msg.text);
        break;
      case 'heartbeat':
        break;
      case 'browser-closed':
        this._send('bot-log', '🔴 Browser window was closed. Click "Launch Browser" to start a new session.');
        this.kill();
        break;
    }
  }

  _handleError(err) {
    this.ready = false;
    this._completeInit(err);
    this._send('bot-error', `Process error: ${err.message}`);
    this.process = null;
    this._send('bot-exited');
  }

  _handleExit(code, signal) {
    this.ready = false;
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      console.log(`[bot] Process terminated normally (${signal})`);
    } else {
      console.log(`[bot] exited with code ${code}${signal ? ', signal ' + signal : ''}`);
    }
    this.process = null;
    this._clearInit();
    this._send('bot-exited');
  }

  _completeInit(error) {
    if (!this.initResolve) return;
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    clearTimeout(this.initTimer);
    this.initTimer = null;
    if (error) {
      this.initResolve.reject(error);
    } else {
      this.initResolve.resolve();
    }
    this.initResolve = null;
  }

  _clearInit() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
    if (this.initResolve) {
      this.initResolve.reject(new Error('Bot process exited before ready'));
      this.initResolve = null;
    }
  }

  _send(channel, payload) {
    if (this._uiSend) {
      try {
        this._uiSend(channel, payload);
      } catch {}
    }
  }
}

module.exports = { BotProcessManager };
