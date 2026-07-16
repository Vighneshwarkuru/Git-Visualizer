import React, { useState } from 'react';
import { X, GitCommit, User, Calendar, FolderOpen, FileText } from 'lucide-react';

interface FileChange {
  file: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'unknown';
}

interface CommitDetails {
  sha: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
  refs: string[];
  files: FileChange[];
  diff: string;
}

interface CommitDetailsPanelProps {
  details: CommitDetails | null;
  loading: boolean;
  onClose: () => void;
}

export const CommitDetailsPanel: React.FC<CommitDetailsPanelProps> = ({
  details,
  loading,
  onClose,
}) => {
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="h-full w-full bg-[#1d1b20] border-l border-transparent flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">Loading commit details...</span>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="h-full w-full bg-[#1d1b20] border-l border-transparent flex items-center justify-center p-8 text-slate-500 text-sm">
        Select a commit to view details
      </div>
    );
  }

  const dateStr = new Date(details.timestamp * 1000).toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filter diff by file if selected
  const renderDiffLines = () => {
    if (!details.diff) return <p className="text-slate-500 italic p-4">No diff details available</p>;

    const lines = details.diff.split('\n');
    let outputLines: React.ReactNode[] = [];
    let currentFile = '';
    let isFileMatching = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track current file in diff
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.+)$/);
        currentFile = match ? match[1] : '';
        isFileMatching = selectedFileFilter ? currentFile === selectedFileFilter : true;
      }

      if (!isFileMatching) continue;

      let className = 'text-slate-300 px-4 py-0.5 whitespace-pre-wrap font-mono text-xs';
      let bgStyle = {};

      if (line.startsWith('+') && !line.startsWith('+++')) {
        className += ' text-emerald-400 bg-emerald-950/30 border-l-2 border-emerald-500';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        className += ' text-rose-400 bg-rose-950/30 border-l-2 border-rose-500';
      } else if (line.startsWith('@@')) {
        className += ' text-cyan-400 bg-cyan-950/20 font-semibold';
      } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
        className += ' text-slate-500 bg-slate-800/40 font-semibold';
      }

      outputLines.push(
        <div key={i} className={className} style={bgStyle}>
          {line || ' '}
        </div>
      );
    }

    return (
      <div className="flex flex-col rounded-2xl border border-transparent bg-[#141218]/80 overflow-hidden">
        <div className="flex justify-between items-center bg-[#1d1b20] px-4 py-2 border-b border-transparent">
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {selectedFileFilter ? `Diff: ${selectedFileFilter}` : 'Full Commit Diff'}
          </span>
          {selectedFileFilter && (
            <button
              onClick={() => setSelectedFileFilter(null)}
              className="text-[10px] text-[#d0bcff] hover:text-[#eaddff] font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="max-h-[500px] overflow-y-auto py-2">
          {outputLines.length > 0 ? outputLines : <div className="p-4 text-slate-500 text-xs italic">Selected file diff not found.</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#1d1b20] border-l border-transparent w-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-transparent">
        <div className="flex items-center gap-2 text-[#d0bcff]">
          <GitCommit size={18} />
          <span className="font-semibold text-sm">Commit Details</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-2xl transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title Message */}
        <div>
          <h2 className="text-lg font-bold text-slate-100 leading-snug">{details.message}</h2>
          <div className="mt-2 text-xs font-mono text-slate-500 break-all select-all">
            SHA: {details.sha}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#211f26] p-4 rounded-3xl border border-transparent">
          {/* Author */}
          <div className="flex items-start gap-3">
            <User className="text-slate-400 flex-shrink-0 mt-0.5" size={16} />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Author</div>
              <div className="text-xs font-medium text-slate-200 truncate">{details.authorName}</div>
              <div className="text-[10px] text-slate-400 truncate">{details.authorEmail}</div>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="text-slate-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Date</div>
              <div className="text-xs font-medium text-slate-200">{dateStr}</div>
            </div>
          </div>
        </div>

        {/* Files Modified list */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <FolderOpen size={14} /> Changed Files ({details.files.length})
            </h3>
            {selectedFileFilter && (
              <span className="text-[10px] bg-[#d0bcff] text-[#381e72]/20 text-[#eaddff] px-2 py-0.5 rounded border border-amber-500/30">
                Filtered
              </span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto border border-transparent rounded-2xl bg-[#1d1b20] divide-y divide-slate-800/60">
            {details.files.map(file => {
              const isSelected = selectedFileFilter === file.file;
              return (
                <div
                  key={file.file}
                  onClick={() => setSelectedFileFilter(isSelected ? null : file.file)}
                  className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#d0bcff] text-[#381e72]/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <FileText size={14} className="text-slate-500 flex-shrink-0" />
                    <span className="font-mono text-slate-300 truncate" title={file.file}>
                      {file.file}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[10px]">
                    <span className="text-emerald-400 font-bold">+{file.additions}</span>
                    <span className="text-rose-400 font-bold">-{file.deletions}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diff view */}
        <div className="space-y-2">{renderDiffLines()}</div>
      </div>
    </div>
  );
};
