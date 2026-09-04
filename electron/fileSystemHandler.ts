// fileSystemHandler.ts (Electron Main Process)
import { dialog, ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define the exact JSON structure we will send to React
export interface FileNode {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  icon: string;          // Visual anchor icon based on type/extension
  children?: FileNode[]; // Empty array for directories, undefined for files
  isLoaded?: boolean;
}

// Simple VS Code-like extension matcher
function getFileIcon(fileName: string, isDirectory: boolean): string {
  if (isDirectory) return '📁'; // Default folder icon
  
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.ts': return '🔷';   // TS Icon representation
    case '.tsx': return '⚛️';  // React TS Icon
    case '.js': return '🟨';   // JS Icon
    case '.jsx': return '⚛️';  // React JS Icon
    case '.json': return '⚙️';  // Config/JSON Icon
    case '.css': return '🎨';   // Style CSS Icon
    case '.html': return '🌐';  // HTML Icon
    case '.md': return '📝';    // Markdown Icon
    default: return '📄';       // Default generic file fallback
  }
}

export function registerFileSystemHandlers() {
  
  // FUNCTION 1: Open native system folder picker
  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    
    const selectedPath = result.filePaths[0];
    return {
      rootName: path.basename(selectedPath),
      rootPath: selectedPath,
    };
  });

  // FUNCTION 2: Read contents and convert to Icon-mapped JSON structure
  ipcMain.handle('read-directory', async (_, dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      const nodes: FileNode[] = entries.map((entry) => {
        const isDir = entry.isDirectory();
        const fullPath = path.join(dirPath, entry.name);
        
        return {
          name: entry.name,
          path: fullPath,
          kind: isDir ? 'directory' : 'file',
          icon: getFileIcon(entry.name, isDir),
          children: isDir ? [] : undefined, // Initialize empty layout for folders
          isLoaded: false
        };
      });

      // VS Code Sorting Rule: Directories first, then files alphabetically
      return nodes.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
      
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error);
      return [];
    }
  });
}
