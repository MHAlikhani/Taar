'use strict';

const { BotProcessManager } = require('../../src/runtime/botProcessManager');

function makeFakeProc() {
  return {
    killed: false,
    killedBySignal: null,
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    on: () => {},
    send: () => {},
    kill(signal) { this.killedBySignal = signal; this.killed = true; }
  };
}

describe('BotProcessManager — browser close & relaunch recovery', () => {
  let uiSend;
  let manager;

  beforeEach(() => {
    uiSend = jest.fn();
    manager = new BotProcessManager(uiSend);
  });

  test('starts not running and not ready', () => {
    expect(manager.isRunning()).toBe(false);
    expect(manager.isReady()).toBe(false);
    expect(manager.getPid()).toBeNull();
  });

  test('browser-closed message kills the process and notifies the UI', () => {
    const proc = makeFakeProc();
    manager.process = proc;

    manager._handleMessage({ type: 'browser-closed' });

    // Process was torn down so a relaunch is possible
    expect(manager.process).toBeNull();
    expect(manager.isRunning()).toBe(false);
    // UI got the recovery log line
    const channels = uiSend.mock.calls.map((c) => c[0]);
    expect(channels).toContain('bot-log');
    expect(uiSend.mock.calls.some((c) => c[0] === 'bot-log' && /closed/i.test(c[1]))).toBe(true);
  });

  test('ready message sets readiness; exit clears it and emits bot-exited', () => {
    const proc = makeFakeProc();
    manager.process = proc;

    manager._handleMessage({ type: 'ready' });
    expect(manager.isReady()).toBe(true);

    manager._handleExit(0, null);
    expect(manager.isReady()).toBe(false);
    expect(uiSend.mock.calls.some((c) => c[0] === 'bot-exited')).toBe(true);
  });

  test('kill() sends SIGTERM and clears the process reference', () => {
    const proc = makeFakeProc();
    manager.process = proc;
    manager.ready = true;

    manager.kill();

    expect(proc.killedBySignal).toBe('SIGTERM');
    expect(manager.process).toBeNull();
    expect(manager.isReady()).toBe(false);
  });

  test('kill() is safe when no process exists', () => {
    expect(() => manager.kill()).not.toThrow();
  });

  test('send() throws when bot is not running', () => {
    expect(() => manager.send({ type: 'start' })).toThrow(/not running/i);
  });

  test('forwarded stats messages reach the UI bridge', () => {
    manager.process = makeFakeProc();
    manager._handleMessage({ type: 'progress', stats: { sent: 2, skipped: 1, errors: 0 } });
    expect(uiSend).toHaveBeenCalledWith('bot-progress', { sent: 2, skipped: 1, errors: 0 });
  });

  test('malformed messages are ignored', () => {
    manager.process = makeFakeProc();
    expect(() => manager._handleMessage(null)).not.toThrow();
    expect(() => manager._handleMessage('not-an-object')).not.toThrow();
    expect(() => manager._handleMessage({ type: 'unknown-type' })).not.toThrow();
  });
});


describe('BotProcessManager — bot entrypoint resolution', () => {
  test('resolves the bot entry to an existing file', () => {
    const path = require('path');
    const fs = require('fs');
    const managerPath = require.resolve('../../src/runtime/botProcessManager');
    const runtimeDir = path.dirname(managerPath);
    const scriptPath = path.join(runtimeDir, '..', 'bot', 'index.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
    expect(scriptPath.replace(/\\/g, '/')).toMatch(/src\/bot\/index\.js$/);
  });
});
