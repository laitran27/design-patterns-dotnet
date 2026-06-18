# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vietnamese-language educational site for learning all 23 Gang of Four (GoF) design patterns in a .NET 8 context. Fully static — no backend, no build step, no framework. Progress tracking via `localStorage`.

## Commands

```bash
# Serve locally
npm run serve        # Python HTTP server on http://localhost:4177

# Run E2E tests (requires server running)
npm test             # Headless Playwright
npm run test:headed  # With browser visible

# First-time setup
npm install
npx playwright install   # Download browser binaries for Playwright
```

Run a single test file:
```bash
npx playwright test tests/smoke.spec.js
```

## Architecture

**No framework, no build tool.** All logic is vanilla JS loaded via `<script>` tags. Three main files:

| File | Role |
|------|------|
| [js/patterns-data.js](js/patterns-data.js) | Source of truth: `PATTERNS_DATA` (23 pattern objects) and `PHASES_DATA` (5-phase roadmap). 4,100+ lines. |
| [js/main.js](js/main.js) | All page logic: filtering, progress tracking, navigation, localStorage read/write. DOM utilities: `$()`, `$$()`, `on()`. |
| [css/style.css](css/style.css) | Single stylesheet with CSS variables for theming. Dark navy (`#0f172a`) + .NET blue (`#3b82f6`). |

**Pages:**
- `index.html` — Hero, 5-phase roadmap, Pattern of the Day
- `patterns.html` — Grid of 23 pattern cards with category filter + search
- `pattern-detail.html` — Per-pattern deep-dive (rendered from JS data, not separate HTML files)
- `progress.html` — Completion %, phase checklists, achievements

**localStorage keys:**
- `dotnet_patterns_progress` — object mapping pattern IDs to completion booleans
- `dotnet_patterns_notes` — per-pattern freeform notes

## Pattern Data Schema

Each entry in `PATTERNS_DATA` must have these fields:

```js
{
  id,           // slug, e.g. "singleton"
  name,         // English name
  nameVi,       // Vietnamese name
  category,     // "creational" | "structural" | "behavioral"
  priority,     // "high" | "medium" | "low"
  readingTime,  // number (minutes)
  phase,        // 1–5 (which learning phase)
  description,  // 1–2 sentence summary
  intent,       // detailed purpose and use-cases
  dotnetExample,// .NET APIs/classes that implement this pattern
  whenToUse,    // string with bullet points
  whenNotToUse, // string with bullet points
  codeExample,  // full C# .NET 8 code block
  umlDiagram,   // ASCII UML
}
```

`PHASES_DATA` maps phases 1–5 to week ranges, titles, and pattern ID lists.

## Testing

Tests live in [tests/smoke.spec.js](tests/smoke.spec.js). They use Playwright and rely on `baseURL: http://127.0.0.1:4177`. The server must be running (`npm run serve`) or Playwright's `reuseExistingServer` will auto-start it.

Tests clear `localStorage` before each run. Each test covers one user flow: page render, filtering, detail view, progress tracking.

## CDN Dependencies

Loaded from CDN — no local copies:
- Highlight.js v11.9.0 (code syntax highlighting)
- Font Awesome 6.5.0 (icons)
- Google Fonts (Inter)
