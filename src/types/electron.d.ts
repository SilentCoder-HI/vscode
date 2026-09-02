export type ExtensionInfo = {
  id?: string
  name: string
  publisher?: string
  description?: string
  version?: string
  path?: string
  namespace?: string
  displayName?: string
}

export type MarketplaceExtension = {
  namespace: string
  name: string
  version: string
  displayName?: string
  description?: string
  files?: {
    download?: string
  }
}

export type ElectronAPI = {
  platform: NodeJS.Platform | string
  workspace: {
    list: (path: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean; parent?: string }>>
    read: (path: string) => Promise<string>
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
