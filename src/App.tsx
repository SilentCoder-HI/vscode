import { useEffect, useState } from 'react'
import PageRouter from './pages/PageRouter'
import type { ElectronAPI, ExtensionInfo } from './types/electron'
import Navbar from './components/navbar'


const initialCode = '// Select a file from the Explorer to begin\n'
type Entry = {
  name: string
  path: string
  isDirectory: boolean
  parent?: string
}

type OpenTab = Entry & { code: string }

function App() {
  const [page, setPage] = useState<string>('welcome')
  const [entries, setEntries] = useState<Entry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeFile, setActiveFile] = useState<OpenTab | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [workspaceName, setWorkspaceName] = useState('NO WORKSPACE')
  const [searchQuery, setSearchQuery] = useState('')
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([])
  const [terminal, setTerminal] = useState('Northstar terminal\nFish shell · vscode-main\n')
  const [command, setCommand] = useState('pwd')



  async function refreshExtensions() {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    setExtensions(await api.extensions.list())
  }

  useEffect(() => {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return

    void (async () => {
      setExtensions(await api.extensions.list())
    })()
  }, [])

  useEffect(() => {
    if (page === 'extensions') void refreshExtensions()
  }, [page])

  async function toggleFolder(entry: Entry) {
    const api = window.electronAPI as ElectronAPI | undefined
    const nextExpanded = new Set(expanded)
    if (nextExpanded.has(entry.path)) nextExpanded.delete(entry.path)
    else nextExpanded.add(entry.path)
    setExpanded(nextExpanded)
    if (!nextExpanded.has(entry.path)) return
    if (!api) return
    const children = await api.workspace.list(entry.path)
    setEntries((current) => [...current.filter((item) => item.parent !== entry.path), ...children.map((item) => ({ ...item, parent: entry.path }))])
  }

  async function openFile(entry: Entry) {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    openTab({ ...entry, code: await api.workspace.read(entry.path) })
  }

  async function openTab(tab: OpenTab) {
    const existingTab = tabs.find((item) => item.path === tab.path)
    const selectedTab = existingTab || tab
    setTabs((current) => existingTab ? current : [...current, tab])
    setActiveFile(selectedTab)
    setPage('editor')
  }

  async function openWorkspaceFolder() {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    const result = await api.workspace.openFolder()
    if (result.canceled) return
    setWorkspaceName(result.name || 'WORKSPACE')
    setEntries(result.entries || [])
    setExpanded(new Set())
    setPage('explorer')
  }

  async function openStandaloneFile() {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    const result = await api.workspace.openFile()
    if (result.canceled || !result.path || !result.name) return
    await openTab({ name: result.name, path: result.path, isDirectory: false, code: result.content || '' })
  }

  function selectTab(path: string) {
    const tab = tabs.find((item) => item.path === path)
    if (!tab) return
    setActiveFile(tab)
    setPage('editor')
  }

  function closeTab(path: string) {
    const remaining = tabs.filter((tab) => tab.path !== path)
    setTabs(remaining)
    if (activeFile?.path !== path) return
    const nextTab = remaining[remaining.length - 1]
    if (nextTab) setActiveFile(nextTab)
    else {
      setActiveFile(null)
      setPage('welcome')
    }
  }

  function updateCode(value: string) {
    if (!activeFile) return
    setTabs((current) => current.map((tab) => tab.path === activeFile.path ? { ...tab, code: value } : tab))
    setActiveFile((current) => current ? { ...current, code: value } : current)
  }

  function searchFromNavbar(query: string) {
    setSearchQuery(query)
    setPage('search')
  }

  async function runCommand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) {
      setTerminal((current) => `${current}\nWeb preview does not provide a shell.\n`)
      setPage('terminal')
      return
    }
    const result = await api.terminal.run(command)
    setTerminal((current) => `${current}\n$ ${command}\n${result.output || '(no output)'}\n`)
    setPage('terminal')
  }

  async function installExtension() {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    const result = await api.extensions.install()
    if (!result.canceled) await refreshExtensions()
  }

  function renderEntries(parent = '') {
    return entries.filter((entry) => entry.parent === parent).map((entry) => (
      <div key={entry.path}>
        <button className={`block w-full px-2 py-1 text-left text-[#b6c3ba] hover:bg-[#30413a] hover:text-white ${activeFile?.path === entry.path ? 'bg-[#30413a] text-white' : ''}`} onClick={() => entry.isDirectory ? toggleFolder(entry) : openFile(entry)}>
          <span className="mr-2 inline-block w-[22px] font-mono text-[10px] text-[#e59b62]">{entry.isDirectory ? (expanded.has(entry.path) ? 'v' : '>') : fileIcon(entry.name)}</span>{entry.name}
        </button>
        {entry.isDirectory && expanded.has(entry.path) && <div className="pl-3">{renderEntries(entry.path)}</div>}
      </div>
    ))
  }
  return <div className="h-screen overflow-hidden bg-[#1e1e1e] font-sans text-[13px] text-[#d7dfd9]">
    <Navbar variant="top" activeFileName={activeFile?.name} onOpenFile={openStandaloneFile} onOpenFolder={openWorkspaceFolder} onSearch={searchFromNavbar} />
    <div className="flex h-[calc(100vh-66px)]">
      <Navbar variant="sidebar" activePage={page} onNavigate={setPage} />
      <aside className="w-61.25 shrink-0 overflow-auto border-r border-[#303c37] bg-[#202a27] max-sm:w-[190px]">
        <div className="flex justify-between px-3.5 pb-2.5 pt-4 font-mono text-[11px] tracking-[0.1em] text-[#d7dfd9]">
          <span>{page === 'extensions' ? 'EXTENSIONS' : 'EXPLORER'}</span>
          <span>...</span>
        </div>
        <div className="px-3.5 pb-2.5 pt-3.5 font-mono text-[11px] tracking-[0.1em] text-[#e59b62]">{workspaceName}</div>
        <div className="px-2 pb-6">{renderEntries()}</div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto bg-[#1e1e1e]">
        <PageRouter page={page} setPage={setPage} activeFile={activeFile} code={activeFile?.code || initialCode} setCode={updateCode} openTabs={tabs} onSelectTab={selectTab} onCloseTab={closeTab} onOpenFile={openStandaloneFile} onOpenFolder={openWorkspaceFolder} searchQuery={searchQuery} extensions={extensions} onInstall={installExtension} onRefreshExtensions={refreshExtensions} terminal={terminal} command={command} setCommand={setCommand} onSubmit={runCommand} /></main>
    </div>
    <footer className="flex h-6 items-center gap-5 bg-[#e59b62] px-3 font-mono text-[11px] text-[#1e1e1e]">
      <span>main *</span>
      <span>UTF-8</span>
      <span>Fish shell</span>
      <span>LF</span>
      <span>Electron connected</span>
    </footer>
  </div>
}
function fileIcon(name: string) { if (name.endsWith('.js') || name.endsWith('.ts')) return 'JS'; if (name.endsWith('.json')) return '{}'; if (name.endsWith('.md')) return 'M'; return '.' }

export default App
