# ADR-0004: Adaptive Selector Engine

## Status
✅ Accepted

## Context

LinkedIn frequently changes CSS class names (obfuscation). Hard-coded selectors break on every UI update. A single selector approach is too brittle.

## Decision

Build a **SmartElementFinder** with:

1. **Multiple strategies** — ordered by priority
2. **Multi-signal scoring** — weight matches by signal strength
3. **Persistent memory** — remember last successful strategy
4. **Graceful fallback** — try next strategy on failure

```javascript
class SmartElementFinder {
  patterns = [
    { selector: 'button[aria-label*="connect" i]', weight: 10 },
    { selector: 'a[aria-label*="invite" i]', weight: 8 },
    { selector: '[componentkey*="Connect"]', weight: 6 },
    { selector: 'a[href*="search-custom-invite"]', weight: 4 },
    { selector: 'text=Connect', weight: 2 }
  ];

  async find() {
    // Try last successful first (from memory)
    // Score each match
    // Return highest score
    // Persist winning strategy
  }
}
```

Memory stored in `data/selector-memory.json`:
```json
{
  "lastSuccessfulPattern": 0,
  "successCount": {"0": 45, "1": 3},
  "failureCount": {"1": 2}
}
```

## Consequences

**Positive:**
- ✅ Resilient to LinkedIn DOM changes
- ✅ Self-improving over time
- ✅ Survives class-name rotations
- ✅ Works across locales (multi-language patterns)

**Negative:**
- ⚠️ Slightly slower on first run
- ⚠️ Memory file needs cleanup occasionally
- ⚠️ Complex scoring logic

**Mitigations:**
- Fast-path for cached strategy
- Memory file small (~200 bytes)
- Comprehensive unit tests for scoring
