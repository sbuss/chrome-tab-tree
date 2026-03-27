# Chrome Tab Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that displays tabs as an indented tree in a side panel, tracking parent-child relationships via `openerTabId` with drag-and-drop reordering and reparenting.

**Architecture:** Manifest V3 extension with a service worker (event handling, tree state, persistence) and a side panel (tree rendering, user interactions). The tree data model and event handlers are pure JavaScript modules tested with Vitest, fully decoupled from Chrome APIs.

**Tech Stack:** Vanilla JS (ES modules), Chrome Extension APIs (Manifest V3), Vitest for testing

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | Project config, vitest dependency, test script |
| `vitest.config.js` | Vitest configuration |
| `manifest.json` | Chrome extension manifest (Manifest V3) |
| `src/tree.js` | Pure tree data model: create, add, remove, move, reparent, reconcile |
| `src/tree.test.js` | Unit tests for tree operations |
| `src/handlers.js` | Pure event handler functions: resolve parent, handle created/removed/moved |
| `src/handlers.test.js` | Unit tests for event handlers |
| `test/chrome-mock.js` | Lightweight Chrome API fakes for integration tests |
| `test/integration.test.js` | Multi-event sequence tests |
| `background.js` | Service worker: wires Chrome events to handlers, manages persistence and panel messaging |
| `panel.html` | Side panel HTML structure |
| `panel.css` | Side panel dark theme styles |
| `panel.js` | Side panel rendering, interactions, drag-and-drop |
| `icons/icon.svg` | Extension icon |

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `manifest.json`
- Create: `icons/icon.svg`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "chrome-tab-tree",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create vitest.config.js**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'test/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated

- [ ] **Step 4: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Tab Tree",
  "version": "0.1.0",
  "description": "Tree-style tab management in a side panel",
  "permissions": ["tabs", "storage", "sidePanel", "webNavigation"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "panel.html"
  },
  "icons": {
    "16": "icons/icon.svg",
    "48": "icons/icon.svg",
    "128": "icons/icon.svg"
  },
  "action": {
    "default_icon": "icons/icon.svg",
    "default_title": "Toggle Tab Tree"
  }
}
```

- [ ] **Step 5: Create extension icon**

Create `icons/icon.svg` — a simple tree icon with indented bars:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="12" y="12" width="80" height="10" rx="2" fill="#8ab4f8"/>
  <rect x="28" y="32" width="64" height="10" rx="2" fill="#8ab4f8" opacity="0.85"/>
  <rect x="44" y="52" width="48" height="10" rx="2" fill="#8ab4f8" opacity="0.7"/>
  <rect x="28" y="72" width="64" height="10" rx="2" fill="#8ab4f8" opacity="0.85"/>
  <rect x="12" y="92" width="80" height="10" rx="2" fill="#8ab4f8"/>
  <rect x="28" y="112" width="64" height="10" rx="2" fill="#8ab4f8" opacity="0.85"/>
</svg>
```

- [ ] **Step 6: Verify tests can run (empty suite)**

Run: `npx vitest run`
Expected: No tests found (or passes with 0 tests). Confirms vitest is configured correctly.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js manifest.json icons/
git commit -m "chore: project scaffolding with vitest and manifest v3"
```

---

### Task 2: Tree Data Model — Core Operations

**Files:**
- Create: `src/tree.js`
- Create: `src/tree.test.js`

- [ ] **Step 1: Write tests for createTree and addRoot**

```js
// src/tree.test.js
import { describe, it, expect } from 'vitest';
import { createTree, addRoot, getNode } from './tree.js';

describe('createTree', () => {
  it('returns empty tree', () => {
    const tree = createTree();
    expect(tree.nodes).toEqual({});
    expect(tree.rootIds).toEqual([]);
  });
});

describe('addRoot', () => {
  it('adds a top-level tab', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    expect(tree.rootIds).toEqual([1]);
    expect(tree.nodes[1]).toEqual({ tabId: 1, parentId: null, children: [] });
  });

  it('appends to existing roots', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    expect(tree.rootIds).toEqual([1, 2]);
  });
});

