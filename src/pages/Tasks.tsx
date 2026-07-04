import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, CheckSquare, Calendar, AlertCircle, 
  ChevronRight, Circle, CheckCircle2, MoreVertical, Edit2, Play, Eye
} from 'lucide-react';
import { useDataStore, useAppStore } from '../hooks/useStore';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Dialog } from '../components/ui/Dialog';
import { Task } from '../types';
import { cn } from '../utils/cn';

export const Tasks: React.FC = () => {
  const { 
    tasks, loadAllData, createTask, updateTask, deleteTask, 
    bulkCompleteTasks, bulkDeleteTasks 
  } = useDataStore();

  const { setQuickAddOpen } = useAppStore();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('date');

  // Bulk actions selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Subtask drawer state
  const [activeParentTask, setActiveParentTask] = useState<Task | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  // Edit dialog state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editDueDate, setEditDueDate] = useState('');

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle category changes - reset select lists
  const categoriesList = [
    { id: 'All', name: 'All Tasks 📋' },
    { id: 'Inbox', name: 'Inbox 📥' },
    { id: 'Work', name: 'Work 💼' },
    { id: 'Study', name: 'Study 🎓' },
    { id: 'Personal', name: 'Personal 🏠' },
    { id: 'Health', name: 'Health 🍏' },
    { id: 'High', name: 'High Priority 🔴' },
    { id: 'Completed', name: 'Completed ✅' },
  ];

  // Selection toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredTasks: Task[]) => {
    const parentTasks = filteredTasks.filter((t) => !t.parent_id);
    if (selectedIds.length === parentTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(parentTasks.map((t) => t.id));
    }
  };

  // Bulk Operations
  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return;
    await bulkCompleteTasks(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) {
      await bulkDeleteTasks(selectedIds);
      setSelectedIds([]);
    }
  };

  // Compile filters
  const getFilteredTasks = (): Task[] => {
    // Only fetch parent tasks (subtasks are rendered inside parent detail lists)
    let list = tasks.filter((t) => !t.parent_id);

    // Category Filter
    if (activeCategory === 'High') {
      list = list.filter((t) => t.priority === 'High' && t.status !== 'Completed');
    } else if (activeCategory === 'Completed') {
      list = list.filter((t) => t.status === 'Completed');
    } else if (activeCategory !== 'All') {
      list = list.filter((t) => t.category === activeCategory);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Priority filter dropdown
    if (priorityFilter !== 'All') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // Sort order
    if (sortBy === 'date') {
      list.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    } else if (sortBy === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      list.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'created') {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    return list;
  };

  const filteredTasks = getFilteredTasks();

  // Create Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim() || !activeParentTask) return;

    await createTask({
      title: subtaskTitle,
      parent_id: activeParentTask.id,
      priority: activeParentTask.priority,
      category: activeParentTask.category,
      due_date: activeParentTask.due_date,
      status: 'Todo',
      completed_at: null,
    });

    // Refresh parent task object in state to show new subtask
    const freshParent = tasks.find((t) => t.id === activeParentTask.id);
    if (freshParent) {
      setActiveParentTask(freshParent);
    }
    setSubtaskTitle('');
  };

  // Subtasks lists for currently active parent task
  const getSubtasks = (): Task[] => {
    if (!activeParentTask) return [];
    return tasks.filter((t) => t.parent_id === activeParentTask.id);
  };

  const activeSubtasks = getSubtasks();
  const subtasksCompletedCount = activeSubtasks.filter((s) => s.status === 'Completed').length;

  // Edit Task handlers
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date || '');
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    await updateTask(editingTask.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      due_date: editDueDate || null,
    });
    setEditingTask(null);
  };

  return (
    <div className="flex h-full gap-6 animate-fade-in select-none">
      
      {/* Left Pane - Categories list */}
      <aside className="w-56 shrink-0 hidden md:block">
        <div className="glass-panel border border-border rounded-2xl p-4 space-y-1">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Folders & filters</h4>
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIds([]);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 relative flex items-center justify-between',
                activeCategory === cat.id
                  ? 'bg-accent/15 border border-accent/20 text-accent'
                  : 'text-slate-400 hover:bg-secondary/40 hover:text-white border border-transparent'
              )}
            >
              <span>{cat.name}</span>
              {/* Badges count */}
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                {cat.id === 'All' && tasks.filter((t) => !t.parent_id).length}
                {cat.id === 'High' && tasks.filter((t) => !t.parent_id && t.priority === 'High' && t.status !== 'Completed').length}
                {cat.id === 'Completed' && tasks.filter((t) => !t.parent_id && t.status === 'Completed').length}
                {cat.id !== 'All' && cat.id !== 'High' && cat.id !== 'Completed' && tasks.filter((t) => !t.parent_id && t.category === cat.id).length}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main List Area */}
      <section className="flex-1 flex flex-col min-w-0">
        
        {/* Filter bar options */}
        <div className="glass-panel border border-border rounded-2xl p-4 mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xl">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-950/20"
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <Select
              options={[
                { label: 'All Priorities', value: 'All' },
                { label: '🔴 High', value: 'High' },
                { label: '🟡 Medium', value: 'Medium' },
                { label: '🟢 Low', value: 'Low' },
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-36 bg-slate-950/20"
            />
            <Select
              options={[
                { label: 'Sort by Date', value: 'date' },
                { label: 'Sort by Priority', value: 'priority' },
                { label: 'Alphabetical', value: 'alpha' },
                { label: 'Recently Created', value: 'created' },
              ]}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-40 bg-slate-950/20"
            />
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="bg-accent/10 border border-accent/25 rounded-2xl p-3.5 mb-4 flex items-center justify-between animate-fade-in shadow-lg">
            <span className="text-xs font-bold text-accent">
              {selectedIds.length} tasks selected
            </span>
            <div className="flex items-center gap-3">
              <Button onClick={handleBulkComplete} variant="primary" size="sm" className="font-semibold">
                Complete Selected
              </Button>
              <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="font-semibold gap-1.5">
                <Trash2 size={13} /> Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Task Cards container */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon="tasks"
              title="No Tasks Found"
              description={search ? "We couldn't find matches for your search query." : "No tasks in this list. Create your first task to gain momentum."}
              actionText="Add New Task"
              onAction={() => setQuickAddOpen(true)}
            />
          ) : (
            <div className="space-y-2">
              {/* Header check all option */}
              <div className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-500 font-bold select-none border-b border-border/50">
                <button
                  onClick={() => toggleSelectAll(filteredTasks)}
                  className="hover:underline flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredTasks.length && filteredTasks.length > 0}
                    readOnly
                    className="rounded border-border bg-card text-accent focus:ring-accent"
                  />
                  <span>Select All</span>
                </button>
                <span>Items: {filteredTasks.length}</span>
              </div>

              {/* Tasks mapping */}
              {filteredTasks.map((task) => {
                const subCount = tasks.filter((t) => t.parent_id === task.id).length;
                const subCompleted = tasks.filter((t) => t.parent_id === task.id && t.status === 'Completed').length;
                
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'glass-panel border rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-150 border-border hover:border-slate-800 hover:shadow-lg group',
                      task.status === 'Completed' ? 'opacity-65' : ''
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox trigger */}
                      <button
                        onClick={() => updateTask(task.id, { status: task.status === 'Completed' ? 'Todo' : 'Completed' })}
                        className="mt-1 text-slate-500 hover:text-accent transition-colors shrink-0"
                      >
                        {task.status === 'Completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      {/* Selection checkbox for bulk operations */}
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(task.id)}
                        onChange={() => toggleSelect(task.id)}
                        className="mt-1.5 h-3.5 w-3.5 rounded border-border bg-slate-900 text-accent focus:ring-accent/50 shrink-0"
                      />

                      {/* Information text block */}
                      <div className="min-w-0 flex-1" onClick={() => openEditModal(task)}>
                        <h4 className={cn(
                          'text-sm font-bold text-slate-200 truncate cursor-pointer',
                          task.status === 'Completed' ? 'line-through text-slate-500' : ''
                        )}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1 truncate cursor-pointer">
                            {task.description}
                          </p>
                        )}
                        
                        {/* Meta items */}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            task.priority === 'High' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : task.priority === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {task.priority}
                          </span>
                          
                          <span className="text-[9px] bg-slate-800 border border-border text-slate-400 px-2 py-0.5 rounded">
                            {task.category}
                          </span>

                          {task.due_date && (
                            <span className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold">
                              <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                            </span>
                          )}

                          {subCount > 0 && (
                            <span className="text-[9px] text-accent flex items-center gap-1 font-bold">
                              Checklist: {subCompleted}/{subCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions and toggle drawer buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        onClick={() => setActiveParentTask(task)}
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                        title="View subtask checklist"
                      >
                        <Eye size={15} />
                      </Button>
                      <Button
                        onClick={() => openEditModal(task)}
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white"
                      >
                        <Edit2 size={15} />
                      </Button>
                      <Button
                        onClick={() => deleteTask(task.id)}
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-950/20"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Slide-out Panel Detail Drawer for Subtask Checklist */}
      {activeParentTask && (
        <aside className="w-80 border-l border-border pl-6 flex flex-col justify-between shrink-0 animate-fade-in">
          <div className="glass-panel border border-border rounded-2xl p-5 flex flex-col h-full overflow-hidden shadow-2xl relative bg-slate-950/40">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-white truncate max-w-[180px]">Checklist for "{activeParentTask.title}"</h3>
              <button 
                onClick={() => setActiveParentTask(null)}
                className="text-xs text-slate-500 hover:text-white font-bold"
              >
                Close
              </button>
            </div>

            {/* Checklist items list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {activeSubtasks.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  No subtasks. Add checklist items below to stay organized.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${activeSubtasks.length > 0 ? (subtasksCompletedCount / activeSubtasks.length) * 100 : 0}%` }}
                    />
                  </div>

                  {activeSubtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/40 border border-border/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => updateTask(sub.id, { status: sub.status === 'Completed' ? 'Todo' : 'Completed' })}
                          className="text-slate-500 hover:text-accent shrink-0"
                        >
                          {sub.status === 'Completed' ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                          ) : (
                            <Circle className="h-4.5 w-4.5" />
                          )}
                        </button>
                        <span className={cn(
                          'text-xs truncate text-slate-300',
                          sub.status === 'Completed' ? 'line-through text-slate-500' : ''
                        )}>
                          {sub.title}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTask(sub.id)}
                        className="text-slate-500 hover:text-rose-500 shrink-0 p-0.5 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add subtask input */}
            <form onSubmit={handleAddSubtask} className="border-t border-border pt-4 mt-auto">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Add Checklist Item</label>
              <div className="flex gap-2">
                <Input
                  required
                  placeholder="Subtask description..."
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  className="h-8 text-xs bg-slate-950/40"
                />
                <Button type="submit" variant="secondary" size="sm" className="h-8 shrink-0">
                  Add
                </Button>
              </div>
            </form>
          </div>
        </aside>
      )}

      {/* Edit Dialog Modal Overlay */}
      {editingTask && (
        <Dialog 
          isOpen={!!editingTask} 
          onClose={() => setEditingTask(null)}
          title="Edit Task Details"
          className="max-w-md"
        >
          <form onSubmit={handleUpdateTask} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Task Title</label>
              <Input
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Description</label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Due Date</label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Priority</label>
                <Select
                  options={[
                    { label: 'Low', value: 'Low' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'High', value: 'High' },
                  ]}
                  value={editPriority}
                  onChange={(e: any) => setEditPriority(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
