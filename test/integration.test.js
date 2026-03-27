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
