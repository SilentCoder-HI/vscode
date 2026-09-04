const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({
  platform: process.platform,
  workspace: {
    list: (path) => ipcRenderer.invoke('workspace:list', path),
    read: (path) => ipcRenderer.invoke('workspace:read', path),
    write: (path, content) => ipcRenderer.invoke('workspace:write', path, content),
    openFolder: () => ipcRenderer.invoke('workspace:openFolder'),
    restore: () => ipcRenderer.invoke('workspace:restore'),
    setIconTheme: (themeId) => ipcRenderer.invoke('workspace:setIconTheme', themeId),
    openFile: () => ipcRenderer.invoke('workspace:openFile'),
    create: (directory, name, isDirectory) => ipcRenderer.invoke('workspace:create', directory, name, isDirectory),
    delete: (path) => ipcRenderer.invoke('workspace:delete', path),
    copyPath: (path) => ipcRenderer.invoke('workspace:copyPath', path),
    paste: (directory) => ipcRenderer.invoke('workspace:paste', directory),
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