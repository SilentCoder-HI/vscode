type WelcomeProps = {
  onOpen: () => void
  onExtensions: () => void
}

export default function Welcome({ onOpen, onExtensions }: WelcomeProps) {
  return <section className="mx-auto max-w-5xl px-8 py-[9vh] sm:px-16">
    <p className="font-mono text-[11px] font-medium tracking-[0.1em] text-[#a6c9a8]">NORTHSTAR WORKBENCH / 01</p>
    <h1 className="mt-8 text-5xl font-semibold leading-[0.95] text-[#f5f1e8] sm:text-7xl lg:text-[6.5rem]">Code without<br /><em className="not-italic text-[#e59b62]">compromise.</em></h1>
    <p className="mt-5 max-w-[450px] text-base leading-relaxed text-[#aab8ae]">A focused desktop workspace built from React, Monaco, and Electron. Your source, extensions, and tools in one quiet place.</p>
    <div className="mt-8 flex flex-wrap gap-3">
      <button className="border border-[#e59b62] bg-[#e59b62] px-5 py-3 text-sm font-medium text-[#1e1e1e] transition hover:bg-[#f1b07b]" onClick={onOpen}>Open workspace <span className="ml-2">{'->'}</span></button>
      <button className="border border-[#4b5b52] px-5 py-3 text-sm text-[#d7dfd9] transition hover:border-[#e59b62] hover:text-[#f1b07b]" onClick={onExtensions}>Browse extensions</button>
    </div>
    <div className="mt-16 grid max-w-2xl grid-cols-1 border-t border-[#303c37] sm:grid-cols-3">
      {['Open a file', 'Run Fish commands', 'Install VSIX tools'].map((label, index) => <div className="border-b border-[#303c37] py-4 sm:border-r sm:px-4 first:sm:pl-0 last:sm:border-r-0" key={label}><strong className="block font-mono text-xs text-[#e59b62]">0{index + 1}</strong><span className="mt-2 block text-sm text-[#aab8ae]">{label}</span></div>)}
    </div>
  </section>
}
