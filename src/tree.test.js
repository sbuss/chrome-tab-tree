// src/tree.test.js
import { describe, it, expect } from 'vitest';
import { createTree, addRoot, getNode, addChild, getDepth, getSubtreeIds, flattenTree } from './tree.js';

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
