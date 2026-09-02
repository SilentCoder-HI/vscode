import Editor from '@monaco-editor/react'
import Extensions from './Extensions'
import Welcome from './Welcome'
import { RunPage, SearchPage, TerminalPage } from './UtilityPages'

export default function PageRouter({ page, setPage, activeFile, code, setCode, extensions, onInstall, onRefreshExtensions, terminal, command, setCommand, onSubmit }) {
  if (page === 'welcome') return <Welcome onOpen={() => setPage('explorer')} onExtensions={() => setPage('extensions')} />
  if (page === 'extensions') return <Extensions extensions={extensions} onInstall={onInstall} onRefreshExtensions={onRefreshExtensions} />
  if (page === 'search') return <SearchPage />
  if (page === 'run') return <RunPage />
  if (page === 'terminal') return <TerminalPage terminal={terminal} command={command} setCommand={setCommand} onSubmit={onSubmit} />
  return <section className="h-full"><div className="h-[38px] border-b border-[#3a4540] bg-[#252b29] px-4 py-3 font-mono text-xs text-[#e6eee7]">{activeFile?.name || 'welcome.js'} <span className="float-right text-[#8f9c93]">x</span></div><Editor height="calc(100vh - 122px)" language={languageFor(activeFile?.name)} theme="vs-dark" value={code} onChange={(value) => setCode(value || '')} options={{ minimap: { enabled: true }, fontSize: 14, padding: { top: 18 } }} /></section>
}

function languageFor(name = '') { if (name.endsWith('.json')) return 'json'; if (name.endsWith('.ts')) return 'typescript'; if (name.endsWith('.css')) return 'css'; if (name.endsWith('.md')) return 'markdown'; return 'javascript' }
