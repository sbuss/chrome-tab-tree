# Visual Test Harness — Design Spec

## Overview

A standalone HTML test harness that renders the side panel's tab rows in predefined visual states. Playwright takes screenshots of each state and compares against stored baselines for automated visual regression testing.

## Goals

- Automated visual regression testing via Playwright screenshot comparison
- Render real panel rendering code (not copies) in a browser outside the extension context
- Cover all meaningful visual states: nesting, active tab, truncation, favicons, drag states

## Architecture

### Shared Render Function

Extract tab row DOM construction from `panel.js` into `src/render.js`. Both `panel.js` and the harness import from `render.js`, ensuring the harness tests real rendering code.

`renderTabRow(tabId, depth, tab, isActive)` returns a DOM element (a `.tab-row` div with indent, favicon/placeholder, title, and close button).

### Harness Page

`test/visual/harness.html` — a standalone HTML page that:
- Loads `panel.css` for styling
- Imports `flattenTree` from `src/tree.js` and `renderTabRow` from `src/render.js`
- Builds trees using the pure data model functions
- Renders each visual scene in a labeled section with a `data-scene` attribute

### Visual Scenes

Each scene is a self-contained section rendered on the page:

| Scene ID | Description |
|---|---|
| `single-root` | One root tab |
| `shallow-tree` | Root with 3 children |
| `deep-tree` | 4 levels of nesting |
| `active-tab` | One tab highlighted as active |
| `long-title` | Titles that overflow and truncate with ellipsis |
| `missing-favicon` | Tabs with no favicon (shows placeholder circle) |
| `many-tabs` | 20+ tabs to test scrolling/density |
| `drag-dragging` | A tab with `.dragging` class (opacity) |
| `drag-over` | A tab with `.drag-over` class (highlight + outline) |
| `drag-gap-before` | A tab with `.drop-gap-before` class (margin animation) |
| `drag-gap-after` | A tab with `.drop-gap-after` class (margin animation) |

### Playwright Test

`test/visual/visual.test.js` — a Playwright test that:
- Launches a browser, navigates to the harness HTML file via `file://` protocol
- For each `[data-scene]` element, takes a screenshot
- Compares against stored baselines in `test/visual/baselines/`
- Fails if any scene differs beyond a pixel threshold

### Baselines

`test/visual/baselines/` — PNG files generated on first run, git-tracked. Updated manually when intentional CSS changes are made (`npx playwright test --update-snapshots`).

## File Changes

| File | Change |
|---|---|
| `src/render.js` | **Create** — shared `renderTabRow` function |
| `panel.js` | **Modify** — import `renderTabRow` from `src/render.js`, remove inline DOM construction |
| `test/visual/harness.html` | **Create** — standalone harness page with all scenes |
| `test/visual/visual.test.js` | **Create** — Playwright screenshot tests |
| `test/visual/baselines/` | **Created by first test run** — baseline PNGs |
| `package.json` | **Modify** — add `@playwright/test` devDependency, add `test:visual` script |
| `.gitignore` | **Modify** — add `test-results/` (Playwright artifacts) |

## Test Commands

```bash
# Run visual regression tests
npm run test:visual

# Update baselines after intentional CSS changes
npx playwright test test/visual/visual.test.js --update-snapshots
```

## Non-Goals

- Interactive testing (clicking, drag-and-drop simulation) — future enhancement
- Testing Chrome API integration — covered by unit/integration tests
- Cross-browser visual testing — Chrome only for now
