'use strict';

// Integration smoke test — guards that the core bot module graph loads
// cleanly under the Bun runtime (the bot child process runs on Bun).
const { LinkedInBot } = require('../../src/bot/core/LinkedInBot');
const { BotProcessManager } = require('../../src/runtime/botProcessManager');
const { appSchema } = require('../../src/schemas/index.js');

describe('integration smoke (bun runtime)', () => {
  test('core bot classes construct', () => {
    const bot = new LinkedInBot();
    expect(typeof bot.startAutomation).toBe('function');
    expect(typeof bot.stop).toBe('function');
  });

  test('BotProcessManager accepts a UI bridge callback', () => {
    const sent = [];
    const manager = new BotProcessManager((ch, pl) => sent.push([ch, pl]));
    expect(manager.isRunning()).toBe(false);
    expect(manager.getPid()).toBeNull();
  });

  test('electrobun RPC schema defines all UI channels', () => {
    const msgs = Object.keys(appSchema.webview.messages);
    for (const m of ['botLog', 'botProgress', 'botComplete', 'botStopped', 'botExited', 'botError']) {
      expect(msgs).toContain(m);
    }
    const reqs = Object.keys(appSchema.bun.requests);
    for (const r of ['startBrowser', 'startAutomation', 'stopAutomation', 'getStatus']) {
      expect(reqs).toContain(r);
    }
  });
});
