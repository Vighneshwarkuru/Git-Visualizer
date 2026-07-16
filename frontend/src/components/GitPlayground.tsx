import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle, FileText, ArrowRight, GitBranch, GitCommit, GitMerge, AlertCircle, HelpCircle } from 'lucide-react';
import { GIT_MISSIONS } from '../utils/GitMissionData';
import type { GitMission, SandboxState, SandboxCommit } from '../utils/GitMissionData';

export const GitPlayground: React.FC = () => {
  const [selectedMissionIdx, setSelectedMissionIdx] = useState<number>(0);
  const [mission, setMission] = useState<GitMission>(GIT_MISSIONS[0]);
  const [sandbox, setSandbox] = useState<SandboxState>(JSON.parse(JSON.stringify(GIT_MISSIONS[0].initialState)));
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [mergeBranchTarget, setMergeBranchTarget] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load mission state
  useEffect(() => {
    const targetMission = GIT_MISSIONS[selectedMissionIdx];
    setMission(targetMission);
    setSandbox(JSON.parse(JSON.stringify(targetMission.initialState)));
    setIsSuccess(false);
    setErrorMsg(null);
    setCommitMessage('');
    setNewBranchName('');
    setMergeBranchTarget('');
  }, [selectedMissionIdx]);

  // Validate state whenever sandbox updates
  useEffect(() => {
    if (mission && mission.validate(sandbox)) {
      setIsSuccess(true);
    } else {
      setIsSuccess(false);
    }
  }, [sandbox, mission]);

  const handleReset = () => {
    setSandbox(JSON.parse(JSON.stringify(mission.initialState)));
    setErrorMsg(null);
    setIsSuccess(false);
  };

  // Stage a file (moves it from unstaged to staged)
  const handleStageFile = (fileName: string) => {
    setSandbox(prev => ({
      ...prev,
      unstagedFiles: prev.unstagedFiles.filter(f => f !== fileName),
      stagedFiles: [...prev.stagedFiles, fileName]
    }));
  };

  // Unstage a file
  const handleUnstageFile = (fileName: string) => {
    setSandbox(prev => ({
      ...prev,
      stagedFiles: prev.stagedFiles.filter(f => f !== fileName),
      unstagedFiles: [...prev.unstagedFiles, fileName]
    }));
  };

  // Run commit command
  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!commitMessage.trim()) {
      setErrorMsg('Commit message cannot be empty!');
      return;
    }

    if (sandbox.stagedFiles.length === 0 && mission.id === 'commit') {
      setErrorMsg('No files staged! Click a file in the Staging Area first.');
      return;
    }

    const newSha = 'c' + (sandbox.commits.length + 1);
    
    // Find parent (last commit in this branch or current active commit)
    const parents = sandbox.commits.length > 0 
      ? [sandbox.commits[sandbox.commits.length - 1].id] 
      : [];

    const newCommit: SandboxCommit = {
      id: newSha,
      message: commitMessage,
      parents,
      branch: sandbox.currentBranch
    };

    setSandbox(prev => ({
      ...prev,
      commits: [...prev.commits, newCommit],
      stagedFiles: [], // clear staged files
      unstagedFiles: prev.unstagedFiles.filter(f => !prev.stagedFiles.includes(f))
    }));
    setCommitMessage('');
  };

  // Run branch command
  const handleCreateBranch = () => {
    setErrorMsg(null);
    const cleanName = newBranchName.trim();
    if (!cleanName) {
      setErrorMsg('Branch name cannot be empty!');
      return;
    }
    if (sandbox.branches.includes(cleanName)) {
      setErrorMsg(`Branch "${cleanName}" already exists!`);
      return;
    }

    setSandbox(prev => ({
      ...prev,
      branches: [...prev.branches, cleanName],
      currentBranch: cleanName // automatically switch to new branch on create
    }));
    setNewBranchName('');
  };

  // Switch branch (checkout)
  const handleCheckoutBranch = (branch: string) => {
    setSandbox(prev => ({
      ...prev,
      currentBranch: branch
    }));
  };

  // Merge branch
  const handleMerge = () => {
    setErrorMsg(null);
    if (!mergeBranchTarget) {
      setErrorMsg('Select a branch to merge!');
      return;
    }
    if (mergeBranchTarget === sandbox.currentBranch) {
      setErrorMsg('Cannot merge branch into itself!');
      return;
    }

    // Find the last commits of current branch and target branch
    const baseCommit = sandbox.commits[sandbox.commits.length - 1];
    const targetCommitObj = [...sandbox.commits].reverse().find(c => c.branch === mergeBranchTarget);

    if (!targetCommitObj) {
      setErrorMsg(`No commits found on branch "${mergeBranchTarget}"!`);
      return;
    }

    const mergeSha = 'c' + (sandbox.commits.length + 1);
    const mergeCommit: SandboxCommit = {
      id: mergeSha,
      message: `Merge branch '${mergeBranchTarget}' into ${sandbox.currentBranch}`,
      parents: [baseCommit.id, targetCommitObj.id],
      branch: sandbox.currentBranch,
      isMerge: true
    };

    setSandbox(prev => ({
      ...prev,
      commits: [...prev.commits, mergeCommit]
    }));
    setMergeBranchTarget('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[500px]">
      {/* 1. Missions Selector & Instructions Panel (1/4 Column) */}
      <div className="xl:col-span-1 bg-[#131b2e] p-5 rounded-3xl border border-slate-800/80 backdrop-blur-md flex flex-col justify-between">
        <div>
          <span className="text-[10px] bg-indigo-500 text-white shadow-md shadow-indigo-500/10/10 text-[#d0bcff] border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Git Academy
          </span>
          <h3 className="text-base font-black mt-2 text-white">Interactive Levels</h3>
          
          {/* Mission buttons */}
          <div className="mt-3 flex flex-col gap-2">
            {GIT_MISSIONS.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setSelectedMissionIdx(idx)}
                className={`w-full text-left p-2.5 rounded-3xl text-xs font-semibold flex items-center justify-between border transition-all ${
                  selectedMissionIdx === idx
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10 border-amber-500 text-white shadow-lg shadow-none'
                    : 'bg-[#1b2640] border-slate-800/80 hover:bg-slate-800/20 text-slate-400'
                }`}
              >
                <span>{m.title}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1b2640] text-slate-400">
                  {m.difficulty}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-800/80 mt-4 pt-4 space-y-3">
            {/* Concept explainer */}
            <div className="bg-[#1b2640] p-3 rounded-3xl border border-slate-800/80/40 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-[#d0bcff] font-bold mb-1">
                <HelpCircle size={14} /> Git Core Concept
              </div>
              <p className="leading-relaxed text-[11px] text-slate-400">{mission.concept}</p>
            </div>

            {/* Step-by-step checklist */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Instructions</h4>
              {mission.instructions.map((inst, idx) => (
                <div key={idx} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
                  <span className="text-[#d0bcff] font-bold font-mono">{idx + 1}.</span>
                  <span>{inst}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level Completion status */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          {isSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl p-3 text-center flex flex-col items-center gap-1">
              <CheckCircle className="animate-bounce" size={24} />
              <span className="text-xs font-black">Level Completed!</span>
              <p className="text-[9px] text-slate-400">You successfully performed this git operation.</p>
              {selectedMissionIdx < GIT_MISSIONS.length - 1 && (
                <button
                  onClick={() => setSelectedMissionIdx(prev => prev + 1)}
                  className="mt-2 text-[10px] bg-emerald-500 text-white font-bold px-3 py-1 rounded hover:bg-emerald-400 transition-colors"
                >
                  Next Mission
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleReset}
              className="w-full bg-[#0b0f19] hover:bg-[#131b2e] border border-slate-800/80 text-slate-400 hover:text-white font-semibold py-2 px-4 rounded-3xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Reset Level
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Git Playground Sandbox (3/4 Columns) */}
      <div className="xl:col-span-3 flex flex-col gap-6">
        
        {/* Sandbox visual board */}
        <div className="bg-[#131b2e] border border-slate-800/80 rounded-3xl p-6 flex-1 flex flex-col justify-between h-[360px] relative overflow-hidden backdrop-blur-md">
          {/* Staging Area Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800/80 pb-4 mb-4">
            {/* Unstaged Box */}
            <div className="bg-[#1b2640] rounded-3xl p-3 border border-slate-800/80/40">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Unstaged Workspace Changes
              </span>
              <div className="flex flex-wrap gap-2">
                {sandbox.unstagedFiles.length === 0 ? (
                  <span className="text-[10px] text-slate-600 italic">No files modified</span>
                ) : (
                  sandbox.unstagedFiles.map(file => (
                    <button
                      key={file}
                      onClick={() => handleStageFile(file)}
                      className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded px-2 py-1 text-[10px] font-mono text-rose-400 transition-colors cursor-pointer"
                      title="Click to stage file"
                    >
                      <FileText size={10} /> {file}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Staged Box */}
            <div className="bg-[#1b2640] rounded-3xl p-3 border border-slate-800/80/40">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Staged Changes (Ready to Commit)
              </span>
              <div className="flex flex-wrap gap-2">
                {sandbox.stagedFiles.length === 0 ? (
                  <span className="text-[10px] text-slate-600 italic">Stage files to prepare commit</span>
                ) : (
                  sandbox.stagedFiles.map(file => (
                    <button
                      key={file}
                      onClick={() => handleUnstageFile(file)}
                      className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded px-2 py-1 text-[10px] font-mono text-emerald-400 transition-colors cursor-pointer"
                      title="Click to unstage file"
                    >
                      <FileText size={10} /> {file}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Commits visual track */}
          <div className="flex-1 overflow-x-auto flex items-center justify-start gap-4 py-4 relative min-h-24">
            {sandbox.commits.length === 0 ? (
              <div className="w-full text-center text-xs text-slate-500 italic">No commits made yet</div>
            ) : (
              sandbox.commits.map((commit, idx) => {
                const isActive = idx === sandbox.commits.length - 1;
                const isCurrentBranch = commit.branch === sandbox.currentBranch;

                return (
                  <React.Fragment key={commit.id}>
                    <div
                      className={`w-32 bg-[#0b0f19] border p-3 rounded-3xl flex flex-col justify-between h-20 shadow-md relative group transition-all duration-150 ${
                        isActive
                          ? 'border-amber-500 shadow-amber-500/10 scale-105'
                          : isCurrentBranch
                          ? 'border-slate-800/80 hover:border-slate-800/80'
                          : 'border-slate-800/80/60 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                          <span>{commit.id}</span>
                          <span
                            className={`px-1 rounded font-bold ${
                              commit.branch === 'main'
                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10/20 text-[#d0bcff]'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {commit.branch}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-200 mt-1 truncate" title={commit.message}>
                          {commit.message}
                        </p>
                      </div>

                      {commit.isMerge && (
                        <span className="text-[8px] bg-indigo-500 text-white shadow-md shadow-indigo-500/10/20 text-[#d0bcff] border border-amber-500/30 px-1 py-0.5 rounded w-fit font-bold flex items-center gap-0.5 mt-1">
                          <GitMerge size={8} /> Merge Commit
                        </span>
                      )}
                    </div>

                    {/* Connecting arrows */}
                    {idx < sandbox.commits.length - 1 && (
                      <ArrowRight size={14} className="text-slate-700 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Active branch indicators */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Active Branch Pointer:</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500 text-white shadow-md shadow-indigo-500/10 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow-md shadow-none">
                <GitBranch size={10} /> HEAD -&gt; {sandbox.currentBranch}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Available Branches:</span>
              <div className="flex gap-1.5">
                {sandbox.branches.map(b => (
                  <span
                    key={b}
                    onClick={() => handleCheckoutBranch(b)}
                    className={`cursor-pointer px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold border ${
                      b === sandbox.currentBranch
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10/20 text-[#d0bcff] border-amber-500/30'
                        : 'bg-[#131b2e] border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox CLI Controls Console */}
        <div className="bg-[#131b2e] p-5 rounded-3xl border border-slate-800/80 backdrop-blur-md space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <GitCommit size={14} className="text-[#d0bcff]" /> Command Board Console
          </h4>

          {/* Error notifications */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl p-3 flex items-start gap-2 text-[11px]">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form 1: Git Commit */}
            <form onSubmit={handleCommit} className="space-y-2">
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                1. Git Commit Action
              </label>
              <input
                type="text"
                placeholder="Commit message..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-2xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <GitCommit size={12} /> git commit
              </button>
            </form>

            {/* Form 2: Git Branch */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                2. Git Branch Action
              </label>
              <input
                type="text"
                placeholder="New branch name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleCreateBranch}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-2xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <GitBranch size={12} /> git branch
              </button>
            </div>

            {/* Form 3: Git Merge */}
            <div className="space-y-2">
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                3. Git Merge Action
              </label>
              <select
                value={mergeBranchTarget}
                onChange={(e) => setMergeBranchTarget(e.target.value)}
                className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
              >
                <option value="">Select branch to merge...</option>
                {sandbox.branches
                  .filter(b => b !== sandbox.currentBranch)
                  .map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
              </select>
              <button
                onClick={handleMerge}
                className="w-full bg-indigo-500 text-white shadow-md shadow-indigo-500/10 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/10 text-white font-bold py-1.5 px-3 rounded-2xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <GitMerge size={12} /> git merge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
