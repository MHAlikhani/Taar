# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-09

### 🚀 Electrobun Era — "Bun-First" Release

#### Changed
- **Desktop shell migrated from Electron to Electrobun 2.0** — main process runs on Bun; typed RPC replaces contextBridge IPC (`src/bun/`, `src/schemas/`, `src/mainview/`). Electron shell kept as legacy fallback (`npm run start:electron`)
- **Version unified to 1.0.0** across app, docs and packaging
- Tooling is Bun-native: `bun test` (jest removed), `bun -e` clean script (rimraf removed), `bunfig.toml`

#### Added
- **Browser-relaunch resilience (3 layers)** — bot-side liveness watchdog (poll + disconnect event), force-restart on Launch, and a UI self-healing status poll that re-enables Launch even if an exit event is missed
- **Pending-invitation intelligence** — "Pending" (withdraw) buttons are excluded from selectors and pending dialogs are auto-dismissed; fixes 30s click-timeout storms seen in the field
- **Adaptive pacing** — exponential cooldown after consecutive errors protects the account; successes reset it
- **Stale-dialog recovery** — leftover modal from a previous error is dismissed before the next iteration
- **In-app Persian guide** — bilingual راهنما dialog (carpet-style enamel panel) inside the app
- **Persian design polish** — gold tashir header rule, carpet-border cards, Vazirmatn typography for Persian UI

#### Fixed
- Duplicate log lines in the UI (structured log + stderr broadcast were both forwarded)
- Launch button could stay disabled after the browser was closed

## [7.0.0] - 2026-09-09

### 🎉 Major Rewrite — "Persian Edition"

#### Added
- **Adaptive Selector Engine** (`SmartElementFinder`) — Self-learning element locator with persisted memory
- **Navigation Guard** — Auto-detects wrong pages and redirects to People Search
- **Multi-Process Architecture** — Bot runs in separate Node.js process
- **Persian-Inspired UI** — Boteh-jegheh + Termeh patterns with modern glassmorphism
- **ADR System** — Full Architecture Decision Records under `docs/ard/`
- **Comprehensive Test Suite** — Unit + integration tests with coverage thresholds

#### Changed
- **BREAKING:** Restructured into `src/{main,preload,renderer,bot}/`
- **BREAKING:** UI language unified to English
- **BREAKING:** Bot process now spawned with system Node.js (v24+)
- **BREAKING:** IPC protocol redesigned with contextBridge security

#### Fixed
- `ERR_IPC_ONE_PIPE` — Corrected stdio configuration
- Stale Launch button — `bot-exited` event properly resets UI
- "Target page closed" crashes — Safe wrapper methods added
- Node.js 18 vs 24 conflict — Bot now uses system Node

#### Optimized
- Lazy `playwright` require — ~300ms faster startup
- Throttled IPC — Max 20 messages/second
- Cached regex patterns — Compiled once per run
- LRU log buffer — Max 1000 entries
- Selector memory — Never re-discover working patterns

## [6.x.x] - Previous Releases

See git history for older versions.
