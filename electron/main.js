import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron'
import { exec } from 'node:child_process'
import { dirname, join, resolve, sep } from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const builtInExtensionsRoot = resolve(__dirname, '../vscode-main/extensions')
let workspaceRoot = null
let iconTheme = null
let selectedIconTheme = 'default'

function recentWorkspacePath() {
  return join(app.getPath('userData'), 'last-workspace.json')
}

async function saveWorkspaceState() {
  if (!workspaceRoot) return
  await fs.mkdir(codeMindRoot(), { recursive: true })
  await fs.writeFile(join(codeMindRoot(), 'workspace.json'), JSON.stringify({ workspaceRoot, iconTheme: selectedIconTheme }, null, 2))
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(recentWorkspacePath(), JSON.stringify({ workspaceRoot }, null, 2))
}

async function setWorkspaceRoot(selectedPath) {
  const resolvedPath = resolve(selectedPath)
  workspaceRoot = resolvedPath.endsWith(`${sep}.codemind`) ? dirname(resolvedPath) : resolvedPath
  selectedIconTheme = 'default'
  iconTheme = null
  try {
    const state = JSON.parse(await fs.readFile(join(codeMindRoot(), 'workspace.json'), 'utf8'))
    selectedIconTheme = state.iconTheme || 'default'
  } catch { }
  await fs.mkdir(userExtensionsRoot(), { recursive: true })
  await saveWorkspaceState()
}

function codeMindRoot() {
  return workspaceRoot ? join(workspaceRoot, '.codemind') : join(app.getPath('home'), '.codemind')
}

function userExtensionsRoot() {
  return join(codeMindRoot(), 'extensions')
}

function extensionRegistryPath() {
  return join(codeMindRoot(), 'extensions.json')
}

function workspacePath(relativePath = '') {
  if (!workspaceRoot) throw new Error('Open a workspace first')
  const target = resolve(workspaceRoot, relativePath)
  if (target !== workspaceRoot && !target.startsWith(`${workspaceRoot}/`)) {
    throw new Error('Path is outside the workspace')
  }
  return target
}

async function loadIconTheme() {
  if (iconTheme) return iconTheme
  const manifests = [...await readExtensionManifests(builtInExtensionsRoot), ...await readExtensionManifests(userExtensionsRoot())]
  for (const extension of manifests) {
    const contribution = extension.manifest?.contributes?.iconThemes?.find((item) => item.id === selectedIconTheme)
    if (!contribution || !extension.path) continue
    try {
      const themePath = resolve(extension.extensionRoot, contribution.path)
      const theme = JSON.parse(await fs.readFile(themePath, 'utf8'))
      const icons = {}
      for (const [id, definition] of Object.entries(theme.iconDefinitions || {})) {
        if (!definition?.iconPath) continue
        const assetPath = resolve(dirname(themePath), definition.iconPath)
        if (!assetPath.startsWith(`${resolve(extension.extensionRoot)}${sep}`)) continue
        const svg = await fs.readFile(assetPath, 'utf8')
        icons[id] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
      }
      iconTheme = { theme, icons }
      return iconTheme
    } catch { continue }
  }
  return null
}

async function getFileIcon(fileName, isDirectory) {
  const fallback = ''
  const loadedTheme = await loadIconTheme()
  if (!loadedTheme) return fallback
  const { theme, icons } = loadedTheme
  let iconId
  if (isDirectory) iconId = theme.folderNames?.[fileName] || theme.folder
  else {
    iconId = theme.fileNames?.[fileName] || theme.fileNames?.[fileName.toLowerCase()]
    if (!iconId) {
      const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
      iconId = theme.fileExtensions?.[extension]
    }
    iconId ||= theme.file
  }
  return icons[iconId] || fallback
}

async function getFileIconSafely(fileName, isDirectory) {
  try {
    return await getFileIcon(fileName, isDirectory)
  } catch (error) {
    console.error(`Failed to resolve icon for ${fileName}:`, error)
    return ''
  }
}