describe('getNode', () => {
  it('returns node by tabId', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    expect(getNode(tree, 1).tabId).toBe(1);
  });

  it('returns undefined for missing tabId', () => {
    const tree = createTree();
    expect(getNode(tree, 99)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL — module `./tree.js` not found

- [ ] **Step 3: Implement createTree, addRoot, getNode**

```js
// src/tree.js

export function createTree() {
  return { nodes: {}, rootIds: [] };
}

export function addRoot(tree, tabId) {
  return {
    nodes: {
      ...tree.nodes,
      [tabId]: { tabId, parentId: null, children: [] },
    },
    rootIds: [...tree.rootIds, tabId],
  };
}

export function getNode(tree, tabId) {
  return tree.nodes[tabId];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tree.test.js`
Expected: All tests PASS

- [ ] **Step 5: Write tests for addChild, getDepth, getSubtreeIds, flattenTree**

Update the import at the top of `src/tree.test.js`:

```js
import { createTree, addRoot, getNode, addChild, getDepth, getSubtreeIds, flattenTree } from './tree.js';
```

Add the following test suites to `src/tree.test.js`:

```js
describe('addChild', () => {
  it('adds child to parent', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    expect(tree.nodes[1].children).toEqual([2]);
    expect(tree.nodes[2]).toEqual({ tabId: 2, parentId: 1, children: [] });
  });

  it('appends to existing children', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 1, 3);
    expect(tree.nodes[1].children).toEqual([2, 3]);
  });

  it('supports arbitrary nesting depth', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 3);
    tree = addChild(tree, 3, 4);
    expect(tree.nodes[4].parentId).toBe(3);
    expect(getDepth(tree, 4)).toBe(3);
  });
});

describe('getDepth', () => {
  it('returns 0 for root tabs', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    expect(getDepth(tree, 1)).toBe(0);
  });

  it('returns depth for nested tabs', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 3);
    expect(getDepth(tree, 2)).toBe(1);
    expect(getDepth(tree, 3)).toBe(2);
  });
});

describe('getSubtreeIds', () => {
  it('returns just the node for leaves', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    expect(getSubtreeIds(tree, 1)).toEqual([1]);
  });

  it('returns all descendants in DFS order', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 4);
    tree = addChild(tree, 1, 3);
    expect(getSubtreeIds(tree, 1)).toEqual([1, 2, 4, 3]);
  });
});

describe('flattenTree', () => {
  it('returns empty array for empty tree', () => {
    expect(flattenTree(createTree())).toEqual([]);
  });

  it('flattens tree in DFS order with depths', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 4);
    tree = addChild(tree, 1, 3);
    tree = addRoot(tree, 5);
    expect(flattenTree(tree)).toEqual([
      { tabId: 1, depth: 0 },
      { tabId: 2, depth: 1 },
      { tabId: 4, depth: 2 },
      { tabId: 3, depth: 1 },
      { tabId: 5, depth: 0 },
    ]);
  });
});
```

- [ ] **Step 6: Run tests to verify new tests fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL for addChild, getDepth, getSubtreeIds, flattenTree tests

- [ ] **Step 7: Implement addChild, getDepth, getSubtreeIds, flattenTree**

Add to `src/tree.js`:

```js
export function addChild(tree, parentId, tabId) {
  const parent = tree.nodes[parentId];
  return {
    nodes: {
      ...tree.nodes,
      [parentId]: { ...parent, children: [...parent.children, tabId] },
      [tabId]: { tabId, parentId, children: [] },
    },
    rootIds: tree.rootIds,
  };
}

export function getDepth(tree, tabId) {
  let depth = 0;
  let node = tree.nodes[tabId];
  while (node && node.parentId !== null) {
    depth++;
    node = tree.nodes[node.parentId];
  }
  return depth;
}

export function getSubtreeIds(tree, tabId) {
  const result = [tabId];
  const node = tree.nodes[tabId];
  if (node) {
    for (const childId of node.children) {
      result.push(...getSubtreeIds(tree, childId));
    }
  }
  return result;
}

export function flattenTree(tree) {
  const result = [];
  function visit(tabId, depth) {
    result.push({ tabId, depth });
    const node = tree.nodes[tabId];
    if (node) {
      for (const childId of node.children) {
        visit(childId, depth + 1);
      }
    }
  }
  for (const rootId of tree.rootIds) {
    visit(rootId, 0);
  }
  return result;
}
```

- [ ] **Step 8: Run tests to verify all pass**

Run: `npx vitest run src/tree.test.js`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/tree.js src/tree.test.js
git commit -m "feat: tree data model — core operations (create, add, query, flatten)"
```

---

### Task 3: Tree Data Model — Remove Node

**Files:**
- Modify: `src/tree.js`
- Modify: `src/tree.test.js`

- [ ] **Step 1: Write tests for removeNode**

Add to `src/tree.test.js`:

```js
import {
  createTree,
  addRoot,
  getNode,
  getDepth,
  addChild,
  getSubtreeIds,
  flattenTree,
  removeNode,
} from './tree.js';

describe('removeNode', () => {
  it('removes a leaf root tab', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = removeNode(tree, 1);
    expect(tree.rootIds).toEqual([2]);
    expect(tree.nodes[1]).toBeUndefined();
  });

  it('removes a leaf child tab', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 1, 3);
    tree = removeNode(tree, 2);
    expect(tree.nodes[1].children).toEqual([3]);
    expect(tree.nodes[2]).toBeUndefined();
  });

  it('promotes first child when removing parent (root)', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 1, 3);
    tree = removeNode(tree, 1);
    expect(tree.rootIds).toEqual([2]);
    expect(tree.nodes[2].parentId).toBeNull();
    expect(tree.nodes[2].children).toEqual([3]);
    expect(tree.nodes[3].parentId).toBe(2);
  });

  it('promoted child keeps existing children, siblings appended after', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 5);
    tree = addChild(tree, 1, 3);
    tree = addChild(tree, 1, 4);
    tree = removeNode(tree, 1);
    expect(tree.rootIds).toEqual([2]);
    expect(tree.nodes[2].parentId).toBeNull();
    expect(tree.nodes[2].children).toEqual([5, 3, 4]);
    expect(tree.nodes[3].parentId).toBe(2);
    expect(tree.nodes[4].parentId).toBe(2);
  });

  it('promotes first child when removing non-root parent', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 3);
    tree = addChild(tree, 2, 4);
    tree = removeNode(tree, 2);
    expect(tree.nodes[1].children).toEqual([3]);
    expect(tree.nodes[3].parentId).toBe(1);
    expect(tree.nodes[3].children).toEqual([4]);
    expect(tree.nodes[4].parentId).toBe(3);
  });

  it('preserves root ordering when promoting', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addRoot(tree, 3);
    tree = addChild(tree, 2, 4);
    tree = removeNode(tree, 2);
    expect(tree.rootIds).toEqual([1, 4, 3]);
    expect(tree.nodes[4].parentId).toBeNull();
  });

  it('returns tree unchanged for unknown tabId', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = removeNode(tree, 99);
    expect(result.rootIds).toEqual([1]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL — `removeNode` is not exported from `./tree.js`

- [ ] **Step 3: Implement removeNode**

Add to `src/tree.js`:

```js
export function removeNode(tree, tabId) {
  const node = tree.nodes[tabId];
  if (!node) return tree;

  const newNodes = { ...tree.nodes };
  let newRootIds = [...tree.rootIds];

  if (node.children.length === 0) {
    // Leaf node: just remove
    delete newNodes[tabId];
    if (node.parentId !== null) {
      const parent = { ...newNodes[node.parentId] };
      parent.children = parent.children.filter((id) => id !== tabId);
      newNodes[node.parentId] = parent;
    } else {
      newRootIds = newRootIds.filter((id) => id !== tabId);
    }
  } else {
    // Has children: promote first child
    const [promotedId, ...siblingIds] = node.children;
    const promoted = { ...newNodes[promotedId] };

    // Promoted child keeps its children, siblings appended after
    promoted.children = [...promoted.children, ...siblingIds];
    promoted.parentId = node.parentId;
    newNodes[promotedId] = promoted;

    // Update siblings to point to promoted as parent
    for (const sibId of siblingIds) {
      newNodes[sibId] = { ...newNodes[sibId], parentId: promotedId };
    }

    // Replace removed node in parent's children or root list
    if (node.parentId !== null) {
      const parent = { ...newNodes[node.parentId] };
      parent.children = parent.children.map((id) => (id === tabId ? promotedId : id));
      newNodes[node.parentId] = parent;
    } else {
      newRootIds = newRootIds.map((id) => (id === tabId ? promotedId : id));
    }

    delete newNodes[tabId];
  }

  return { nodes: newNodes, rootIds: newRootIds };
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run src/tree.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tree.js src/tree.test.js
git commit -m "feat: tree removeNode with first-child promotion"
```

---

### Task 4: Tree Data Model — Move, Reparent, Cycle Detection

**Files:**
- Modify: `src/tree.js`
- Modify: `src/tree.test.js`

- [ ] **Step 1: Write tests for isDescendant**

Add to `src/tree.test.js`:

```js
import {
  createTree,
  addRoot,
  getNode,
  getDepth,
  addChild,
  getSubtreeIds,
  flattenTree,
  removeNode,
  isDescendant,
  moveNode,
  reparentNode,
} from './tree.js';

describe('isDescendant', () => {
  it('returns false for unrelated nodes', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    expect(isDescendant(tree, 2, 1)).toBe(false);
  });

  it('returns true for direct child', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    expect(isDescendant(tree, 2, 1)).toBe(true);
  });

  it('returns true for deep descendant', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 3);
    expect(isDescendant(tree, 3, 1)).toBe(true);
  });

  it('returns false for ancestor (wrong direction)', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    expect(isDescendant(tree, 1, 2)).toBe(false);
  });

  it('returns false for self', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    expect(isDescendant(tree, 1, 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL — `isDescendant` is not exported from `./tree.js`

- [ ] **Step 3: Implement isDescendant**

Add to `src/tree.js`:

```js
export function isDescendant(tree, tabId, ancestorId) {
  let node = tree.nodes[tabId];
  while (node && node.parentId !== null) {
    if (node.parentId === ancestorId) return true;
    node = tree.nodes[node.parentId];
  }
  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tree.test.js`
Expected: All `isDescendant` tests PASS

- [ ] **Step 5: Write tests for moveNode**

Add to `src/tree.test.js`:

```js
describe('moveNode', () => {
  it('reorders within root siblings', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addRoot(tree, 3);
    tree = moveNode(tree, 3, null, 0);
    expect(tree.rootIds).toEqual([3, 1, 2]);
  });

  it('reorders within parent children', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 1, 3);
    tree = addChild(tree, 1, 4);
    tree = moveNode(tree, 4, 1, 0);
    expect(tree.nodes[1].children).toEqual([4, 2, 3]);
  });

  it('subtree moves with node', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addChild(tree, 2, 3);
    tree = addRoot(tree, 4);
    tree = moveNode(tree, 2, null, 2);
    expect(tree.rootIds).toEqual([1, 4, 2]);
    expect(tree.nodes[2].children).toEqual([3]);
    expect(tree.nodes[3].parentId).toBe(2);
  });

  it('moves node from one parent to another', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addChild(tree, 1, 3);
    tree = moveNode(tree, 3, 2, 0);
    expect(tree.nodes[1].children).toEqual([]);
    expect(tree.nodes[2].children).toEqual([3]);
    expect(tree.nodes[3].parentId).toBe(2);
  });

  it('moves node from parent to root level', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = moveNode(tree, 2, null, 1);
    expect(tree.rootIds).toEqual([1, 2]);
    expect(tree.nodes[1].children).toEqual([]);
    expect(tree.nodes[2].parentId).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL — `moveNode` is not exported

- [ ] **Step 7: Implement moveNode**

Add to `src/tree.js`:

```js
export function moveNode(tree, tabId, newParentId, index) {
  const node = tree.nodes[tabId];
  if (!node) return tree;

  const newNodes = { ...tree.nodes };
  let newRootIds = [...tree.rootIds];

  // Remove from current location
  if (node.parentId !== null) {
    const oldParent = { ...newNodes[node.parentId] };
    oldParent.children = oldParent.children.filter((id) => id !== tabId);
    newNodes[node.parentId] = oldParent;
  } else {
    newRootIds = newRootIds.filter((id) => id !== tabId);
  }

  // Insert at new location
  if (newParentId !== null) {
    const newParent = { ...newNodes[newParentId] };
    const children = [...newParent.children];
    children.splice(index, 0, tabId);
    newParent.children = children;
    newNodes[newParentId] = newParent;
    newNodes[tabId] = { ...node, parentId: newParentId };
  } else {
    newRootIds.splice(index, 0, tabId);
    newNodes[tabId] = { ...node, parentId: null };
  }

  return { nodes: newNodes, rootIds: newRootIds };
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/tree.test.js`
Expected: All `moveNode` tests PASS

- [ ] **Step 9: Write tests for reparentNode**

Add to `src/tree.test.js`:

```js
describe('reparentNode', () => {
  it('moves root tab to become child of another', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = reparentNode(tree, 2, 1);
    expect(tree.rootIds).toEqual([1]);
    expect(tree.nodes[1].children).toEqual([2]);
    expect(tree.nodes[2].parentId).toBe(1);
  });

  it('moves child to different parent', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addChild(tree, 1, 3);
    tree = reparentNode(tree, 3, 2);
    expect(tree.nodes[1].children).toEqual([]);
    expect(tree.nodes[2].children).toEqual([3]);
    expect(tree.nodes[3].parentId).toBe(2);
  });

  it('preserves subtree when reparenting', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addChild(tree, 1, 3);
    tree = addChild(tree, 3, 4);
    tree = reparentNode(tree, 3, 2);
    expect(tree.nodes[3].parentId).toBe(2);
    expect(tree.nodes[3].children).toEqual([4]);
    expect(tree.nodes[4].parentId).toBe(3);
  });

  it('rejects reparenting onto own descendant', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 3);
    const result = reparentNode(tree, 1, 3);
    expect(result.nodes[1].parentId).toBeNull();
    expect(result.rootIds).toEqual([1]);
  });

  it('rejects reparenting onto self', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = reparentNode(tree, 1, 1);
    expect(result.rootIds).toEqual([1]);
    expect(result.nodes[1].parentId).toBeNull();
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL — `reparentNode` is not exported

- [ ] **Step 11: Implement reparentNode**

Add to `src/tree.js`:

```js
export function reparentNode(tree, tabId, newParentId) {
  if (tabId === newParentId) return tree;
  if (isDescendant(tree, newParentId, tabId)) return tree;

  const node = tree.nodes[tabId];
  if (!node) return tree;

  const newNodes = { ...tree.nodes };
  let newRootIds = [...tree.rootIds];

  // Remove from current parent
  if (node.parentId !== null) {
    const oldParent = { ...newNodes[node.parentId] };
    oldParent.children = oldParent.children.filter((id) => id !== tabId);
    newNodes[node.parentId] = oldParent;
  } else {
    newRootIds = newRootIds.filter((id) => id !== tabId);
  }

  // Add as last child of new parent
  const newParent = { ...newNodes[newParentId] };
  newParent.children = [...newParent.children, tabId];
  newNodes[newParentId] = newParent;
  newNodes[tabId] = { ...node, parentId: newParentId };

  return { nodes: newNodes, rootIds: newRootIds };
}
```

- [ ] **Step 12: Run tests to verify all pass**

Run: `npx vitest run src/tree.test.js`
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add src/tree.js src/tree.test.js
git commit -m "feat: tree move, reparent, and cycle detection"
```

---

### Task 5: Tree Data Model — Reconciliation

**Files:**
- Modify: `src/tree.js`
- Modify: `src/tree.test.js`

- [ ] **Step 1: Write tests for reconcile**

Add to `src/tree.test.js`:

```js
import {
  createTree,
  addRoot,
  getNode,
  getDepth,
  addChild,
  getSubtreeIds,
  flattenTree,
  removeNode,
  isDescendant,
  moveNode,
  reparentNode,
  reconcile,
} from './tree.js';

describe('reconcile', () => {
  it('removes orphaned nodes not in live tabs', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addRoot(tree, 2);
    tree = addChild(tree, 1, 3);
    tree = reconcile(tree, [1, 3]);
    expect(tree.rootIds).toEqual([1]);
    expect(tree.nodes[2]).toBeUndefined();
    expect(tree.nodes[1].children).toEqual([3]);
  });

  it('adds new live tabs as roots', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = reconcile(tree, [1, 5, 6]);
    expect(tree.rootIds).toEqual([1, 5, 6]);
    expect(tree.nodes[5]).toEqual({ tabId: 5, parentId: null, children: [] });
    expect(tree.nodes[6]).toEqual({ tabId: 6, parentId: null, children: [] });
  });

  it('promotes children when parent is orphaned', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 1, 3);
    tree = reconcile(tree, [2, 3]);
    expect(tree.rootIds).toContain(2);
    expect(tree.rootIds).toContain(3);
    expect(tree.nodes[1]).toBeUndefined();
  });

  it('returns empty tree reconciled with no live tabs', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = reconcile(tree, []);
    expect(tree.rootIds).toEqual([]);
    expect(tree.nodes).toEqual({});
  });

  it('handles already-in-sync tree', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = reconcile(tree, [1, 2]);
    expect(tree.rootIds).toEqual([1]);
    expect(tree.nodes[1].children).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tree.test.js`
Expected: FAIL — `reconcile` is not exported

- [ ] **Step 3: Implement reconcile**

Add to `src/tree.js`:

```js
export function reconcile(tree, liveTabIds) {
  const liveSet = new Set(liveTabIds);

  let result = { nodes: { ...tree.nodes }, rootIds: [...tree.rootIds] };

  // Find dead tab IDs (not in live set)
  const deadIds = Object.keys(result.nodes)
    .map(Number)
    .filter((id) => !liveSet.has(id));

  // Remove deepest nodes first to avoid cascading promotion issues
  deadIds.sort((a, b) => getDepth(result, b) - getDepth(result, a));

  for (const deadId of deadIds) {
    if (result.nodes[deadId]) {
      result = removeNode(result, deadId);
    }
  }

  // Add new live tabs not in tree as roots
  for (const tabId of liveTabIds) {
    if (!result.nodes[tabId]) {
      result = addRoot(result, tabId);
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run src/tree.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tree.js src/tree.test.js
git commit -m "feat: tree reconciliation with live tab state"
```

---

### Task 6: Event Handlers

**Files:**
- Create: `src/handlers.js`
- Create: `src/handlers.test.js`

- [ ] **Step 1: Write tests for resolveParent**

```js
// src/handlers.test.js
import { describe, it, expect } from 'vitest';
import { resolveParent, handleTabCreated, handleTabRemoved, handleTabDetached, handleTabAttached } from './handlers.js';
import { createTree, addRoot, addChild } from './tree.js';

describe('resolveParent', () => {
  it('returns sourceTabId from pendingParents', () => {
    const pending = { 2: 1 };
    const tab = { id: 2, openerTabId: 1 };
    expect(resolveParent(pending, tab)).toBe(1);
  });

  it('filters Ctrl+T (openerTabId set, no navigation target, no URL)', () => {
    const pending = {};
    const tab = { id: 2, openerTabId: 1, url: '' };
    expect(resolveParent(pending, tab)).toBeNull();
  });

  it('filters Ctrl+T with chrome://newtab URL', () => {
    const pending = {};
    const tab = { id: 2, openerTabId: 1, url: 'chrome://newtab/' };
    expect(resolveParent(pending, tab)).toBeNull();
  });

  it('uses openerTabId when URL is present and no pending entry', () => {
    const pending = {};
    const tab = { id: 2, openerTabId: 1, url: 'https://example.com' };
    expect(resolveParent(pending, tab)).toBe(1);
  });

  it('returns null when no openerTabId and no pending entry', () => {
    const pending = {};
    const tab = { id: 2 };
    expect(resolveParent(pending, tab)).toBeNull();
  });

  it('returns null for address bar navigation (no openerTabId)', () => {
    const pending = {};
    const tab = { id: 2, url: 'https://example.com' };
    expect(resolveParent(pending, tab)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/handlers.test.js`
Expected: FAIL — module `./handlers.js` not found

- [ ] **Step 3: Implement resolveParent**

```js
// src/handlers.js
import { addRoot, addChild, removeNode, getNode } from './tree.js';

export function resolveParent(pendingParents, tab) {
  if (pendingParents[tab.id]) {
    return pendingParents[tab.id];
  }

  if (tab.openerTabId) {
    if (!tab.url || tab.url === '' || tab.url === 'chrome://newtab/') {
      return null;
    }
    return tab.openerTabId;
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/handlers.test.js`
Expected: All `resolveParent` tests PASS

- [ ] **Step 5: Write tests for handleTabCreated and handleTabRemoved**

Add to `src/handlers.test.js`:

```js
describe('handleTabCreated', () => {
  it('adds child tab when parentTabId is set and exists in tree', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = handleTabCreated(tree, 2, 1);
    expect(result.nodes[1].children).toEqual([2]);
    expect(result.nodes[2].parentId).toBe(1);
  });

  it('adds root tab when parentTabId is null', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = handleTabCreated(tree, 2, null);
    expect(result.rootIds).toEqual([1, 2]);
    expect(result.nodes[2].parentId).toBeNull();
  });

  it('adds root tab when parent not found in tree', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = handleTabCreated(tree, 2, 99);
    expect(result.rootIds).toEqual([1, 2]);
    expect(result.nodes[2].parentId).toBeNull();
  });
});

describe('handleTabRemoved', () => {
  it('removes tab and promotes children', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 1, 3);
    const result = handleTabRemoved(tree, 1);
    expect(result.rootIds).toEqual([2]);
    expect(result.nodes[2].children).toEqual([3]);
  });

  it('handles removing unknown tab gracefully', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = handleTabRemoved(tree, 99);
    expect(result.rootIds).toEqual([1]);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run src/handlers.test.js`
Expected: FAIL — `handleTabCreated` and `handleTabRemoved` not exported

- [ ] **Step 7: Implement handleTabCreated and handleTabRemoved**

Add to `src/handlers.js`:

```js
export function handleTabCreated(tree, tabId, parentTabId) {
  if (parentTabId !== null && getNode(tree, parentTabId)) {
    return addChild(tree, parentTabId, tabId);
  }
  return addRoot(tree, tabId);
}

export function handleTabRemoved(tree, tabId) {
  if (!getNode(tree, tabId)) return tree;
  return removeNode(tree, tabId);
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/handlers.test.js`
Expected: All tests PASS

- [ ] **Step 9: Write tests for handleTabDetached and handleTabAttached**

Add to `src/handlers.test.js`:

```js
describe('handleTabDetached', () => {
  it('removes tab and promotes its children', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    tree = addChild(tree, 2, 3);
    const result = handleTabDetached(tree, 2);
    expect(result.nodes[1].children).toEqual([3]);
    expect(result.nodes[3].parentId).toBe(1);
    expect(result.nodes[2]).toBeUndefined();
  });

  it('removes leaf tab', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    tree = addChild(tree, 1, 2);
    const result = handleTabDetached(tree, 2);
    expect(result.nodes[1].children).toEqual([]);
    expect(result.nodes[2]).toBeUndefined();
  });
});

describe('handleTabAttached', () => {
  it('adds tab as new root', () => {
    let tree = createTree();
    tree = addRoot(tree, 1);
    const result = handleTabAttached(tree, 5);
    expect(result.rootIds).toEqual([1, 5]);
    expect(result.nodes[5].parentId).toBeNull();
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npx vitest run src/handlers.test.js`
Expected: FAIL — `handleTabDetached` and `handleTabAttached` not exported

- [ ] **Step 11: Implement handleTabDetached and handleTabAttached**

Add to `src/handlers.js`:

```js
export function handleTabDetached(tree, tabId) {
  if (!getNode(tree, tabId)) return tree;
  return removeNode(tree, tabId);
}

export function handleTabAttached(tree, tabId) {
  return addRoot(tree, tabId);
}
```

- [ ] **Step 12: Run tests to verify all pass**

Run: `npx vitest run src/handlers.test.js`
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add src/handlers.js src/handlers.test.js
git commit -m "feat: event handlers for tab lifecycle (create, remove, detach, attach)"
```

---

### Task 7: Chrome Mock & Integration Tests

**Files:**
- Create: `test/chrome-mock.js`
- Create: `test/integration.test.js`

- [ ] **Step 1: Create Chrome API mock**

```js
// test/chrome-mock.js

export function createMockChrome() {
  const storage = {};

  return {
    storage: {
      local: {
        get: async (keys) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const key of keyList) {
            if (storage[key] !== undefined) result[key] = storage[key];
          }
          return result;
        },
        set: async (items) => {
          Object.assign(storage, items);
        },
        _data: storage,
      },
    },
    tabs: {
      _tabs: new Map(),
      _nextId: 1,
      async get(tabId) {
        return this._tabs.get(tabId);
      },
      async query(queryInfo) {
        return [...this._tabs.values()].filter((tab) => {
          if (queryInfo.windowId !== undefined && tab.windowId !== queryInfo.windowId)
            return false;
          return true;
        });
      },
      async update(tabId, updateProperties) {
        const tab = this._tabs.get(tabId);
        if (tab) Object.assign(tab, updateProperties);
        return tab;
      },
      async remove(tabId) {
        this._tabs.delete(tabId);
      },
      _create(props) {
        const tab = {
          id: this._nextId++,
          windowId: 1,
          index: this._tabs.size,
          title: 'New Tab',
          url: '',
          favIconUrl: '',
          active: false,
          ...props,
        };
        this._tabs.set(tab.id, tab);
        return tab;
      },
    },
  };
}
```

- [ ] **Step 2: Write integration tests for multi-event sequences**

```js
// test/integration.test.js
import { describe, it, expect } from 'vitest';
import { createTree, flattenTree } from '../src/tree.js';
import {
  resolveParent,
  handleTabCreated,
  handleTabRemoved,
  handleTabDetached,
  handleTabAttached,
} from '../src/handlers.js';

