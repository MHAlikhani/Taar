'use strict';

const { DecisionEngine } = require('../../src/bot/core/DecisionEngine');

describe('DecisionEngine', () => {
  let engine;
  let logs;

  beforeEach(() => {
    logs = [];
    const logger = {
      info: (t) => logs.push(['info', t]),
      warn: (t) => logs.push(['warn', t]),
      error: (t) => logs.push(['error', t]),
      debug: (t) => logs.push(['debug', t])
    };
    engine = new DecisionEngine(logger);
  });

  describe('shouldAddNote', () => {
    test('returns false when user did not request note', () => {
      expect(engine.shouldAddNote(false)).toBe(false);
    });

    test('returns true when user requested and quota unknown', () => {
      expect(engine.shouldAddNote(true)).toBe(true);
    });

    test('returns true when user requested and quota available', () => {
      engine.updatePersonalizedCount(5);
      expect(engine.shouldAddNote(true)).toBe(true);
    });

    test('returns false when quota exhausted', () => {
      engine.updatePersonalizedCount(0);
      expect(engine.shouldAddNote(true)).toBe(false);
    });

    test('logs decision', () => {
      engine.shouldAddNote(false);
      expect(logs.some(l => l[1].includes('Decision'))).toBe(true);
    });
  });

  describe('optimizeText', () => {
    test('returns original if under limit', () => {
      const text = 'Hello, world!';
      expect(engine.optimizeText(text, 200)).toBe(text);
    });

    test('truncates with ellipsis if over limit', () => {
      const text = 'x'.repeat(250);
      const result = engine.optimizeText(text, 200);
      expect(result.length).toBe(200);
      expect(result.endsWith('…')).toBe(true);
    });

    test('handles empty string', () => {
      expect(engine.optimizeText('', 200)).toBe('');
    });
  });

  describe('updatePersonalizedCount', () => {
    test('updates count', () => {
      engine.updatePersonalizedCount(5);
      expect(engine.personalizedRemaining).toBe(5);
    });

    test('ignores non-numbers', () => {
      engine.updatePersonalizedCount(null);
      expect(engine.personalizedRemaining).toBeNull();
      engine.updatePersonalizedCount('abc');
      expect(engine.personalizedRemaining).toBeNull();
    });
  });

  describe('consumePersonalizedInvitation', () => {
    test('decrements count when positive', () => {
      engine.updatePersonalizedCount(3);
      engine.consumePersonalizedInvitation();
      expect(engine.personalizedRemaining).toBe(2);
    });

    test('does not go below zero', () => {
      engine.updatePersonalizedCount(0);
      engine.consumePersonalizedInvitation();
      expect(engine.personalizedRemaining).toBe(0);
    });

    test('does nothing when count unknown', () => {
      engine.consumePersonalizedInvitation();
      expect(engine.personalizedRemaining).toBeNull();
    });
  });

  describe('limit tracking', () => {
    test('shouldStopDueToLimits is false by default', () => {
      expect(engine.shouldStopDueToLimits()).toBe(false);
    });

    test('returns true after weekly limit', () => {
      engine.markWeeklyLimitReached();
      expect(engine.shouldStopDueToLimits()).toBe(true);
    });

    test('returns true after restriction', () => {
      engine.markRestrictionDetected('test');
      expect(engine.shouldStopDueToLimits()).toBe(true);
    });
  });
});
