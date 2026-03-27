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
