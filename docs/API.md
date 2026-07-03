# API Reference

## IPC Protocol

Communication between renderer and bot happens through a typed message protocol over Node's IPC channel.

### Renderer → Main → Bot

#### `start-browser`
Spawns the bot child process and initializes the browser.

**Response:** `{ success: boolean; error?: string; }`

#### `start-automation`
Starts the connection loop.

**Payload:**
```typescript
{ maxRequests: number; addNote: boolean; noteText: string; }
```

#### `stop-automation`
Signals graceful shutdown. Bot finishes current op, saves session, closes browser.

---

### Bot → Main → Renderer (push events)

| Event | Payload | Description |
|-------|---------|-------------|
| `bot-log` | `string` | Log entry |
| `bot-progress` | `{sent, skipped, errors}` | Stats update |
| `bot-complete` | `string` | Completion message |
| `bot-stopped` | `{sent, skipped, errors}` | User-initiated stop |
| `bot-exited` | — | Process exited (resets UI) |
| `bot-error` | `string` | Error message |

---

## Public Modules

### `LinkedInBot` (`src/bot/core/LinkedInBot.js`)
```javascript
await bot.init();
await bot.startAutomation({maxRequests, addNote, noteText});
bot.stop();
```

### `DecisionEngine` (`src/bot/core/DecisionEngine.js`)
```javascript
engine.shouldAddNote(requested)   // → boolean
engine.optimizeText(text, max)     // → truncated string
engine.updatePersonalizedCount(n)  // Updates counter
```

### `SmartElementFinder` (`src/bot/selectors/SmartElementFinder.js`)
```javascript
const locator = await finder.findConnectButtons();
```

Strategies (priority order):
1. Last successful pattern (memory)
2. `aria-label` contains "connect"/"invite"
3. `componentkey` contains "Connect"
4. `href` contains "search-custom-invite"
5. Generic text match

### `HumanSimulator` (`src/bot/core/HumanSimulator.js`)
```javascript
await human.delay(800, 1500);
await human.type('textarea', 'Hello');
await human.moveMouse(element);
await human.scroll(300);
```

### `ModalStateMachine` (`src/bot/core/ModalStateMachine.js`)
State transitions:
```
(no modal) ─► First Modal
              ├─► Add Note ─► Second Modal ─► Send
              └─► Send Without Note ─► (closed)
```

---

## File System API

### `data/session.json`
Stores Playwright `storageState` (cookies, localStorage).

### `data/selector-memory.json`
Adaptive selector state:
```json
{
  "lastSuccessfulPattern": 0,
  "successCount": {"0": 45, "1": 3},
  "failureCount": {"1": 2}
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| `ERR_BOT_NOT_READY` | Bot process not spawned |
| `ERR_NAVIGATION_WRONG_PAGE` | Not on People Search |
| `ERR_SESSION_EXPIRED` | LinkedIn redirected to login |
| `ERR_SELECTOR_EXHAUSTED` | All selector patterns failed |