describe('integration: browsing session builds tree', () => {
  it('builds correct tree from a typical browsing session', () => {
    let tree = createTree();

    // User opens tab 1 (address bar)
    tree = handleTabCreated(tree, 1, null);
    // User clicks link in tab 1 -> opens tab 2
    tree = handleTabCreated(tree, 2, 1);
    // User clicks link in tab 2 -> opens tab 3
    tree = handleTabCreated(tree, 3, 2);
    // User clicks another link in tab 1 -> opens tab 4
    tree = handleTabCreated(tree, 4, 1);
    // User opens tab 5 from address bar
    tree = handleTabCreated(tree, 5, null);

    expect(flattenTree(tree)).toEqual([
      { tabId: 1, depth: 0 },
      { tabId: 2, depth: 1 },
      { tabId: 3, depth: 2 },
      { tabId: 4, depth: 1 },
      { tabId: 5, depth: 0 },
    ]);
  });
});

describe('integration: closing parent with deep tree', () => {
  it('promotes first child and reparents siblings', () => {
    let tree = createTree();
    tree = handleTabCreated(tree, 1, null);
    tree = handleTabCreated(tree, 2, 1);
    tree = handleTabCreated(tree, 3, 2);
    tree = handleTabCreated(tree, 4, 1);

    // Close tab 1 — tab 2 promoted, gets sibling 4
    tree = handleTabRemoved(tree, 1);

    expect(flattenTree(tree)).toEqual([
      { tabId: 2, depth: 0 },
      { tabId: 3, depth: 1 },
      { tabId: 4, depth: 1 },
    ]);
  });
});

