import React from 'react';
import { BarChart3 } from 'lucide-react';

interface FileStats {
  file: string;
  count: number;
}

interface TreeMapProps {
  files: FileStats[];
  width?: number;
  height?: number;
}

interface TreeItem {
  name: string;
  value: number;
  path: string;
  children?: TreeItem[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const TreeMap: React.FC<TreeMapProps> = ({
  files,
  width = 600,
  height = 300,
}) => {
  if (files.length === 0) {
    return <div className="text-slate-500 text-xs italic">No data to build map.</div>;
  }

  // 1. Build nested tree structure from files
  const buildTree = (): TreeItem => {
    const root: TreeItem = { name: 'root', value: 0, path: '', children: [] };

    files.forEach(f => {
      const parts = f.file.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        let node = current.children?.find(c => c.name === part);

        if (!node) {
          node = {
            name: part,
            value: index === parts.length - 1 ? f.count : 0,
            path,
          };
          if (index < parts.length - 1) {
            node.children = [];
          }
          current.children?.push(node);
        }

        if (index === parts.length - 1) {
          node.value = f.count;
        }
        current = node;
      });
    });

    // Compute sums of folder weights recursively
    const computeWeight = (node: TreeItem): number => {
      if (node.children && node.children.length > 0) {
        node.value = node.children.reduce((acc, c) => acc + computeWeight(c), 0);
      }
      return node.value;
    };

    computeWeight(root);
    return root;
  };

  // 2. Recursive Slice-and-Dice partition layout
  const computeLayout = (
    nodes: TreeItem[],
    rect: Rect,
    vertical: boolean
  ): { node: TreeItem; rect: Rect }[] => {
    if (nodes.length === 0) return [];
    if (nodes.length === 1) return [{ node: nodes[0], rect }];

    // Sort nodes descending
    nodes.sort((a, b) => b.value - a.value);

    // Split list into two halves of roughly equal weights
    const total = nodes.reduce((acc, n) => acc + n.value, 0);
    let halfSum = 0;
    let splitIdx = 0;

    for (let i = 0; i < nodes.length; i++) {
      halfSum += nodes[i].value;
      if (halfSum >= total / 2 || i === nodes.length - 1) {
        splitIdx = i + 1;
        break;
      }
    }

    const firstHalf = nodes.slice(0, splitIdx);
    const secondHalf = nodes.slice(splitIdx);

    const firstSum = firstHalf.reduce((acc, n) => acc + n.value, 0);
    const ratio = total > 0 ? firstSum / total : 0.5;

    let rect1: Rect;
    let rect2: Rect;

    if (vertical) {
      // Split horizontally (vertical partition line)
      const w1 = rect.w * ratio;
      rect1 = { x: rect.x, y: rect.y, w: w1, h: rect.h };
      rect2 = { x: rect.x + w1, y: rect.y, w: rect.w - w1, h: rect.h };
    } else {
      // Split vertically (horizontal partition line)
      const h1 = rect.h * ratio;
      rect1 = { x: rect.x, y: rect.y, w: rect.w, h: h1 };
      rect2 = { x: rect.x, y: rect.y + h1, w: rect.w, h: rect.h - h1 };
    }

    // Toggle split direction for next depth to keep blocks squarish
    const nextSplit = !vertical;

    return [
      ...computeLayout(firstHalf, rect1, nextSplit),
      ...computeLayout(secondHalf, rect2, nextSplit),
    ];
  };

  const root = buildTree();
  const leafNodes = computeLayout(root.children || [], { x: 0, y: 0, w: width, h: height }, true);

  // Group top-level folders to assign color palettes
  const getBlockColor = (path: string) => {
    if (path.startsWith('backend')) return 'fill-amber-650/40 stroke-amber-500/30';
    if (path.startsWith('frontend')) return 'fill-emerald-650/40 stroke-emerald-500/30';
    return 'fill-slate-800/40 stroke-slate-700/30';
  };

  return (
    <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60 flex flex-col">
      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-amber-400" /> Repository TreeMap (Visual Hotspots)
      </h4>
      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto rounded-lg overflow-hidden border border-slate-900 bg-slate-950"
        >
          {leafNodes.map(({ node, rect }) => {
            // Avoid drawing zero size rects
            if (rect.w < 2 || rect.h < 2) return null;

            return (
              <g key={node.path} className="group cursor-pointer">
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  className={`transition-all duration-200 hover:brightness-125 ${getBlockColor(
                    node.path
                  )}`}
                  strokeWidth="1"
                />
                <title>{`${node.path}\nChanges: ${node.value}`}</title>
                {rect.w > 60 && rect.h > 20 && (
                  <text
                    x={rect.x + 8}
                    y={rect.y + 16}
                    fill="#e2e8f0"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    className="select-none pointer-events-none opacity-80"
                  >
                    {node.name}
                  </text>
                )}
                {rect.w > 60 && rect.h > 32 && (
                  <text
                    x={rect.x + 8}
                    y={rect.y + 28}
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                    className="select-none pointer-events-none opacity-60"
                  >
                    {node.value} changes
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-mono select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500/30" />
          <span>Backend Files</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/30" />
          <span>Frontend Files</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-slate-800/40 border border-slate-700/30" />
          <span>Other Files</span>
        </div>
      </div>
    </div>
  );
};
