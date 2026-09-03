const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({
  platform: process.platform,
  workspace: {
    list: (path) => ipcRenderer.invoke('workspace:list', path),
    read: (path) => ipcRenderer.invoke('workspace:read', path),
    openFolder: () => ipcRenderer.invoke('workspace:openFolder'),
    openFile: () => ipcRenderer.invoke('workspace:openFile'),
  },
  terminal: {
    run: (command) => ipcRenderer.invoke('terminal:run', command),
  },
  extensions: {
    list: () => ipcRenderer.invoke('extensions:list'),
    install: () => ipcRenderer.invoke('extensions:install'),
    search: (query) => ipcRenderer.invoke('extensions:search', query),
    installMarketplace: (extension) => ipcRenderer.invoke('extensions:installMarketplace', extension),
  },
}))