'use strict';

const { LinkedInBot } = require('../../src/bot/core/LinkedInBot');
const { DecisionEngine } = require('../../src/bot/core/DecisionEngine');
const { ModalStateMachine } = require('../../src/bot/core/ModalStateMachine');
const { PATTERNS } = require('../../src/bot/selectors/patterns');

const noopLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

/** Capture process.send so we can assert bot → parent notifications. */
function captureProcessSend() {
  const original = process.send;
  const calls = [];
  process.send = (msg) => { calls.push(msg); };
  return { calls, restore: () => { if (original === undefined) delete process.send; else process.send = original; } };
}

describe('LinkedInBot — browser close watchdog', () => {
  let bot;
  let captured;

  beforeEach(() => {
    bot = new LinkedInBot();
    captured = captureProcessSend();
  });

  afterEach(() => {
    captured.restore();
    // Cancel the real process.exit(0) scheduled by _handleBrowserGone
    if (bot._exitTimer) clearTimeout(bot._exitTimer);
  });

  test('browser death notifies parent with browser-closed and clears state', () => {
    bot.browser = { isConnected: () => false };
    bot.isRunning = true;

    bot._handleBrowserGone();

    expect(bot.browser).toBeNull();
    expect(bot.context).toBeNull();
    expect(bot.page).toBeNull();
    expect(bot.isRunning).toBe(false);
    expect(captured.calls.some((m) => m.type === 'browser-closed')).toBe(true);
  });

  test('watchdog handler is idempotent — only one notification', () => {
    bot.browser = { isConnected: () => false };
    bot._handleBrowserGone();
    bot.browser = { isConnected: () => false };
    bot._handleBrowserGone();

    const closeCount = captured.calls.filter((m) => m.type === 'browser-closed').length;
    expect(closeCount).toBe(1);
  });

  test('intentional close (graceful stop) does not trigger recovery', () => {
    bot._intentionalClose = true;
    bot.browser = { isConnected: () => false };

    bot._handleBrowserGone();

    expect(captured.calls.some((m) => m.type === 'browser-closed')).toBe(false);
    expect(bot.browser).not.toBeNull();
  });

  test('a live browser passes the watchdog check', () => {
    bot.browser = { isConnected: () => true };
    // simulate one watchdog tick body
    const dead = bot.browser && !bot.browser.isConnected();
    expect(dead).toBe(false);
  });
});

describe('ModalStateMachine — pending-invitation intelligence', () => {
  function makeFakePage(dialogText, dialogVisible = true) {
    const keyboard = { press: jest.fn().mockResolvedValue(undefined) };
    const modal = {
      first: () => modal,
      isVisible: async () => dialogVisible,
      waitFor: () => Promise.resolve(),
      getByRole: () => ({ first: () => ({ isVisible: async () => false }) }),
      locator: () => ({ first: () => ({ isVisible: async () => false }) }),
      textContent: () => Promise.resolve(dialogText),
      filter: () => ({ first: () => ({ isVisible: async () => false }) })
    };
    return {
      keyboard,
      locator: () => modal,
      _modal: modal
    };
  }

  function makeModal(page, decision, human) {
    return new ModalStateMachine(page, decision, human, noopLogger);
  }

  test('PENDING pattern matches withdraw-invitation dialogs (en)', () => {
    expect(PATTERNS.PENDING.test('Pending, click to withdraw invitation sent to X')).toBe(true);
  });

  test('PENDING pattern matches Persian pending text', () => {
    expect(PATTERNS.PENDING.test('در انتظار تایید')).toBe(true);
  });

  test('isPendingDialogOpen detects an open pending dialog', async () => {
    const page = makeFakePage('Pending, click to withdraw invitation');
    const modal = makeModal(page, new DecisionEngine(noopLogger), {});
    await expect(modal.isPendingDialogOpen()).resolves.toBe(true);
  });

  test('isPendingDialogOpen returns false for a normal invite dialog', async () => {
    const page = makeFakePage('Add a note to your invitation');
    const modal = makeModal(page, new DecisionEngine(noopLogger), {});
    await expect(modal.isPendingDialogOpen()).resolves.toBe(false);
  });

  test('handle() dismisses a pending dialog and returns skipped (no clicks!)', async () => {
    const page = makeFakePage('Pending, click to withdraw invitation sent to X');
    const modal = makeModal(page, new DecisionEngine(noopLogger), {});
    const result = await modal.handle(false, '', () => false);
    expect(result).toBe('skipped');
    // Escape was used to close the dialog — never clicked "withdraw"
    expect(page.keyboard.press).toHaveBeenCalledWith('Escape');
  });

  test('dismissAnyDialog closes a leftover dialog', async () => {
    const page = makeFakePage('Some leftover dialog');
    const modal = makeModal(page, new DecisionEngine(noopLogger), {});
    await modal.dismissAnyDialog();
    expect(page.keyboard.press).toHaveBeenCalledWith('Escape');
  });

  test('dismissAnyDialog is a no-op with no dialog open', async () => {
    const page = makeFakePage('whatever', false);
    const modal = makeModal(page, new DecisionEngine(noopLogger), {});
    await expect(modal.dismissAnyDialog()).resolves.toBeUndefined();
    expect(page.keyboard.press).not.toHaveBeenCalled();
  });
});

