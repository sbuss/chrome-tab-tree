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

export function handleTabDetached(tree, tabId) {
  if (!getNode(tree, tabId)) return tree;
  return removeNode(tree, tabId);
}

export function handleTabAttached(tree, tabId) {
  return addRoot(tree, tabId);
}
