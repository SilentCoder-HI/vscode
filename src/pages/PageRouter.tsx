import Editor from '@monaco-editor/react'
import Extensions from './Extensions'
import Welcome from './Welcome'
import { RunPage, SearchPage, TerminalPage } from './UtilityPages'
import type { ExtensionInfo } from '../types/electron'

type PageRouterProps = {
  page: string
  setPage: React.Dispatch<React.SetStateAction<string>>
  activeFile?: { name?: string; path?: string } | null
  code: string
  setCode: (value: string) => void
  openTabs: Array<{ name: string; path: string }>
  onSelectTab: (path: string) => void
  onCloseTab: (path: string) => void
  onOpenFile: () => void
  onOpenFolder: () => void
  searchQuery: string
  extensions: ExtensionInfo[]
  onInstall: () => Promise<void> | void
  onRefreshExtensions?: () => Promise<void> | void
  terminal: string
  command: string
  setCommand: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
}

export default function PageRouter({ page, setPage, activeFile, code, setCode, openTabs, onSelectTab, onCloseTab, onOpenFile, onOpenFolder, searchQuery, extensions, onInstall, onRefreshExtensions, terminal, command, setCommand, onSubmit }: PageRouterProps) {
  if (page === 'welcome') return <Welcome onOpenFile={onOpenFile} onOpenFolder={onOpenFolder} onExtensions={() => setPage('extensions')} />
  if (page === 'extensions') return <Extensions extensions={extensions} onInstall={onInstall} onRefreshExtensions={onRefreshExtensions} />
  if (page === 'search') return <SearchPage initialQuery={searchQuery} />
  if (page === 'run') return <RunPage />
  if (page === 'terminal') return <TerminalPage terminal={terminal} command={command} setCommand={setCommand} onSubmit={onSubmit} />
  return <section className="h-full"><div className="flex h-[38px] overflow-x-auto border-b border-[#3a4540] bg-[#252b29]">{openTabs.map((tab) => <button className={`flex shrink-0 items-center gap-3 border-r border-[#3a4540] px-4 font-mono text-xs ${tab.path === activeFile?.path ? 'bg-[#1e1e1e] text-[#e6eee7]' : 'text-[#8f9c93]'}`} key={tab.path} onClick={() => onSelectTab(tab.path)}>{tab.name}<span className="text-[#8f9c93] hover:text-[#e59b62]" onClick={(event) => { event.stopPropagation(); onCloseTab(tab.path) }}>x</span></button>)}</div><Editor height="calc(100vh - 122px)" language={languageFor(activeFile?.name)} theme="vs-dark" value={code} onChange={(value) => setCode(value || '')} options={{ minimap: { enabled: true }, fontSize: 14, padding: { top: 18 } }} /></section>
}

function languageFor(name = '') { if (name.endsWith('.json')) return 'json'; if (name.endsWith('.ts')) return 'typescript'; if (name.endsWith('.css')) return 'css'; if (name.endsWith('.md')) return 'markdown'; return 'javascript' }