describe('integration: rapid tab creation', () => {
  it('handles 5 tabs opened from same parent at once', () => {
    let tree = createTree();
    tree = handleTabCreated(tree, 1, null);

    for (let i = 2; i <= 6; i++) {
      tree = handleTabCreated(tree, i, 1);
    }

    expect(tree.nodes[1].children).toEqual([2, 3, 4, 5, 6]);
    expect(flattenTree(tree)).toHaveLength(6);
  });
});

describe('integration: tab moving between windows', () => {
  it('detaches from source tree and attaches to destination tree', () => {
    let treeA = createTree();
    let treeB = createTree();
    treeA = handleTabCreated(treeA, 1, null);
    treeA = handleTabCreated(treeA, 2, 1);
    treeB = handleTabCreated(treeB, 3, null);

    // Detach tab 2 from window A
    treeA = handleTabDetached(treeA, 2);
    // Attach tab 2 to window B
    treeB = handleTabAttached(treeB, 2);

    expect(treeA.nodes[1].children).toEqual([]);
    expect(treeA.nodes[2]).toBeUndefined();
    expect(treeB.rootIds).toEqual([3, 2]);
  });
});

describe('integration: cascading closures', () => {
  it('handles closing multiple parents in sequence', () => {
    let tree = createTree();
    tree = handleTabCreated(tree, 1, null);
    tree = handleTabCreated(tree, 2, 1);
    tree = handleTabCreated(tree, 3, 2);
    tree = handleTabCreated(tree, 4, 3);

    // Close from top down
    tree = handleTabRemoved(tree, 1);
    expect(tree.rootIds).toEqual([2]);
    expect(tree.nodes[2].children).toEqual([3]);

    tree = handleTabRemoved(tree, 2);
    expect(tree.rootIds).toEqual([3]);
    expect(tree.nodes[3].children).toEqual([4]);

    tree = handleTabRemoved(tree, 3);
    expect(tree.rootIds).toEqual([4]);
    expect(tree.nodes[4].children).toEqual([]);
  });
});

