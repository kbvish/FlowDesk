import React, { useState, useEffect } from 'react';
import { 
  Plus, Target, Trash2, Calendar, CheckSquare, ChevronDown, 
  ChevronUp, CheckCircle2, Circle, AlertCircle, Sparkles
} from 'lucide-react';
import { useDataStore } from '../hooks/useStore';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Dialog } from '../components/ui/Dialog';
import { Goal, Milestone } from '../types';
import { cn } from '../utils/cn';

export const Goals: React.FC = () => {
  const { 
    goals, loadAllData, createGoal, updateGoal, deleteGoal, 
    createMilestone, updateMilestone, deleteMilestone 
  } = useDataStore();

  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Expand milestone list for specific goal IDs
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  
  // Milestone creation form state
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [activeGoalForMilestone, setActiveGoalForMilestone] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Goal Form submit
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    setIsLoading(true);
    try {
      await createGoal({
        title: goalTitle,
        description: goalDesc,
        target_date: goalTargetDate || null,
        status: 'Active',
      });
      setGoalTitle('');
      setGoalDesc('');
      setGoalTargetDate('');
      setCreateGoalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Milestone Form submit
  const handleAddMilestone = async (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;

    await createMilestone({
      goal_id: goalId,
      title: milestoneTitle,
      status: 'Todo',
    });
    setMilestoneTitle('');
    setActiveGoalForMilestone(null);
  };

  // Compute Goal milestone completion percentage
  const getGoalProgress = (goal: Goal): number => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completed = goal.milestones.filter((m) => m.status === 'Completed').length;
    return Math.round((completed / goal.milestones.length) * 100);
  };

  const activeGoals = goals.filter((g) => g.status === 'Active');
  const completedGoals = goals.filter((g) => g.status === 'Completed');

  return (
    <div className="space-y-6 select-none animate-fade-in">
      
      {/* Header bar controls */}
      <div className="glass-panel border border-border rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1">Target Goals</h3>
        <Button onClick={() => setCreateGoalOpen(true)} variant="primary" size="sm" className="flex items-center gap-1.5 font-semibold">
          <Plus size={14} /> New Goal
        </Button>
      </div>

      {/* Empty state trigger */}
      {goals.length === 0 ? (
        <EmptyState
          icon="goals"
          title="No Goals Found"
          description="Create your first major target milestone to track your long term roadmap."
          actionText="Create Goal"
          onAction={() => setCreateGoalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Active Goals list */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <Target size={14} className="text-accent" /> Active Goals ({activeGoals.length})
            </h4>

            {activeGoals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 glass-panel border border-border rounded-xl">
                No active goals. Time to create a new target!
              </div>
            ) : (
              activeGoals.map((goal) => {
                const percent = getGoalProgress(goal);
                const isExpanded = expandedGoalId === goal.id;
                
                return (
                  <div 
                    key={goal.id}
                    className="glass-panel border border-border rounded-xl p-5 hover:border-slate-800 transition-all duration-150 shadow-md"
                  >
                    {/* Goal Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white truncate">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{goal.description}</p>
                        )}
                        {goal.target_date && (
                          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-2.5">
                            <Calendar size={11} /> Target: {new Date(goal.target_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                          </span>
                        )}
                      </div>

                      {/* Chevron Toggle and delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-slate-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Progress tracking */}
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">Track Progress</span>
                        <span className="text-accent">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Expandable Milestones Area */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t border-border space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestones Checklist</h4>
                          <button
                            onClick={() => setActiveGoalForMilestone(activeGoalForMilestone === goal.id ? null : goal.id)}
                            className="text-[10px] text-accent font-bold hover:underline"
                          >
                            + Add Milestone
                          </button>
                        </div>

                        {/* Inline Milestone Creation Form */}
                        {activeGoalForMilestone === goal.id && (
                          <form onSubmit={(e) => handleAddMilestone(e, goal.id)} className="flex gap-2">
                            <Input
                              required
                              placeholder="New milestone..."
                              value={milestoneTitle}
                              onChange={(e) => setMilestoneTitle(e.target.value)}
                              className="h-8 text-xs bg-slate-950/40"
                            />
                            <Button type="submit" variant="secondary" size="sm" className="h-8 shrink-0 font-semibold">
                              Add
                            </Button>
                          </form>
                        )}

                        {/* Milestones list */}
                        {(!goal.milestones || goal.milestones.length === 0) ? (
                          <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-border rounded-lg">
                            No milestones defined. Create one to start tracking.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {goal.milestones.map((m) => (
                              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-border/50 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    onClick={() => updateMilestone(m.id, m.status === 'Completed' ? 'Todo' : 'Completed')}
                                    className="text-slate-500 hover:text-accent shrink-0"
                                  >
                                    {m.status === 'Completed' ? (
                                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                                    ) : (
                                      <Circle className="h-4.5 w-4.5" />
                                    )}
                                  </button>
                                  <span className={cn(
                                    'truncate text-slate-300',
                                    m.status === 'Completed' ? 'line-through text-slate-500' : ''
                                  )}>
                                    {m.title}
                                  </span>
                                </div>
                                <button
                                  onClick={() => deleteMilestone(m.id)}
                                  className="text-slate-500 hover:text-rose-500 shrink-0 p-0.5 rounded transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Complete Goal Trigger */}
                        {percent === 100 && (
                          <Button
                            onClick={() => updateGoal(goal.id, { status: 'Completed' })}
                            variant="primary"
                            size="sm"
                            className="w-full font-semibold gap-1.5 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                          >
                            <CheckCircle2 size={13} /> Complete Goal 🏆
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Completed Goals list */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500" /> Completed Goals ({completedGoals.length})
            </h4>

            {completedGoals.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 glass-panel border border-border rounded-xl">
                Finished goals will display here. Lock in those targets!
              </div>
            ) : (
              completedGoals.map((goal) => (
                <div 
                  key={goal.id}
                  className="glass-panel border border-border rounded-xl p-5 opacity-65 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-300 line-through truncate">{goal.title}</h3>
                    {goal.target_date && (
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-1.5">
                        <Calendar size={11} /> Target: {new Date(goal.target_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Done 🏆
                    </span>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1 rounded-lg hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Goal Dialog Modal Overlay */}
      {createGoalOpen && (
        <Dialog 
          isOpen={createGoalOpen} 
          onClose={() => setCreateGoalOpen(false)}
          title="Create Target Goal"
          className="max-w-md"
        >
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Goal Title</label>
              <Input
                required
                placeholder="What is your major goal?"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Description (Optional)</label>
              <Textarea
                placeholder="Write out why this goal matters or details..."
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Target Completion Date</label>
              <Input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setCreateGoalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isLoading}>
                Create Goal
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
