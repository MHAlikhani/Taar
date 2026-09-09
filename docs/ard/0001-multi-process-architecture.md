# ADR-0001: Multi-Process Architecture

## Status
✅ Accepted

## Context

The original implementation ran all automation logic inside Electron's main process. This caused several problems:

1. **Node.js version conflict** — Playwright requires Node 20+, but Electron 28 bundles Node 18.
2. **UI freeze** — Heavy DOM queries blocked the renderer thread via IPC.
3. **Crash propagation** — Bot crash brought down the entire app.
4. **Memory leaks** — Playwright contexts persisted across sessions.

## Decision

Adopt a **multi-process architecture**:

- **Main Process** (Electron): Window management, IPC routing
- **Bot Process** (Node.js v24): All automation logic
- **Renderer Process** (Chromium): UI only

Communication happens via Node's IPC channel with a typed message protocol.

```
Main Process (Electron)
    ↕ IPC (contextBridge)
Renderer Process (UI)

Main Process
    ↕ IPC pipe
Bot Process (Node.js 24)
```

## Consequences

**Positive:**
- ✅ Bot uses system Node.js (v24), solving version conflict
- ✅ Bot crash cannot crash UI
- ✅ Clean memory reset on each session
- ✅ UI stays responsive during automation
- ✅ Easier testing (can run bot standalone)

**Negative:**
- ⚠️ More complex IPC protocol needed
- ⚠️ Harder to share state between processes
- ⚠️ Debugging requires attaching to child process
- ⚠️ System Node.js must be in PATH

**Mitigations:**
- Typed message protocol with validation
- All state flows through messages (no shared memory)
- `node --inspect-brk` for debugging
- `nodeResolver.js` handles path resolution robustly