describe('integration: resolveParent with Ctrl+T filtering', () => {
  it('correctly categorizes different tab creation scenarios', () => {
    // Link click: has pending entry
    expect(resolveParent({ 2: 1 }, { id: 2, openerTabId: 1 })).toBe(1);

    // Ctrl+T: openerTabId but no URL
    expect(resolveParent({}, { id: 2, openerTabId: 1, url: '' })).toBeNull();

    // Ctrl+T: openerTabId with chrome://newtab
    expect(resolveParent({}, { id: 2, openerTabId: 1, url: 'chrome://newtab/' })).toBeNull();

    // Address bar: no openerTabId
    expect(resolveParent({}, { id: 2, url: 'https://example.com' })).toBeNull();

    // target="_blank" link: openerTabId with real URL, no pending (webNav didn't fire)
    expect(
      resolveParent({}, { id: 2, openerTabId: 1, url: 'https://example.com' })
    ).toBe(1);
  });
});
```

- [ ] **Step 3: Run integration tests**

Run: `npx vitest run test/integration.test.js`
Expected: All tests PASS

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS across all three test files

- [ ] **Step 5: Commit**

```bash
git add test/chrome-mock.js test/integration.test.js
git commit -m "feat: Chrome API mock and integration tests for event sequences"
```

---

### Task 8: Service Worker

**Files:**
- Create: `background.js`

- [ ] **Step 1: Create background.js**

```js
// background.js
import { createTree, reconcile, moveNode, reparentNode } from './src/tree.js';
import {
  resolveParent,
  handleTabCreated,
  handleTabRemoved,
  handleTabDetached,
  handleTabAttached,
} from './src/handlers.js';

