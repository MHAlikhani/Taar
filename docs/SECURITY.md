# Security

## Threat Model

| Threat | Risk | Mitigation |
|--------|------|------------|
| LinkedIn account ban | High | Human-like timing, stealth plugin, rate limiting |
| Session hijacking | Medium | Local-only storage, no network transmission |
| Code injection via UI | Medium | Context bridge, no `nodeIntegration` |
| Process hijacking | Low | Process isolation, IPC whitelisting |
| Data leakage | Medium | `.gitignore` for runtime data |

---

## Security Measures

### 1. Process Isolation
Bot runs in separate Node.js process.
- Bot crash doesn't crash UI
- Bot has no access to Electron APIs
- Clean resource cleanup

### 2. IPC Security
```javascript
webPreferences: {
  nodeIntegration: false,    // No direct Node access
  contextIsolation: true,    // Isolated world
  sandbox: true              // Full sandbox
}
```

Only whitelisted methods exposed via `contextBridge`.

### 3. Session Storage
- Stored locally (`data/session.json`)
- Never transmitted
- Excluded from git
- File permissions: owner read/write only

### 4. Anti-Detection

**Stealth plugin** patches automation signals:
- `navigator.webdriver` → undefined
- Plugin array normalized
- Permissions query spoofed
- Chrome runtime injected

**Behavioral anti-detection:**
- Gaussian delays
- Bézier mouse curves
- 3% typo rate
- Random reading pauses
- Natural scroll

### 5. Rate Limiting
- Max 100 requests per session (UI enforced)
- 2.5-4.5 second delays between requests
- Weekly limit detection
- Restriction keyword monitoring

---

## Compliance Notice

⚠️ This tool is for **educational and research purposes**. Using automation on LinkedIn may violate their [User Agreement](https://www.linkedin.com/legal/user-agreement). Users are responsible for compliance.

---

## Reporting Vulnerabilities

Security issues: [mohammad.hosein.alikhani08@gmail.com](mailto:mohammad.hosein.alikhani08@gmail.com)

Please do not open public issues for security vulnerabilities.
