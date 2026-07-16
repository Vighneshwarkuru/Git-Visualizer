export interface GraphRoute {
  from: number; // column index in the current row
  to: number;   // column index in the next row
  sha: string;  // target commit SHA
}

export interface GraphCommit {
  sha: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  timestamp: number;
  message: string;
  refs: string[];
  column: number;
  routes: GraphRoute[];
}

/**
 * Computes grid columns and routing lines to connect commits in a git history log.
 */
export function computeGraphLayout(commits: any[]): GraphCommit[] {
  const activeTracks: string[] = [];
  const layoutCommits: GraphCommit[] = [];

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const sha = commit.sha;

    // Find or assign column for current commit
    let col = activeTracks.indexOf(sha);
    if (col === -1) {
      // Find first empty slot or append
      col = activeTracks.findIndex(track => !track);
      if (col === -1) {
        col = activeTracks.length;
        activeTracks.push(sha);
      } else {
        activeTracks[col] = sha;
      }
    }

    // Determine routes to parents for the next row
    const routes: GraphRoute[] = [];
    const parents = commit.parents;

    // Create a copy of current tracks to mutate for the next row
    const nextTracks = [...activeTracks];

    // Remove the current commit from next row's active tracks (it is consumed)
    nextTracks[col] = '';

    parents.forEach((parentSha: string, index: number) => {
      // Find if parent already has a track in nextTracks
      let parentCol = nextTracks.indexOf(parentSha);
      if (parentCol === -1) {
        // If first parent, try to put it in the same column as the child (if available)
        if (index === 0 && nextTracks[col] === '') {
          parentCol = col;
          nextTracks[col] = parentSha;
        } else {
          // Find first empty slot or append
          parentCol = nextTracks.findIndex(track => !track);
          if (parentCol === -1) {
            parentCol = nextTracks.length;
            nextTracks.push(parentSha);
          } else {
            nextTracks[parentCol] = parentSha;
          }
        }
      }

      routes.push({
        from: col,
        to: parentCol,
        sha: parentSha,
      });
    });

    // Pass through any other active tracks that aren't the current commit
    for (let trackCol = 0; trackCol < activeTracks.length; trackCol++) {
      const trackSha = activeTracks[trackCol];
      if (trackSha && trackSha !== sha) {
        // Route straight down
        routes.push({
          from: trackCol,
          to: trackCol,
          sha: trackSha,
        });
        nextTracks[trackCol] = trackSha;
      }
    }

    layoutCommits.push({
      ...commit,
      column: col,
      routes,
    });

    // Update active tracks for next iteration
    // Clean up trailing empty tracks to keep the list compact
    while (nextTracks.length > 0 && !nextTracks[nextTracks.length - 1]) {
      nextTracks.pop();
    }
    activeTracks.length = 0;
    activeTracks.push(...nextTracks);
  }

  return layoutCommits;
}
