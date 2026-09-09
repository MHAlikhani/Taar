# Architecture

## Executive Summary

LinkedIn Assistant Pro is a desktop automation platform built on **Electron 28** and **Playwright**, designed to send personalized connection requests on LinkedIn with human-like behavior, adaptive intelligence, and robust error handling.

The system uses a **multi-process architecture** where the UI runs in Electron's main process while the automation logic executes in a separate Node.js child process. This separation provides process isolation, cleaner memory management, and prevents Node.js version conflicts.

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Chromium Renderer Process (sandboxed)                    │   │
│  │  ┌─────────┐  ┌────────┐  ┌─────────┐  ┌─────────────┐  │   │
│  │  │ Controls│  │ Stats  │  │  Logger │  │  Pers. CSS  │   │   │
│  │  └────┬────┘  └───┬────┘  └────┬────┘  └─────────────┘  │   │
│  └───────┼──────────┼──────────┼────────────────────────────┘   │
└──────────┼──────────┼──────────┼────────────────────────────────┘
           │          │          │
           │          │    contextBridge (preload.js)
           │          │          │
           ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ELECTRON MAIN PROCESS                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  IPC Router                                              │   │
│  │  ├─ start-browser ─► botProcessManager.spawn()           │   │
│  │  ├─ start-automation ─► bot.send({type:'start'})         │   │
│  │  └─ stop-automation  ─► bot.send({type:'stop'})          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │ IPC pipe                          │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BOT PROCESS (Node.js v24)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LinkedInBot (orchestrator)                               │   │
│  │  ├─ DecisionEngine ────── reason about modal states       │   │
│  │  ├─ HumanSimulator ───── Bézier/timing simulation        │   │
│  │  ├─ NavigationGuard ──── validate & correct page URL     │   │
│  │  ├─ ModalStateMachine ── handle 2-step invite flow        │   │
│  │  ├─ SessionManager ───── persist cookies to disk          │   │
│  │  └─ SmartElementFinder ─ adaptive selector with memory    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Playwright + Stealth Plugin                              │   │
│  │  └─ System Chrome (channel: 'chrome')                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                        LinkedIn Web App
```

---

## Core Components

### 1. Main Process (`src/main/`)

**Responsibilities:** Window lifecycle, IPC handlers, bot process management.

**Key files:**
- `index.js` — Entry, app lifecycle
- `window.js` — BrowserWindow creation
- `ipc.js` — Handler registration
- `runtime/botProcessManager.js` — Process orchestration
- `runtime/nodeResolver.js` — System Node.js path resolution

### 2. Preload (`src/preload/index.js`)

Exposes safe API via `contextBridge`. No direct Node access from renderer.

### 3. Renderer (`src/renderer/`)

Modern UI with vanilla JS + CSS modules.
- HTML5 semantic structure
- CSS modules: base + persian + components + animations
- JS modules: app, ipc, logger, stats, controls

### 4. Bot Process (`src/bot/`)

All automation logic. Runs as child process with **system Node.js** (not Electron's bundled Node).

| Module | Responsibility |
|--------|----------------|
| `LinkedInBot` | Orchestrator — connection loop |
| `DecisionEngine` | Reasoning about modal states |
| `HumanSimulator` | Gaussian delays, Bézier, typos |
| `ModalStateMachine` | Two-phase invite flow |
| `SessionManager` | Cookie persistence |
| `NavigationGuard` | URL validation |
| `SmartElementFinder` | Adaptive selector |

---

## Data Flow (Happy Path)

```
1. User clicks "Start"
   Renderer → IPC → Main → bot.send({type:'start', options})

2. Bot loop:
   a. NavigationGuard.assertPeopleSearch()
      If wrong URL → navigate()
   b. SmartElementFinder.findConnectButtons()
      Uses selector memory, falls back through patterns
   c. If count === 0 → Next page or break
   d. HumanSimulator.delay(800-1500ms)
   e. Click button
   f. ModalStateMachine.handle(addNote, noteText)
      Detect modal type → decide → type note → Send
   g. Send progress to renderer
   h. HumanSimulator.delay(2500-4500ms)
   i. Loop
```

---

## Security Model

- Renderer sandboxed (no `nodeIntegration`)
- All IPC via `contextBridge`
- Bot process isolated (can't crash UI)
- Session stored locally only

See [SECURITY.md](SECURITY.md) for full threat model.

---

## Performance

See [PERFORMANCE.md](PERFORMANCE.md) for optimization details.

Key: lazy loading, throttled IPC, regex caching, selector memory, LRU log buffer.

---

## Testing Strategy

- `tests/unit/` — Isolated class testing
- `tests/integration/` — IPC protocol testing
- Coverage thresholds: 85% lines, 80% functions, 70% branches
