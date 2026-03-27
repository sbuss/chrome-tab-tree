// src/render.js
// Shared tab row rendering — used by both panel.js and the visual test harness.

export function renderTabRow(tabId, depth, tab, isActive) {
  const row = document.createElement('div');
  row.className = 'tab-row';
  row.dataset.tabId = String(tabId);
  row.dataset.depth = String(depth);
  if (isActive) row.classList.add('active');

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
  row.appendChild(close);

  return row;
}
