'use strict';

const { PATTERNS, CONNECT_SELECTORS } = require('../../src/bot/selectors/patterns');

describe('patterns', () => {
  describe('PATTERNS', () => {
    test('CONNECT_ARIA matches connect', () => {
      expect(PATTERNS.CONNECT_ARIA.test('Invite John to connect')).toBe(true);
      expect(PATTERNS.CONNECT_ARIA.test('دعوت به همکاری')).toBe(true);
      expect(PATTERNS.CONNECT_ARIA.test('Something else')).toBe(false);
    });

    test('ADD_NOTE matches variations', () => {
      expect(PATTERNS.ADD_NOTE.test('Add a note')).toBe(true);
      expect(PATTERNS.ADD_NOTE.test('افزودن یادداشت')).toBe(true);
    });

    test('SEND_WITHOUT_NOTE matches', () => {
      expect(PATTERNS.SEND_WITHOUT_NOTE.test('Send without a note')).toBe(true);
    });

    test('PERSONALIZED_REMAINING extracts count', () => {
      const match = '5 personalized invitations remaining'.match(PATTERNS.PERSONALIZED_REMAINING);
      expect(match).not.toBeNull();
      expect(parseInt(match[1], 10)).toBe(5);
    });

    test('WEEKLY_LIMIT detects', () => {
      expect(PATTERNS.WEEKLY_LIMIT.test('weekly limit reached')).toBe(true);
      expect(PATTERNS.WEEKLY_LIMIT.test('محدودیت هفتگی')).toBe(true);
    });

    test('PEOPLE_SEARCH matches URL', () => {
      expect(PATTERNS.PEOPLE_SEARCH.test('https://www.linkedin.com/search/results/people/')).toBe(true);
      expect(PATTERNS.PEOPLE_SEARCH.test('https://www.linkedin.com/search/results/people/?keywords=foo')).toBe(true);
      expect(PATTERNS.PEOPLE_SEARCH.test('https://www.linkedin.com/feed/')).toBe(false);
    });

    test('LOGIN_PAGE detects login variants', () => {
      expect(PATTERNS.LOGIN_PAGE.test('https://www.linkedin.com/login')).toBe(true);
      expect(PATTERNS.LOGIN_PAGE.test('https://www.linkedin.com/checkpoint/lg/main')).toBe(true);
      expect(PATTERNS.LOGIN_PAGE.test('https://www.linkedin.com/authwall')).toBe(true);
    });
  });

  describe('CONNECT_SELECTORS', () => {
    test('is an array with at least 2 entries', () => {
      expect(Array.isArray(CONNECT_SELECTORS)).toBe(true);
      expect(CONNECT_SELECTORS.length).toBeGreaterThanOrEqual(2);
    });

    test('each entry has id, selector, weight, desc', () => {
      CONNECT_SELECTORS.forEach(entry => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('selector');
        expect(entry).toHaveProperty('weight');
        expect(entry).toHaveProperty('desc');
        expect(typeof entry.weight).toBe('number');
      });
    });
  });
});

describe('pending exclusion (regression: 30s click timeouts on Pending buttons)', () => {
  const { PATTERNS: P } = require('../../src/bot/selectors/patterns');

  test('PENDING regex exists and matches withdraw invitations', () => {
    expect(P.PENDING).toBeInstanceOf(RegExp);
    expect(P.PENDING.test('Pending, click to withdraw invitation sent to John')).toBe(true);
    expect(P.PENDING.test('سفارش در انتظار تایید')).toBe(true);
    expect(P.PENDING.test('Connect with Jane')).toBe(false);
  });

  test('every CONNECT_SELECTORS entry excludes Pending buttons', () => {
    const { CONNECT_SELECTORS } = require('../../src/bot/selectors/patterns');
    for (const entry of CONNECT_SELECTORS) {
      expect(entry.selector).toContain(':not([aria-label*="Pending" i]');
    }
  });
});
