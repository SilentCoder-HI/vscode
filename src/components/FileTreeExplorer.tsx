// FileTreeExplorer.tsx (React Frontend Renderer)
import React, { useState } from 'react';

// Reusing identical type definition from Electron
interface FileNode {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  icon: string;
  children?: FileNode[];
  isLoaded?: boolean;
}

interface TreeItemProps {
  node: FileNode;
  depth: number;
  onFolderExpand: (path: string) => Promise<void>;
  onFileSelect: (path: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth, onFolderExpand, onFileSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = node.kind === 'directory';

  const handleRowClick = async () => {
    if (isDirectory) {
      // Lazy load from Electron if this folder hasn't been fetched yet
      if (!isOpen && !node.isLoaded) {
        await onFolderExpand(node.path);
      }
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Individual Node Row Layout */}
      <div
        onClick={handleRowClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: `${depth * 12 + 6}px`, // Perfect indent per depth level
          paddingTop: '3px',
          paddingBottom: '3px',
          cursor: 'pointer',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '13px',
          borderRadius: '3px',
          transition: 'background 0.1s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2d2e')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Toggle arrow for folders */}
        {isDirectory ? (
          <span style={{ fontSize: '10px', width: '12px', marginRight: '4px', transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>
            ▶
          </span>
        ) : (
          <span style={{ width: '16px' }} />
        )}

        {/* Dynamic Icon provided by Electron handler */}
        <span style={{ marginRight: '6px', fontSize: '14px' }}>{isDirectory && isOpen ? '📂' : node.icon}</span>
        
        <span>{node.name}</span>
      </div>

      {/* Render children recursively if folder is expanded */}
      {isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFolderExpand={onFolderExpand}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeItem;
