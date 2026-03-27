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
