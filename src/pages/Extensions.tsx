import { useEffect, useState } from 'react'
import type { ExtensionInfo, MarketplaceExtension } from '../types/electron'

type ExtensionsProps = {
  extensions: ExtensionInfo[]
  iconTheme: string
  onInstall: () => Promise<void> | void
  onRefreshExtensions?: () => Promise<void> | void
  onSelectIconTheme: (themeId: string) => Promise<void> | void
}

export default function Extensions({ extensions, iconTheme, onInstall, onRefreshExtensions, onSelectIconTheme }: ExtensionsProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketplaceExtension[]>([])
  const [searching, setSearching] = useState(false)
  const [installingId, setInstallingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const text = query.trim()
      if (!text) {
        setResults([])
        return
      }

      const api = window.electronAPI
      if (!api) {
        setResults([])
        return
      }

      try {
        setSearching(true)
        const marketResults = await api.extensions.search(text)
        setResults(marketResults)
      } catch (error) {
        console.error(error)
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query])

  async function handleMarketplaceInstall(extension: MarketplaceExtension) {
    const api = window.electronAPI
    if (!api) return

    try {
      setInstallingId(`${extension.namespace}.${extension.name}`)
      await api.extensions.installMarketplace(extension)
      if (onRefreshExtensions) await onRefreshExtensions()
      setResults((current) => current.filter((item) => `${item.namespace}.${item.name}` !== `${extension.namespace}.${extension.name}`))
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Unable to install extension.')
    } finally {
      setInstallingId(null)
    }
  }

  return <section className="mx-auto max-w-6xl px-8 py-12 sm:px-16">
    <div className="flex flex-col justify-between gap-5 border-b border-[#303c37] pb-6 sm:flex-row sm:items-end">
      <div><p className="font-mono text-[11px] font-medium tracking-widest text-[#a6c9a8]">NORTHSTAR MARKETPLACE</p><h2 className="mt-3 text-3xl font-semibold text-[#f5f1e8]">Extensions</h2><p className="mt-2 text-sm text-[#aab8ae]">Language intelligence and interface tools from your vscode-main source tree.</p></div>
      <button className="border border-[#4aa3ff] px-4 py-2 text-sm text-[#4aa3ff] transition hover:bg-[#4aa3ff] hover:text-[#101820]" onClick={onInstall}>Install from VSIX <span className="ml-2">+</span></button>
    </div>

    <div className="mt-6 rounded border border-[#303c37] bg-[#202a27] p-4">
      <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-[#a6c9a8]">File icon theme</label>
      <select className="mb-4 w-full border border-[#3b4b47] bg-[#181d1b] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#4aa3ff]" value={iconTheme} onChange={(event) => onSelectIconTheme(event.target.value)}>
        <option value="default">Default icons</option>
        {extensions.flatMap((extension) => (extension.iconThemes || []).map((theme) => <option key={`${extension.id}-${theme.id}`} value={theme.id}>{theme.label}</option>))}
      </select>
      <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-[#a6c9a8]">Search Open VSX</label>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search extensions..." className="w-full border border-[#3b4b47] bg-[#181d1b] px-3 py-2 text-sm text-[#f5f1e8] outline-none placeholder:text-[#6f7a72] focus:border-[#4aa3ff]" />
    </div>

    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {searching && <div className="rounded border border-[#303c37] bg-[#202a27] p-4 text-sm text-[#aab8ae]">Searching marketplace...</div>}

      {!searching && results.length > 0 && results.map((extension) => {
        const extensionId = `${extension.namespace}.${extension.name}`
        const isInstalling = installingId === extensionId
        const downloadCount = extension.downloadCount || extension.statistics?.find((item) => item.statisticName.toLowerCase().includes('download'))?.value

        return <article className="flex gap-4 border border-[#303c37] bg-[#202a27] p-4" key={extensionId}>
          {extension.files?.icon ? <img className="h-10 w-10 shrink-0 object-contain" src={extension.files.icon} alt="" /> : <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#4aa3ff] font-mono text-xs font-medium text-[#101820]">{extension.displayName?.slice(0, 2)?.toUpperCase() || extension.name.slice(0, 2).toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium text-[#e6eee7]">{extension.displayName || extension.name}</h3>
                <small className="font-mono text-xs text-[#a6c9a8]">{extension.namespace}.{extension.name} · {extension.version}{downloadCount ? ` · ${downloadCount.toLocaleString()} downloads` : ''}</small>
              </div>
              <button className="shrink-0 border border-[#4aa3ff] px-3 py-1.5 text-xs text-[#4aa3ff] disabled:cursor-not-allowed disabled:opacity-60" disabled={isInstalling} onClick={() => handleMarketplaceInstall(extension)}>{isInstalling ? 'Installing...' : 'Install'}</button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#aab8ae]">{extension.description || 'No description available.'}</p>
          </div>
        </article>
      })}

      {!searching && query.trim() && results.length === 0 && <div className="rounded border border-[#303c37] bg-[#202a27] p-4 text-sm text-[#aab8ae]">No extensions found for “{query}”.</div>}
    </div>

    <div className="mt-8 border-t border-[#303c37] pt-6">
      <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[#a6c9a8]">Installed extensions</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {extensions.map((extension) =>
          <article className="flex gap-4 border border-[#303c37] bg-[#202a27] p-4" key={extension.id || `${extension.publisher}.${extension.name}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#4aa3ff] font-mono text-xs font-medium text-[#101820]">
              {extension.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-[#e6eee7]">{extension.name}</h3>
              <small className="mt-1 block font-mono text-xs text-[#a6c9a8]">{extension.publisher} · {extension.version} · {extension.enabled ? 'Enabled' : 'Disabled'}</small>
              <small className="mt-2 block truncate font-mono text-[10px] text-[#718078]" title={extension.location}>Location: {extension.location || 'Installed extension'}</small>
              {extension.iconThemes?.map((theme) => <small className="mt-2 block text-xs text-[#82c0ff]" key={theme.id}>Icon theme: {theme.label}</small>)}
              <p className="mt-2 text-sm leading-relaxed text-[#aab8ae]">{extension.description}</p>
            </div>
          </article>)}
      </div>
    </div>
  </section>
}
