'use strict';

import { BrowserWindow, BrowserView } from 'electrobun/bun';
import { appSchema } from '../schemas/index.js';
const { BotProcessManager } = require('../runtime/botProcessManager.js');

let mainWindow = null;
let botManager = null;

const CHANNEL_TO_MESSAGE = {
  'bot-log':     { name: 'botLog',      wrap: (p) => ({ text: String(p) }) },
  'bot-progress':{ name: 'botProgress', wrap: (p) => ({ stats: p || { sent: 0, skipped: 0, errors: 0 } }) },
  'bot-complete':{ name: 'botComplete', wrap: (p) => ({ text: String(p) }) },
  'bot-stopped': { name: 'botStopped',  wrap: (p) => ({ stats: p || { sent: 0, skipped: 0, errors: 0 } }) },
  'bot-exited':  { name: 'botExited',   wrap: () => ({}) },
  'bot-error':   { name: 'botError',    wrap: (p) => ({ text: String(p) }) }
};

const rpc = BrowserView.defineRPC({
  schemas: appSchema,
  handlers: {
    requests: {
      startBrowser: async () => {
        const manager = ensureManager();
        if (manager.isRunning()) {
          manager.kill();
          await new Promise((r) => setTimeout(r, 500));
        }
        try {
          await manager.start();
          return ok();
        } catch (err) {
          return fail(err);
        }
      },
      startAutomation: async (options) => {
        const manager = ensureManager();
        if (!manager.isReady()) {
          return fail('Browser not ready yet. Launch the browser and wait for it to finish loading.');
        }
        try {
          manager.send({ type: 'start', options: options || {} });
          return ok();
        } catch (err) {
          return fail(err);
        }
      },
      stopAutomation: async () => {
        const manager = ensureManager();
        if (!manager.isRunning()) return fail('Bot is not running');
        try {
          manager.send({ type: 'stop' });
          return ok();
        } catch (err) {
          return fail(err);
        }
      },
      getStatus: async () => {
        const manager = ensureManager();
        return { running: manager.isRunning(), pid: manager.getPid() };
      }
    },
    messages: {}
  }
});

function ensureManager() {
  if (!botManager) {
    botManager = new BotProcessManager((channel, payload) => {
      const m = CHANNEL_TO_MESSAGE[channel];
      if (m) {
        try {
          rpc.send[m.name](m.wrap(payload));
        } catch {}
      }
    });
  }
  return botManager;
}

const ok = (data = {}) => ({ success: true, ...data });
const fail = (error) => ({ success: false, error: String(error?.message || error) });

mainWindow = new BrowserWindow({
  title: 'Taar — LinkedIn Networking Assistant',
  url: 'views://mainview/index.html',
  rpc
});

process.on('exit', () => {
  if (botManager) botManager.kill();
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => process.exit(0));
}

// Bun turns a child-process pipe failure into an uncaught EPIPE that would
// kill this event loop and freeze the UI. Swallow it — the manager's exit
// handler resets everything.
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EPIPE') return;
  console.error('[main] uncaught:', err);
});
process.on('unhandledRejection', (reason: any) => {
  if (reason?.code === 'EPIPE') return;
  console.error('[main] unhandled rejection:', reason);
});
