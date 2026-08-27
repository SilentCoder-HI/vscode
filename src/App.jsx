import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import './App.css'

const initialCode = '// Select a file from the Explorer to begin\n'
const navItems = [['welcome', 'Welcome'], ['explorer', 'Explorer'], ['search', 'Search'], ['run', 'Run and Debug'], ['extensions', 'Extensions']]

function App() {
  const [page, setPage] = useState('welcome')
  const [entries, setEntries] = useState([])
  const [expanded, setExpanded] = useState(new Set())
  const [activeFile, setActiveFile] = useState(null)
  const [code, setCode] = useState(initialCode)
  const [extensions, setExtensions] = useState([])
  const [terminal, setTerminal] = useState('Northstar terminal\nFish shell · vscode-main\n')
  const [command, setCommand] = useState('pwd')

  useEffect(() => {
    window.electronAPI.workspace.list('').then(setEntries)
    window.electronAPI.extensions.list().then(setExtensions)
  }, [])

  async function toggleFolder(entry) {
    const nextExpanded = new Set(expanded)
    if (nextExpanded.has(entry.path)) nextExpanded.delete(entry.path)
    else nextExpanded.add(entry.path)
    setExpanded(nextExpanded)
    if (!nextExpanded.has(entry.path)) return
    const children = await window.electronAPI.workspace.list(entry.path)
    setEntries((current) => [...current.filter((item) => item.parent !== entry.path), ...children.map((item) => ({ ...item, parent: entry.path }))])
  }

  async function openFile(entry) {
    setActiveFile(entry)
    setCode(await window.electronAPI.workspace.read(entry.path))
    setPage('editor')
  }

  async function runCommand(event) {
    event.preventDefault()
    const result = await window.electronAPI.terminal.run(command)
    setTerminal((current) => `${current}\n$ ${command}\n${result.output || '(no output)'}\n`)
    setPage('terminal')
  }

  async function installExtension() {
    const result = await window.electronAPI.extensions.install()
    if (!result.canceled) setExtensions((current) => [...current, result.extension])
  }

  function renderEntries(parent) {
    return entries.filter((entry) => entry.parent === parent).map((entry) => (
      <div key={entry.path}>
        <button className={`tree-row ${activeFile?.path === entry.path ? 'selected' : ''}`} onClick={() => entry.isDirectory ? toggleFolder(entry) : openFile(entry)}>
          <span className="tree-icon">{entry.isDirectory ? (expanded.has(entry.path) ? 'v' : '>') : fileIcon(entry.name)}</span>{entry.name}
        </button>
        {entry.isDirectory && expanded.has(entry.path) && <div className="tree-children">{renderEntries(entry.path)}</div>}
      </div>
    ))
  }

  function content() {
    if (page === 'welcome') return <Welcome onOpen={() => setPage('explorer')} onExtensions={() => setPage('extensions')} />
    if (page === 'extensions') return <Extensions extensions={extensions} onInstall={installExtension} />
    if (page === 'search') return <Search />
    if (page === 'run') return <Run />
    if (page === 'terminal') return <Terminal terminal={terminal} command={command} setCommand={setCommand} onSubmit={runCommand} />
    return <section className="editor-view"><div className="tab">{activeFile?.name || 'welcome.js'} <span>x</span></div><Editor height="calc(100vh - 122px)" language={languageFor(activeFile?.name)} theme="vs-dark" value={code} onChange={(value) => setCode(value || '')} options={{ minimap: { enabled: true }, fontSize: 14, padding: { top: 18 } }} /></section>
  }

  return <div className="ide-shell">
    <header className="titlebar"><span className="product-mark">N</span><span className="brand">NORTHSTAR</span><span className="window-title">{activeFile?.name || 'Welcome'}</span><span className="platform">LINUX · FISH · ELECTRON</span></header>
    <div className="workbench">
      <nav className="activitybar">{navItems.map(([id, label]) => <button key={id} title={label} className={`activity ${page === id || (id === 'explorer' && page === 'editor') ? 'active' : ''}`} onClick={() => setPage(id)}>{id === 'extensions' ? 'EX' : id.slice(0, 2).toUpperCase()}</button>)}</nav>
      <aside className="explorer"><div className="panel-heading">{page === 'extensions' ? 'EXTENSIONS' : 'EXPLORER'} <span>...</span></div><div className="workspace-name">VSCODE-MAIN</div><div className="tree">{renderEntries()}</div></aside>
      <main className="main-view">{content()}</main>
    </div>
    <footer><span>main *</span><span>UTF-8</span><span>Fish shell</span><span>Electron connected</span></footer>
  </div>
}

function Welcome({ onOpen, onExtensions }) { return <section className="welcome"><p className="eyebrow">NORTHSTAR WORKBENCH / 01</p><h1>Code without<br /><em>compromise.</em></h1><p className="welcome-copy">A focused desktop workspace built from React, Monaco, and Electron. Your source, extensions, and tools in one quiet place.</p><div className="welcome-actions"><button onClick={onOpen}>Open workspace <span>{'->'}</span></button><button className="secondary" onClick={onExtensions}>Browse extensions</button></div><div className="quick-grid"><div><strong>01</strong><span>Open a file</span></div><div><strong>02</strong><span>Run Fish commands</span></div><div><strong>03</strong><span>Install VSIX tools</span></div></div></section> }
function Extensions({ extensions, onInstall }) { return <section className="page"><div className="page-header"><div><p className="eyebrow">NORTHSTAR MARKETPLACE</p><h2>Extensions</h2><p>Language intelligence and interface tools from your vscode-main source tree.</p></div><button onClick={onInstall}>Install from VSIX <span>+</span></button></div><div className="extension-grid">{extensions.slice(0, 30).map((extension) => <article className="extension" key={extension.id}><div className="extension-icon">{extension.name.slice(0, 2).toUpperCase()}</div><div><h3>{extension.name}</h3><small>{extension.publisher} · {extension.version}</small><p>{extension.description}</p></div></article>)}</div></section> }
function Search() { return <section className="page empty-page"><p className="eyebrow">SEARCH EDITORIAL</p><h2>Find in workspace</h2><input autoFocus placeholder="Search files, symbols, and text" /><p>Search is ready for the next layer of your workflow.</p></section> }
function Run() { return <section className="page empty-page"><p className="eyebrow">RUN AND DEBUG</p><h2>Launch configuration</h2><p>Choose a workspace entry point to configure your first debug session.</p><button>Open launch.json <span>{'->'}</span></button></section> }
function Terminal({ terminal, command, setCommand, onSubmit }) { return <section className="terminal-page"><div className="terminal-heading"><span>TERMINAL</span><span>FISH · VSCODE-MAIN</span></div><pre>{terminal}</pre><form onSubmit={onSubmit}><span>❯</span><input value={command} onChange={(event) => setCommand(event.target.value)} aria-label="Fish command" /></form></section> }
function fileIcon(name) { if (name.endsWith('.js') || name.endsWith('.ts')) return 'JS'; if (name.endsWith('.json')) return '{}'; if (name.endsWith('.md')) return 'M'; return '.' }
function languageFor(name = '') { if (name.endsWith('.json')) return 'json'; if (name.endsWith('.ts')) return 'typescript'; if (name.endsWith('.css')) return 'css'; if (name.endsWith('.md')) return 'markdown'; return 'javascript' }

export default App
