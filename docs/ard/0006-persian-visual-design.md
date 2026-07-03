# ADR-0006: Persian Visual Design Language

## Status
✅ Accepted

## Context

The developer (Mohammad Hossein Alikhani) wanted the UI to reflect Persian cultural aesthetics while maintaining a professional, modern feel. Common SaaS UIs are visually homogeneous.

## Decision

Adopt a **Persian-inspired visual design language** with English text:

### Color Palette
Based on traditional Persian art:
- **Gold** `#D4AF37` — Primary accent (from miniatures)
- **Persian Blue** `#1E3A8A` — Primary background (from mosque tiles)
- **Saffron** `#F4C430` — Light gold (from spice markets)
- **Persian Red** `#991B1B` — Danger state (from carpets)
- **Turquoise** `#0891B2` — Info state (from Persian ceramics)
- **Night Sky** `#0F0F1E` — Background (from desert nights)

### Patterns
- **Boteh Jegheh** (بته جقه) — Paisley motif in background
- **Termeh** — Geometric overlay patterns
- **Arabesque borders** — Decorative card flourishes
- **Girih tiles** — Subtle geometric accents

### Typography
- **Inter** for Latin text (modern, readable)
- **Vazirmatn** as fallback (clean Persian-friendly font)
- **Left-to-right** layout (English text)

### Motion
- Slow, elegant transitions (400ms cubic-bezier)
- Gold shimmer effects
- Gentle pulse animations
- Smooth hover elevations

## Consequences

**Positive:**
- ✅ Unique visual identity
- ✅ Cultural authenticity
- ✅ Memorable user experience
- ✅ Professional yet distinctive

**Negative:**
- ⚠️ More CSS complexity
- ⚠️ Potentially distracting patterns
- ⚠️ Non-Persian users may find it unfamiliar

**Mitigations:**
- Patterns subtle (low opacity)
- Accessibility: text always legible
- Respects `prefers-reduced-motion`
- Clear hierarchy maintained
