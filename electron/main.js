import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { exec } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
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

ipcMain.handle('extensions:list', async () => [
  ...(await readExtensionManifests(join(workspaceRoot, 'extensions'))),
  ...(await readExtensionManifests(userExtensionsRoot)),
])

ipcMain.handle('extensions:install', async () => {
  const selection = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'VS Code Extension', extensions: ['vsix'] }] })
  if (selection.canceled || !selection.filePaths[0]) return { canceled: true }
  await fs.mkdir(userExtensionsRoot, { recursive: true })
  const archive = new AdmZip(selection.filePaths[0])
  const packageEntry = archive.getEntry('extension/package.json')
  if (!packageEntry) throw new Error('The VSIX does not contain extension/package.json')
  const manifest = JSON.parse(packageEntry.getData().toString('utf8'))
  const folder = `${manifest.publisher || 'local'}.${manifest.name || Date.now()}`
  archive.extractAllTo(join(userExtensionsRoot, folder), true)
  return { canceled: false, extension: { id: folder, name: manifest.displayName || manifest.name || folder, description: manifest.description || 'Installed extension', version: manifest.version || '0.0.0', publisher: manifest.publisher || 'local' } }
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