ipcMain.handle('workspace:openFolder', async () => {
  const selection = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
  if (selection.canceled || !selection.filePaths[0]) return { canceled: true }
  await setWorkspaceRoot(selection.filePaths[0])
  return { canceled: false, name: workspaceRoot.split(sep).pop(), path: workspaceRoot, iconTheme: selectedIconTheme, entries: await listWorkspaceEntries() }
})

ipcMain.handle('workspace:restore', async () => {
  try {
    const saved = JSON.parse(await fs.readFile(recentWorkspacePath(), 'utf8'))
    await fs.access(saved.workspaceRoot)
    await setWorkspaceRoot(saved.workspaceRoot)
    return { restored: true, name: workspaceRoot.split(sep).pop(), path: workspaceRoot, iconTheme: selectedIconTheme, entries: await listWorkspaceEntries() }
  } catch {
    return { restored: false }
  }
})

ipcMain.handle('workspace:setIconTheme', async (_event, themeId = 'default') => {
  selectedIconTheme = String(themeId || 'default')
  iconTheme = null
  await saveWorkspaceState()
  return listWorkspaceEntries()
})

ipcMain.handle('workspace:openFile', async () => {
  const selection = await dialog.showOpenDialog({ properties: ['openFile'] })
  if (selection.canceled || !selection.filePaths[0]) return { canceled: true }
  const filePath = resolve(selection.filePaths[0])
  return { canceled: false, name: filePath.split(sep).pop(), path: filePath, content: await fs.readFile(filePath, 'utf8') }
})

async function listWorkspaceEntries(relativePath = '') {
  let entries
  try {
    entries = await fs.readdir(workspacePath(relativePath), { withFileTypes: true })
  } catch (error) {
    console.error(`Failed to scan workspace directory ${relativePath}:`, error)
    return []
  }
  const visibleEntries = entries
    .filter((entry) => entry.name !== '.codemind')
    .sort((first, second) => {
      const group = (entry) => entry.isDirectory() ? (entry.name.startsWith('.') ? 0 : 1) : (entry.name.startsWith('.') ? 2 : 3)
      return group(first) - group(second) || first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
    })

  const result = []
  for (const entry of visibleEntries) {
    const entryPath = join(relativePath, entry.name)
    result.push({ name: entry.name, path: entryPath, isDirectory: entry.isDirectory(), parent: relativePath, icon: await getFileIconSafely(entry.name, entry.isDirectory()) })
    if (entry.isDirectory()) result.push(...await listWorkspaceEntries(entryPath))
  }
  return result
}

ipcMain.handle('workspace:list', async (_event, relativePath = '') => {
  if (!workspaceRoot) return []
  return listWorkspaceEntries(relativePath)
})

ipcMain.handle('workspace:read', async (_event, relativePath) => fs.readFile(workspacePath(relativePath), 'utf8'))

ipcMain.handle('workspace:write', async (_event, relativePath, content) => {
  await fs.writeFile(workspacePath(relativePath), String(content ?? ''), 'utf8')
  return { saved: true }
})

function parentWorkspacePath(relativePath = '') {
  const normalized = relativePath.replace(/\\/g, '/')
  const parent = normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : ''
  return parent || ''
}

async function refreshWorkspaceEntries() {
  return listWorkspaceEntries()
}

ipcMain.handle('workspace:create', async (_event, relativeDirectory, name, isDirectory) => {
  if (!workspaceRoot) throw new Error('Open a workspace first')
  const safeName = String(name || '').trim()
  if (!safeName || safeName === '.' || safeName === '..' || safeName.includes('/') || safeName.includes('\\')) throw new Error('Enter a valid name.')
  const target = workspacePath(join(relativeDirectory || '', safeName))
  if (isDirectory) await fs.mkdir(target)
  else await fs.writeFile(target, '', { flag: 'wx' })
  return refreshWorkspaceEntries()
})

