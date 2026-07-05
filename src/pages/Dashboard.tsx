import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  Flame, CheckCircle2, Circle, Clock, Target, Calendar, 
  ChevronRight, ArrowRight, Quote, Plus, AlertCircle, Sparkles
} from 'lucide-react';
import { useDataStore, useAppStore, useThemeStore } from '../hooks/useStore';

const ACCENT_COLORS_HEX = {
  indigo: '#6366f1',
  blue: '#3b82f6',
  green: '#22c55e',
  emerald: '#10b981',
  orange: '#f97316',
  rose: '#f43f5e',
};
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Task, Goal } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, goals, loadAllData, createTask, updateTask } = useDataStore();
  const { accent } = useThemeStore();
  
  const activeAccentHex = ACCENT_COLORS_HEX[accent] || '#6366f1';
  const { currentQuote, loadQuote, setQuickAddOpen } = useAppStore();

  const [quickTitle, setQuickTitle] = useState('');
  const [streak, setStreak] = useState(0);
  const [todayCompletedPercentage, setTodayCompletedPercentage] = useState(0);
  const [weeklyChartData, setWeeklyChartData] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Compute stats on tasks change
  useEffect(() => {
    computeStreak();
    computeTodayProgress();
    computeWeeklyChart();
  }, [tasks]);

  // Calculate consecutive completion days
  const computeStreak = () => {
    if (tasks.length === 0) {
      setStreak(0);
      return;
    }

    const completedDates = Array.from(
      new Set(
        tasks
          .filter((t) => t.status === 'Completed' && t.completed_at)
          .map((t) => t.completed_at!.substring(0, 10))
      )
    ).sort((a, b) => b.localeCompare(a)); // Sort descending (latest first)

    if (completedDates.length === 0) {
      setStreak(0);
      return;
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    const latest = completedDates[0];
    if (latest !== todayStr && latest !== yesterdayStr) {
      setStreak(0);
      return;
    }

    let currentStreak = 1;
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
    setStreak(currentStreak);
  };

  // Compute circular progress statistics
  const computeTodayProgress = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayTasks = tasks.filter(
      (t) => 
        (t.due_date && t.due_date.substring(0, 10) === todayStr) || 
        (t.completed_at && t.completed_at.substring(0, 10) === todayStr)
    );

    if (todayTasks.length === 0) {
      setTodayCompletedPercentage(100); // 100% when no tasks due today
      return;
    }

    const completed = todayTasks.filter((t) => t.status === 'Completed');
    const percent = Math.round((completed.length / todayTasks.length) * 100);
    setTodayCompletedPercentage(percent);
  };

  // Compute 7 days chart data
  const computeWeeklyChart = () => {
    const data = [];
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      const dateStr = date.toISOString().substring(0, 10);
      const count = tasks.filter(
        (t) => t.status === 'Completed' && t.completed_at && t.completed_at.substring(0, 10) === dateStr
      ).length;

      data.push({
        day: daysName[date.getDay()],
        count,
      });
    }
    setWeeklyChartData(data);
  };

  // Inline Quick Add Task handler
  const handleInlineQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    await createTask({
      title: quickTitle,
      priority: 'Medium',
      due_date: new Date().toISOString().substring(0, 10), // Set as due today
      category: 'Inbox',
      status: 'Todo',
      completed_at: null,
    });
    setQuickTitle('');
  };

  // Identify Today's Focus Task
  const getFocusTask = (): Task | undefined => {
    const todayStr = new Date().toISOString().substring(0, 10);
    
    // 1. Get uncompleted High priority task due today
    const highToday = tasks.find(
      (t) => t.status !== 'Completed' && t.priority === 'High' && t.due_date && t.due_date.substring(0, 10) === todayStr
    );
    if (highToday) return highToday;

    // 2. Any uncompleted task due today
    const anyToday = tasks.find(
      (t) => t.status !== 'Completed' && t.due_date && t.due_date.substring(0, 10) === todayStr
    );
    if (anyToday) return anyToday;

    // 3. Any uncompleted High priority task in database
    const highAny = tasks.find((t) => t.status !== 'Completed' && t.priority === 'High');
    return highAny;
  };

  const focusTask = getFocusTask();

  // Upcoming deadlines (next 3 days, excluding today)
  const getUpcomingDeadlines = (): Task[] => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const maxDate = new Date(today.getTime() + 3 * 86400000);
    const todayStr = today.toISOString().substring(0, 10);

    return tasks.filter((t) => {
      if (t.status === 'Completed' || !t.due_date) return false;
      const due = t.due_date.substring(0, 10);
      return due > todayStr && due <= maxDate.toISOString().substring(0, 10);
    }).slice(0, 4);
  };

  const upcomingDeadlines = getUpcomingDeadlines();

  // Active Goals list (max 3)
  const activeGoals = goals.filter((g) => g.status === 'Active').slice(0, 3);

  // Compute Goal milestone percentage
  const getGoalProgress = (goal: Goal): number => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completed = goal.milestones.filter((m) => m.status === 'Completed').length;
    return Math.round((completed / goal.milestones.length) * 100);
  };

  // Compile a list of recent actions / completions
  const getRecentActivities = () => {
    const activities: { id: string; text: string; time: string; type: 'task' | 'goal' | 'reflection' }[] = [];

    // Completed tasks
    tasks.filter((t) => t.status === 'Completed' && t.completed_at).forEach((t) => {
      activities.push({
        id: `act-task-${t.id}`,
        text: `Completed task: "${t.title}"`,
        time: t.completed_at!,
        type: 'task',
      });
    });

    // Created tasks (limit to last 3)
    tasks.slice(0, 3).forEach((t) => {
      activities.push({
        id: `act-create-task-${t.id}`,
        text: `Created task: "${t.title}"`,
        time: t.created_at,
        type: 'task',
      });
    });

    // Goals completed
    goals.filter((g) => g.status === 'Completed').forEach((g) => {
      activities.push({
        id: `act-goal-${g.id}`,
        text: `Achieved goal: "${g.title}"! 🏆`,
        time: g.created_at, // Approximation
        type: 'goal',
      });
    });

    return activities
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 4);
  };

  const recentActivities = getRecentActivities();

  return (
    <div className="space-y-6 select-none animate-fade-in">
      
      {/* Top Welcome / Quote Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Streak & Productivity score cards */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border border-border shadow-xl min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="h-40 w-40 text-accent" />
          </div>
          {currentQuote ? (
            <div className="space-y-3 z-10">
              <Quote className="h-5 w-5 text-accent opacity-60" />
              <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed italic">
                "{currentQuote.text}"
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 tracking-wider">
                  — {currentQuote.author}
                </span>
                <button
                  onClick={loadQuote}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors uppercase tracking-wider font-bold"
                >
                  Refresh Quote
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          )}
        </div>

        {/* Streak card */}
        <div className="glass-panel rounded-2xl p-6 flex items-center justify-between border border-border shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 text-orange-500 scale-150 transform group-hover:scale-[1.7] transition-all duration-300">
            <Flame className="h-24 w-24" />
          </div>
          <div className="space-y-1.5 z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Streak</p>
            <h3 className="text-3xl font-extrabold text-white flex items-baseline gap-2">
              {streak} <span className="text-sm font-semibold text-slate-400">days</span>
            </h3>
            <p className="text-xs text-slate-400">
              {streak > 0 
                ? "Excellent momentum! Keep building." 
                : "Complete a task to kickstart your streak!"}
            </p>
          </div>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-lg z-10 transition-transform duration-300 group-hover:rotate-6 ${
            streak > 0 
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-orange-500/10' 
              : 'bg-slate-900 border-border text-slate-500'
          }`}>
            <Flame className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Analytics chart and circle score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Productivity Circle ring */}
        <div className="glass-panel rounded-2xl p-6 border border-border shadow-xl flex flex-col items-center justify-between text-center min-h-[300px]">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">Today's Productivity</h4>
          
          <div className="relative flex items-center justify-center my-4">
            {/* SVG Circle indicator */}
            <svg className="w-36 h-36">
              <circle
                className="text-slate-800/60"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="62"
                cx="72"
                cy="72"
              />
              <circle
                className="text-accent transition-all duration-500 ease-out"
                strokeWidth="8"
                strokeDasharray={389.5}
                strokeDashoffset={389.5 - (389.5 * todayCompletedPercentage) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="62"
                cx="72"
                cy="72"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-white">{todayCompletedPercentage}%</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-xs mt-2">
            {todayCompletedPercentage === 100 
              ? "All caught up! Magnificent work today." 
              : "Focus on your remaining items to boost output."}
          </p>
        </div>

        {/* Weekly chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-border shadow-xl flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Output</h4>
            <span className="text-[10px] text-accent font-bold uppercase tracking-wider">Tasks Completed</span>
          </div>

          <div className="flex-1 min-h-[180px] w-full">
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={weeklyChartData}>
                <XAxis 
                  dataKey="day" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  allowDecimals={false} 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  width={25}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#1e293b', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {weeklyChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 6 ? activeAccentHex : `${activeAccentHex}80`} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Focus task, upcoming deadlines & quick add */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Focus & Quick Add */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Focus Card */}
          <div className="glass-panel rounded-2xl p-6 border border-border shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-slate-800/10 pointer-events-none">
              <Sparkles className="h-28 w-28" />
            </div>
            
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent animate-pulse" /> Focus Task
            </h4>

            {focusTask ? (
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/40 border border-border hover:border-slate-800 transition-all duration-150">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => updateTask(focusTask.id, { status: 'Completed' })}
                    className="mt-1 text-slate-500 hover:text-accent transition-colors shrink-0"
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{focusTask.title}</h3>
                    {focusTask.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{focusTask.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded border ${
                        focusTask.priority === 'High' 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {focusTask.priority}
                      </span>
                      <span className="text-[9px] bg-slate-800 border border-border text-slate-400 px-2 py-0.5 rounded font-medium">
                        {focusTask.category}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => updateTask(focusTask.id, { status: 'Completed' })}
                  variant="primary" 
                  size="sm" 
                  className="shrink-0 font-semibold"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-border rounded-xl bg-slate-950/20">
                <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No active focus tasks due today.</p>
                <button
                  onClick={() => setQuickAddOpen(true)}
                  className="text-xs text-accent font-bold hover:underline mt-1.5"
                >
                  Create one now
                </button>
              </div>
            )}

            {/* Quick add inline task */}
            <form onSubmit={handleInlineQuickAdd} className="flex items-center gap-2 mt-6">
              <Input
                placeholder="Quick add task due today..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="bg-slate-950/40"
              />
              <Button type="submit" variant="secondary" size="icon" className="shrink-0 border border-border">
                <Plus size={18} />
              </Button>
            </form>
          </div>

          {/* Goals Progress */}
          <div className="glass-panel rounded-2xl p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goal Tracks</h4>
              <button 
                onClick={() => navigate('/goals')}
                className="text-[10px] text-slate-400 hover:text-white font-bold uppercase tracking-wider flex items-center gap-0.5"
              >
                All Goals <ChevronRight size={10} />
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No active goals. Create one in Goals view!
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((g) => {
                  const percent = getGoalProgress(g);
                  return (
                    <div key={g.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-200 truncate">{g.title}</span>
                        <span className="text-accent">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deadlines & Activity Feed */}
        <div className="space-y-6">
          
          {/* Upcoming deadlines */}
          <div className="glass-panel rounded-2xl p-6 border border-border shadow-xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Deadlines (Next 3 Days)</h4>
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No upcoming deadlines.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((t) => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-slate-950/20 hover:border-slate-800 transition-all duration-150 cursor-pointer"
                      onClick={() => navigate('/tasks')}
                    >
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{t.title}</p>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> {new Date(t.due_date!).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.priority === 'High' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity feed */}
          <div className="glass-panel rounded-2xl p-6 border border-border shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Activity</h4>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No recent activity.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                    <div className="h-6 w-6 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
                      {act.type === 'task' && <CheckCircle2 className="h-3.5 w-3.5 text-accent" />}
                      {act.type === 'goal' && <Target className="h-3.5 w-3.5 text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-300 font-semibold leading-snug">{act.text}</p>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        {new Date(act.time).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
