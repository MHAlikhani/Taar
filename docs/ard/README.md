# Architecture Decision Records (ADR)

This directory contains all architectural decisions made during the development of LinkedIn Assistant Pro.

Each ADR follows the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

- **Title** — What was decided
- **Status** — Proposed / Accepted / Deprecated / Superseded
- **Context** — What prompted this decision
- **Decision** — What we decided
- **Consequences** — What results from the decision

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-multi-process-architecture.md) | Multi-Process Architecture | ✅ Accepted |
| [0002](0002-system-node-runtime.md) | System Node.js Runtime | ✅ Accepted |
| [0003](0003-local-browser-channel.md) | Local Browser Channel | ✅ Accepted |
| [0004](0004-adaptive-selector-engine.md) | Adaptive Selector Engine | ✅ Accepted |
| [0005](0005-human-behavior-simulation.md) | Human Behavior Simulation | ✅ Accepted |
| [0006](0006-persian-visual-design.md) | Persian Visual Design Language | ✅ Accepted |
| [0007](0007-session-persistence.md) | Session Persistence Strategy | ✅ Accepted |

---

## Creating a New ADR

1. Copy the template below
2. Use sequential numbering: `0008-your-title.md`
3. Fill in all sections
4. Submit for review

### Template

```markdown
# ADR-000X: Title

## Status
Accepted | Proposed | Deprecated | Superseded by ADR-XXXX

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```