ipcMain.handle('workspace:delete', async (_event, relativePath) => {
  if (!workspaceRoot || !relativePath) throw new Error('Cannot delete the workspace root.')
  await fs.rm(workspacePath(relativePath), { recursive: true, force: false })
  return refreshWorkspaceEntries()
})

ipcMain.handle('workspace:copyPath', async (_event, relativePath) => {
  if (!workspaceRoot || !relativePath) throw new Error('Nothing to copy.')
  clipboard.writeText(workspacePath(relativePath))
})

ipcMain.handle('workspace:paste', async (_event, relativeDirectory) => {
  if (!workspaceRoot) throw new Error('Open a workspace first')
  const source = clipboard.readText()
  const sourcePath = resolve(source)
  const workspaceResolved = resolve(workspaceRoot)
  if (!source || !sourcePath.startsWith(`${workspaceResolved}${sep}`)) throw new Error('Copy a workspace file or folder first.')
  const destinationDirectory = workspacePath(relativeDirectory || '')
  const destination = join(destinationDirectory, sourcePath.split(sep).pop())
  await fs.cp(sourcePath, destination, { recursive: true, errorOnExist: true })
  return refreshWorkspaceEntries()
})

ipcMain.handle('terminal:run', async (_event, command) => new Promise((resolveResult) => {
  const shell = process.platform === 'linux' ? '/usr/bin/fish' : undefined
  exec(command, { cwd: workspaceRoot, shell, timeout: 30_000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    resolveResult({ output: `${stdout}${stderr}`, code: error?.code ?? 0 })
  })
}))

async function readExtensionManifests(root) {
  try {
    const folders = await fs.readdir(root, { withFileTypes: true })
    return Promise.all(folders.filter((folder) => folder.isDirectory()).slice(0, 250).map(async (folder) => {
      try {
        const extensionRoot = join(root, folder.name)
        let manifestPath = join(extensionRoot, 'package.json')
        try {
          await fs.access(manifestPath)
        } catch {
          manifestPath = join(extensionRoot, 'extension', 'package.json')
        }
        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
        let localization = {}
        try {
          localization = JSON.parse(await fs.readFile(join(dirname(manifestPath), 'package.nls.json'), 'utf8'))
        } catch { }
        const localize = (value, fallback) => {
          if (typeof value !== 'string') return fallback
          const match = value.match(/^%(.+)%$/)
          return match ? (localization[match[1]] || fallback) : value
        }
        manifest.displayName = localize(manifest.displayName, manifest.name || folder.name)
        manifest.description = localize(manifest.description, 'No description provided.')
        for (const theme of manifest.contributes?.iconThemes || []) theme.label = localize(theme.label, theme.id)
        return { id: `${manifest.publisher || 'local'}.${manifest.name || folder.name}`, name: manifest.displayName, description: manifest.description, version: manifest.version || '0.0.0', publisher: manifest.publisher || 'local', path: extensionRoot, extensionRoot: dirname(manifestPath), manifest }
      } catch { return null }
    })).then((items) => items.filter(Boolean))
  } catch { return [] }
}

async function saveExtensionRegistry() {
  const extensions = await readExtensionManifests(userExtensionsRoot())
  await fs.mkdir(codeMindRoot(), { recursive: true })
  await fs.writeFile(extensionRegistryPath(), JSON.stringify(extensions, null, 2))
}

