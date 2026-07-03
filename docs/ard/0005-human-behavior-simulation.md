# ADR-0005: Human Behavior Simulation

## Status
✅ Accepted

## Context

LinkedIn actively detects bots. Uniform timing (fixed 2s delays) and linear mouse movements are telltale signs. We need behavior that mimics human users.

## Decision

Implement a **HumanSimulator** with multiple layers:

### 1. Gaussian Delay Distribution
```javascript
gaussianRandom(mean, stdDev) {
  // Box-Muller transform
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * stdDev + mean;
}
```
Delays follow normal distribution, not uniform.

### 2. Bézier Mouse Curves
Mouse moves along cubic Bézier path with acceleration/deceleration:
```
P(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
```

### 3. Typo Simulation
3% of characters are "mistyped", then backspaced:
```javascript
if (Math.random() < 0.03) {
  await element.type(typo);
  await page.keyboard.press('Backspace');
}
```

### 4. Reading Pauses
Occasional 10-25 second pauses (simulating reading profiles).

### 5. Natural Scroll
Wheel events with momentum, not fixed amounts.

## Consequences

**Positive:**
- ✅ Much harder to detect as bot
- ✅ Matches human interaction patterns
- ✅ Reduces account flag risk

**Negative:**
- ⚠️ Slower overall (longer delays)
- ⚠️ More complex code
- ⚠️ Tuning parameters not obvious

**Mitigations:**
- Configurable "humanity" level (future)
- Clear defaults based on research
- Document each behavior in code
