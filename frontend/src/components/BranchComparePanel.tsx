import React, { useState } from 'react';
import { ArrowLeftRight, GitCommit, FileText, AlertCircle } from 'lucide-react';

interface CommitInfo {
  sha: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
  refs: string[];
}

interface BranchComparison {
  aheadCount: number;
  behindCount: number;
  aheadCommits: CommitInfo[];
  behindCommits: CommitInfo[];
  changedFiles: { file: string; status: string }[];
}

interface BranchComparePanelProps {
  branches: string[];
  repoPath: string;
  onSelectCommit: (sha: string) => void;
}

export const BranchComparePanel: React.FC<BranchComparePanelProps> = ({
  branches,
  repoPath,
  onSelectCommit,
}) => {
  const [baseBranch, setBaseBranch] = useState(branches[0] || 'main');
  const [targetBranch, setTargetBranch] = useState(branches[1] || branches[0] || 'main');
  const [comparison, setComparison] = useState<BranchComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!baseBranch || !targetBranch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:4000/api/compare?path=${encodeURIComponent(
          repoPath
        )}&base=${encodeURIComponent(baseBranch)}&target=${encodeURIComponent(targetBranch)}`
      );
      if (!res.ok) {
        throw new Error('Comparison failed or branches are incompatible');
      }
      const data = await res.json();
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compare branches');
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
      case 'D': return 'text-rose-400 border-rose-500/20 bg-rose-500/10';
      default: return 'text-blue-400 border-blue-500/20 bg-blue-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector controls */}
      <div className="bg-[#131b2e] rounded-3xl p-6 border border-slate-800/80">
        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <ArrowLeftRight size={16} className="text-[#d0bcff]" /> Compare Branches
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
              Base Branch
            </label>
            <select
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-800/80 rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
              Target Branch (Compare against Base)
            </label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-800/80 rounded-2xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || baseBranch === targetBranch}
          className="mt-4 w-full bg-indigo-500 text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/10 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-2 px-4 rounded-2xl transition-colors text-sm"
        >
          {loading ? 'Comparing...' : baseBranch === targetBranch ? 'Select Different Branches' : 'Compare'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl p-4 flex items-start gap-3 text-xs">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#131b2e] rounded-3xl p-4 border border-slate-800/80/40 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ahead</span>
              <div className="text-xl font-black text-emerald-400 mt-1">+{comparison.aheadCount}</div>
              <span className="text-[9px] text-slate-400 block mt-0.5">commits in {targetBranch}</span>
            </div>
            <div className="bg-[#131b2e] rounded-3xl p-4 border border-slate-800/80/40 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Behind</span>
              <div className="text-xl font-black text-rose-400 mt-1">-{comparison.behindCount}</div>
              <span className="text-[9px] text-slate-400 block mt-0.5">commits behind {baseBranch}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unique commits */}
            <div className="bg-[#131b2e] rounded-3xl p-6 border border-slate-800/80 flex flex-col h-[320px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <GitCommit size={14} className="text-emerald-400" /> Commits Unique to {targetBranch}
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {comparison.aheadCommits.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 text-xs italic">No unique commits</div>
                ) : (
                  comparison.aheadCommits.map(commit => (
                    <div
                      key={commit.sha}
                      onClick={() => onSelectCommit(commit.sha)}
                      className="p-2.5 rounded-2xl bg-[#131b2e]/50 hover:bg-slate-800/40 border border-slate-800/80 cursor-pointer flex justify-between items-center text-xs transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="font-bold text-slate-200 truncate">{commit.message}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{commit.authorName}</div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                        {commit.sha.substring(0, 7)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Changed files list */}
            <div className="bg-[#131b2e] rounded-3xl p-6 border border-slate-800/80 flex flex-col h-[320px]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <FileText size={14} className="text-[#d0bcff]" /> Changed Files ({comparison.changedFiles.length})
              </h4>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {comparison.changedFiles.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 text-xs italic">No changed files</div>
                ) : (
                  comparison.changedFiles.map(file => (
                    <div
                      key={file.file}
                      className="flex items-center justify-between p-2 rounded-2xl bg-[#131b2e]/20 hover:bg-slate-800/10 text-xs"
                    >
                      <span className="font-mono text-slate-300 truncate pr-4" title={file.file}>
                        {file.file}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(file.status)}`}>
                        {file.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
