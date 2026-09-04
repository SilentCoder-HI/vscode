export type ExtensionInfo = {
  id?: string
  name: string
  publisher?: string
  description?: string
  version?: string
  path?: string
  namespace?: string
  displayName?: string
  iconThemes?: Array<{ id: string; label: string; path?: string }>
  enabled?: boolean
  location?: string
}

export type MarketplaceExtension = {
  namespace: string
  name: string
  version: string
  displayName?: string
  description?: string
  files?: {
    download?: string
    icon?: string
  }
  statistics?: Array<{ statisticName: string; value: number }>
  downloadCount?: number
}

export type ElectronAPI = {
  platform: NodeJS.Platform | string
  workspace: {
    list: (path: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }>>
    read: (path: string) => Promise<string>
    write: (path: string, content: string) => Promise<{ saved: boolean }>
    openFolder: () => Promise<{ canceled: boolean; name?: string; path?: string; iconTheme?: string; entries?: Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }> }>
    restore: () => Promise<{ restored: boolean; name?: string; path?: string; iconTheme?: string; entries?: Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }> }>
    setIconTheme: (themeId: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }>>
    openFile: () => Promise<{ canceled: boolean; name?: string; path?: string; content?: string }>
    create: (directory: string, name: string, isDirectory: boolean) => Promise<Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }>>
    delete: (path: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }>>
    copyPath: (path: string) => Promise<void>
    paste: (directory: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean; parent?: string; icon?: string }>>
  }
  terminal: {
    run: (command: string) => Promise<{ output: string; code: number }>
  }
  extensions: {
    list: () => Promise<ExtensionInfo[]>
    install: () => Promise<{ canceled: boolean; extension?: ExtensionInfo }>
    search: (query: string) => Promise<MarketplaceExtension[]>
    installMarketplace: (extension: MarketplaceExtension) => Promise<{ canceled?: boolean; extension?: ExtensionInfo }>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
