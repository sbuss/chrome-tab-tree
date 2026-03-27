# Tab Tree

A Chrome extension that organizes your tabs as an indented tree in a side panel. When you open a tab from an existing tab, it appears as a child — giving you a visual hierarchy of your browsing session.

## Features

- **Tree-style tab management** — Tabs opened from other tabs appear as indented children, to arbitrary depth
- **Side panel UI** — Replaces Chrome's built-in vertical tab strip as your primary tab interface
- **Drag-and-drop** — Reorder tabs by dragging between rows, or drop onto a tab to reparent it as a child
- **Smart tab closing** — When you close a parent tab, its first child gets promoted and inherits the siblings (matching Firefox Tree Style Tab behavior)
- **Per-window trees** — Each browser window maintains its own independent tab tree
- **Persistent state** — Tree structure survives browser restarts via `chrome.storage.local`

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Google Chrome](https://www.google.com/chrome/) (v120 or later, for Manifest V3 ES module support)

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

The test suite covers the tree data model, event handlers, and integration scenarios. Tests run in Node.js with Vitest — no browser required.

### Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this project's root directory (`chrome-tab-tree/`)
5. The Tab Tree extension icon will appear in your toolbar
6. Click the icon to open the side panel

### Development Workflow

After making changes to the source files:

- **Service worker changes** (`background.js`, `src/tree.js`, `src/handlers.js`): Go to `chrome://extensions`, find Tab Tree, and click the reload button (circular arrow)
- **Side panel changes** (`panel.html`, `panel.css`, `panel.js`): Close and reopen the side panel, or reload the extension as above
- **Test changes**: Tests re-run automatically if you're using `npm run test:watch`

## Project Structure

```
chrome-tab-tree/
├── manifest.json           # Chrome extension manifest (Manifest V3)
├── background.js           # Service worker — event handling, persistence, panel messaging
├── panel.html              # Side panel HTML shell
├── panel.css               # Side panel dark theme styles
├── panel.js                # Side panel rendering, interactions, drag-and-drop
├── src/
│   ├── tree.js             # Pure tree data model (immutable operations)
│   ├── tree.test.js        # Tree unit tests (41 tests)
│   ├── handlers.js         # Event handler functions (Chrome events → tree ops)
│   └── handlers.test.js    # Handler unit tests (14 tests)
├── test/
│   ├── chrome-mock.js      # Lightweight Chrome API fakes
│   └── integration.test.js # Multi-event sequence tests (6 tests)
└── icons/
    └── icon.svg            # Extension icon
```

### Architecture

The extension separates concerns into three layers:

1. **Pure data model** (`src/tree.js`) — Immutable tree operations with no Chrome API dependencies. Every function takes a tree and returns a new tree. Fully testable in Node.js.

2. **Event handlers** (`src/handlers.js`) — Pure functions that map Chrome tab event payloads to tree operations. Handles `openerTabId` resolution and Ctrl+T filtering.

3. **Chrome integration** (`background.js`, `panel.js`) — The only files that touch Chrome APIs. The service worker wires events to handlers and manages persistence. The panel renders the tree and handles user interactions.

## Publishing to the Chrome Web Store

### 1. Prepare the Extension

Make sure all tests pass:

```bash
npm test
```

Create a production zip file containing only the extension files (no tests, no node_modules):

```bash
zip -r tab-tree.zip \
  manifest.json \
  background.js \
  panel.html \
  panel.css \
  panel.js \
  src/tree.js \
  src/handlers.js \
  icons/
```

### 2. Create Icon Assets

The Chrome Web Store requires PNG icons in addition to the SVG used locally. Create PNG versions at these sizes:

- **128x128** — Store listing and install dialog
- **48x48** — Extensions management page
- **16x16** — Favicon

You can convert the SVG with any image editor or a tool like [Inkscape](https://inkscape.org/):

```bash
# Example using Inkscape CLI
inkscape icons/icon.svg -w 128 -h 128 -o icons/icon-128.png
inkscape icons/icon.svg -w 48 -h 48 -o icons/icon-48.png
inkscape icons/icon.svg -w 16 -h 16 -o icons/icon-16.png
```

Then update `manifest.json` to reference the PNGs:

```json
"icons": {
  "16": "icons/icon-16.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png"
}
```

Rebuild the zip after updating.

### 3. Register as a Chrome Web Store Developer

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google account
3. Pay the one-time **$5 registration fee**
4. Accept the developer agreement

### 4. Upload and Configure the Listing

1. In the Developer Dashboard, click **New Item**
2. Upload `tab-tree.zip`
3. Fill in the store listing:
   - **Name:** Tab Tree
   - **Summary:** Tree-style tab management in a side panel
   - **Description:** Organize your tabs as an indented tree. Tabs opened from other tabs appear as children, giving you a visual hierarchy of your browsing session. Drag and drop to reorder or reparent tabs.
   - **Category:** Productivity
   - **Language:** English
4. Upload screenshots (at least 1 required, 1280x800 or 640x400)
5. Upload a promotional tile image (440x280) if desired
6. Set **Visibility** — choose "Public" for everyone or "Unlisted" for a private link

### 5. Submit for Review

1. Click **Submit for Review**
2. Google reviews all extensions before publishing — this typically takes 1-3 business days
3. You'll receive an email when the review is complete
4. If rejected, the dashboard will show the reason and you can fix and resubmit

### 6. Publish Updates

To publish a new version:

1. Increment the `version` in `manifest.json` (e.g., `"0.2.0"`)
2. Create a new zip file
3. Go to the Developer Dashboard, select your extension, and click **Package** → **Upload new package**
4. Submit for review

## Permissions

The extension requests these Chrome permissions:

| Permission | Why |
|---|---|
| `tabs` | Read tab titles, URLs, and favicons for display in the side panel |
| `storage` | Persist the tree structure across browser restarts |
| `sidePanel` | Register and open the side panel UI |
| `webNavigation` | Detect parent-child relationships when tabs are opened from links |

## License

MIT