// Per-window tree state (in-memory cache)
const trees = new Map();

// Pending parent signals from webNavigation
const pendingParents = {};

// Connected panel ports (keyed by windowId)
const panelPorts = new Map();

function storageKey(windowId) {
  return `tree_${windowId}`;
}

async function getTree(windowId) {
  if (trees.has(windowId)) return trees.get(windowId);

  const key = storageKey(windowId);
  const data = await chrome.storage.local.get(key);
  const tree = data[key] || createTree();
  trees.set(windowId, tree);
  return tree;
}

async function setTree(windowId, tree) {
  trees.set(windowId, tree);
  await chrome.storage.local.set({ [storageKey(windowId)]: tree });
  notifyPanel(windowId);
}

async function notifyPanel(windowId) {
  const port = panelPorts.get(windowId);
  if (!port) return;

  const tree = await getTree(windowId);
  const tabs = await chrome.tabs.query({ windowId });
  const tabMap = {};
  let activeTabId = null;
  for (const tab of tabs) {
    tabMap[tab.id] = {
      id: tab.id,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      url: tab.url,
    };
    if (tab.active) activeTabId = tab.id;
  }

  port.postMessage({
    type: 'state-update',
    tree,
    tabs: tabMap,
    activeTabId,
  });
}

// --- Event Listeners ---

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  pendingParents[details.tabId] = details.sourceTabId;
});

