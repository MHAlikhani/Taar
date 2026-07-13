'use strict';

let chromium = null;
let stealthPlugin = null;

function loadPlaywright() {
  if (!chromium) {
    const pwExtra = require('playwright-extra');
    chromium = pwExtra.chromium;
    stealthPlugin = require('puppeteer-extra-plugin-stealth')();
    chromium.use(stealthPlugin);
  }
  return { chromium };
}

const { IpcLogger } = require('../utils/ipcLogger');
const { SmartElementFinder } = require('../selectors/SmartElementFinder');
const { DecisionEngine } = require('./DecisionEngine');
const { HumanSimulator } = require('./HumanSimulator');
const { ModalStateMachine } = require('./ModalStateMachine');
const { SessionManager } = require('./SessionManager');
const { NavigationGuard } = require('./NavigationGuard');
const { PATTERNS } = require('../selectors/patterns');
const { sleep } = require('../utils/sleep');

function getBrowserChannelsToTry() {
  return ['chrome', 'msedge'];
}

class LinkedInBot {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.logger = new IpcLogger(process.env.LOG_LEVEL || 'info');

    this.isRunning = false;
    this.isStopping = false;
    this._intentionalClose = false;
    this.stats = { sent: 0, skipped: 0, errors: 0 };

    this.finder = null;
    this.decision = new DecisionEngine(this.logger);
    this.human = null;
    this.modal = null;
    this.session = new SessionManager(this.logger);
    this.nav = null;
  }

  log(text, level = 'info') {
    this.logger[level === 'info' ? 'info' : level](text);
  }

  _watchForBrowserClose() {
    this.browser.on('disconnected', () => this._handleBrowserGone());
    this._browserWatchdog = setInterval(() => this._probeBrowser(), 3000);
    this._browserWatchdog.unref?.();
  }

  async _probeBrowser(timeoutMs = 5000) {
    if (!this.browser || this._intentionalClose || this._probing) return;
    this._probing = true;
    try {
      // Active roundtrip — passive checks (isConnected / disconnected event)
      // miss the close when the CDP pipe dies without a clean close frame
      // (observed under the Bun runtime).
      await Promise.race([
        this.browser.version(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('probe timeout')), timeoutMs))
      ]);
    } catch {
      this._handleBrowserGone();
    } finally {
      this._probing = false;
    }
  }

  _handleBrowserGone() {
    if (this._intentionalClose || this._browserGoneHandled) return;
    this._browserGoneHandled = true;
    if (this._browserWatchdog) {
      clearInterval(this._browserWatchdog);
      this._browserWatchdog = null;
    }

    this.logger.warn('🔴 Browser window was closed. You can launch a new browser from the app.');
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isRunning = false;
    this.isStopping = true;

    if (process.send) {
      try { process.send({ type: 'browser-closed' }); } catch {}
    }

    this._exitTimer = setTimeout(() => process.exit(0), 200);
    this._exitTimer.unref?.();
  }

  async init() {
    if (process.send) {
      try { process.send({ type: 'log', text: '🔹 Loading browser engine...' }); } catch {}
    }

    this.logger.info('🔹 Starting browser initialization...');

    let chromium;
    try {
      const loaded = loadPlaywright();
      chromium = loaded.chromium;
      this.logger.info('✅ Playwright loaded successfully');
    } catch (err) {
      this.logger.error(`❌ Failed to load Playwright: ${err.message}`);
      throw err;
    }

    const channels = getBrowserChannelsToTry();
    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-infobars',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-background-timer-throttling'
    ];

    let lastError = null;
    for (const channel of channels) {
      try {
        this.logger.info(`🔹 Trying to launch with ${channel}...`);
        this.browser = await chromium.launch({
          headless: false,
          channel,
          args: launchArgs
        });
        this.logger.info(`✅ Browser launched via ${channel}`);
        lastError = null;
        this._watchForBrowserClose();
        break;
      } catch (err) {
        this.logger.warn(`⚠️ ${channel} failed: ${err.message.split('\n')[0]}`);
        lastError = err;
        continue;
      }
    }

    if (!this.browser) {
      try {
        this.logger.info('🔹 Falling back to bundled Chromium...');
        this.browser = await chromium.launch({
          headless: false,
          args: launchArgs
        });
        this.logger.info('✅ Browser launched via bundled Chromium');
        this._watchForBrowserClose();
      } catch (err) {
        this.logger.error(
          `❌ All browser launch attempts failed: ${err.message}` +
          (lastError ? ` (last channel error: ${lastError.message.split('\n')[0]})` : '')
        );
        throw err;
      }
    }

    try {

      const savedState = this.session.load();
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 900 },
        storageState: savedState || undefined,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();

      this.finder = new SmartElementFinder(this.page, this.logger);
      this.human = new HumanSimulator(this.page, this.logger);
      this.modal = new ModalStateMachine(this.page, this.decision, this.human, this.logger);
      this.nav = new NavigationGuard(this.page, this.logger);

      this.logger.info('✅ Browser launched successfully. You can now log in.');
      if (process.send) {
        try { process.send({ type: 'ready' }); } catch {}
      }

      this.page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }).catch(() => {}).then(async () => {
        const loggedIn = await this._isLoggedIn();
        if (loggedIn) {
          this.logger.info('✅ Already logged in. Using saved session.');
        } else {
          this.logger.info('🔑 Please log in to LinkedIn in the browser window.');
          await this.page.goto('https://www.linkedin.com/login', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          }).catch(() => {});

          const success = await this._waitForLogin();
          if (success) {
            try {
              await this.session.save(this.context);
              this.logger.info('✅ Login successful. Session saved.');
            } catch {}
          }
        }
      });
    } catch (err) {
      this.logger.error(`❌ Init failed: ${err.message}`);
      if (process.send) {
        try { process.send({ type: 'error', text: `Init failed: ${err.message}` }); } catch {}
      }
      await this.stop();
      throw err;
    }
  }

  async _isLoggedIn() {
    try {
      await sleep(1000);
      const url = this.page.url();
      if (PATTERNS.LOGIN_PAGE.test(url)) return false;
      const hasNav = await this.page.locator('header.global-nav, div.global-nav').count();
      return hasNav > 0;
    } catch {
      return false;
    }
  }

  async _waitForLogin(maxMs = 600000) {
    try {
      await this.page.waitForURL(url => !PATTERNS.LOGIN_PAGE.test(url.toString()), {
        timeout: maxMs
      });
      await sleep(1500);
      return true;
    } catch (err) {
      if (this.browser && !this.browser.isConnected()) {
        this.logger.warn('🔴 Browser was closed while waiting for login.');
      } else {
        this.logger.warn('⚠️ Login wait timeout (10 minutes).');
      }
      return false;
    }
  }

  async _checkForRestrictions() {
    try {
      const body = await this.page.locator('body').textContent();
      if (!body) return false;
      if (PATTERNS.WEEKLY_LIMIT.test(body)) {
        this.decision.markWeeklyLimitReached();
        return true;
      }
      const restrictionMatch = body.match(PATTERNS.RESTRICTION);
      if (restrictionMatch) {
        this.decision.markRestrictionDetected(restrictionMatch[0]);
        return true;
      }
    } catch {}
    return false;
  }

  async startAutomation(options) {
    const { maxRequests = 30, addNote = false, noteText = '' } = options;

    if (!this.page || !this.nav) {
      this.logger.error('❌ Browser not initialized yet — launch the browser first and wait for it to load.');
      if (process.send) {
        try { process.send({ type: 'error', text: 'Browser not initialized yet — launch the browser first.' }); } catch {}
      }
      return;
    }

    this.isRunning = true;
    this.isStopping = false;
    this.stats = { sent: 0, skipped: 0, errors: 0 };

    const navResult = await this.nav.ensurePeopleSearch();
    if (navResult === 'failed') {
      this.logger.info('⏳ Waiting for you to navigate to People Search...');
      const reached = await this.nav.waitForPeopleSearch(300000, () => this.isStopping);
      if (!reached) {
        this.logger.warn('⚠️ Did not reach People Search. Aborting.');
        this.isRunning = false;
        return;
      }
    }

    this.logger.info(`🚀 Starting: ${maxRequests} requests${addNote ? ' with notes' : ''}.`);
    this.logger.info(`🧠 Persona: ${this.human.persona.name} · ${this.decision.assess()}`);

    while (
      this.stats.sent < maxRequests &&
      this.isRunning &&
      !this.isStopping &&
      !this.decision.shouldStopDueToLimits()
    ) {
      if (await this._checkForRestrictions()) break;

      await this.modal.dismissAnyDialog();

      const buttons = await this.finder.findConnectButtons();
      const count = await buttons.count();

      if (count === 0) {
        const nextBtn = await this.finder.findNextPageButton();
        if (nextBtn) {
          this.logger.info('📄 Moving to next page...');
          await this.human.moveMouseTo(nextBtn);
          await this.human.delayRange(300, 600, () => this.isStopping);
          await nextBtn.click();
          await this.page.waitForLoadState('domcontentloaded').catch(() => {});
          await this.human.delayRange(2500, 4000, () => this.isStopping);
        } else {
          this.logger.info('✅ End of search results reached.');
          break;
        }
        continue;
      }

      const current = buttons.first();

      try {
        await current.scrollIntoViewIfNeeded({ timeout: 3000 });
        await this.human.delayRange(600, 1200, () => this.isStopping);
        await this.human.maybeReadingPause(() => this.isStopping);

        if (this.isStopping) break;

        await this.human.moveMouseTo(current);
        await current.click();
        await this.human.delayRange(800, 1500, () => this.isStopping);

        if (this.isStopping) break;

        const result = await this.modal.handle(addNote, noteText, () => this.isStopping);

        if (result === 'sent') {
          this.stats.sent++;
          this.decision.recordOutcome(true);
          this.logger.info(`✅ Sent: ${this.stats.sent}/${maxRequests}`);
        } else if (result === 'skipped') {
          this.stats.skipped++;
          this.decision.recordOutcome(true); // not a failure — don't punish pacing
          this.logger.info(`⊘ Skipped. Total skipped: ${this.stats.skipped}`);
        } else {
          this.stats.errors++;
          this.decision.recordOutcome(false);
          this.logger.warn(`⚠️ Error on profile. Total errors: ${this.stats.errors}`);
        }

        if (process.send) {
          try { process.send({ type: 'progress', stats: { ...this.stats } }); } catch {}
        }

        if (this.stats.sent % 5 === 0 && this.stats.sent > 0) {
          try { await this.session.save(this.context); } catch {}
        }

        await this.human.delayRange(2500, 4500, () => this.isStopping);

        const cooldown = this.decision.currentCooldownMs();
        if (cooldown > 0) {
          this.logger.info(`🧠 Cooling down ${(cooldown / 1000).toFixed(0)}s before retrying...`);
          await sleep(cooldown, () => this.isStopping);
        }
      } catch (err) {
        if (this.isStopping) break;
        this.decision.recordOutcome(false);
        this.logger.error(`❌ Loop error: ${err.message.split('\n')[0]}`);
        this.stats.errors++;
        if (process.send) {
          try { process.send({ type: 'progress', stats: { ...this.stats } }); } catch {}
        }
        try { await this.modal.dismissAnyDialog(); } catch {}
        await this.human.delayRange(1000, 2000, () => this.isStopping);
      }
    }

    this.isRunning = false;

    if (this.context) {
      try { await this.session.save(this.context); } catch {}
    }

    const msg = `🏁 Finished. Sent: ${this.stats.sent}, Skipped: ${this.stats.skipped}, Errors: ${this.stats.errors}`;
    this.logger.info(msg);
    if (process.send) {
      try { process.send({ type: 'complete', text: msg }); } catch {}
    }
  }

  async stop() {
    if (this.isStopping) return;
    this.isStopping = true;
    this.isRunning = false;
    this._intentionalClose = true;
    this._browserGoneHandled = true;
    if (this._browserWatchdog) {
      clearInterval(this._browserWatchdog);
      this._browserWatchdog = null;
    }
    this.logger.info('🛑 Stopping gracefully...');

    await sleep(300);

    try {
      if (this.context) await this.session.save(this.context);
    } catch {}

    try {
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    } catch (err) {
      this.logger.warn(`⚠️ Close error: ${err.message}`);
    }

    if (process.send) {
      try { process.send({ type: 'stopped', stats: { ...this.stats } }); } catch {}
    }

    this.logger.info('✅ Stopped cleanly.');
  }
}

module.exports = { LinkedInBot };
