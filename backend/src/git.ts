import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Helper to run commands
export function runGitCommand(repoPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Sanitize path
    const resolvedPath = path.resolve(repoPath);
    if (!fs.existsSync(resolvedPath)) {
      return reject(new Error(`Path does not exist: ${repoPath}`));
    }

    execFile('git', args, { cwd: resolvedPath, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout);
    });
  });
}

export interface RepoInfo {
  isRepo: boolean;
  currentBranch: string;
  repoName: string;
  branches: string[];
  tags: string[];
}

export interface CommitInfo {
  sha: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
  refs: string[];
}

export interface FileChange {
  file: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'unknown';
}

export interface CommitDetails extends CommitInfo {
  files: FileChange[];
  diff: string;
}

export interface ContributorInfo {
  name: string;
  email: string;
  commits: number;
}

export interface FileStats {
  file: string;
  count: number;
}

export interface AnalyticsInfo {
  mostModifiedFiles: FileStats[];
  totalCommits: number;
  totalContributors: number;
  commitsByDate: { [date: string]: number };
}

// 1. Repo Info
export async function getRepoInfo(repoPath: string): Promise<RepoInfo> {
  try {
    await runGitCommand(repoPath, ['rev-parse', '--is-inside-work-tree']);
    
    let currentBranch = '';
    try {
      currentBranch = (await runGitCommand(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
    } catch {
      currentBranch = 'DETACHED';
    }

    const repoName = path.basename(path.resolve(repoPath));

    // Get all branches
    const branchOutput = await runGitCommand(repoPath, ['branch', '-a', '--format=%(refname)']);
    const branches = branchOutput
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0)
      .map(b => {
        if (b.startsWith('refs/heads/')) return b.replace('refs/heads/', '');
        if (b.startsWith('refs/remotes/')) return b.replace('refs/remotes/', '');
        return b;
      });

    // Get all tags
    let tags: string[] = [];
    try {
      const tagOutput = await runGitCommand(repoPath, ['tag']);
      tags = tagOutput.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    } catch {
      // Tags might fail or be empty
    }

    return {
      isRepo: true,
      currentBranch,
      repoName,
      branches: Array.from(new Set(branches)),
      tags,
    };
  } catch (error: any) {
    return {
      isRepo: false,
      currentBranch: '',
      repoName: path.basename(path.resolve(repoPath)),
      branches: [],
      tags: [],
    };
  }
}

// 2. Commit log
export async function getCommits(repoPath: string, branch?: string, search?: string): Promise<CommitInfo[]> {
  // Format details: SHA|Parents|AuthorName|AuthorEmail|Timestamp|Subject|Refs
  const formatStr = '%H|%P|%an|%ae|%at|%s|%D';
  const args = ['log', `--pretty=format:${formatStr}`, '--all'];

  if (branch) {
    // If specific branch is requested instead of --all
    const idx = args.indexOf('--all');
    if (idx !== -1) args.splice(idx, 1);
    args.push(branch);
  }

  const logOutput = await runGitCommand(repoPath, args);
  if (!logOutput.trim()) return [];

  const lines = logOutput.split('\n');
  const commits: CommitInfo[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('|');
    if (parts.length < 7) continue;

    const sha = parts[0];
    const parents = parts[1] ? parts[1].split(' ') : [];
    const authorName = parts[2];
    const authorEmail = parts[3];
    const timestamp = parseInt(parts[4], 10);
    const message = parts[5];
    const refsRaw = parts[6] ? parts[6].split(', ') : [];
    const refs = refsRaw.map(r => r.trim()).filter(r => r.length > 0);

    // Apply search filter if specified
    if (search) {
      const s = search.toLowerCase();
      const matchSha = sha.toLowerCase().includes(s);
      const matchAuthor = authorName.toLowerCase().includes(s) || authorEmail.toLowerCase().includes(s);
      const matchMsg = message.toLowerCase().includes(s);
      if (!matchSha && !matchAuthor && !matchMsg) {
        continue;
      }
    }

    commits.push({
      sha,
      parents,
      authorName,
      authorEmail,
      timestamp,
      message,
      refs,
    });
  }

  return commits;
}

// 3. Commit Details
export async function getCommitDetails(repoPath: string, sha: string): Promise<CommitDetails> {
  // Get commit basic info
  const formatStr = '%H|%P|%an|%ae|%at|%s|%D';
  const infoOutput = await runGitCommand(repoPath, ['show', `--pretty=format:${formatStr}`, '--no-patch', sha]);
  const parts = infoOutput.trim().split('|');
  if (parts.length < 7) {
    throw new Error(`Commit not found: ${sha}`);
  }

  const baseInfo: CommitInfo = {
    sha: parts[0],
    parents: parts[1] ? parts[1].split(' ') : [],
    authorName: parts[2],
    authorEmail: parts[3],
    timestamp: parseInt(parts[4], 10),
    message: parts[5],
    refs: parts[6] ? parts[6].split(', ').map(r => r.trim()).filter(r => r.length > 0) : [],
  };

  // Get file stats
  // format of numstat: additions deletions filename
  const numstatOutput = await runGitCommand(repoPath, ['show', '--numstat', '--pretty=format:', sha]);
  const files: FileChange[] = [];
  
  const numstatLines = numstatOutput.split('\n');
  for (const line of numstatLines) {
    if (!line.trim()) continue;
    const [addStr, delStr, file] = line.split(/\s+/);
    if (!file) continue;

    const additions = addStr === '-' ? 0 : parseInt(addStr, 10);
    const deletions = delStr === '-' ? 0 : parseInt(delStr, 10);
    
    // Determine status (added, deleted, modified)
    let status: FileChange['status'] = 'modified';
    if (additions > 0 && deletions === 0) status = 'added';
    else if (deletions > 0 && additions === 0) status = 'deleted';

    files.push({
      file,
      additions,
      deletions,
      status,
    });
  }

  // Get diff
  const diff = await runGitCommand(repoPath, ['show', '--patch', '--pretty=format:', sha]);

  return {
    ...baseInfo,
    files,
    diff,
  };
}

// 4. Contributors
export async function getContributors(repoPath: string): Promise<ContributorInfo[]> {
  const shortlog = await runGitCommand(repoPath, ['shortlog', '-sne', '--all']);
  const lines = shortlog.split('\n');
  const contributors: ContributorInfo[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Format: "   266\tAuthor Name <email@domain.com>"
    const match = line.trim().match(/^(\d+)\s+(.+)\s+<(.+)>$/);
    if (match) {
      contributors.push({
        commits: parseInt(match[1], 10),
        name: match[2].trim(),
        email: match[3].trim(),
      });
    }
  }

  return contributors;
}

// 5. Analytics
export async function getAnalytics(repoPath: string): Promise<AnalyticsInfo> {
  const commits = await getCommits(repoPath);
  const totalCommits = commits.length;
  
  // Total contributors
  const contributors = await getContributors(repoPath);
  const totalContributors = contributors.length;

  // Commits by Date & Most Modified Files
  const commitsByDate: { [date: string]: number } = {};
  const fileFrequencies: { [file: string]: number } = {};

  // For modified files, let's get all files changed in all commits.
  // Using native git log with name-only is much faster.
  const nameOnlyOutput = await runGitCommand(repoPath, ['log', '--all', '--name-only', '--pretty=format:']);
  const fileLines = nameOnlyOutput.split('\n');
  for (const file of fileLines) {
    const trimmed = file.trim();
    if (trimmed) {
      fileFrequencies[trimmed] = (fileFrequencies[trimmed] || 0) + 1;
    }
  }

  // Map to FileStats array
  const mostModifiedFiles: FileStats[] = Object.keys(fileFrequencies)
    .map(file => ({ file, count: fileFrequencies[file] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Parse commit timestamp dates
  for (const commit of commits) {
    const dateStr = new Date(commit.timestamp * 1000).toISOString().split('T')[0];
    commitsByDate[dateStr] = (commitsByDate[dateStr] || 0) + 1;
  }

  return {
    mostModifiedFiles,
    totalCommits,
    totalContributors,
    commitsByDate,
  };
}

export interface BranchComparison {
  aheadCount: number;
  behindCount: number;
  aheadCommits: CommitInfo[];
  behindCommits: CommitInfo[];
  changedFiles: { file: string; status: string }[];
}

export async function compareBranches(
  repoPath: string,
  base: string,
  target: string
): Promise<BranchComparison> {
  const formatStr = '%H|%P|%an|%ae|%at|%s|%D';

  // Helper to parse logs
  const parseLog = (logOutput: string): CommitInfo[] => {
    if (!logOutput.trim()) return [];
    return logOutput.split('\n').map(line => {
      const parts = line.split('|');
      return {
        sha: parts[0],
        parents: parts[1] ? parts[1].split(' ') : [],
        authorName: parts[2],
        authorEmail: parts[3],
        timestamp: parseInt(parts[4], 10),
        message: parts[5],
        refs: parts[6] ? parts[6].split(', ').map(r => r.trim()).filter(r => r.length > 0) : [],
      };
    });
  };

  // 1. Get counts
  const aheadCountStr = await runGitCommand(repoPath, ['rev-list', '--count', `${base}..${target}`]);
  const behindCountStr = await runGitCommand(repoPath, ['rev-list', '--count', `${target}..${base}`]);
  const aheadCount = parseInt(aheadCountStr.trim(), 10);
  const behindCount = parseInt(behindCountStr.trim(), 10);

  // 2. Get commits
  const aheadLog = await runGitCommand(repoPath, ['log', `--pretty=format:${formatStr}`, `${base}..${target}`]);
  const behindLog = await runGitCommand(repoPath, ['log', `--pretty=format:${formatStr}`, `${target}..${base}`]);
  const aheadCommits = parseLog(aheadLog);
  const behindCommits = parseLog(behindLog);

  // 3. Get file changes
  const diffStatus = await runGitCommand(repoPath, ['diff', '--name-status', `${base}..${target}`]);
  const changedFiles = diffStatus.split('\n').filter(line => line.trim().length > 0).map(line => {
    const [status, file] = line.split(/\s+/);
    return {
      file: file || status,
      status: status || 'M',
    };
  });

  return {
    aheadCount,
    behindCount,
    aheadCommits,
    behindCommits,
    changedFiles,
  };
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
}

export async function getFileTree(repoPath: string): Promise<TreeNode[]> {
  const output = await runGitCommand(repoPath, ['ls-files']);
  const files = output.split('\n').map(f => f.trim()).filter(f => f.length > 0);
  
  const root: TreeNode[] = [];
  
  const addPath = (parts: string[], fullPath: string, currentLevel: TreeNode[]) => {
    const name = parts[0];
    const isFile = parts.length === 1;
    
    let existingNode = currentLevel.find(n => n.name === name);
    if (!existingNode) {
      existingNode = {
        name,
        path: isFile ? fullPath : fullPath.substring(0, fullPath.indexOf(name) + name.length),
        type: isFile ? 'file' : 'dir',
      };
      if (!isFile) {
        existingNode.children = [];
      }
      currentLevel.push(existingNode);
    }
    
    if (!isFile && existingNode.children) {
      addPath(parts.slice(1), fullPath, existingNode.children);
    }
  };
  
  for (const file of files) {
    const parts = file.split('/');
    addPath(parts, file, root);
  }
  
  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => {
      if (n.children) sortTree(n.children);
    });
  };
  
  sortTree(root);
  return root;
}

export interface FileHistoryItem {
  sha: string;
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
}

export async function getFileHistory(repoPath: string, filePath: string): Promise<FileHistoryItem[]> {
  const formatStr = '%H|%an|%ae|%at|%s';
  const output = await runGitCommand(repoPath, ['log', '--follow', `--pretty=format:${formatStr}`, '--', filePath]);
  if (!output.trim()) return [];
  
  return output.split('\n').map(line => {
    const parts = line.split('|');
    return {
      sha: parts[0],
      authorName: parts[1],
      authorEmail: parts[2],
      timestamp: parseInt(parts[3], 10),
      message: parts[4],
    };
  });
}
