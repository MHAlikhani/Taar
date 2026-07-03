# Troubleshooting

## Installation Issues

### ❌ "Cannot find module 'playwright-extra'"
**Fix:** Clean install:
```bash
rm -rf node_modules bun.lock package-lock.json
bun install
```

### ❌ "Download failed: 403 AccessDenied" (Playwright)
**Fix:** We use system Chrome instead. No download needed.
```javascript
channel: 'chrome'
```

### ❌ "You are running Node.js 18.18.2. Playwright requires Node.js 20+"
**Fix:** Bot is now spawned with system Node:
```bash
node --version   # Should show v20+ or v24
```

### ❌ "ERR_IPC_ONE_PIPE"
**Fix (already applied):** Only one `'ipc'` in stdio:
```javascript
stdio: ['pipe', 'pipe', 'pipe', 'ipc']
```

---

## Runtime Issues

### ❌ Launch button stays disabled after stop
**Fix:** Bot must exit cleanly. If stuck, restart the app.

### ❌ "No profiles found" / "Please navigate to People Search"
**Fix:** In Chrome, navigate to `https://www.linkedin.com/search/results/people/`

The `NavigationGuard` auto-redirects from related pages.

### ❌ "Target page closed" errors
**Fix:** Safe wrapper methods check `isClosing` flag before operations.

### ❌ Bot clicks profile card instead of Connect button
**Fix:** `SmartElementFinder` uses multi-signal scoring to avoid card-level `<a>` tags.

### ❌ Modal handling fails
**Fix:** `ModalStateMachine` has fallback detection for unknown modal structures.

### ❌ Session expires frequently
**Fix:** Delete `data/session.json` and re-login.

### ❌ Very slow automation
**Tune:** Edit `src/bot/core/LinkedInBot.js`:
```javascript
await this.human.delay(2500, 4500);  // Reduce to 1500, 2500
```
⚠️ Reducing delays increases ban risk.

---

## Performance Issues

### UI lags during automation
**Fix (already applied):** Throttled to 20 msgs/sec.

### Bot uses too much memory
**Fix:** Bot process restarts cleanly each session.

---

## Debugging

### Enable verbose logs
In `src/bot/utils/ipcLogger.js`, set:
```javascript
const LOG_LEVEL = 'debug';
```

### Inspect bot process
```bash
node --inspect-brk src/bot/index.js
```
Then open `chrome://inspect` in Chrome.

---

## Still Stuck?

Open an [issue](https://github.com/MHAlikhani/LinkedIn-Assistant-main/issues) with:
- OS & version
- Node version
- Chrome version
- Full error message
- Steps to reproduce
