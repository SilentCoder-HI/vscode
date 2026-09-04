import type { ExtensionInfo } from '../types/electron'

type SettingsProps = {
  extensions: ExtensionInfo[]
  iconTheme: string
  onSelectIconTheme: (themeId: string) => Promise<void> | void
}

export default function Settings({ extensions, iconTheme, onSelectIconTheme }: SettingsProps) {
  const iconThemes = extensions.flatMap((extension) => (extension.iconThemes || []).map((theme) => ({
    ...theme,
    extensionName: extension.name,
  })))

  return <section className="mx-auto max-w-4xl px-8 py-12 sm:px-16">
    <p className="font-mono text-[11px] tracking-widest text-[#a6c9a8]">WORKBENCH SETTINGS</p>
    <h2 className="mt-3 text-3xl font-semibold text-[#f5f1e8]">Settings</h2>
    <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#aab8ae]">Choose how files and folders appear in this workspace.</p>

    <div className="mt-8 border border-[#303c37] bg-[#202a27] p-5">
      <label className="block font-mono text-[11px] uppercase tracking-widest text-[#a6c9a8]">File icon theme</label>
      <select className="mt-3 w-full border border-[#3b4b47] bg-[#181d1b] px-3 py-2 text-sm text-[#f5f1e8] outline-none focus:border-[#4aa3ff]" value={iconTheme} onChange={(event) => onSelectIconTheme(event.target.value)}>
        <option value="default">Default icons</option>
        {iconThemes.map((theme) => <option key={`${theme.extensionName}-${theme.id}`} value={theme.id}>{theme.label} · {theme.extensionName}</option>)}
      </select>
      <p className="mt-3 text-xs text-[#718078]">The selection is saved in this workspace&apos;s .codemind folder.</p>
    </div>

    <div className="mt-5 border border-[#303c37] bg-[#202a27] p-5">
      <h3 className="font-medium text-[#e6eee7]">Installed workspace extensions</h3>
      <p className="mt-2 text-sm text-[#aab8ae]">{extensions.length} extension{extensions.length === 1 ? '' : 's'} installed for this workspace.</p>
    </div>
  </section>
}
