import { getRepoInfo, getCommits } from './git';

async function main() {
  console.log('Testing git parser against the current workspace directory...');
  const repoPath = process.cwd();
  
  try {
    const info = await getRepoInfo(repoPath);
    console.log('Repo Info:', JSON.stringify(info, null, 2));

    const commits = await getCommits(repoPath);
    console.log(`Found ${commits.length} commits.`);
    if (commits.length > 0) {
      console.log('First Commit preview:', JSON.stringify(commits[0], null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();