chrome.tabs.onCreated.addListener(async (tab) => {
  // Short delay to let openerTabId populate, then confirm
  const fullTab = await chrome.tabs.get(tab.id);
  const parentId = resolveParent(pendingParents, fullTab);
  delete pendingParents[fullTab.id];

  const tree = await getTree(fullTab.windowId);
  const newTree = handleTabCreated(tree, fullTab.id, parentId);
  await setTree(fullTab.windowId, newTree);
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const tree = await getTree(removeInfo.windowId);
  const newTree = handleTabRemoved(tree, tabId);
  await setTree(removeInfo.windowId, newTree);
});

chrome.tabs.onDetached.addListener(async (tabId, detachInfo) => {
  const tree = await getTree(detachInfo.oldWindowId);
  const newTree = handleTabDetached(tree, tabId);
  await setTree(detachInfo.oldWindowId, newTree);
});

chrome.tabs.onAttached.addListener(async (tabId, attachInfo) => {
  const tree = await getTree(attachInfo.newWindowId);
  const newTree = handleTabAttached(tree, tabId);
  await setTree(attachInfo.newWindowId, newTree);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  notifyPanel(activeInfo.windowId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.title || changeInfo.favIconUrl) {
    notifyPanel(tab.windowId);
  }
});

// --- Panel Communication ---

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'tab-tree-panel') return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'init') {
      panelPorts.set(msg.windowId, port);

      // Reconcile tree with live tabs on panel open
      const tabs = await chrome.tabs.query({ windowId: msg.windowId });
      const liveIds = tabs.map((t) => t.id);
      let tree = await getTree(msg.windowId);
      tree = reconcile(tree, liveIds);
      await setTree(msg.windowId, tree);
    }

    if (msg.type === 'activate-tab') {
      await chrome.tabs.update(msg.tabId, { active: true });
    }

    if (msg.type === 'close-tab') {
      await chrome.tabs.remove(msg.tabId);
    }

    if (msg.type === 'move-tab') {
      const tree = await getTree(msg.windowId);
      const newTree = moveNode(tree, msg.tabId, msg.newParentId, msg.index);
      await setTree(msg.windowId, newTree);
    }

    if (msg.type === 'reparent-tab') {
      const tree = await getTree(msg.windowId);
      const newTree = reparentNode(tree, msg.tabId, msg.newParentId);
      await setTree(msg.windowId, newTree);
    }
  });

  port.onDisconnect.addListener(() => {
    for (const [windowId, p] of panelPorts) {
      if (p === port) {
        panelPorts.delete(windowId);
        break;
      }
    }
  });
});

// --- Extension Action ---

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// --- Startup Reconciliation ---

