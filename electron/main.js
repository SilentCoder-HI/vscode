import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { exec } from 'node:child_process'
import { dirname, join, resolve, sep } from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import AdmZip from 'adm-zip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(__dirname, '../vscode-main')
const userExtensionsRoot = join(app.getPath('userData'), 'extensions')

function workspacePath(relativePath = '') {
  const target = resolve(workspaceRoot, relativePath)
  if (target !== workspaceRoot && !target.startsWith(`${workspaceRoot}/`)) {
    throw new Error('Path is outside the workspace')
  }
  return target
}

ipcMain.handle('workspace:list', async (_event, relativePath = '') => {
  const entries = await fs.readdir(workspacePath(relativePath), { withFileTypes: true })
  return entries
    .filter((entry) => !entry.name.startsWith('.') || ['.github', '.vscode'].includes(entry.name))
    .sort((first, second) => Number(second.isDirectory()) - Number(first.isDirectory()) || first.name.localeCompare(second.name))
    .slice(0, 100)
    .map((entry) => ({ name: entry.name, path: join(relativePath, entry.name), isDirectory: entry.isDirectory() }))
})

ipcMain.handle('workspace:read', async (_event, relativePath) => fs.readFile(workspacePath(relativePath), 'utf8'))

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
        const manifest = JSON.parse(await fs.readFile(join(root, folder.name, 'package.json'), 'utf8'))
        return { id: `${manifest.publisher || 'local'}.${manifest.name || folder.name}`, name: manifest.displayName || manifest.name || folder.name, description: manifest.description || 'Installed extension', version: manifest.version || '0.0.0', publisher: manifest.publisher || 'local', path: join(root, folder.name) }
      } catch { return null }
    })).then((items) => items.filter(Boolean))
  } catch { return [] }
}

async function installVsixArchive(vsixPath, installRoot = userExtensionsRoot) {
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

ipcMain.handle('extensions:list', async () => [
  ...(await readExtensionManifests(join(workspaceRoot, 'extensions'))),
  ...(await readExtensionManifests(userExtensionsRoot)),
])

ipcMain.handle('extensions:search', async (_event, searchText = '') => {
  const query = String(searchText || '').trim()
  if (!query) return []

  const response = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error(`Marketplace search failed: ${response.status}`)
  const data = await response.json()
  return data.extensions ?? []
})

ipcMain.handle('extensions:installMarketplace', async (_event, extension) => {
  const downloadUrl = extension?.files?.download
  if (!downloadUrl) throw new Error(`No download URL exists for ${extension?.namespace || 'unknown'}.${extension?.name || 'extension'}`)

  const response = await fetch(downloadUrl)
  if (!response.ok) throw new Error(`Extension download failed: ${response.status}`)

  const tempPath = join(app.getPath('temp'), `${extension.namespace}.${extension.name}-${extension.version || '0.0.0'}.vsix`)
  const fileBuffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(tempPath, fileBuffer)

  try {
    const { folderName, manifest } = await installVsixArchive(tempPath, userExtensionsRoot)
    return { canceled: false, extension: { id: folderName, name: manifest.displayName || manifest.name || folderName, description: manifest.description || 'Installed extension', version: manifest.version || '0.0.0', publisher: manifest.publisher || 'local' } }
  } finally {
    await fs.rm(tempPath, { force: true })
  }
})

ipcMain.handle('extensions:install', async () => {
  const selection = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'VS Code Extension', extensions: ['vsix'] }] })
  if (selection.canceled || !selection.filePaths[0]) return { canceled: true }

  try {
    const { folderName, manifest } = await installVsixArchive(selection.filePaths[0], userExtensionsRoot)
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