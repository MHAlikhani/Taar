# ADR-0008: Migration from Electron to Electrobun (Bun-native)

- Status: Accepted (implemented and boot-verified: window opens, webview loads HTML/CSS, RPC transport initialized)
- Date: 2026-09-09

## Context

The desktop shell ran on Electron (Node.js main process). We wanted a Bun-first
stack everywhere: faster startup, smaller binaries, one runtime.

Electrobun 2.0 is cross-platform (CEF-based webviews on macOS/Linux/Windows),
its main process runs on Bun with full `node:child_process` support — required
for spawning the Playwright bot child process with IPC (verified: Bun supports
Node-compatible IPC in both directions).

## Decision

1. **Primary shell = Electrobun.** `src/bun/index.js` (main, Bun runtime) +
   `src/schemas/index.js` (RPC schema) + `src/mainview/` (webview UI).
2. **Typed RPC replaces contextBridge IPC.** (Build: the RPC client is bundled via `build.views.mainview.entrypoint` into `views/mainview/index.js`; all other UI assets ship via `build.copy`.) (Build config:  = the RPC client, bundled to ; all other UI assets ship via .) Requests:
   `startBrowser` / `startAutomation` / `stopAutomation` / `getStatus`.
   Main→webview messages: `botLog`, `botProgress`, `botComplete`, `botStopped`,
   `botExited`, `botError`.
2b. **RPC instance requirement (2.0.1).** `BrowserWindow`'s `rpc` option must be an instance created with `BrowserView.defineRPC({ schemas, handlers })` (from `electrobun/bun`) — a plain config object crashes with `setTransport is not a function`. Request handlers receive raw `params`; message handlers receive the payload object, so manager payloads are wrapped (`bot-log` → `{text}`) in `src/bun/index.ts`.

3. **UI preserved.** `src/mainview/` is a copy of the old renderer; only
   `js/ipc.js` was rewritten as an Electrobun RPC client exposing the same
   `IpcService` API, so `app.js`/`controls.js`/`stats.js`/`logger.js` are
   unchanged. Scripts load as ordered ES modules.
4. **Bot layer unchanged.** `BotProcessManager` is now shell-agnostic
   (constructor takes a `(channel, payload) => void` UI bridge). The bot child
   process runs on Bun (Node.js fallback, `BOT_RUNTIME=node`).
5. **Electron kept as fallback** (`src/main/`, `src/preload/`, `src/renderer/`,
   `npm run start:electron`) until Electrobun is verified end-to-end on
   production machines.
6. **Tooling is Bun-native:** `bun test` (jest removed), `bun -e` clean script
   (rimraf removed), `bunfig.toml`, `bunx electrobun dev/build`.

## Consequences

- `bun start` launches via Electrobun; `npm run start:electron` runs the legacy shell.
- The RPC schema shape (plain object) mirrors the documented Electroview /
  BrowserWindow `defineRPC` pattern; if `bunx electrobun dev` reports schema
  shape changes in future versions, `src/schemas/index.js` is the single place
  to adjust.
- Remaining risk (cannot be verified in CI here): first `bunx electrobun dev`
  run downloads CEF binaries; the webview bundler must resolve
  `electrobun/view` imports in `src/mainview/js/ipc.js`.
