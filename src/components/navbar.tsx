import { Blocks, Files, House, Play, Search, Settings } from 'lucide-react'
import { useState } from 'react'

type NavbarPage = 'welcome' | 'explorer' | 'search' | 'run' | 'extensions' | 'settings'

type NavbarProps = {
  variant: 'top' | 'sidebar'
  activePage?: string
  onNavigate?: (page: NavbarPage) => void
  onOpenFile?: () => void
  onOpenFolder?: () => void
  onSearch?: (query: string) => void
}

const items: Array<{ id: NavbarPage; label: string; icon: typeof House }> = [
  { id: 'welcome', label: 'Welcome', icon: House },
  { id: 'explorer', label: 'Explorer', icon: Files },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'run', label: 'Run and Debug', icon: Play },
  { id: 'extensions', label: 'Extensions', icon: Blocks },
]

export default function Navbar({ variant, activePage, onNavigate, onOpenFile, onOpenFolder, onSearch }: NavbarProps) {
  if (variant === 'top') {
    return <TopNavbar onNavigate={onNavigate} onOpenFile={onOpenFile} onOpenFolder={onOpenFolder} onSearch={onSearch} />
  }

  return <nav className="flex w-14.5 shrink-0 flex-col items-center gap-2 border-r border-[#303c37] bg-[#18201e] pt-3 max-sm:w-[46px]">
    <div className="flex flex-col items-center gap-2">
    {items.map(({ id, label, icon: Icon }) => {
      const isActive = activePage === id || (id === 'explorer' && activePage === 'editor')
      return <button key={id} title={label} aria-label={label} className={`grid w-11 place-items-center border-l-2 border-transparent bg-transparent py-3 text-[#718078] hover:border-[#4aa3ff] hover:bg-[#26322e] hover:text-[#82c0ff] ${isActive ? 'border-[#4aa3ff] bg-[#26322e] text-[#82c0ff]' : ''}`} onClick={() => onNavigate?.(id)}>
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </button>
    })}
    </div>
    <button title="Settings" aria-label="Settings" className={`mt-auto mb-2 grid w-11 place-items-center border-l-2 border-transparent bg-transparent py-3 text-[#718078] hover:border-[#4aa3ff] hover:bg-[#26322e] hover:text-[#82c0ff] ${activePage === 'settings' ? 'border-[#4aa3ff] bg-[#26322e] text-[#82c0ff]' : ''}`} onClick={() => onNavigate?.('settings')}>
      <Settings className="h-5 w-5" strokeWidth={1.6} />
    </button>
  </nav>
}

const menus = [
  { label: 'File', actions: [{ label: 'Open File...', run: (onOpenFile?: () => void) => onOpenFile?.() }, { label: 'Open Folder...', run: (_onOpenFile?: () => void, onOpenFolder?: () => void) => onOpenFolder?.() }] },
  { label: 'View', actions: [{ label: 'Explorer', page: 'explorer' as NavbarPage }, { label: 'Search', page: 'search' as NavbarPage }, { label: 'Extensions', page: 'extensions' as NavbarPage }] },
  { label: 'Go', actions: [{ label: 'Welcome', page: 'welcome' as NavbarPage }, { label: 'Run and Debug', page: 'run' as NavbarPage }] },
]

function TopNavbar({ onNavigate, onOpenFile, onOpenFolder, onSearch }: Pick<NavbarProps, 'onNavigate' | 'onOpenFile' | 'onOpenFolder' | 'onSearch'>) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch?.(query.trim())
  }

      return <header className="relative flex h-10.5 items-center gap-3 border-b border-[#303c37] bg-[#181d1b] px-4 font-mono text-[11px] text-[#9dad9f]">
        <span className="font-sans text-lg font-semibold text-[#4aa3ff]">N</span>
        <span className="font-medium text-[#4aa3ff]">CodeMind</span>
        <div className="flex items-center gap-1 max-md:hidden">{menus.map((menu) => <div className="relative" key={menu.label} onMouseEnter={() => setOpenMenu(menu.label)} onMouseLeave={() => setOpenMenu(null)}><button className="flex items-center gap-1 px-2 py-1.5 hover:bg-[#26322e] hover:text-[#4aa3ff]" onFocus={() => setOpenMenu(menu.label)}>{menu.label}</button>{openMenu === menu.label && <div className="absolute left-0 top-full z-20 min-w-44 border border-[#3b4b47] bg-[#202a27] py-1 shadow-xl">{menu.actions.map((action) => <button className="block w-full px-3 py-2 text-left text-xs text-[#d7dfd9] hover:bg-[#30413a] hover:text-[#4aa3ff]" key={action.label} onClick={() => { if ('run' in action) action.run(onOpenFile, onOpenFolder); else if (action.page) onNavigate?.(action.page); setOpenMenu(null) }}>{action.label}</button>)}</div>}</div>)}</div>
      <form className="mx-auto flex w-full max-w-md items-center border border-[#3b4b47] bg-[#202a27] px-2 focus-within:border-[#4aa3ff]" onSubmit={submitSearch}><Search className="h-3.5 w-3.5 text-[#8ecbff]" /><input className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs text-[#e6eee7] outline-none placeholder:text-[#728178]" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files, commands, extensions..." aria-label="Search files, commands, and extensions" /></form>
    </header>
}