describe('DecisionEngine — adaptive pacing', () => {
  let engine;

  beforeEach(() => {
    engine = new DecisionEngine(noopLogger);
  });

  test('no cooldown without errors', () => {
    expect(engine.currentCooldownMs()).toBe(0);
  });

  test('cooldown grows exponentially with consecutive errors', () => {
    engine.recordOutcome(false);
    expect(engine.currentCooldownMs()).toBe(2000);
    engine.recordOutcome(false);
    expect(engine.currentCooldownMs()).toBe(4000);
    engine.recordOutcome(false);
    expect(engine.currentCooldownMs()).toBe(8000);
  });

  test('cooldown is capped at 20s', () => {
    for (let i = 0; i < 10; i++) engine.recordOutcome(false);
    expect(engine.currentCooldownMs()).toBe(20000);
  });

  test('a success resets the backoff entirely', () => {
    engine.recordOutcome(false);
    engine.recordOutcome(false);
    engine.recordOutcome(true);
    expect(engine.currentCooldownMs()).toBe(0);
  });

  test('skipped profiles are treated as non-failures', () => {
    engine.recordOutcome(true); // skipped → true
    expect(engine.currentCooldownMs()).toBe(0);
    expect(engine.successRate()).toBe(1);
  });

  test('successRate computes correctly', () => {
    engine.recordOutcome(true);
    engine.recordOutcome(true);
    engine.recordOutcome(false);
    expect(engine.successRate()).toBeCloseTo(2 / 3);
  });

  test('successRate is null before any outcome', () => {
    expect(engine.successRate()).toBeNull();
  });
});


describe('LinkedInBot — active browser probe (pipe-death detection)', () => {
  let bot;
  let captured;

  beforeEach(() => {
    bot = new LinkedInBot();
    captured = captureProcessSend();
  });

  afterEach(() => {
    captured.restore();
    if (bot._exitTimer) clearTimeout(bot._exitTimer);
  });

  test('probe detects a dead pipe (version rejects) and triggers recovery', async () => {
    bot.browser = {
      isConnected: () => true,
      version: () => Promise.reject(new Error('pipe dead'))
    };

    await bot._probeBrowser(50);

    expect(captured.calls.some((m) => m.type === 'browser-closed')).toBe(true);
    expect(bot.browser).toBeNull();
  });

  test('probe detects a hung pipe (version never settles) via timeout', async () => {
    bot.browser = {
      isConnected: () => true,
      version: () => new Promise(() => {})
    };

    await bot._probeBrowser(50);

    expect(captured.calls.some((m) => m.type === 'browser-closed')).toBe(true);
  });

  test('probe stays quiet on a healthy browser', async () => {
    bot.browser = {
      isConnected: () => true,
      version: () => Promise.resolve('124.0')
    };

    await bot._probeBrowser(50);

    expect(captured.calls.some((m) => m.type === 'browser-closed')).toBe(false);
    expect(bot.browser).not.toBeNull();
  });

  test('probe skips when an intentional close is in progress', async () => {
    bot._intentionalClose = true;
    bot.browser = {
      isConnected: () => false,
      version: () => Promise.reject(new Error('closed'))
    };

    await bot._probeBrowser(50);

    expect(captured.calls.some((m) => m.type === 'browser-closed')).toBe(false);
  });
});
