export interface SandboxCommit {
  id: string;
  message: string;
  parents: string[];
  branch: string;
  isMerge?: boolean;
}

export interface SandboxState {
  commits: SandboxCommit[];
  branches: string[];
  currentBranch: string;
  stagedFiles: string[];
  unstagedFiles: string[];
}

export interface GitMission {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate';
  concept: string;
  description: string;
  instructions: string[];
  initialState: SandboxState;
  validate: (state: SandboxState) => boolean;
}

export const GIT_MISSIONS: GitMission[] = [
  {
    id: 'commit',
    title: '1. The Snapshot (git commit)',
    difficulty: 'Beginner',
    concept: 'A commit is like saving a game. It takes a snapshot of your staged changes and saves them permanently in history.',
    description: 'Stage your unstaged modifications, then create a new commit to record your work in the sandbox history.',
    instructions: [
      'Click the unstaged file box named "index.html" to stage it.',
      'Enter a commit message (e.g., "Add home page structure") in the input box.',
      'Click "Commit" to create your first commit box!'
    ],
    initialState: {
      commits: [
        { id: 'c1', message: 'Initial commit', parents: [], branch: 'main' }
      ],
      branches: ['main'],
      currentBranch: 'main',
      stagedFiles: [],
      unstagedFiles: ['index.html']
    },
    validate: (state) => {
      // Valid if they have made at least one new commit on the main branch
      return state.commits.length > 1 && state.commits[state.commits.length - 1].branch === 'main';
    }
  },
  {
    id: 'branch',
    title: '2. Parallel Timelines (git branch)',
    difficulty: 'Beginner',
    concept: 'Branches let you work on new features in an isolated timeline without messing up the main stable branch.',
    description: 'Create a new branch named "feature-login" to start working on a login form separately.',
    instructions: [
      'Locate the "Branch" input action.',
      'Type "feature-login" as the branch name.',
      'Click "Create Branch" to split your pipeline timeline!'
    ],
    initialState: {
      commits: [
        { id: 'c1', message: 'Initial commit', parents: [], branch: 'main' },
        { id: 'c2', message: 'Set up server configuration', parents: ['c1'], branch: 'main' }
      ],
      branches: ['main'],
      currentBranch: 'main',
      stagedFiles: [],
      unstagedFiles: []
    },
    validate: (state) => {
      // Valid if they have created a branch named 'feature-login'
      return state.branches.includes('feature-login');
    }
  },
  {
    id: 'checkout',
    title: '3. Teleporting (git checkout)',
    difficulty: 'Beginner',
    concept: 'Switching branches moves your active workspace pointer (HEAD) to that branch so any new commits are added there.',
    description: 'Switch onto your new "feature-login" branch and make a commit representing your logins code.',
    instructions: [
      'Select "feature-login" from the checkout selector or click switch.',
      'Verify that the active branch pointer moves to "feature-login".',
      'Stage the file "login.js" by clicking on it.',
      'Type a message and click "Commit" to add it to the feature branch.'
    ],
    initialState: {
      commits: [
        { id: 'c1', message: 'Initial commit', parents: [], branch: 'main' }
      ],
      branches: ['main', 'feature-login'],
      currentBranch: 'main',
      stagedFiles: [],
      unstagedFiles: ['login.js']
    },
    validate: (state) => {
      // Valid if they are on branch 'feature-login' and there is a commit on it
      const currentCommit = state.commits[state.commits.length - 1];
      return state.currentBranch === 'feature-login' && currentCommit.branch === 'feature-login';
    }
  },
  {
    id: 'merge',
    title: '4. Bringing it Together (git merge)',
    difficulty: 'Intermediate',
    concept: 'Merging takes the changes from one branch and merges them back into another branch (e.g. main), creating a Merge Commit.',
    description: 'Merge the changes from "feature-login" back into the "main" branch.',
    instructions: [
      'Switch back to the "main" branch (checkout main).',
      'Select "feature-login" in the Merge dropdown selector.',
      'Click "Merge Branch" to combine the timelines and create a merge block node!'
    ],
    initialState: {
      commits: [
        { id: 'c1', message: 'Initial commit', parents: [], branch: 'main' },
        { id: 'c2', message: 'Add login panel UI', parents: ['c1'], branch: 'feature-login' }
      ],
      branches: ['main', 'feature-login'],
      currentBranch: 'feature-login',
      stagedFiles: [],
      unstagedFiles: []
    },
    validate: (state) => {
      // Valid if they are on 'main' and there is a merge commit merging feature-login
      const currentCommit = state.commits[state.commits.length - 1];
      return state.currentBranch === 'main' && currentCommit.isMerge === true;
    }
  }
];
