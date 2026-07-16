import express, { Request, Response } from 'express';
import cors from 'cors';
import { getRepoInfo, getCommits, getCommitDetails, getContributors, getAnalytics } from './git';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Helper middleware/util to resolve repository path
function getPath(req: Request): string {
  const repoPath = req.query.path as string;
  return repoPath ? repoPath.trim() : process.cwd();
}

// 1. Repo Info
app.get('/api/repo-info', async (req: Request, res: Response) => {
  const repoPath = getPath(req);
  try {
    const info = await getRepoInfo(repoPath);
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Commits List (supports filtering by branch and search term)
app.get('/api/commits', async (req: Request, res: Response) => {
  const repoPath = getPath(req);
  const branch = req.query.branch as string | undefined;
  const search = req.query.search as string | undefined;
  try {
    const commits = await getCommits(repoPath, branch, search);
    res.json(commits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Commit Details
app.get('/api/commit/:sha', async (req: Request, res: Response) => {
  const repoPath = getPath(req);
  const { sha } = req.params;
  try {
    const details = await getCommitDetails(repoPath, sha);
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Contributors
app.get('/api/contributors', async (req: Request, res: Response) => {
  const repoPath = getPath(req);
  try {
    const stats = await getContributors(repoPath);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Analytics
app.get('/api/analytics', async (req: Request, res: Response) => {
  const repoPath = getPath(req);
  try {
    const analytics = await getAnalytics(repoPath);
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date() });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
