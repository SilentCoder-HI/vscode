import { useEffect, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import PageRouter from './pages/PageRouter'
import type { ElectronAPI, ExtensionInfo } from './types/electron'
import Navbar from './components/navbar'


const initialCode = '// Select a file from the Explorer to begin\n'
type Entry = {
  name: string
  path: string
  isDirectory: boolean
  parent?: string
  icon?: string
}

type OpenTab = Entry & { code: string }
type ContextMenuState = { x: number; y: number; entry: Entry | null }
type NewEntryState = { parent: string; isDirectory: boolean }

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
  const [iconTheme, setIconTheme] = useState('default')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [newEntry, setNewEntry] = useState<NewEntryState | null>(null)
  const [newEntryName, setNewEntryName] = useState('')



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
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    void api.workspace.restore().then(async (result) => {
      if (!result.restored) return
      setWorkspaceName(result.name || 'WORKSPACE')
      setIconTheme(result.iconTheme || 'default')
      setEntries(result.entries || [])
      setExpanded(new Set())
      setPage('explorer')
      await refreshExtensions()
    })
  }, [])

  useEffect(() => {
    if (page === 'extensions') void refreshExtensions()
  }, [page])

  useEffect(() => {
    async function saveActiveFile(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's' || !activeFile) return
      event.preventDefault()
      const api = window.electronAPI as ElectronAPI | undefined
      if (!api) return
      try {
        await api.workspace.write(activeFile.path, activeFile.code)
      } catch (error) {
        console.error('Failed to save file', error)
      }
    }

    window.addEventListener('keydown', saveActiveFile)
    return () => window.removeEventListener('keydown', saveActiveFile)
  }, [activeFile])

  async function toggleFolder(entry: Entry) {
    const nextExpanded = new Set(expanded)
    if (nextExpanded.has(entry.path)) nextExpanded.delete(entry.path)
    else nextExpanded.add(entry.path)
    setExpanded(nextExpanded)
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
    let result
    try {
      result = await api.workspace.openFolder()
    } catch (error) {
      console.error('Failed to open workspace folder', error)
      window.alert(error instanceof Error ? error.message : 'Unable to open workspace folder.')
      return
    }
    if (result.canceled) return
    setWorkspaceName(result.name || 'WORKSPACE')
    setIconTheme(result.iconTheme || 'default')
    setEntries(result.entries || [])
    setExpanded(new Set())
    setPage('explorer')
    await refreshExtensions()
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

  async function selectIconTheme(themeId: string) {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    setEntries(await api.workspace.setIconTheme(themeId))
    setIconTheme(themeId)
  }

  function refreshTree(nextEntries: Entry[]) {
    setEntries(nextEntries)
    setContextMenu(null)
  }

  function targetDirectory(entry: Entry | null) {
    if (!entry || entry.isDirectory) return entry?.path || ''
    const separator = entry.path.lastIndexOf('/')
    return separator === -1 ? '' : entry.path.slice(0, separator)
  }

  function startCreate(isDirectory: boolean) {
    const parent = targetDirectory(contextMenu?.entry || null)
    setExpanded((current) => new Set(current).add(parent))
    setNewEntry({ parent, isDirectory })
    setNewEntryName('')
    setContextMenu(null)
  }

  async function submitCreate(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || !newEntryName.trim() || !newEntry) return
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    const parent = newEntry.parent
    try {
      const nextEntries = await api.workspace.create(parent, newEntryName.trim(), newEntry.isDirectory)
      refreshTree(nextEntries)
      setExpanded((current) => new Set(current).add(parent))
      setNewEntry(null)
      setNewEntryName('')
    } catch (error) {
      console.error(error)
    }
  }

  async function copyPath() {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api || !contextMenu?.entry) return
    await api.workspace.copyPath(contextMenu.entry.path)
    setContextMenu(null)
  }

  async function pasteEntry() {
    const api = window.electronAPI as ElectronAPI | undefined
    if (!api) return
    try {
      refreshTree(await api.workspace.paste(targetDirectory(contextMenu?.entry || null)))
    } catch (error) {
      console.error(error)
    }
  }

  async function deleteEntry() {
    const api = window.electronAPI as ElectronAPI | undefined
    const entry = contextMenu?.entry
    if (!api || !entry || !window.confirm(`Delete ${entry.name}?`)) return
    try {
      refreshTree(await api.workspace.delete(entry.path))
    } catch (error) {
      console.error(error)
    }
  }

  function renderEntries(parent = '') {
    const children = entries.filter((entry) => entry.parent === parent)
    return <>{newEntry?.parent === parent && <input autoFocus className="my-1 w-full border border-[#4aa3ff] bg-[#181d1b] px-2 py-1 text-[#e6eee7] outline-none" value={newEntryName} onChange={(event) => setNewEntryName(event.target.value)} onKeyDown={submitCreate} onBlur={() => setNewEntry(null)} placeholder={newEntry.isDirectory ? 'Folder name' : 'File name.ext'} />}{children.map((entry) => (
      <div key={entry.path}>
        <button className={`block w-full px-2 py-1 text-left text-[#b6c3ba] hover:bg-[#30413a] hover:text-white ${activeFile?.path === entry.path ? 'bg-[#30413a] text-white' : ''}`} onClick={() => entry.isDirectory ? toggleFolder(entry) : openFile(entry)} onContextMenu={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, entry }) }}>
          {entry.icon?.startsWith('data:image/') && <img className="mr-2 inline-block h-4 w-4 object-contain" src={entry.icon} alt="" />}{entry.name}
        </button>
        {entry.isDirectory && expanded.has(entry.path) && <div className="pl-3">{renderEntries(entry.path)}</div>}
      </div>
    ))}</>
  }
  return <div className="h-screen overflow-hidden bg-[#1e1e1e] font-sans text-[13px] text-[#d7dfd9]" onClick={() => setContextMenu(null)}>
    <Navbar variant="top" onOpenFile={openStandaloneFile} onOpenFolder={openWorkspaceFolder} onSearch={searchFromNavbar} />
    <div className="flex h-[calc(100vh-66px)]">
      <Navbar variant="sidebar" activePage={page} onNavigate={setPage} />
      <aside className="w-61.25 shrink-0 overflow-auto border-r border-[#303c37] bg-[#202a27] max-sm:w-47.5">
        <div className="flex justify-between px-3.5 pb-2.5 pt-4 font-mono text-[11px] tracking-widest text-[#d7dfd9]">
          <span>{page === 'extensions' ? 'EXTENSIONS' : 'EXPLORER'}</span>
          <span>...</span>
        </div>
        <div className="truncate px-3.5 pb-2.5 pt-3.5 font-mono text-[11px] tracking-widest text-[#4aa3ff]" title={workspaceName} onContextMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, entry: null }) }}>{workspaceName}</div>
        <div className="px-2 pb-6">{renderEntries()}</div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto bg-[#1e1e1e]">
        <PageRouter page={page} setPage={setPage} activeFile={activeFile} code={activeFile?.code || initialCode} setCode={updateCode} openTabs={tabs} onSelectTab={selectTab} onCloseTab={closeTab} onOpenFile={openStandaloneFile} onOpenFolder={openWorkspaceFolder} searchQuery={searchQuery} extensions={extensions} iconTheme={iconTheme} onInstall={installExtension} onRefreshExtensions={refreshExtensions} onSelectIconTheme={selectIconTheme} terminal={terminal} command={command} setCommand={setCommand} onSubmit={runCommand} /></main>
    </div>
    {contextMenu && <div className="fixed z-50 min-w-44 border border-[#3b4b47] bg-[#202a27] py-1 text-[#d7dfd9] shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
      <button className="block w-full px-3 py-2 text-left text-xs hover:bg-[#30413a]" onClick={() => startCreate(false)}>New File</button>
      <button className="block w-full px-3 py-2 text-left text-xs hover:bg-[#30413a]" onClick={() => startCreate(true)}>New Folder</button>
      <button className="block w-full px-3 py-2 text-left text-xs hover:bg-[#30413a] disabled:opacity-40" disabled={!contextMenu.entry} onClick={copyPath}>Copy Path</button>
      <button className="block w-full px-3 py-2 text-left text-xs hover:bg-[#30413a]" onClick={pasteEntry}>Paste</button>
      <button className="block w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-[#30413a] disabled:opacity-40" disabled={!contextMenu.entry} onClick={deleteEntry}>Delete</button>
    </div>}
    <footer className="flex h-6 items-center gap-5 bg-[#4aa3ff] px-3 font-mono text-[11px] text-[#101820]">
      <span>main *</span>
      <span>UTF-8</span>
      <span>Fish shell</span>
      <span>Electron connected</span>
    </footer>
  </div>
}

export default App
