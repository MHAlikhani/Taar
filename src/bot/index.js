'use strict';

const { LinkedInBot } = require('./core/LinkedInBot');

const bot = new LinkedInBot();

let initialized = false;
let shuttingDown = false;

async function shutdown(signal = 'stop') {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bot] shutdown requested (${signal})`);
  try {
    await Promise.race([
      bot.stop(),
      new Promise((resolve) => setTimeout(resolve, 8000))
    ]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[bot] shutdown error:', err.message);
  }
  setTimeout(() => process.exit(0), 300);
}

process.on('message', async (msg) => {
  if (!msg || typeof msg !== 'object') return;

  try {
    switch (msg.type) {
      case 'init':
        if (initialized) {
          bot.log('Ignoring duplicate init message', 'warning');
          break;
        }
        initialized = true;
        await bot.init();
        break;
      case 'start':
        await bot.startAutomation(msg.options || {});
        break;
      case 'stop':
        await shutdown('stop');
        break;
      default:
        bot.log(`Unknown message type: ${msg.type}`, 'warning');
    }
  } catch (err) {
    bot.log(`❌ Fatal: ${err.message}`, 'error');
    // eslint-disable-next-line no-console
    console.error('[bot]', err);
    await shutdown('error');
  }
});

process.on('SIGINT', () => shutdown('sigint'));
process.on('SIGTERM', () => shutdown('sigterm'));

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[bot] uncaught:', err);
  try {
    bot.log(`❌ Uncaught: ${err.message}`, 'error');
  } catch {}
  shutdown('uncaught');
});

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[bot] unhandled rejection:', reason);
  try {
    bot.log(`❌ Unhandled: ${reason?.message || reason}`, 'error');
  } catch {}
});
