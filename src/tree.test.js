// src/tree.test.js
import { describe, it, expect } from 'vitest';
import { createTree, addRoot, getNode, addChild, getDepth, getSubtreeIds, flattenTree, removeNode, isDescendant, moveNode, reparentNode, reconcile } from './tree.js';

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
