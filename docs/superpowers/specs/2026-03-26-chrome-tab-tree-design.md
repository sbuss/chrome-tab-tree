# Chrome Tab Tree — Design Spec

## Overview

A Chrome extension that provides a tree-style tab management side panel. When a user opens a tab from an existing tab, it appears as a child in an indented tree view. The side panel replaces the native vertical tab strip as the primary tab navigation interface.

## Goals

- Show parent-child tab relationships as an indented tree in a side panel
- Track relationships via `openerTabId` — only explicit parent-child, no domain grouping
- Support arbitrary tree depth (children, grandchildren, etc.)
- Promote first child when a parent is closed (Firefox Tree Style Tab behavior)
- Design for future collapse/expand support

## Non-Goals (MVP)

- Cross-device sync of tree structure
- Tab group integration
- Domain-based grouping
- Drag-and-drop reordering
- Collapse/expand UI (data model supports it, UI deferred)
- Right-click context menus

## Architecture

**Manifest V3** Chrome extension with three components:

### 1. Service Worker (`background.js`)

Listens to Chrome tab events, maintains the tree data model, persists to `chrome.storage.local`. Thin adapter that wires Chrome events to pure tree logic functions.

### 2. Side Panel (`panel.html` + `panel.js`)

Renders the tree UI. Handles user interactions (click to activate, close button, middle-click to close). Communicates with the service worker via `chrome.runtime` messaging.

### 3. No Content Scripts

The extension does not inject into web pages.

### Permissions

- `sidePanel` — register the side panel
- `tabs` — access tab URLs and titles for display
- `storage` — persist tree structure
- `webNavigation` — reliable parent-child detection via `onCreatedNavigationTarget`

### Data Flow

1. Tab events (`onCreated`, `onRemoved`, `onMoved`, etc.) fire in the service worker
2. Service worker updates the tree model via pure functions and persists to `chrome.storage.local`
3. Service worker sends updated tree to the side panel via `chrome.runtime` messaging
4. User clicks in the side panel send commands back to the service worker (activate tab, close tab)

## Tree Data Model

Each tab is a node. The model is stored in `chrome.storage.local` as a flat map keyed by `tabId`.

```
TreeNode {
  tabId: number
  parentId: number | null    // null = top-level tab
  children: number[]         // ordered list of child tabIds
}
```

Stored as: `{ [tabId]: TreeNode }`

### Per-Window Trees

Each browser window has its own independent tree. The storage key includes the `windowId`.

## Tab Lifecycle Behaviors

### Tab opened from existing tab

`openerTabId` is set. New tab becomes a child of the opener, inserted at the end of the opener's full subtree (after all descendants, matching Firefox Tree Style Tab behavior).

### Tab opened independently

No `openerTabId` (address bar, bookmarks, Ctrl+T). Becomes a top-level tab appended to the root list.

### Parent tab closed (has children)

First child is promoted to the parent's position in the tree. The promoted child keeps its own existing children, and its former siblings are appended after them as additional children.

### Tab closed (no children)

Removed from parent's `children` array. Node deleted from the map.

### Tab moved between windows

Removed from the source window's tree. Added as a top-level tab in the destination window's tree.

### Browser restart / session restore

Tree is rebuilt from `chrome.storage.local`, matched to live tabs by `tabId`. Orphaned entries (tabs that no longer exist) are cleaned up. Tabs not in the stored tree become top-level.

### Extension installed with existing tabs

All existing tabs become top-level nodes. No retroactive tree inference.

## Event Handling

### Core event listeners (service worker)

| Event | Action |
|---|---|
| `tabs.onCreated` | Check `openerTabId`, add as child or top-level. Confirm with `tabs.get()` for timing reliability. |
| `webNavigation.onCreatedNavigationTarget` | Primary signal for link-click parent-child detection. Fires with `sourceTabId` before `onCreated`. |
| `tabs.onRemoved` | Promote first child, reparent siblings, remove node, persist. |
| `tabs.onMoved` | Update position in tree if user manually reordered tabs. |
| `tabs.onAttached` / `onDetached` | Remove from old window tree, add as top-level in new window. |
| `tabs.onActivated` | Update highlighted state in side panel. |
| `tabs.onUpdated` | Update title/favicon in side panel when page loads. |

### Edge Cases

- **Rapid tab creation** (e.g., open all bookmarks): batch updates, debounce panel re-renders.
- **`openerTabId` timing**: `webNavigation.onCreatedNavigationTarget` is the primary signal for link-click parent-child detection (fires before `onCreated` with reliable `sourceTabId`). For non-link-click cases, `onCreated` + `chrome.tabs.get()` is the fallback to confirm `openerTabId`.
- **Ctrl+T noise**: Chrome sets `openerTabId` to the active tab on Ctrl+T. Filter this: if a tab creation has no corresponding `onCreatedNavigationTarget` event and the new tab has no URL, treat it as top-level.
- **Session/crash recovery**: No `openerTabId` available on restored tabs. Use stored tree from `chrome.storage.local` to restore relationships where possible.

## Side Panel UI

### Tab Row

Each tab is rendered as a row with:
- **Indentation**: 16px per tree depth level
- **Favicon**: from `tab.favIconUrl`
- **Title**: truncated with ellipsis if too wide
- **Close button**: visible on hover

### Interactions

- **Click**: activate the tab
- **Middle-click**: close the tab
- **Close button (X)**: close the tab, promote children per data model rules

### Styling

- Minimal dark theme to match Chrome's side panel aesthetic
- No framework — plain HTML/CSS/JS for lightweight footprint
- Handles narrow panel widths: truncated titles, visible favicons and close buttons

### Future UI (not MVP, but designed for)

- Collapse/expand toggle on parent nodes
- Drag-and-drop to reparent tabs
- Right-click context menu (close subtree, close children, etc.)

## Testing Strategy

### Unit Tests (Node, no browser)

The tree data model and event handling logic are extracted into pure modules with no `chrome.*` dependencies. These are tested with Vitest:

- Tree operations: add child, remove with promotion, reparent, subtree ordering
- Event handler logic: given event payloads, assert correct tree state transitions
- Edge cases: rapid creation, Ctrl+T filtering, orphan cleanup

### Mock Integration Tests (Node, no browser)

A lightweight fake of `chrome.tabs`, `chrome.storage`, and `chrome.webNavigation` APIs. Simulates event sequences (open 5 tabs rapidly, close a parent, move tab between windows) and asserts final tree state.

### Manual Testing (Chrome, for UI and real browser behavior)

- Reload extension via `chrome://extensions`
- File watcher for side panel hot-reload during development

### Not in Scope

E2E browser automation (Puppeteer/Playwright for extensions). Pure-logic tests cover behavior; manual testing covers Chrome integration.

## File Structure

```
chrome-tab-tree/
├── manifest.json
├── background.js          # Service worker — thin adapter
├── panel.html             # Side panel markup
├── panel.js               # Side panel logic
├── panel.css              # Side panel styles
├── src/
│   ├── tree.js            # Pure tree data model
│   ├── tree.test.js       # Tree unit tests
│   ├── handlers.js        # Event handler logic (pure functions)
│   └── handlers.test.js   # Handler tests
├── test/
│   ├── chrome-mock.js     # Lightweight Chrome API fakes
│   └── integration.test.js # Event sequence tests
├── icons/                 # Extension icons
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-26-chrome-tab-tree-design.md
```
