import React from 'react';
import { BarChart3, Users, Flame, FileText, GitCommit, PieChart, Activity } from 'lucide-react';
import { TreeMap } from './TreeMap';

interface FileStats {
  file: string;
  count: number;
}

interface ContributorInfo {
  name: string;
  email: string;
  commits: number;
}

interface AnalyticsInfo {
  mostModifiedFiles: FileStats[];
  totalCommits: number;
  totalContributors: number;
  commitsByDate: { [date: string]: number };
}

interface AnalyticsDashboardProps {
  analytics: AnalyticsInfo | null;
  contributors: ContributorInfo[];
  loading: boolean;
}

const DONUT_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analytics,
  contributors,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-400 mt-2">Analyzing repository history...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-12 text-slate-500">
        No analytics data available. Make sure the repository is loaded.
      </div>
    );
  }

  // Calculate Language/Extension distribution
  const getLanguageDistribution = () => {
    const extCounts: { [ext: string]: number } = {};
    let total = 0;

    analytics.mostModifiedFiles.forEach(f => {
      let ext = f.file.split('.').pop() || 'other';
      if (ext.length > 5 || ext === f.file) ext = 'other';
      ext = ext.toLowerCase();
      extCounts[ext] = (extCounts[ext] || 0) + f.count;
      total += f.count;
    });

    return Object.keys(extCounts)
      .map(ext => ({
        name: ext === 'other' ? 'Other' : `.${ext}`,
        count: extCounts[ext],
        percentage: Math.round((extCounts[ext] / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // Calculate Weekly Commit Distribution
  const getWeeklyDistribution = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    Object.keys(analytics.commitsByDate).forEach(dateStr => {
      const day = new Date(dateStr).getDay();
      counts[day] += analytics.commitsByDate[dateStr];
    });
    return [
      { name: 'Sun', count: counts[0] },
      { name: 'Mon', count: counts[1] },
      { name: 'Tue', count: counts[2] },
      { name: 'Wed', count: counts[3] },
      { name: 'Thu', count: counts[4] },
      { name: 'Fri', count: counts[5] },
      { name: 'Sat', count: counts[6] },
    ];
  };

  // Calculate Commits Over Time data
  const getCommitsOverTime = () => {
    const sortedDates = Object.keys(analytics.commitsByDate).sort();
    const recentDates = sortedDates.slice(-12);
    return recentDates.map(dateStr => {
      const parts = dateStr.split('-');
      return {
        label: `${parts[1]}/${parts[2]}`,
        count: analytics.commitsByDate[dateStr],
      };
    });
  };

  // Render Contribution Heatmap (last 12 weeks)
  const renderHeatmap = () => {
    const today = new Date();
    const cells: { dateStr: string; dateObj: Date; count: number }[] = [];
    
    const startDate = new Date();
    startDate.setDate(today.getDate() - 14 * 7); // 14 weeks ago
    const startDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDay);

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = analytics.commitsByDate[dateStr] || 0;
      cells.push({
        dateStr,
        dateObj: new Date(currentDate),
        count,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    type CalendarCell = { dateStr: string; dateObj: Date; count: number };
    const columns: CalendarCell[][] = [];
    let currentWeek: CalendarCell[] = [];
    
    cells.forEach(cell => {
      currentWeek.push(cell);
      if (currentWeek.length === 7) {
        columns.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      columns.push(currentWeek);
    }

    const getColorClass = (count: number) => {
      if (count === 0) return 'bg-slate-900 border-slate-950/20';
      if (count <= 2) return 'bg-amber-950/40 text-amber-400 border-amber-900/30';
      if (count <= 5) return 'bg-amber-800/40 text-amber-300 border-amber-700/40';
      if (count <= 9) return 'bg-amber-600/70 text-amber-200 border-amber-500/50';
      return 'bg-amber-500 text-white border-amber-400';
    };

    return (
      <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60">
        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Flame size={16} className="text-amber-500" /> Contribution Activity Calendar
        </h4>
        <div className="flex overflow-x-auto pb-2">
          <div className="flex gap-1.5 mx-auto">
            <div className="flex flex-col justify-between text-[10px] text-slate-500 pr-2 font-mono h-[84px] py-1 select-none">
              <span>Sun</span>
              <span>Wed</span>
              <span>Sat</span>
            </div>
            {columns.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map(day => (
                  <div
                    key={day.dateStr}
                    className={`w-3.5 h-3.5 rounded-sm border ${getColorClass(day.count)} transition-all duration-200`}
                    title={`${day.dateStr}: ${day.count} commits`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end items-center gap-1.5 mt-3 text-[10px] text-slate-500 select-none">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-950/20" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-950/40 border border-amber-900/30" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-800/40 border border-amber-700/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-600/70 border border-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 border border-amber-400" />
          <span>More</span>
        </div>
      </div>
    );
  };

  // Render SVG Donut Chart
  const renderDonutChart = () => {
    const dist = getLanguageDistribution();
    let accumulatedAngle = 0;
    const r = 50;
    const cx = 70;
    const cy = 70;
    const circumference = 2 * Math.PI * r;

    return (
      <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60 flex flex-col h-[320px]">
        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <PieChart size={16} className="text-amber-400" /> Codebase Composition
        </h4>
        <div className="flex items-center justify-around flex-1">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
              {dist.map((item, idx) => {
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedAngle;
                accumulatedAngle += (item.percentage / 100) * circumference;
                const color = DONUT_COLORS[idx % DONUT_COLORS.length];

                return (
                  <circle
                    key={item.name}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="transparent"
                    stroke={color}
                    strokeWidth="18"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-350 hover:stroke-[22px] cursor-pointer"
                  >
                    <title>{`${item.name}: ${item.percentage}%`}</title>
                  </circle>
                );
              })}
              {/* Inner cutout */}
              <circle cx={cx} cy={cy} r="38" fill="#0f172a" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Files</span>
              <span className="text-lg font-black text-slate-200">{analytics.mostModifiedFiles.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 font-mono text-[10px]">
            {dist.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                />
                <span className="text-slate-300 font-bold w-12">{item.name}</span>
                <span className="text-slate-500">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render SVG Weekly Bar Chart
  const renderWeeklyBarChart = () => {
    const data = getWeeklyDistribution();
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const height = 150;
    const width = 280;
    const barWidth = 24;
    const gap = 12;

    return (
      <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60 flex flex-col h-[320px]">
        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-emerald-400" /> Commits by Weekday
        </h4>
        <div className="flex-1 flex flex-col justify-end items-center">
          <svg viewBox={`0 0 ${width} ${height + 25}`} className="w-full max-w-[280px]">
            {data.map((item, idx) => {
              const barHeight = (item.count / maxCount) * height;
              const x = idx * (barWidth + gap) + 18;
              const y = height - barHeight;

              return (
                <g key={item.name} className="group cursor-pointer">
                  {/* Glowing backdrop */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    fill="#10b981"
                    opacity="0.15"
                    className="blur-sm group-hover:opacity-30 transition-opacity"
                  />
                  {/* Solid bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    fill="#10b981"
                    opacity="0.75"
                    className="group-hover:fill-emerald-400 transition-colors"
                  />
                  {/* Hover count text */}
                  {item.count > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {item.count}
                    </text>
                  )}
                  {/* Weekday label */}
                  <text
                    x={x + barWidth / 2}
                    y={height + 15}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="group-hover:fill-slate-300 transition-colors"
                  >
                    {item.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Render SVG Commits Over Time Area Chart
  const renderAreaChart = () => {
    const data = getCommitsOverTime();
    if (data.length === 0) return null;

    const maxCount = Math.max(...data.map(d => d.count), 1);
    const height = 140;
    const width = 640;
    const padding = 20;

    // Calculate line points
    const points = data.map((item, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      const y = height - (item.count / maxCount) * (height - 2 * padding);
      return { x, y };
    });

    const pathD = points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      : '';

    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : '';

    return (
      <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60">
        <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-amber-400" /> Commits Timeline (Last 12 Active Days)
        </h4>
        <div className="w-full">
          <svg viewBox={`0 0 ${width} ${height + 25}`} className="w-full">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
            <line x1={padding} y1={height} x2={width - padding} y2={height} stroke="#334155" opacity="0.3" />

            {/* Filled area */}
            <path d={areaD} fill="url(#areaGradient)" />

            {/* Stroke path */}
            <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" />

            {/* Nodes */}
            {points.map((p, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={p.x} cy={p.y} r="8" fill="#6366f1" opacity="0" className="group-hover:opacity-30 transition-opacity" />
                <text
                  x={p.x}
                  y={p.y - 10}
                  fill="#e2e8f0"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {data[idx].count}
                </text>
                <text
                  x={p.x}
                  y={height + 15}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {data[idx].label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Commits</span>
            <div className="text-2xl font-black text-slate-100 mt-1">{analytics.totalCommits}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <GitCommit size={20} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Contributors</span>
            <div className="text-2xl font-black text-slate-100 mt-1">{analytics.totalContributors}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/60 rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unique File Hits</span>
            <div className="text-2xl font-black text-slate-100 mt-1">{analytics.mostModifiedFiles.length}+</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileText size={20} />
          </div>
        </div>
      </div>

      {/* Heatmap */}
      {renderHeatmap()}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderDonutChart()}
        {renderWeeklyBarChart()}
      </div>

      {/* Timeline Area Chart */}
      {renderAreaChart()}

      {/* Codebase TreeMap */}
      <TreeMap files={analytics.mostModifiedFiles} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hotspots */}
        <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60 flex flex-col h-[400px]">
          <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-500" /> Top File Hotspots (Most Changed)
          </h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {analytics.mostModifiedFiles.map((fileStats, idx) => (
              <div key={fileStats.file} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold font-mono">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-slate-300 truncate" title={fileStats.file}>
                    {fileStats.file}
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (fileStats.count / analytics.mostModifiedFiles[0].count) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-bold font-mono pl-2">{fileStats.count}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contributors */}
        <div className="bg-slate-950/30 rounded-xl p-6 border border-slate-800/60 flex flex-col h-[400px]">
          <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Users size={16} className="text-amber-400" /> Contributor Leaderboard
          </h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {contributors.map((contrib) => (
              <div key={contrib.email} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 hover:bg-slate-800/20 border border-slate-800/40">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-purple-600 text-xs font-black flex items-center justify-center text-white flex-shrink-0">
                    {contrib.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{contrib.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{contrib.email}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-black font-mono text-amber-400">{contrib.commits}</span>
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">commits</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
