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

export function isDescendant(tree, tabId, ancestorId) {
  let node = tree.nodes[tabId];
  while (node && node.parentId !== null) {
    if (node.parentId === ancestorId) return true;
    node = tree.nodes[node.parentId];
  }
  return false;
}

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

export function reconcile(tree, liveTabIds) {
  const liveSet = new Set(liveTabIds);

  let result = { nodes: { ...tree.nodes }, rootIds: [...tree.rootIds] };

  // Find dead tab IDs (not in live set)
  const deadIds = Object.keys(result.nodes)
    .map(Number)
    .filter((id) => !liveSet.has(id));

  // Remove shallowest nodes first so children are promoted to the dead node's
  // level before their own ancestors are processed
  deadIds.sort((a, b) => getDepth(result, a) - getDepth(result, b));

  for (const deadId of deadIds) {
    if (!result.nodes[deadId]) continue;

    const node = result.nodes[deadId];
    const newNodes = { ...result.nodes };
    let newRootIds = [...result.rootIds];

    // Promote each child independently to the dead node's position
    const children = [...node.children];
    delete newNodes[deadId];

    if (node.parentId !== null) {
      // Replace dead node with its children in the parent's children list
      const parent = { ...newNodes[node.parentId] };
      const idx = parent.children.indexOf(deadId);
      const before = parent.children.slice(0, idx);
      const after = parent.children.slice(idx + 1);
      parent.children = [...before, ...children, ...after];
      newNodes[node.parentId] = parent;
    } else {
      // Replace dead root with its children in rootIds
      const idx = newRootIds.indexOf(deadId);
      const before = newRootIds.slice(0, idx);
      const after = newRootIds.slice(idx + 1);
      newRootIds = [...before, ...children, ...after];
    }

    // Update each child's parentId to the dead node's parentId
    for (const childId of children) {
      newNodes[childId] = { ...newNodes[childId], parentId: node.parentId };
    }

    result = { nodes: newNodes, rootIds: newRootIds };
  }

  // Add new live tabs not in tree as roots
  for (const tabId of liveTabIds) {
    if (!result.nodes[tabId]) {
      result = addRoot(result, tabId);
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
