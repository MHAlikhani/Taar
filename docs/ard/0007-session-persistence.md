# ADR-0007: Session Persistence Strategy

## Status
✅ Accepted

## Context

LinkedIn sessions expire. Re-login on every run is tedious. But storing credentials is insecure and risky. We needed a balance between convenience and security.

## Decision

Use **Playwright's `storageState`** to persist cookies and localStorage:

```javascript
// Save after successful login
const state = await context.storageState();
fs.writeFileSync('data/session.json', JSON.stringify(state));

// Load on next run
const savedState = JSON.parse(fs.readFileSync('data/session.json'));
const context = await browser.newContext({ storageState: savedState });
```

### Storage location: `data/session.json`
- In project directory (portable)
- Excluded from git via `.gitignore`
- File permissions: owner read/write only

### Session lifecycle:
1. **First run:** No session file → prompt login → save after successful
2. **Subsequent runs:** Load session → verify validity → use if valid
3. **Expired:** NavigationGuard detects redirect to `/login` → prompt re-login → save new

### Validation:
Before each automation run, check session by:
1. Navigate to `/feed`
2. Check for feed icon / user avatar
3. If redirected to `/login`, session is invalid

## Consequences

**Positive:**
- ✅ Login once, use indefinitely
- ✅ No credentials stored (just cookies)
- ✅ Portable across sessions
- ✅ Auto-refresh on expiry

**Negative:**
- ⚠️ Session file is a security target
- ⚠️ Cookie rotation can invalidate unexpectedly
- ⚠️ Cross-device portability limited

**Mitigations:**
- File excluded from version control
- Clear error message on expiry
- Manual "re-login" option always available
- Could encrypt file with system keychain (future)
