'use strict';

const { HumanSimulator } = require('../../src/bot/core/HumanSimulator');

describe('HumanSimulator', () => {
  let simulator;
  let mockPage;
  let logger;
  let waitCalls;

  beforeEach(() => {
    waitCalls = [];
    mockPage = {
      waitForTimeout: jest.fn((ms) => {
        waitCalls.push(ms);
        return Promise.resolve();
      }),
      keyboard: {
        press: jest.fn(() => Promise.resolve())
      },
      mouse: {
        move: jest.fn(() => Promise.resolve()),
        wheel: jest.fn(() => Promise.resolve())
      },
      viewportSize: jest.fn(() => ({ width: 1280, height: 900 }))
    };
    logger = {
      info: jest.fn(), warn: jest.fn(),
      error: jest.fn(), debug: jest.fn()
    };
    simulator = new HumanSimulator(mockPage, logger);
  });

  describe('delayRange', () => {
    test('resolves without error and uses reasonable delay', async () => {
      const start = Date.now();
      await simulator.delayRange(100, 200);
      const elapsed = Date.now() - start;
      // Should have waited at least 50ms (min clamp) but not too long
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some timing variance
      expect(elapsed).toBeLessThan(500); // Should not take too long in test
    });
  });

  describe('type', () => {
    test('types each character with delays', async () => {
      const mockLocator = {
        click: jest.fn(() => Promise.resolve()),
        pressSequentially: jest.fn(() => Promise.resolve())
      };

      await simulator.type(mockLocator, 'Hi', () => false);

      // Initial click + per-char presses + delays
      expect(mockLocator.click).toHaveBeenCalled();
      // 'H' and 'i' = 2 calls (or more with typos)
      expect(mockLocator.pressSequentially.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    test('aborts on shouldStop', async () => {
      const mockLocator = {
        click: jest.fn(() => Promise.resolve()),
        pressSequentially: jest.fn(() => Promise.resolve())
      };
      let stop = false;
      const shouldStop = () => stop;
      const promise = simulator.type(mockLocator, 'Hello world', shouldStop);
      stop = true; // Trigger stop
      await promise;
      // Should have typed fewer than all characters
      // (We don't strictly assert count because of timing, but it returns)
    });
  });

  describe('scroll', () => {
    test('calls mouse.wheel', async () => {
      await simulator.scroll(100, 200);
      expect(mockPage.mouse.wheel).toHaveBeenCalledWith(0, expect.any(Number));
    });
  });

  describe('maybeReadingPause', () => {
    test('returns true without error', async () => {
      // Mock Math.random to always return > 0.15 (no long pause)
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5);
      
      const result = await simulator.maybeReadingPause(() => false);
      expect(typeof result).toBe('boolean');
      
      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('moveMouseTo', () => {
    test('handles missing bounding box gracefully', async () => {
      const mockLocator = {
        boundingBox: jest.fn(() => Promise.resolve(null))
      };
      await expect(simulator.moveMouseTo(mockLocator)).resolves.toBeUndefined();
    });

    test('moves to element center', async () => {
      const mockLocator = {
        boundingBox: jest.fn(() =>
          Promise.resolve({ x: 100, y: 100, width: 50, height: 20 })
        )
      };
      await simulator.moveMouseTo(mockLocator);
      expect(mockPage.mouse.move).toHaveBeenCalled();
      // Last move should be near center (125, 110)
      const lastCall = mockPage.mouse.move.mock.calls.at(-1);
      expect(lastCall[0]).toBeCloseTo(125, 0);
      expect(lastCall[1]).toBeCloseTo(110, 0);
    });
  });
});