async function installVsixArchive(vsixPath, installRoot = userExtensionsRoot()) {
  await fs.mkdir(installRoot, { recursive: true })
  const archive = new AdmZip(vsixPath)
  const packageEntry = archive.getEntry('extension/package.json')
  if (!packageEntry) throw new Error('The VSIX does not contain extension/package.json')

  const manifest = JSON.parse(packageEntry.getData().toString('utf8'))
  const folderName = `${manifest.publisher || 'local'}.${manifest.name || Date.now()}-${manifest.version || '0.0.0'}`
  const destination = join(installRoot, folderName)

  await fs.rm(destination, { recursive: true, force: true })

  for (const entry of archive.getEntries()) {
    const normalized = entry.entryName.replace(/\\/g, '/')
    const safeTarget = resolve(destination, normalized)
    const safeRoot = `${resolve(destination)}${sep}`
    if (!safeTarget.startsWith(safeRoot) && safeTarget !== resolve(destination)) {
      throw new Error(`Unsafe file path in extension package: ${entry.entryName}`)
    }

    if (entry.isDirectory) {
      await fs.mkdir(safeTarget, { recursive: true })
      continue
    }

    await fs.mkdir(dirname(safeTarget), { recursive: true })
    await fs.writeFile(safeTarget, entry.getData())
  }

  return { folderName, manifest }
}

ipcMain.handle('extensions:list', async () => {
  const userExtensions = await readExtensionManifests(userExtensionsRoot())
    if (!workspaceRoot) return []
  await fs.mkdir(codeMindRoot(), { recursive: true })
  await fs.writeFile(extensionRegistryPath(), JSON.stringify(userExtensions, null, 2))
  return userExtensions.map(({ manifest, extensionRoot: _extensionRoot, ...extension }) => ({
    ...extension,
    enabled: true,
    location: extension.path,
    iconThemes: manifest.contributes?.iconThemes?.map((theme) => ({ id: theme.id, label: theme.label, path: theme.path })) || [],
  }))
})

ipcMain.handle('extensions:search', async (_event, searchText = '') => {
  const query = String(searchText || '').trim()
  if (!query) return []

  const response = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error(`Marketplace search failed: ${response.status}`)
  const data = await response.json()
  return data.extensions ?? []
})

ipcMain.handle('extensions:installMarketplace', async (_event, extension) => {
    if (!workspaceRoot) throw new Error('Open a workspace before installing an extension.')
  const downloadUrl = extension?.files?.download
  if (!downloadUrl) throw new Error(`No download URL exists for ${extension?.namespace || 'unknown'}.${extension?.name || 'extension'}`)

  const response = await fetch(downloadUrl)
  if (!response.ok) throw new Error(`Extension download failed: ${response.status}`)

  const tempPath = join(app.getPath('temp'), `${extension.namespace}.${extension.name}-${extension.version || '0.0.0'}.vsix`)
  const fileBuffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(tempPath, fileBuffer)

  try {
    const { folderName, manifest } = await installVsixArchive(tempPath, userExtensionsRoot())
    iconTheme = null
    await saveExtensionRegistry()
    return { canceled: false, extension: { id: folderName, name: manifest.displayName || manifest.name || folderName, description: manifest.description || 'Installed extension', version: manifest.version || '0.0.0', publisher: manifest.publisher || 'local' } }
  } finally {
    await fs.rm(tempPath, { force: true })
  }
})

ipcMain.handle('extensions:install', async () => {
    if (!workspaceRoot) throw new Error('Open a workspace before installing an extension.')
  const selection = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'VS Code Extension', extensions: ['vsix'] }] })
  if (selection.canceled || !selection.filePaths[0]) return { canceled: true }

  try {
    const { folderName, manifest } = await installVsixArchive(selection.filePaths[0], userExtensionsRoot())
    iconTheme = null
    await saveExtensionRegistry()
    return { canceled: false, extension: { id: folderName, name: manifest.displayName || manifest.name || folderName, description: manifest.description || 'Installed extension', version: manifest.version || '0.0.0', publisher: manifest.publisher || 'local' } }
  } catch (error) {
    console.error(error)
    throw error
  }
})

function createWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (!app.isPackaged && !process.env.NORTHSTAR_USE_DIST) window.loadURL('http://localhost:5173')
  else window.loadFile(join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})