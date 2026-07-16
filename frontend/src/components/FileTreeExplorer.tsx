import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, GitCommit, User, Calendar } from 'lucide-react';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
}

interface FileHistoryItem {
  sha: string;
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
}

interface FileTreeExplorerProps {
  repoPath: string;
  onSelectCommit: (sha: string) => void;
}

// Recursive Tree Node Component
const FileNode: React.FC<{
  node: TreeNode;
  level: number;
  onSelectFile: (filePath: string) => void;
  activeFilePath: string | null;
}> = ({ node, level, onSelectFile, activeFilePath }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = activeFilePath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'dir') {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        className={`flex items-center py-1.5 px-2 rounded-2xl text-xs cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[#d0bcff] text-[#381e72]/20 text-[#eaddff] font-semibold'
            : 'hover:bg-slate-800/40 text-slate-300 hover:text-white'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <span className="mr-1 text-slate-500">
          {node.type === 'dir' ? (
            hasChildren ? (
              isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            ) : null
          ) : null}
        </span>
        <span className="mr-1.5">
          {node.type === 'dir' ? (
            isOpen ? (
              <FolderOpen size={14} className="text-[#d0bcff]" />
            ) : (
              <Folder size={14} className="text-[#d0bcff]" />
            )
          ) : (
            <File size={14} className="text-slate-400" />
          )}
        </span>
        <span className="truncate">{node.name}</span>
      </div>

      {node.type === 'dir' && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children.map(child => (
            <FileNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelectFile={onSelectFile}
              activeFilePath={activeFilePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTreeExplorer: React.FC<FileTreeExplorerProps> = ({
  repoPath,
  onSelectCommit,
}) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [history, setHistory] = useState<FileHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Tree
  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:4000/api/files?path=${encodeURIComponent(repoPath)}`);
        if (!res.ok) throw new Error('Failed to fetch repository files');
        const data = await res.json();
        setTree(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load file explorer');
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
    setActiveFile(null);
    setHistory([]);
  }, [repoPath]);

  // Load File History when activeFile changes
  useEffect(() => {
    if (!activeFile) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(
          `http://localhost:4000/api/file-history?path=${encodeURIComponent(
            repoPath
          )}&file=${encodeURIComponent(activeFile)}`
        );
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error('Failed to fetch file history', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeFile, repoPath]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
      {/* File Tree Explorer (Left column, spanning 1/3) */}
      <div className="lg:col-span-1 bg-[#1d1b20] rounded-3xl p-4 border border-transparent flex flex-col h-full overflow-hidden">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Folder size={14} className="text-[#d0bcff]" /> Repository Files
        </h4>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex-1 text-center text-xs text-rose-400 p-4">{error}</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {tree.map(node => (
              <FileNode
                key={node.path}
                node={node}
                level={0}
                onSelectFile={setActiveFile}
                activeFilePath={activeFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* File History Timeline (Right columns, spanning 2/3) */}
      <div className="lg:col-span-2 bg-[#1d1b20] rounded-3xl p-6 border border-transparent flex flex-col h-full overflow-hidden">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <GitCommit size={14} className="text-emerald-400" /> File History Timeline
        </h4>

        {!activeFile ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs italic">
            Select a file from the explorer to view its commit history timeline.
          </div>
        ) : loadingHistory ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header info */}
            <div className="bg-[#1d1b20]/50 border border-transparent/50 rounded-2xl p-3 mb-4 text-xs">
              <span className="text-slate-400">Tracking file:</span>
              <div className="font-mono text-slate-200 mt-0.5 break-all font-semibold">{activeFile}</div>
              <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
                {history.length} commits affecting this file
              </div>
            </div>

            {/* Commits scroll timeline */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative pl-4 border-l border-transparent">
              {history.map((item) => {
                const dateStr = new Date(item.timestamp * 1000).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.sha}
                    onClick={() => onSelectCommit(item.sha)}
                    className="relative group cursor-pointer"
                  >
                    {/* Circle dot on the border line */}
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-emerald-500 group-hover:bg-emerald-500 transition-colors duration-150" />
                    
                    <div className="bg-[#1d1b20] hover:bg-slate-800/30 border border-transparent hover:border-transparent/60 rounded-3xl p-4 transition-all duration-150">
                      <div className="flex justify-between items-start gap-4">
                        <h5 className="font-bold text-xs text-slate-200 group-hover:text-[#d0bcff] transition-colors">
                          {item.message}
                        </h5>
                        <span className="font-mono text-[10px] text-slate-500 bg-[#141218] px-2 py-0.5 rounded border border-transparent">
                          {item.sha.substring(0, 7)}
                        </span>
                      </div>
                      
                      {/* Author / Date info row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-slate-500" />
                          {item.authorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-500" />
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
