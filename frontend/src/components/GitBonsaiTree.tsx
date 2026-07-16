import React, { useEffect, useRef, useState } from 'react';
import type { GraphCommit } from '../utils/graphLayout';
import { Play, Pause, RotateCcw, AlertCircle } from 'lucide-react';

interface GitBonsaiTreeProps {
  commits: GraphCommit[];
  onSelectCommit: (sha: string) => void;
  selectedSha: string | null;
}

interface RenderNode {
  sha: string;
  message: string;
  author: string;
  branch: string;
  tags: string[];
  parents: string[];
  x: number;
  y: number;
  angle: number;
  type: 'root' | 'standard' | 'merge';
}

export const GitBonsaiTree: React.FC<GitBonsaiTreeProps> = ({
  commits,
  onSelectCommit,
  selectedSha,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredNode, setHoveredNode] = useState<RenderNode | null>(null);
  const [nodes, setNodes] = useState<RenderNode[]>([]);

  // Reset visibility when commits change
  useEffect(() => {
    setVisibleCount(commits.length);
    setIsPlaying(false);
  }, [commits]);

  // Layout algorithm: Calculate botanical branch coordinates (from oldest to newest)
  useEffect(() => {
    if (commits.length === 0) return;

    const width = 800;
    const height = 550;
    const stepLength = 28;

    // Order from oldest to newest for growing
    const orderedCommits = [...commits].reverse();
    const computedNodes: RenderNode[] = [];

    // Keep track of active growth tips per branch name
    const branchTips: { [branch: string]: { x: number; y: number; angle: number } } = {};

    orderedCommits.forEach((commit, idx) => {
      // Find branch name
      let branchName = 'main';
      commit.refs.forEach(r => {
        if (r.startsWith('HEAD -> ')) branchName = r.replace('HEAD -> ', '');
        else if (r.startsWith('refs/heads/')) branchName = r.replace('refs/heads/', '');
      });

      // Filter tags
      const tags = commit.refs.filter(r => r.startsWith('tag: ')).map(r => r.replace('tag: ', ''));

      // If first commit (the root base of the trunk)
      if (idx === 0 || commit.parents.length === 0) {
        const rootNode: RenderNode = {
          sha: commit.sha,
          message: commit.message,
          author: commit.authorName,
          branch: branchName,
          tags,
          parents: [],
          x: width / 2,
          y: height - 50,
          angle: -Math.PI / 2, // Grow straight up
          type: 'root',
        };
        computedNodes.push(rootNode);
        branchTips[branchName] = { x: rootNode.x, y: rootNode.y, angle: rootNode.angle };
        return;
      }

      // Find parent coordinates
      const primaryParentSha = commit.parents[0];
      const parentNode = computedNodes.find(n => n.sha === primaryParentSha);

      let startX = width / 2;
      let startY = height - 50;
      let startAngle = -Math.PI / 2;

      if (parentNode) {
        startX = parentNode.x;
        startY = parentNode.y;
        startAngle = parentNode.angle;
      } else {
        // Fallback to active tip of branch
        const tip = branchTips[branchName] || Object.values(branchTips)[0];
        if (tip) {
          startX = tip.x;
          startY = tip.y;
          startAngle = tip.angle;
        }
      }

      // Determine angle split
      let angle = startAngle;
      
      // If we split off into a different branch, angle it away
      const parentBranch = parentNode?.branch || 'main';
      if (branchName !== parentBranch) {
        // Find split direction
        const branchHash = branchName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const isLeft = branchHash % 2 === 0;
        angle = startAngle + (isLeft ? -0.45 : 0.45);
      } else {
        // Main growth wiggles organically
        angle = startAngle + (Math.sin(idx) * 0.08);
      }

      const x = startX + Math.cos(angle) * stepLength;
      const y = startY + Math.sin(angle) * stepLength;

      const isMerge = commit.parents.length > 1;

      const newNode: RenderNode = {
        sha: commit.sha,
        message: commit.message,
        author: commit.authorName,
        branch: branchName,
        tags,
        parents: commit.parents,
        x,
        y,
        angle,
        type: isMerge ? 'merge' : 'standard',
      };

      computedNodes.push(newNode);
      branchTips[branchName] = { x, y, angle };
    });

    setNodes(computedNodes);
  }, [commits]);

  // Animation timeline player loop
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= commits.length) {
            setIsPlaying(false);
            return commits.length;
          }
          return prev + 1;
        });
      }, 350);

      return () => clearInterval(interval);
    }
  }, [isPlaying, commits]);

  // Main Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background stardust / atmosphere
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid overlay for sci-fi look
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (nodes.length === 0) return;

    // Slice to visible commits for timeline replay
    const visibleNodes = nodes.slice(0, visibleCount);

    // 1. Draw Branching Limbs (lines)
    visibleNodes.forEach(node => {
      node.parents.forEach((parentSha, idx) => {
        const parentNode = nodes.find(n => n.sha === parentSha);
        if (!parentNode) return;

        ctx.beginPath();
        ctx.moveTo(parentNode.x, parentNode.y);

        const isSecondaryParent = idx > 0; // merge vine
        if (isSecondaryParent) {
          // Draw curved vine for merge connection
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 1.5;
          const xc = (parentNode.x + node.x) / 2 + 15;
          const yc = (parentNode.y + node.y) / 2 - 15;
          ctx.quadraticCurveTo(xc, yc, node.x, node.y);
          ctx.stroke();
        } else {
          // Draw organic wood limb
          ctx.strokeStyle = node.branch === 'main' ? '#4f46e5' : '#10b981';
          ctx.lineWidth = Math.max(1.5, 5 - (nodes.indexOf(node) / nodes.length) * 3.5);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        }
      });
    });

    // Helper to draw a beautiful leaf shape
    const drawLeaf = (cx: number, cy: number, angle: number, size: number, color: string, glow: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Glow effect
      if (glow) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
      }

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size / 2, -size / 2, size, 0);
      ctx.quadraticCurveTo(size / 2, size / 2, 0, 0);
      ctx.fillStyle = color;
      ctx.fill();

      // Leaf vein
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    };

    // Helper to draw release flowers
    const drawFlower = (cx: number, cy: number, size: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';

      ctx.fillStyle = '#f43f5e';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(0, -size / 2, size / 2.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.rotate((2 * Math.PI) / 5);
      }
      ctx.beginPath();
      ctx.arc(0, 0, size / 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#fef08a'; // yellow center
      ctx.fill();
      ctx.restore();
    };

    // 2. Draw Commit Leaves
    visibleNodes.forEach(node => {
      const isSelected = selectedSha === node.sha;
      const isHovered = hoveredNode?.sha === node.sha;
      const highlight = isSelected || isHovered;

      let leafColor = node.branch === 'main' ? '#818cf8' : '#34d399';
      if (node.type === 'merge') leafColor = '#fbbf24'; // merge leaves are amber

      // Draw leaf angling off the limb direction
      const leftLeafAngle = node.angle - Math.PI / 3;
      const rightLeafAngle = node.angle + Math.PI / 3;

      const leafSize = highlight ? 18 : 12;

      // Draw double leaves for highlighted nodes
      drawLeaf(node.x, node.y, leftLeafAngle, leafSize, leafColor, highlight);
      if (highlight) {
        drawLeaf(node.x, node.y, rightLeafAngle, leafSize - 3, leafColor, true);
      }

      // Draw blossoms/flowers on tag releases
      if (node.tags.length > 0) {
        drawFlower(node.x - 8, node.y - 8, 10);
      }
    });

  }, [nodes, visibleCount, selectedSha, hoveredNode]);

  // Handle canvas mouse move for interactive node hovering
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find node within click range (18px radius)
    const activeNodes = nodes.slice(0, visibleCount);
    const hit = activeNodes.find(n => {
      const dist = Math.hypot(n.x - x, n.y - y);
      return dist < 18;
    });

    setHoveredNode(hit || null);
  };

  const handleMouseClick = () => {
    if (hoveredNode) {
      onSelectCommit(hoveredNode.sha);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls HUD */}
      <div className="flex items-center justify-between bg-slate-900/60 px-6 py-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Bonsai Tree Replay</span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({visibleCount} / {commits.length} commits grown)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (visibleCount === commits.length) setVisibleCount(1);
              setIsPlaying(true);
            }}
            disabled={isPlaying}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={12} fill="currentColor" /> Grow Tree
          </button>
          <button
            onClick={() => setIsPlaying(false)}
            disabled={!isPlaying}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Pause size={12} fill="currentColor" /> Pause
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setVisibleCount(1);
            }}
            className="bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={12} /> Reset Soil
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Main Canvas Viewport (Left columns, 3/4) */}
        <div ref={containerRef} className="lg:col-span-3 bg-slate-900/40 rounded-2xl border border-slate-800/80 overflow-hidden backdrop-blur-md relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={550}
            onMouseMove={handleMouseMove}
            onClick={handleMouseClick}
            className="w-full max-w-[800px] h-auto cursor-crosshair block"
          />

          {/* Sci-fi guide overlay */}
          <div className="absolute top-4 left-4 pointer-events-none text-[10px] text-slate-500 font-mono space-y-1 select-none">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded bg-amber-500" />
              <span>Main Trunk (main branch)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded bg-emerald-500" />
              <span>Feature Limbs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded bg-amber-500" />
              <span>Merge Vines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded bg-rose-500 animate-pulse" />
              <span>Tag Releases (Cherry Blossoms)</span>
            </div>
          </div>
        </div>

        {/* Botanical Commit Details HUD (Right column, 1/4) */}
        <div className="lg:col-span-1 bg-slate-950/30 p-5 rounded-2xl border border-slate-800/60 flex flex-col justify-between h-full min-h-[400px]">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2 select-none">
              Botanical HUD console
            </span>

            {hoveredNode || selectedSha ? (
              (() => {
                const node = hoveredNode || nodes.find(n => n.sha === selectedSha);
                if (!node) return null;

                return (
                  <div className="space-y-4">
                    <div className="border-b border-slate-800/80 pb-3">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                        {node.branch}
                      </span>
                      <h4 className="font-bold text-sm text-slate-200 mt-2">{node.message}</h4>
                      <span className="text-[9px] font-mono text-slate-500 block mt-1 break-all select-all">
                        SHA: {node.sha}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Sprouted By</span>
                        <span className="font-semibold text-slate-300">{node.author}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Limb Type</span>
                        <span className="font-semibold text-slate-300 uppercase text-[10px]">
                          {node.type === 'root' ? 'Root Seed' : node.type === 'merge' ? 'Grafted Vine (Merge)' : 'Limb Leaf'}
                        </span>
                      </div>
                      {node.tags.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-500 block">Blossoms (Tags)</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {node.tags.map(t => (
                              <span key={t} className="px-1 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-xs text-slate-500 italic py-12 text-center">
                Hover or click on a leaf node of the Bonsai to examine its properties.
              </div>
            )}
          </div>

          <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3.5 text-[10px] text-slate-400 flex items-start gap-2 leading-relaxed">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span>Clicking a leaf selects the commit. Dragging the timeline causes the tree to grow limb-by-limb!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
