# ADR-0003: Local Browser Channel

## Status
✅ Accepted

## Context

Playwright downloads its own Chromium binary (~150MB). This fails in regions with CDN restrictions (403 errors). Also:

- Different Chrome version than user's system
- Fingerprint differs from normal browser
- User loses cookies/sessions on each run

## Decision

Use the **system-installed Chrome** via Playwright's `channel: 'chrome'` option:

```javascript
const browser = await chromium.launch({
  channel: 'chrome',  // Uses installed Chrome
  headless: false,
  args: ['--disable-blink-features=AutomationControlled']
});
```

## Consequences

**Positive:**
- ✅ Zero download weight
- ✅ No 403 CDN errors
- ✅ Same Chrome version user normally uses
- ✅ Better fingerprint match
- ✅ Session state preserved across runs

**Negative:**
- ⚠️ Requires Chrome installed on system
- ⚠️ Chrome version varies across users
- ⚠️ Edge case: user has no Chrome

**Mitigations:**
- Clear error if Chrome not found
- Could add Edge fallback (`channel: 'msedge'`)
- Stealth plugin masks automation signals
- Document Chrome requirement
