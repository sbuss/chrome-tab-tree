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
