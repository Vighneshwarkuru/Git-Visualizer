import { useState } from 'react';
import type { GraphCommit } from '../utils/graphLayout';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CommitGraphProps {
  commits: GraphCommit[];
  selectedSha: string | null;
  onSelectCommit: (sha: string) => void;
  rowHeight?: number;
}

const COLORS = [
  '#f59e0b', // Pulsing Gold
  '#f43f5e', // Coral Copper
  '#10b981', // Jade Green
  '#38bdf8', // Ice Blue
  '#c084fc', // Amethyst Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#fb923c', // Amber/Orange
];

export const CommitGraph: React.FC<CommitGraphProps> = ({
  commits,
  selectedSha,
  onSelectCommit,
  rowHeight: baseRowHeight = 48,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [hoveredSha, setHoveredSha] = useState<string | null>(null);

  if (commits.length === 0) {
    return <div className="text-slate-400 p-8 text-center">No commits found.</div>;
  }

  // Calculate dynamic dimensions based on zoom factor
  const columnWidth = 24 * zoom;
  const rowHeight = baseRowHeight * zoom;

  // Determine max column
  let maxCol = 0;
  commits.forEach(c => {
    maxCol = Math.max(maxCol, c.column);
    c.routes.forEach(r => {
      maxCol = Math.max(maxCol, r.from, r.to);
    });
  });

  const svgWidth = (maxCol + 1) * columnWidth + 24;
  const svgHeight = commits.length * rowHeight;

  // Compute Ancestors & Descendants for path highlighting
  const getHighlightedShas = (): Set<string> => {
    const highlighted = new Set<string>();
    if (!hoveredSha) return highlighted;

    highlighted.add(hoveredSha);

    // 1. Ancestors (Parents)
    const queue = [hoveredSha];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const commit = commits.find(c => c.sha === current);
      if (commit) {
        commit.parents.forEach(p => {
          highlighted.add(p);
          queue.push(p);
        });
      }
    }

    // 2. Descendants (Children)
    let foundNew = true;
    while (foundNew) {
      foundNew = false;
      for (let i = commits.length - 1; i >= 0; i--) {
        const commit = commits[i];
        if (highlighted.has(commit.sha)) continue;

        const hasHighlightedParent = commit.parents.some(p => highlighted.has(p));
        if (hasHighlightedParent) {
          highlighted.add(commit.sha);
          foundNew = true;
        }
      }
    }

    return highlighted;
  };

  const highlightedShas = getHighlightedShas();
  const hasActiveHover = hoveredSha !== null;

  // Render SVG lines
  const renderGraphLines = () => {
    const paths: React.ReactNode[] = [];

    commits.forEach((commit, i) => {
      const yStart = i * rowHeight + rowHeight / 2;

      commit.routes.forEach((route, rIdx) => {
        const yEnd = (i + 1) * rowHeight + rowHeight / 2;
        const xStart = route.from * columnWidth + columnWidth / 2;
        const xEnd = route.to * columnWidth + columnWidth / 2;
        const color = COLORS[route.from % COLORS.length];

        // Highlight line if route is between two highlighted commits
        const isRouteHighlighted =
          hasActiveHover &&
          highlightedShas.has(commit.sha) &&
          highlightedShas.has(route.sha);

        const opacity = hasActiveHover ? (isRouteHighlighted ? '1.0' : '0.1') : '0.8';
        const strokeWidth = isRouteHighlighted ? '3.5' : '2.0';

        let pathData = '';
        if (xStart === xEnd) {
          pathData = `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
        } else {
          const yMid = (yStart + yEnd) / 2;
          pathData = `M ${xStart} ${yStart} C ${xStart} ${yMid}, ${xEnd} ${yMid}, ${xEnd} ${yEnd}`;
        }

        paths.push(
          <path
            key={`${commit.sha}-route-${rIdx}-${route.to}`}
            d={pathData}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={opacity}
            className="transition-all duration-200"
          />
        );
      });
    });

    return <g>{paths}</g>;
  };

  // Render SVG nodes
  const renderGraphNodes = () => {
    return commits.map((commit, i) => {
      const y = i * rowHeight + rowHeight / 2;
      const x = commit.column * columnWidth + columnWidth / 2;
      const color = COLORS[commit.column % COLORS.length];
      const isSelected = selectedSha === commit.sha;

      const isNodeHighlighted = !hasActiveHover || highlightedShas.has(commit.sha);
      const opacity = isNodeHighlighted ? '1.0' : '0.15';

      return (
        <g
          key={`${commit.sha}-node`}
          className="cursor-pointer group"
          opacity={opacity}
          onMouseEnter={() => setHoveredSha(commit.sha)}
          onMouseLeave={() => setHoveredSha(null)}
          onClick={() => onSelectCommit(commit.sha)}
        >
          {isSelected && (
            <circle
              cx={x}
              cy={y}
              r={10 * zoom}
              fill={color}
              opacity="0.4"
              className="animate-ping"
            />
          )}

          <circle
            cx={x}
            cy={y}
            r={isSelected ? 7.5 * zoom : 5.5 * zoom}
            fill={color}
            stroke="#0f172a"
            strokeWidth="1.5"
            className="transition-all duration-200 group-hover:scale-125"
          />

          <circle
            cx={x}
            cy={y}
            r={3 * zoom}
            fill="#ffffff"
            className="pointer-events-none"
          />
        </g>
      );
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Zoom / View controls bar */}
      <div className="flex items-center justify-between bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800/80 backdrop-blur-md">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          💡 Hover nodes to highlight ancestry paths
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] font-bold text-slate-500 font-mono select-none w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Graph Layout */}
      <div className="flex bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden backdrop-blur-md relative">
        {/* Graph SVG Column */}
        <div className="relative overflow-visible" style={{ width: svgWidth }}>
          <svg
            width={svgWidth}
            height={svgHeight}
            className="absolute top-0 left-0 overflow-visible pointer-events-none z-10"
          >
            {renderGraphLines()}
            {renderGraphNodes()}
          </svg>

          {/* Invisible interactive click rows */}
          {commits.map((commit, i) => (
            <div
              key={`${commit.sha}-click-zone`}
              onClick={() => onSelectCommit(commit.sha)}
              onMouseEnter={() => setHoveredSha(commit.sha)}
              onMouseLeave={() => setHoveredSha(null)}
              className="absolute cursor-pointer hover:bg-slate-800/20"
              style={{
                left: 0,
                top: i * rowHeight,
                width: svgWidth,
                height: rowHeight,
                zIndex: 1,
              }}
            />
          ))}
        </div>

        {/* Commit Log Details Column */}
        <div className="flex-1 overflow-x-auto min-w-0">
          {commits.map((commit) => {
            const isSelected = selectedSha === commit.sha;
            const isHighlighted = !hasActiveHover || highlightedShas.has(commit.sha);
            const opacity = isHighlighted ? 'opacity-100' : 'opacity-25';

            const dateStr = new Date(commit.timestamp * 1000).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            // Extract tags and branch names
            const tags: string[] = [];
            const branches: string[] = [];
            commit.refs.forEach(ref => {
              if (ref.includes('tag: ')) {
                tags.push(ref.replace('tag: ', ''));
              } else if (ref.startsWith('HEAD -> ')) {
                branches.push(ref.replace('HEAD -> ', ''));
              } else if (ref.startsWith('refs/heads/')) {
                branches.push(ref.replace('refs/heads/', ''));
              } else if (ref !== 'HEAD') {
                branches.push(ref);
              }
            });

            return (
              <div
                key={commit.sha}
                onClick={() => onSelectCommit(commit.sha)}
                onMouseEnter={() => setHoveredSha(commit.sha)}
                onMouseLeave={() => setHoveredSha(null)}
                className={`flex items-center px-4 cursor-pointer transition-all duration-150 border-b border-slate-800/30 ${opacity} ${
                  isSelected
                    ? 'bg-amber-500/10 border-l-2 border-amber-500'
                    : 'hover:bg-slate-800/30 border-l-2 border-transparent'
                }`}
                style={{ height: rowHeight }}
              >
                {/* Message & Tags */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 truncate text-sm">
                      {commit.message}
                    </span>

                    {/* Branches */}
                    {branches.map(branch => (
                      <span
                        key={branch}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0"
                      >
                        {branch}
                      </span>
                    ))}

                    {/* Tags */}
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Author Info */}
                <div className="w-36 text-slate-300 text-xs truncate flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0">
                    {commit.authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{commit.authorName}</span>
                </div>

                {/* SHA & Date */}
                <div className="w-48 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="text-slate-500">{commit.sha.substring(0, 7)}</span>
                  <span>{dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
