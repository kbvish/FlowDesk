import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  CheckCircle2, Flame, TrendingUp, BookOpen, Smile, 
  Calendar, PieChart as PieIcon, Award, Sparkles
} from 'lucide-react';
import { useDataStore, useThemeStore } from '../hooks/useStore';
import { cn } from '../utils/cn';

const ACCENT_COLORS_HEX = {
  indigo: '#6366f1',
  blue: '#3b82f6',
  green: '#22c55e',
  emerald: '#10b981',
  orange: '#f97316',
  rose: '#f43f5e',
};

export const Statistics: React.FC = () => {
  const { tasks, reflections, loadAllData } = useDataStore();
  const { accent } = useThemeStore();
  const [statsPeriod, setStatsPeriod] = useState<'week' | 'month'>('week');

  const activeAccentHex = ACCENT_COLORS_HEX[accent] || '#6366f1';

  // Computed metrics state
  const [metrics, setMetrics] = useState({
    totalCreated: 0,
    totalCompleted: 0,
    completionRate: 0,
    currentStreak: 0,
    longestStreak: 0,
    mostProductiveDay: 'None',
    averageMood: 0,
  });

  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; count: number; level: number }[]>([]);

  useEffect(() => {
    loadAllData();
    // Trigger achievements check for viewing stats
    window.api.achievements.triggerCheck('stats');
  }, [loadAllData]);

  useEffect(() => {
    computeMetrics();
    computeTrendData();
    computeCategoryData();
    computeHeatmapData();
  }, [tasks, reflections, statsPeriod]);

  const computeMetrics = () => {
    const safeTasks = tasks || [];
    const safeReflections = reflections || [];

    const totalCreated = safeTasks.length;
    const totalCompleted = safeTasks.filter((t) => t.status === 'Completed').length;
    const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
    const finalRate = Math.min(Math.round(completionRate), 100);

    // Compute Streaks
    const completedDates = Array.from(
      new Set(
        safeTasks
          .filter((t) => t.status === 'Completed' && t.completed_at)
          .map((t) => t.completed_at!.substring(0, 10))
      )
    ).sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let longestStreak = 0;

    if (completedDates.length > 0) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
      
      const latest = completedDates[0];
      if (latest === todayStr || latest === yesterdayStr) {
        currentStreak = 1;
        let checkDate = new Date(latest);
        
        for (let i = 1; i < completedDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const expectedStr = checkDate.toISOString().substring(0, 10);
          if (completedDates[i] === expectedStr) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate Longest Streak
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < completedDates.length; i++) {
        const d1 = new Date(completedDates[i - 1]);
        const d2 = new Date(completedDates[i]);
        // Difference in days
        const diffTime = Math.abs(d1.getTime() - d2.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    // Most productive day of week
    const daysName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completionsDayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    safeTasks
      .filter((t) => t.status === 'Completed' && t.completed_at)
      .forEach((t) => {
        const d = new Date(t.completed_at!);
        const dayIdx = d.getDay();
        if (!isNaN(dayIdx)) {
          completionsDayCounts[dayIdx]++;
        }
      });

    let maxDayIndex = 0;
    let maxCount = 0;
    completionsDayCounts.forEach((count, idx) => {
      if (count > maxCount) {
        maxCount = count;
        maxDayIndex = idx;
      }
    });

    const mostProductiveDay = maxCount > 0 ? daysName[maxDayIndex] : 'None';

    // Average Mood Reflection
    const totalRef = safeReflections.length;
    const moodSum = safeReflections.reduce((acc, r) => acc + (r.mood || 0), 0);
    const averageMood = totalRef > 0 ? Math.round((moodSum / totalRef) * 10) / 10 : 0;

    setMetrics({
      totalCreated,
      totalCompleted,
      completionRate: finalRate,
      currentStreak,
      longestStreak,
      mostProductiveDay,
      averageMood,
    });
  };

  const computeTrendData = () => {
    const safeTasks = tasks || [];
    const data = [];
    const numDays = statsPeriod === 'week' ? 7 : 30;

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().substring(0, 10);
      const count = safeTasks.filter(
        (t) => t.status === 'Completed' && t.completed_at && t.completed_at.substring(0, 10) === dateStr
      ).length;

      data.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count,
      });
    }
    setTrendData(data);
  };

  const computeCategoryData = () => {
    const safeTasks = tasks || [];
    const counts: Record<string, number> = {};
    safeTasks
      .filter((t) => t.status === 'Completed')
      .forEach((t) => {
        const cat = t.category || 'Inbox';
        counts[cat] = (counts[cat] || 0) + 1;
      });

    const data = Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }));

    // If empty, supply placeholder details for Recharts to avoid blank panels
    if (data.length === 0) {
      setCategoryData([{ name: 'No Completed Tasks', value: 1 }]);
    } else {
      setCategoryData(data);
    }
  };

  // Github-style completions heatmap (past 18 weeks: 126 squares)
  const computeHeatmapData = () => {
    const safeTasks = tasks || [];
    const data = [];
    const totalDays = 126; // 18 weeks

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().substring(0, 10);
      const count = safeTasks.filter(
        (t) => t.status === 'Completed' && t.completed_at && t.completed_at.substring(0, 10) === dateStr
      ).length;

      let level = 0;
      if (count === 0) level = 0;
      else if (count <= 2) level = 1;
      else if (count <= 4) level = 2;
      else level = 3;

      data.push({
        date: dateStr,
        count,
        level,
      });
    }
    setHeatmapData(data);
  };

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-6 select-none animate-fade-in">
      
      {/* Overview core metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="glass-panel border border-border rounded-2xl p-5 shadow flex flex-col justify-between min-h-[110px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completion rate</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-extrabold text-white">{metrics.completionRate}%</h3>
            <span className="text-[10px] text-slate-400 font-medium">({metrics.totalCompleted}/{metrics.totalCreated})</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-semibold">Total task completion percentage</p>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel border border-border rounded-2xl p-5 shadow flex flex-col justify-between min-h-[110px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Streaks</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-extrabold text-orange-500 flex items-center gap-1.5">
              <Flame className="h-7 w-7 text-orange-500" /> {metrics.currentStreak}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Max: {metrics.longestStreak}d</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-semibold">Current consecutive completion days</p>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel border border-border rounded-2xl p-5 shadow flex flex-col justify-between min-h-[110px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peak Output Day</p>
          <h3 className="text-xl font-extrabold text-white mt-3 truncate">{metrics.mostProductiveDay}</h3>
          <p className="text-[10px] text-slate-500 mt-2 font-semibold">Most tasks completed on this day</p>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel border border-border rounded-2xl p-5 shadow flex flex-col justify-between min-h-[110px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Average Mood</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Smile className="h-7 w-7 text-emerald-400" /> {metrics.averageMood}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">/ 5.0</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-semibold">Average emotional reflections score</p>
        </div>
      </div>

      {/* Main Charts block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 glass-panel border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[340px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Productivity Trend</h4>
            <div className="flex bg-slate-900 border border-border p-0.5 rounded-lg">
              <button
                onClick={() => setStatsPeriod('week')}
                className={cn('px-2.5 py-1 text-[10px] font-bold rounded', statsPeriod === 'week' ? 'bg-accent text-white' : 'text-slate-500')}
              >
                7 Days
              </button>
              <button
                onClick={() => setStatsPeriod('month')}
                className={cn('px-2.5 py-1 text-[10px] font-bold rounded', statsPeriod === 'month' ? 'bg-accent text-white' : 'text-slate-500')}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeAccentHex} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={activeAccentHex} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={25} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#1e293b', 
                    borderRadius: '8px', 
                    fontSize: '12px',
                    color: '#fff' 
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke={activeAccentHex} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="glass-panel border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[340px]">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Category Distribution</h4>
          
          <div className="flex-1 flex items-center justify-center min-h-[180px] relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#1e293b', 
                    borderRadius: '8px', 
                    fontSize: '12px',
                    color: '#fff' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-white">
                {categoryData[0]?.name === 'No Completed Tasks' ? 0 : categoryData.reduce((acc, c) => acc + c.value, 0)}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Completions</span>
            </div>
          </div>

          {/* Color labels legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-4">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span 
                  className="h-2 w-2 rounded-full shrink-0" 
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                />
                <span className="truncate max-w-[80px]">{entry.name}</span>
                <span>({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Github-style activity heatmap */}
      <div className="glass-panel border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consistency Heatmap</h4>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Past 18 Weeks (126 Days)</span>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto pb-2">
          <div className="flex flex-wrap gap-1 md:grid md:grid-flow-col md:grid-rows-7 md:auto-cols-max min-w-[700px]">
            {heatmapData.map((d, index) => (
              <div
                key={`${d.date}-${index}`}
                className={cn(
                  'heatmap-square h-3.5 w-3.5 rounded-sm transition-all duration-100 cursor-pointer relative group',
                  {
                    'bg-slate-900 border border-slate-950/20': d.level === 0,
                    'bg-accent/25 border border-accent/10': d.level === 1,
                    'bg-accent/60 border border-accent/20': d.level === 2,
                    'bg-accent border border-accent/40 shadow-[0_0_8px_hsl(var(--accent)/0.15)]': d.level === 3,
                  }
                )}
              >
                {/* Custom tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                  <div className="bg-slate-950 border border-border rounded-lg px-2.5 py-1 text-[10px] font-bold text-white whitespace-nowrap shadow-xl">
                    {d.count} tasks on {new Date(d.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend labels */}
        <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3 select-none">
          <span>Less</span>
          <span className="h-3 w-3 bg-slate-900 rounded-sm border border-border" />
          <span className="h-3 w-3 bg-accent/25 rounded-sm" />
          <span className="h-3 w-3 bg-accent/60 rounded-sm" />
          <span className="h-3 w-3 bg-accent rounded-sm" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
