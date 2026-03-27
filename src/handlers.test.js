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
