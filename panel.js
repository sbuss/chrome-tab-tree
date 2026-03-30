// panel.js
import { flattenTree, isDescendant } from './src/tree.js';
import { renderTabRow } from './src/render.js';

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
    const row = renderTabRow(tabId, depth, tab, tabId === activeTabId);

    // Event listeners (panel-specific, not in shared render)
    row.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      port.postMessage({ type: 'close-tab', tabId });
    });

    row.addEventListener('click', () => {
      port.postMessage({ type: 'activate-tab', tabId });
    });

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
let currentGapIndex = -1; // index in rows[] where the gap opens (items at this index and below shift down)
let hysteresisTimeout = null;
const HYSTERESIS_MS = 30;
const GAP_PX = 34; // full row height gap

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
      currentGapIndex = -1;
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedTabId === null) return;
      if (Number(row.dataset.tabId) === draggedTabId) return;

      const rect = row.getBoundingClientRect();
      const y = e.clientY - rect.top;
      // 40% top = above, 20% center = reparent, 40% bottom = below
      const zone = y < rect.height * 0.4 ? 'above' : y > rect.height * 0.6 ? 'below' : 'on';

      const allRows = [...container.querySelectorAll('.tab-row')];
      const rowIndex = allRows.indexOf(row);
      let newGapIndex;

      if (zone === 'on') {
        newGapIndex = -1; // reparent, no gap
      } else if (zone === 'above') {
        newGapIndex = rowIndex;
      } else {
        newGapIndex = rowIndex + 1;
      }

      // Skip if nothing changed
      const targetKey = zone === 'on' ? `on-${row.dataset.tabId}` : `gap-${newGapIndex}`;
      if (targetKey === (currentGapIndex === -1 && zone === 'on'
        ? `on-${row.dataset.tabId}`
        : `gap-${currentGapIndex}`)) return;

      clearTimeout(hysteresisTimeout);
      hysteresisTimeout = setTimeout(() => {
        clearAllDropFeedback();

        if (zone === 'on') {
          currentGapIndex = -1;
          row.classList.add('drag-over');
        } else {
          currentGapIndex = newGapIndex;
          // Shift all rows at and below the gap index down
          for (let i = 0; i < allRows.length; i++) {
            if (i >= currentGapIndex) {
              allRows[i].style.transform = `translateY(${GAP_PX}px)`;
            }
          }
        }
      }, HYSTERESIS_MS);
    });

    row.addEventListener('dragleave', () => {
      // Hysteresis handles cleanup
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedTabId === null) return;

      const targetTabId = Number(row.dataset.tabId);
      if (targetTabId === draggedTabId) return;

      if (isDescendant(currentTree, targetTabId, draggedTabId)) return;

      const rect = row.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const zone = y < rect.height * 0.4 ? 'above' : y > rect.height * 0.6 ? 'below' : 'on';

      if (zone === 'on') {
        port.postMessage({
          type: 'reparent-tab',
          tabId: draggedTabId,
          newParentId: targetTabId,
          windowId: currentWindowId,
        });
      } else {
        const targetNode = currentTree.nodes[targetTabId];
        const parentId = targetNode.parentId;
        const siblings =
          parentId !== null ? currentTree.nodes[parentId].children : currentTree.rootIds;
        let index = siblings.indexOf(targetTabId);
        if (zone === 'below') index++;

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
      currentGapIndex = -1;
    });
  });
}

function clearAllDropFeedback() {
  container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
  container.querySelectorAll('.tab-row').forEach((el) => {
    el.style.transform = '';
  });
}

// --- Start ---

init();
