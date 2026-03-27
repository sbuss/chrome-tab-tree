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
