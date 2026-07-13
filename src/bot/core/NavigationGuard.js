'use strict';

const { PATTERNS } = require('../selectors/patterns');

class NavigationGuard {
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
  }

  async isOnPeopleSearch() {
    const url = this.page.url();
    return PATTERNS.PEOPLE_SEARCH.test(url);
  }

  async isOnLoginPage() {
    const url = this.page.url();
    return PATTERNS.LOGIN_PAGE.test(url);
  }

  async ensurePeopleSearch() {
    const url = this.page.url();

    if (PATTERNS.PEOPLE_SEARCH.test(url)) {
      return 'ok';
    }

    if (PATTERNS.LOGIN_PAGE.test(url)) {
      this.logger.error('🧭 Session expired — please log in again in the browser window');
      return 'failed';
    }

    if (PATTERNS.FEED_PAGE.test(url) || url.includes('/feed')) {
      this.logger.info('🧭 Not on People Search → auto-navigating...');
      try {
        await this.page.goto('https://www.linkedin.com/search/results/people/', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        return 'corrected';
      } catch (err) {
        this.logger.error(`🧭 Navigation failed: ${err.message}`);
        return 'failed';
      }
    }

    const otherSearch = url.match(/\/search\/results\/(companies|jobs|groups|schools|events|content)\//);
    if (otherSearch) {
      const newUrl = url.replace(
        /\/search\/results\/(companies|jobs|groups|schools|events|content)\//,
        '/search/results/people/'
      );
      this.logger.info(`🧭 On /${otherSearch[1]}/ → switching to /people/`);
      try {
        await this.page.goto(newUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return 'corrected';
      } catch (err) {
        this.logger.error(`🧭 Navigation failed: ${err.message}`);
        return 'failed';
      }
    }

    this.logger.warn(
      `🧭 Not on People Search. Current URL: ${url}\n` +
      `   Please navigate to https://www.linkedin.com/search/results/people/ in the browser window.`
    );
    return 'failed';
  }

  async waitForPeopleSearch(maxWaitMs = 300000, shouldStop) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (shouldStop && shouldStop()) return false;
      if (await this.isOnPeopleSearch()) return true;
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }
}

module.exports = { NavigationGuard };
