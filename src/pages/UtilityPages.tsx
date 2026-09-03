type TerminalPageProps = {
  terminal: string
  command: string
  setCommand: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
}

export function SearchPage({ initialQuery = '' }: { initialQuery?: string }) {
  return <section className="mx-auto max-w-5xl px-8 py-12 sm:px-16"><p className="font-mono text-[11px] tracking-[0.1em] text-[#a6c9a8]">SEARCH EDITORIAL</p><h2 className="mt-3 text-3xl font-semibold text-[#f5f1e8]">Find in workspace</h2><input className="mt-8 w-full max-w-xl border-b border-[#4b5b52] bg-transparent px-0 py-3 text-[#e6eee7] outline-none placeholder:text-[#728178] focus:border-[#e59b62]" autoFocus defaultValue={initialQuery} placeholder="Search files, symbols, and text" /><p className="mt-5 text-sm text-[#aab8ae]">Search is ready for the next layer of your workflow.</p></section>
}

export function RunPage() {
  return <section className="mx-auto max-w-5xl px-8 py-12 sm:px-16"><p className="font-mono text-[11px] tracking-[0.1em] text-[#a6c9a8]">RUN AND DEBUG</p><h2 className="mt-3 text-3xl font-semibold text-[#f5f1e8]">Launch configuration</h2><p className="mt-3 text-sm text-[#aab8ae]">Choose a workspace entry point to configure your first debug session.</p><button className="mt-8 border border-[#e59b62] px-4 py-2 text-sm text-[#e59b62] transition hover:bg-[#e59b62] hover:text-[#1e1e1e]">Open launch.json <span className="ml-2">{'->'}</span></button></section>
}

export function TerminalPage({ terminal, command, setCommand, onSubmit }: TerminalPageProps) {
  return <section className="h-full bg-[#171b1a] p-6 font-mono text-sm"><div className="flex justify-between border-b border-[#303c37] pb-4 text-[11px] tracking-[0.1em] text-[#a6c9a8]"><span>TERMINAL</span><span>FISH · VSCODE-MAIN</span></div><pre className="whitespace-pre-wrap py-6 text-[#d7dfd9]">{terminal}</pre><form className="flex items-center gap-3 border-t border-[#303c37] pt-4" onSubmit={onSubmit}><span className="text-[#e59b62]">❯</span><input className="min-w-0 flex-1 bg-transparent text-[#e6eee7] outline-none" value={command} onChange={(event) => setCommand(event.target.value)} aria-label="Fish command" /></form></section>
}
