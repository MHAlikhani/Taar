# ADR-0002: System Node.js Runtime

## Status
✅ Accepted

## Context

Playwright requires Node.js 20+. Electron 28 bundles Node.js 18.18.2. Using `fork()` or running bot code in the main process caused:

```
Error: Playwright requires Node.js 20 or higher.
```

Options considered:
1. Upgrade Electron to v33+ (bundles Node 20) — blocked by download CDN restrictions in some regions
2. Bundle separate Node binary with the app — bloats app by 100MB
3. Use system Node.js — requires PATH lookup, but lightweight

## Decision

Spawn the bot as a child process using the **system-installed Node.js**:

```javascript
const nodePath = resolveNodePath(); // Finds 'node' in PATH
spawn(nodePath, [botScriptPath], { stdio: ['pipe','pipe','pipe','ipc'] });
```

`resolveNodePath()` uses:
1. `where node` on Windows
2. `which node` on Unix
3. Falls back to bare `'node'` (relies on PATH)

## Consequences

**Positive:**
- ✅ No version conflicts — uses user's Node 24
- ✅ No app bloat (no bundled Node)
- ✅ No CDN download issues
- ✅ Users can upgrade Node independently

**Negative:**
- ⚠️ Requires Node.js 20+ installed on system
- ⚠️ PATH must be correct for Electron-launched processes
- ⚠️ Different Node versions across users

**Mitigations:**
- Document Node.js 20+ requirement in README
- Cache resolved path for session lifetime
- Validate Node version at spawn time
- Clear error message if Node not found
