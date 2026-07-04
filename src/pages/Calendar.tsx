import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  Clock, AlertCircle, ArrowRight
} from 'lucide-react';
import { useDataStore, useAppStore } from '../hooks/useStore';
import { QuickAddTask } from '../components/QuickAddTask';
import { Button } from '../components/ui/Button';
import { Task } from '../types';
import { cn } from '../utils/cn';

export const Calendar: React.FC = () => {
  const { tasks, loadAllData, updateTask } = useDataStore();
  const { setQuickAddOpen } = useAppStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Navigate dates
  const next = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    }
  };

  const prev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    }
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Reschedule task due date via SQLite IPC
    await updateTask(taskId, { due_date: dateStr });
  };

  // Click empty date cell to create a task
  const handleDateClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setQuickAddOpen(true);
  };

  // Get tasks due on a specific date (excluding subtasks)
  const getTasksForDate = (dateStr: string): Task[] => {
    return tasks.filter((t) => !t.parent_id && t.due_date && t.due_date.substring(0, 10) === dateStr);
  };

  // ==========================================
  // MONTH GRID COMPILATION
  // ==========================================
  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month index (0: Sunday, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Number of days in the current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Number of days in the previous month
    const prevTotalDays = new Date(year, month, 0).getDate();

    const cells: React.ReactNode[] = [];
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Weekday headers
    const headerRow = daysName.map((day) => (
      <div key={day} className="text-center font-bold text-xs text-slate-500 py-2 border-b border-border uppercase tracking-widest">
        {day}
      </div>
    ));

    // Pad previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevTotalDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().substring(0, 10);
      const dateTasks = getTasksForDate(dateStr);

      cells.push(
        <div
          key={`prev-${dayNum}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, dateStr)}
          onClick={() => handleDateClick(dateStr)}
          className="min-h-[100px] border-r border-b border-border bg-slate-950/15 p-2 text-slate-600 transition-colors duration-150 hover:bg-secondary/10 flex flex-col justify-between group cursor-pointer relative"
        >
          <span className="text-xs font-bold font-mono">{dayNum}</span>
          <div className="flex-1 overflow-y-auto space-y-1 mt-1 max-h-[70px]">
            {dateTasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => handleDragStart(e, t.id)}
                onClick={(ev) => {
                  ev.stopPropagation();
                  // Trigger open edits
                }}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded truncate font-semibold border',
                  t.status === 'Completed'
                    ? 'bg-slate-900/40 text-slate-600 border-border line-through'
                    : t.priority === 'High'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-accent/15 text-accent border-accent/20'
                )}
              >
                {t.title}
              </div>
            ))}
            {dateTasks.length > 3 && (
              <div className="text-[8px] text-slate-500 font-bold">+{dateTasks.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    // Current month days
    const todayStr = new Date().toISOString().substring(0, 10);
    for (let day = 1; day <= totalDays; day++) {
      const curDate = new Date(year, month, day);
      const dateStr = curDate.toISOString().substring(0, 10);
      const isToday = dateStr === todayStr;
      const dateTasks = getTasksForDate(dateStr);

      cells.push(
        <div
          key={`curr-${day}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, dateStr)}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            'min-h-[100px] border-r border-b border-border p-2 transition-colors duration-150 hover:bg-secondary/25 flex flex-col justify-between group cursor-pointer relative',
            isToday ? 'bg-accent/5' : 'bg-card/20'
          )}
        >
          <span className={cn(
            'text-xs font-bold font-mono h-5 w-5 rounded-full flex items-center justify-center shrink-0',
            isToday ? 'bg-accent text-accent-foreground shadow-lg' : 'text-slate-300'
          )}>
            {day}
          </span>
          
          <div className="flex-1 overflow-y-auto space-y-1 mt-1 max-h-[70px]">
            {dateTasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => handleDragStart(e, t.id)}
                onClick={(ev) => ev.stopPropagation()}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded truncate font-semibold border transition-all duration-150 active:opacity-70 cursor-grab',
                  t.status === 'Completed'
                    ? 'bg-slate-900/40 text-slate-500 border-border line-through'
                    : t.priority === 'High'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.05)]'
                    : 'bg-accent/15 text-accent border-accent/20'
                )}
              >
                {t.title}
              </div>
            ))}
            {dateTasks.length > 3 && (
              <div className="text-[8px] text-accent font-bold">+{dateTasks.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    // Pad next month days to complete grid (multiples of 7)
    const remainingCells = 42 - cells.length; // Standard 6 weeks grid layout
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      const dateStr = nextDate.toISOString().substring(0, 10);
      const dateTasks = getTasksForDate(dateStr);

      cells.push(
        <div
          key={`next-${day}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, dateStr)}
          onClick={() => handleDateClick(dateStr)}
          className="min-h-[100px] border-r border-b border-border bg-slate-950/15 p-2 text-slate-600 transition-colors duration-150 hover:bg-secondary/10 flex flex-col justify-between group cursor-pointer relative"
        >
          <span className="text-xs font-bold font-mono">{day}</span>
          <div className="flex-1 overflow-y-auto space-y-1 mt-1 max-h-[70px]">
            {dateTasks.slice(0, 3).map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => handleDragStart(e, t.id)}
                onClick={(ev) => ev.stopPropagation()}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded truncate font-semibold border',
                  t.status === 'Completed'
                    ? 'bg-slate-900/40 text-slate-500 border-border line-through'
                    : t.priority === 'High'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-accent/15 text-accent border-accent/20'
                )}
              >
                {t.title}
              </div>
            ))}
            {dateTasks.length > 3 && (
              <div className="text-[8px] text-slate-500 font-bold">+{dateTasks.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 border-l border-t border-border rounded-xl overflow-hidden shadow-xl">
        {headerRow}
        {cells}
      </div>
    );
  };

  // ==========================================
  // WEEK GRID COMPILATION
  // ==========================================
  const renderWeekGrid = () => {
    const startOfWeek = new Date(currentDate);
    // Align starting offset to Sunday
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = new Date().toISOString().substring(0, 10);

    const cells = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().substring(0, 10);
      const isToday = dateStr === todayStr;
      const dateTasks = getTasksForDate(dateStr);

      cells.push(
        <div
          key={`week-${i}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, dateStr)}
          onClick={() => handleDateClick(dateStr)}
          className={cn(
            'flex-1 min-h-[350px] border-r border-b border-border p-3 flex flex-col justify-start gap-4 transition-all duration-150 hover:bg-secondary/15 cursor-pointer relative',
            isToday ? 'bg-accent/5' : 'bg-card/25'
          )}
        >
          {/* Day details */}
          <div className="flex flex-col items-center pb-2.5 border-b border-border">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{daysName[i]}</span>
            <span className={cn(
              'text-lg font-bold font-mono h-8 w-8 rounded-full flex items-center justify-center mt-1.5 shadow-md',
              isToday ? 'bg-accent text-accent-foreground' : 'text-slate-200'
            )}>
              {date.getDate()}
            </span>
          </div>

          {/* Draggable tasks list */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-0.5">
            {dateTasks.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => handleDragStart(e, t.id)}
                onClick={(ev) => ev.stopPropagation()}
                className={cn(
                  'text-xs p-2 rounded-lg border font-bold shadow-sm transition-all duration-150 cursor-grab hover:shadow-md active:opacity-75',
                  t.status === 'Completed'
                    ? 'bg-slate-900/40 text-slate-500 border-border line-through'
                    : t.priority === 'High'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-accent/15 text-accent border-accent/20'
                )}
              >
                <span className="block truncate">{t.title}</span>
                {t.description && (
                  <span className="block text-[10px] text-slate-400 font-normal truncate mt-0.5">{t.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex border-l border-t border-border rounded-xl overflow-hidden shadow-xl">
        {cells}
      </div>
    );
  };

  const getHeaderTitle = (): string => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      if (start.getMonth() === end.getMonth()) {
        return `${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${monthNames[start.getMonth()]} - ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
      } else {
        return `${monthNames[start.getMonth()]} ${start.getFullYear()} - ${monthNames[end.getMonth()]} ${end.getFullYear()}`;
      }
    }
  };

  return (
    <div className="space-y-6 select-none animate-fade-in flex flex-col h-full">
      
      {/* Header bar controls */}
      <div className="glass-panel border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xl">
        
        {/* Navigation buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            <Button onClick={prev} variant="secondary" size="icon" className="h-9 w-9 border border-border">
              <ChevronLeft size={16} />
            </Button>
            <Button onClick={next} variant="secondary" size="icon" className="h-9 w-9 border border-border">
              <ChevronRight size={16} />
            </Button>
          </div>

          <Button onClick={today} variant="outline" size="sm" className="font-semibold text-slate-300">
            Today
          </Button>

          <h3 className="text-base font-extrabold text-white ml-2">
            {getHeaderTitle()}
          </h3>
        </div>

        {/* View Mode controls */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-border shrink-0">
          <button
            onClick={() => setViewMode('month')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150',
              viewMode === 'month'
                ? 'bg-accent text-accent-foreground shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Month View
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={cn(
              'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150',
              viewMode === 'week'
                ? 'bg-accent text-accent-foreground shadow'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Week View
          </button>
        </div>
      </div>

      {/* Drag instructions */}
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1 select-none">
        <Clock size={11} className="text-slate-500 shrink-0" />
        <span>Drag task items to reschedule. Click on any date cell to plan a task.</span>
      </div>

      {/* Grid rendering container */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'month' ? renderMonthGrid() : renderWeekGrid()}
      </div>

      {/* Quick Add dialog trigger with preset date */}
      {selectedDateStr && (
        <QuickAddTask
          isOpen={quickAddOpen}
          onClose={() => {
            setQuickAddOpen(false);
            setSelectedDateStr(null);
          }}
          defaultDate={selectedDateStr}
        />
      )}
    </div>
  );
};
