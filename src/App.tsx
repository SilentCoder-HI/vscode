import { useEffect, useState } from 'react'
import PageRouter from './pages/PageRouter'
import type { ElectronAPI, ExtensionInfo } from './types/electron'

const initialCode = '// Select a file from the Explorer to begin\n'
const navItems = [['welcome', 'Welcome'], ['explorer', 'Explorer'], ['search', 'Search'], ['run', 'Run and Debug'], ['extensions', 'Extensions']] as const

type Entry = {
  name: string
  path: string
  isDirectory: boolean
  parent?: string
}

function App() {
  const [page, setPage] = useState<string>('welcome')
  const [entries, setEntries] = useState<Entry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeFile, setActiveFile] = useState<Entry | null>(null)
  const [code, setCode] = useState(initialCode)
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
      const list = await api.workspace.list('')
      setEntries(list)
      setExtensions(await api.extensions.list())
    })()
  }, [])

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
    setActiveFile(entry)
    setCode(await api.workspace.read(entry.path))
    setPage('editor')
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
    <header className="flex h-10.5 items-center gap-2.5 border-b border-[#303c37] bg-[#181d1b] px-4 font-mono text-[11px] tracking-[0.08em] text-[#9dad9f]"><span className="font-sans text-lg font-semibold text-[#e59b62]">N</span><span className="font-medium text-[#e59b62]">CodeMind</span><span className="absolute left-1/2 -translate-x-1/2 tracking-normal text-[#e4ebe5]">{activeFile?.name || 'Welcome'}</span><span className="ml-auto text-[#728178] max-sm:hidden">LINUX · FISH · ELECTRON</span></header>
    <div className="flex h-[calc(100vh-66px)]">
      <nav className="flex w-14.5 shrink-0 flex-col items-center gap-2 border-r border-[#303c37] bg-[#18201e] pt-3 max-sm:w-[46px]">{navItems.map(([id, label]) => <button key={id} title={label} className={`w-11 border-l-2 border-transparent bg-transparent py-3 font-mono text-[10px] text-[#718078] hover:border-[#e59b62] hover:bg-[#26322e] hover:text-[#f1b07b] ${page === id || (id === 'explorer' && page === 'editor') ? 'border-[#e59b62] bg-[#26322e] text-[#f1b07b]' : ''}`} onClick={() => setPage(id)}>{id === 'extensions' ? 'EX' : id.slice(0, 2).toUpperCase()}</button>)}</nav>
      <aside className="w-61.25 shrink-0 overflow-auto border-r border-[#303c37] bg-[#202a27] max-sm:w-[190px]"><div className="flex justify-between px-3.5 pb-2.5 pt-4 font-mono text-[11px] tracking-[0.1em] text-[#d7dfd9]"><span>{page === 'extensions' ? 'EXTENSIONS' : 'EXPLORER'}</span><span>...</span></div><div className="px-3.5 pb-2.5 pt-3.5 font-mono text-[11px] tracking-[0.1em] text-[#e59b62]">VSCODE-MAIN</div><div className="px-2 pb-6">{renderEntries()}</div></aside>
      <main className="min-w-0 flex-1 overflow-auto bg-[#1e1e1e]">
        <PageRouter page={page} setPage={setPage} activeFile={activeFile} code={code} setCode={setCode} extensions={extensions} onInstall={installExtension} onRefreshExtensions={refreshExtensions} terminal={terminal} command={command} setCommand={setCommand} onSubmit={runCommand} /></main>
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