chrome.runtime.onStartup.addListener(async () => {
  const windows = await chrome.windows.getAll();
  for (const win of windows) {
    const tabs = await chrome.tabs.query({ windowId: win.id });
    const liveIds = tabs.map((t) => t.id);
    let tree = await getTree(win.id);
    tree = reconcile(tree, liveIds);
    await setTree(win.id, tree);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add background.js
git commit -m "feat: service worker wiring Chrome events to tree handlers"
```

---

### Task 9: Side Panel — Structure & Styling

**Files:**
- Create: `panel.html`
- Create: `panel.css`

- [ ] **Step 1: Create panel.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="panel.css">
</head>
<body>
  <div id="tab-tree"></div>
  <script type="module" src="panel.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create panel.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #202124;
  color: #e8eaed;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  overflow-x: hidden;
  user-select: none;
}

#tab-tree {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.tab-row {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  transition: background 0.1s;
  position: relative;
}

.tab-row:hover {
  background: #2d2e30;
}

.tab-row.active {
  background: #394457;
}

.tab-row.drag-over {
  background: #394457;
  outline: 2px solid #8ab4f8;
  outline-offset: -2px;
}

.tab-row.dragging {
  opacity: 0.4;
}

.tab-indent {
  flex-shrink: 0;
}

.tab-favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-right: 8px;
  border-radius: 2px;
}

.tab-favicon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-right: 8px;
  background: #5f6368;
  border-radius: 50%;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 32px;
}

.tab-close {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
  background: none;
  border: none;
  color: #9aa0a6;
  cursor: pointer;
  font-size: 14px;
  margin-left: 4px;
}

.tab-row:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: #3c4043;
  color: #e8eaed;
}

/* Drop indicator line between tabs */
.drop-indicator {
  height: 2px;
  margin: 0 4px;
  background: #8ab4f8;
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.drop-indicator.visible {
  opacity: 1;
}

/* Animated gap opening for drop target */
.tab-row.drop-gap-before {
  margin-top: 12px;
  transition: margin 0.15s ease;
}

.tab-row.drop-gap-after {
  margin-bottom: 12px;
  transition: margin 0.15s ease;
}
```

- [ ] **Step 3: Commit**

```bash
git add panel.html panel.css
git commit -m "feat: side panel HTML structure and dark theme CSS"
```

---

### Task 10: Side Panel — Rendering & Tab Interactions

**Files:**
- Create: `panel.js`

- [ ] **Step 1: Create panel.js with rendering and interactions**

```js
// panel.js
import { flattenTree } from './src/tree.js';

let port = null;
let currentTree = null;
let currentTabs = {};
let activeTabId = null;
let currentWindowId = null;

const container = document.getElementById('tab-tree');

// --- Connection ---

async function init() {
  const win = await chrome.windows.getCurrent();
  currentWindowId = win.id;

  port = chrome.runtime.connect({ name: 'tab-tree-panel' });

  port.onMessage.addListener((msg) => {
    if (msg.type === 'state-update') {
      currentTree = msg.tree;
      currentTabs = msg.tabs;
      activeTabId = msg.activeTabId;
      render();
    }
  });

  port.postMessage({ type: 'init', windowId: currentWindowId });
}

// --- Rendering ---

function render() {
  if (!currentTree) return;

  const flat = flattenTree(currentTree);
  container.innerHTML = '';

  for (const { tabId, depth } of flat) {
    const tab = currentTabs[tabId];

    const row = document.createElement('div');
    row.className = 'tab-row';
    row.dataset.tabId = String(tabId);
    row.dataset.depth = String(depth);
    if (tabId === activeTabId) row.classList.add('active');

    // Indentation
    const indent = document.createElement('div');
    indent.className = 'tab-indent';
    indent.style.width = `${depth * 16}px`;
    row.appendChild(indent);

    // Favicon
    if (tab && tab.favIconUrl) {
      const favicon = document.createElement('img');
      favicon.className = 'tab-favicon';
      favicon.src = tab.favIconUrl;
      favicon.onerror = () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'tab-favicon-placeholder';
        favicon.replaceWith(placeholder);
      };
      row.appendChild(favicon);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'tab-favicon-placeholder';
      row.appendChild(placeholder);
    }

    // Title
    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = (tab && tab.title) || 'New Tab';
    row.appendChild(title);

    // Close button
    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '\u00D7';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      port.postMessage({ type: 'close-tab', tabId });
    });
    row.appendChild(close);

    // Click to activate
    row.addEventListener('click', () => {
      port.postMessage({ type: 'activate-tab', tabId });
    });

    // Middle-click to close
    row.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        port.postMessage({ type: 'close-tab', tabId });
      }
    });

    container.appendChild(row);
  }

  initDragAndDrop();
}

// --- Drag and Drop ---

let draggedTabId = null;
let currentDropTarget = null;
let hysteresisTimeout = null;
const HYSTERESIS_MS = 80;

function initDragAndDrop() {
  const rows = container.querySelectorAll('.tab-row');

  rows.forEach((row) => {
    row.draggable = true;

    row.addEventListener('dragstart', (e) => {
      draggedTabId = Number(row.dataset.tabId);
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(draggedTabId));
    });

    row.addEventListener('dragend', () => {
      draggedTabId = null;
      row.classList.remove('dragging');
      clearAllDropFeedback();
      clearTimeout(hysteresisTimeout);
      currentDropTarget = null;
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedTabId === null) return;
      if (Number(row.dataset.tabId) === draggedTabId) return;

      const rect = row.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const zone = y < rect.height * 0.3 ? 'above' : y > rect.height * 0.7 ? 'below' : 'on';

      const targetKey = `${row.dataset.tabId}-${zone}`;
      if (currentDropTarget === targetKey) return;

      clearTimeout(hysteresisTimeout);
      hysteresisTimeout = setTimeout(() => {
        currentDropTarget = targetKey;
        clearAllDropFeedback();

        if (zone === 'on') {
          // Reparent: highlight the row
          row.classList.add('drag-over');
        } else if (zone === 'above') {
          // Reorder above: open gap before this row
          row.classList.add('drop-gap-before');
        } else {
          // Reorder below: open gap after this row
          row.classList.add('drop-gap-after');
        }
      }, HYSTERESIS_MS);
    });

    row.addEventListener('dragleave', () => {
      // Hysteresis handles cleanup — do nothing here
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedTabId === null) return;

      const targetTabId = Number(row.dataset.tabId);
      if (targetTabId === draggedTabId) return;

      // Cycle check: cannot drop onto own descendant
      if (isDescendantOf(targetTabId, draggedTabId)) return;

      const rect = row.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const zone = y < rect.height * 0.3 ? 'above' : y > rect.height * 0.7 ? 'below' : 'on';

      if (zone === 'on') {
        // Reparent as last child
        port.postMessage({
          type: 'reparent-tab',
          tabId: draggedTabId,
          newParentId: targetTabId,
          windowId: currentWindowId,
        });
      } else {
        // Reorder: determine target parent and index
        const targetNode = currentTree.nodes[targetTabId];
        const parentId = targetNode.parentId;
        const siblings =
          parentId !== null ? currentTree.nodes[parentId].children : currentTree.rootIds;
        let index = siblings.indexOf(targetTabId);
        if (zone === 'below') index++;

        // Adjust index if moving within the same parent
        const draggedNode = currentTree.nodes[draggedTabId];
        if (draggedNode.parentId === parentId) {
          const currentIndex = siblings.indexOf(draggedTabId);
          if (currentIndex < index) index--;
        }

        port.postMessage({
          type: 'move-tab',
          tabId: draggedTabId,
          newParentId: parentId,
          index,
          windowId: currentWindowId,
        });
      }

      clearAllDropFeedback();
      currentDropTarget = null;
    });
  });
}

function isDescendantOf(tabId, potentialAncestorId) {
  let node = currentTree.nodes[tabId];
  while (node && node.parentId !== null) {
    if (node.parentId === potentialAncestorId) return true;
    node = currentTree.nodes[node.parentId];
  }
  return false;
}

function clearAllDropFeedback() {
  container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
  container
    .querySelectorAll('.drop-gap-before')
    .forEach((el) => el.classList.remove('drop-gap-before'));
  container
    .querySelectorAll('.drop-gap-after')
    .forEach((el) => el.classList.remove('drop-gap-after'));
}

// --- Start ---

init();
```

- [ ] **Step 2: Commit**

```bash
git add panel.js
git commit -m "feat: side panel rendering, interactions, and drag-and-drop"
```

---

### Task 11: Final Verification

**Files:**
- All files

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS across `src/tree.test.js`, `src/handlers.test.js`, `test/integration.test.js`

- [ ] **Step 2: Verify complete file structure**

Run: `find . -not -path './node_modules/*' -not -path './.git/*' -not -path './.superpowers/*' -type f | sort`

Expected output:
```
./.gitignore
./background.js
./docs/superpowers/plans/2026-03-26-chrome-tab-tree.md
./docs/superpowers/specs/2026-03-26-chrome-tab-tree-design.md
./icons/icon.svg
./manifest.json
./package-lock.json
./package.json
./panel.css
./panel.html
./panel.js
./src/handlers.js
./src/handlers.test.js
./src/tree.js
./src/tree.test.js
./test/chrome-mock.js
./test/integration.test.js
./vitest.config.js
```

- [ ] **Step 3: Verify manifest.json is valid**

Run: `node -e "const m = JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('Name:', m.name, '| Version:', m.version, '| MV:', m.manifest_version)"`
Expected: `Name: Tab Tree | Version: 0.1.0 | MV: 3`

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git status
# Only commit if there are uncommitted changes
```
