// test/chrome-mock.js

export function createMockChrome() {
  const storage = {};

  return {
    storage: {
      local: {
        get: async (keys) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const key of keyList) {
            if (storage[key] !== undefined) result[key] = storage[key];
          }
          return result;
        },
        set: async (items) => {
          Object.assign(storage, items);
        },
        _data: storage,
      },
    },
    tabs: {
      _tabs: new Map(),
      _nextId: 1,
      async get(tabId) {
        return this._tabs.get(tabId);
      },
      async query(queryInfo) {
        return [...this._tabs.values()].filter((tab) => {
          if (queryInfo.windowId !== undefined && tab.windowId !== queryInfo.windowId)
            return false;
          return true;
        });
      },
      async update(tabId, updateProperties) {
        const tab = this._tabs.get(tabId);
        if (tab) Object.assign(tab, updateProperties);
        return tab;
      },
      async remove(tabId) {
        this._tabs.delete(tabId);
      },
      _create(props) {
        const tab = {
          id: this._nextId++,
          windowId: 1,
          index: this._tabs.size,
          title: 'New Tab',
          url: '',
          favIconUrl: '',
          active: false,
          ...props,
        };
        this._tabs.set(tab.id, tab);
        return tab;
      },
    },
  };
}
