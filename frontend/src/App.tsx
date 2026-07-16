import { useState, useEffect, useRef } from 'react';
import {
  Folder,
  GitBranch,
  Search,
  RefreshCw,
  GitCommit,
  BarChart2,
  ArrowLeftRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { computeGraphLayout } from './utils/graphLayout';
import type { GraphCommit } from './utils/graphLayout';
import { CommitGraph } from './components/CommitGraph';
import { CommitDetailsPanel } from './components/CommitDetailsPanel';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { BranchComparePanel } from './components/BranchComparePanel';
import { FileTreeExplorer } from './components/FileTreeExplorer';
import { GitPlayground } from './components/GitPlayground';
import { GitBonsaiTree } from './components/GitBonsaiTree';

interface RepoInfo {
  isRepo: boolean;
  currentBranch: string;
  repoName: string;
  branches: string[];
  tags: string[];
}

export default function App() {
  const [repoPath, setRepoPath] = useState<string>('');
  const [activePath, setActivePath] = useState<string>('');
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [commits, setCommits] = useState<GraphCommit[]>([]);
  const [allCommitsRaw, setAllCommitsRaw] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Selection details
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [commitDetails, setCommitDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'history' | 'analytics' | 'compare' | 'files' | 'playground' | 'bonsai'>('history');

  // Loading states
  const [loadingRepo, setLoadingRepo] = useState<boolean>(false);
  const [loadingCommits, setLoadingCommits] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [contributorsData, setContributorsData] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);

  // Timeline player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // ms per commit
  const playIntervalRef = useRef<any>(null);

  // Load repo information on path change
  const loadRepository = async (path: string) => {
    setLoadingRepo(true);
    try {
      const res = await fetch(`http://localhost:4000/api/repo-info?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setRepoInfo(data);
      if (data.isRepo) {
        // Fallback to active current branch if none selected
        setSelectedBranch('');
        // Fetch fresh commit logs and analytics
        await loadCommits(path, '', '');
        loadAnalyticsData(path);
      } else {
        setCommits([]);
        setAllCommitsRaw([]);
        setAnalyticsData(null);
      }
    } catch (err) {
      console.error('Failed to load repo info', err);
    } finally {
      setLoadingRepo(false);
    }
  };

  // Load commits from API
  const loadCommits = async (path: string, branch: string, search: string) => {
    setLoadingCommits(true);
    try {
      const branchParam = branch ? `&branch=${encodeURIComponent(branch)}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await fetch(
        `http://localhost:4000/api/commits?path=${encodeURIComponent(path)}${branchParam}${searchParam}`
      );
      const data = await res.json();
      setAllCommitsRaw(data);
      
      // If timeline is playing, we manage layout dynamically, otherwise render full layout
      const layout = computeGraphLayout(data);
      setCommits(layout);
      
      // Select first commit by default if available
      if (layout.length > 0) {
        setSelectedSha(layout[0].sha);
      }
    } catch (err) {
      console.error('Failed to load commits', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  // Load stats data
  const loadAnalyticsData = async (path: string) => {
    setLoadingAnalytics(true);
    try {
      const [resAnal, resContrib] = await Promise.all([
        fetch(`http://localhost:4000/api/analytics?path=${encodeURIComponent(path)}`),
        fetch(`http://localhost:4000/api/contributors?path=${encodeURIComponent(path)}`)
      ]);
      const analData = await resAnal.json();
      const contribData = await resContrib.json();
      
      setAnalyticsData(analData);
      setContributorsData(contribData);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load commit details when selected
  useEffect(() => {
    if (!selectedSha) {
      setCommitDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setDetailsLoading(true);
      try {
        const res = await fetch(
          `http://localhost:4000/api/commit/${selectedSha}?path=${encodeURIComponent(activePath)}`
        );
        const data = await res.json();
        setCommitDetails(data);
      } catch (err) {
        console.error('Failed to fetch commit details', err);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [selectedSha, activePath]);

  // Initial load
  useEffect(() => {
    loadRepository('');
  }, []);

  const handleLoadPath = () => {
    setActivePath(repoPath);
    loadRepository(repoPath);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    loadCommits(activePath, branch, searchTerm);
  };

  const handleSearch = () => {
    loadCommits(activePath, selectedBranch, searchTerm);
  };

  // Timeline player logic
  useEffect(() => {
    if (isPlaying) {
      // Setup interval
      playIntervalRef.current = setInterval(() => {
        setTimelineIndex(prev => {
          // If we reached the end (newest commit, index 0 is newest, length-1 is oldest)
          // We play chronologically: starting from oldest (length-1) down to 0
          if (prev <= 0) {
            setIsPlaying(false);
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
            return 0;
          }
          const nextIndex = prev - 1;
          setSelectedSha(allCommitsRaw[nextIndex].sha);
          return nextIndex;
        });
      }, playSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, allCommitsRaw, playSpeed]);

  const startTimelineReplay = () => {
    if (allCommitsRaw.length === 0) return;
    // Set to the oldest commit index
    const oldestIndex = allCommitsRaw.length - 1;
    setTimelineIndex(oldestIndex);
    setSelectedSha(allCommitsRaw[oldestIndex].sha);
    setIsPlaying(true);
  };

  const pauseTimelineReplay = () => {
    setIsPlaying(false);
  };

  const resetTimelineReplay = () => {
    setIsPlaying(false);
    setTimelineIndex(allCommitsRaw.length - 1);
    if (allCommitsRaw.length > 0) {
      setSelectedSha(allCommitsRaw[allCommitsRaw.length - 1].sha);
    }
  };

  // Create subset of commits to show only up to current timeline replay index
  const visibleCommits = isPlaying || timelineIndex !== 0
    ? computeGraphLayout(allCommitsRaw.slice(timelineIndex))
    : commits;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Navbar Header */}
      <header className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white">Git Visualizer</h1>
            <span className="text-[10px] text-slate-400 block -mt-1 font-semibold uppercase tracking-wider">
              {repoInfo?.isRepo ? repoInfo.repoName : 'Select Repository'}
            </span>
          </div>
        </div>

        {/* Repository Path Input */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Folder className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Paste absolute path to local Git repository..."
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadPath()}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
            />
          </div>
          <button
            onClick={handleLoadPath}
            disabled={loadingRepo}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {loadingRepo ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              'Load'
            )}
          </button>
        </div>
      </header>

      {/* Main Body */}
      {repoInfo && !repoInfo.isRepo ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
            <Folder size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-200">No Git Repository Found</h3>
          <p className="text-xs text-slate-400 mt-2">
            The path you entered is either not a directory, does not exist, or does not contain a Git repository.
          </p>
          <p className="text-xs text-slate-500 mt-1 italic">
            Provide a path containing a <code className="font-mono bg-slate-900 px-1 py-0.5 rounded">.git</code> folder.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Main workspace container */}
          <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
            {/* Tabs & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Tab selector */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80 w-fit">
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'history'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GitCommit size={14} /> Commit History
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'analytics'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart2 size={14} /> Analytics
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'compare'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowLeftRight size={14} /> Compare
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'files'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Folder size={14} /> Files
                </button>
                <button
                  onClick={() => setActiveTab('playground')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'playground'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🎮 Playground
                </button>
                <button
                  onClick={() => setActiveTab('bonsai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'bonsai'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌳 Bonsai Tree
                </button>
              </div>

              {/* Filtering Controls (Only for History Tab) */}
              {activeTab === 'history' && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Branch filter */}
                  <div className="relative">
                    <GitBranch className="absolute left-2.5 top-2 text-slate-500" size={14} />
                    <select
                      value={selectedBranch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-4 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
                    >
                      <option value="">All Branches</option>
                      {repoInfo?.branches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search box */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 text-slate-500" size={14} />
                      <input
                        type="text"
                        placeholder="Search SHA, author, msg..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-4 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TAB VIEWS */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {/* Timeline Replay Controller Card */}
                <div className="bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border border-indigo-500/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Play size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Timeline Replay Mode</h4>
                      <p className="text-[10px] text-slate-400">Animate commit histories chronologically over time.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={startTimelineReplay}
                      disabled={isPlaying}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1"
                    >
                      <Play size={12} fill="currentColor" /> Play Replay
                    </button>
                    <button
                      onClick={pauseTimelineReplay}
                      disabled={!isPlaying}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Pause size={12} fill="currentColor" /> Pause
                    </button>
                    <button
                      onClick={resetTimelineReplay}
                      className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Reset
                    </button>

                    {/* Playback speed selector */}
                    <select
                      value={playSpeed}
                      onChange={(e) => setPlaySpeed(parseInt(e.target.value, 10))}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-300 focus:outline-none"
                    >
                      <option value={1500}>0.7x Speed</option>
                      <option value={1000}>1.0x Speed</option>
                      <option value={500}>2.0x Speed</option>
                      <option value={200}>5.0x Speed</option>
                    </select>
                  </div>
                </div>

                {/* Graph View */}
                {loadingCommits ? (
                  <div className="flex flex-col items-center justify-center p-24 bg-slate-900/30 rounded-xl border border-slate-850">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-400 mt-2">Fetching commits...</span>
                  </div>
                ) : (
                  <CommitGraph
                    commits={visibleCommits}
                    selectedSha={selectedSha}
                    onSelectCommit={setSelectedSha}
                  />
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                analytics={analyticsData}
                contributors={contributorsData}
                loading={loadingAnalytics}
              />
            )}

            {activeTab === 'compare' && (
              <BranchComparePanel
                branches={repoInfo?.branches || []}
                repoPath={activePath}
                onSelectCommit={(sha) => {
                  setActiveTab('history');
                  setSelectedSha(sha);
                }}
              />
            )}

            {activeTab === 'files' && (
              <FileTreeExplorer
                repoPath={activePath}
                onSelectCommit={(sha) => {
                  setActiveTab('history');
                  setSelectedSha(sha);
                }}
              />
            )}

            {activeTab === 'playground' && (
              <GitPlayground />
            )}

            {activeTab === 'bonsai' && (
              <GitBonsaiTree
                commits={commits}
                onSelectCommit={setSelectedSha}
                selectedSha={selectedSha}
              />
            )}
          </div>

          {/* Sliding Commitment Details Panel Drawer */}
          {activeTab === 'history' && selectedSha && (
            <div className="w-full md:w-[480px] lg:w-[580px] xl:w-[680px] flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-800/80 bg-slate-900/90 backdrop-blur-md relative z-0">
              <CommitDetailsPanel
                details={commitDetails}
                loading={detailsLoading}
                onClose={() => setSelectedSha(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
