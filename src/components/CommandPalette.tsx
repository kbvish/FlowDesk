import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, CheckSquare, Target, BookOpen, BarChart2, Settings, Terminal } from 'lucide-react';
import { useDataStore, useAppStore } from '../hooks/useStore';
import { cn } from '../utils/cn';

interface SearchResultItem {
  id: string;
  title: string;
  category: 'Task' | 'Goal' | 'Note' | 'Navigation';
  path?: string;
  action?: () => void;
  description?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const { tasks, goals, notes } = useDataStore();
  const { setActivePage } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Listen for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset indices on search or toggle
  useEffect(() => {
    setSelectedIndex(0);
  }, [search, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        triggerResult(filteredResults[selectedIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Filtered List compilation
  const getSearchResults = (): SearchResultItem[] => {
    const results: SearchResultItem[] = [];

    // 1. Navigation shortcuts
    const navs: { title: string; page: string; path: string; icon: any }[] = [
      { title: 'Go to Dashboard', page: 'dashboard', path: '/dashboard', icon: Terminal },
      { title: 'Go to Tasks', page: 'tasks', path: '/tasks', icon: CheckSquare },
      { title: 'Go to Calendar', page: 'calendar', path: '/calendar', icon: Calendar },
      { title: 'Go to Goals', page: 'goals', path: '/goals', icon: Target },
      { title: 'Go to Notes', page: 'notes', path: '/notes', icon: BookOpen },
      { title: 'Go to Statistics', page: 'statistics', path: '/statistics', icon: BarChart2 },
      { title: 'Go to Settings', page: 'settings', path: '/settings', icon: Settings },
    ];

    navs.forEach((n) => {
      results.push({
        id: `nav-${n.page}`,
        title: n.title,
        category: 'Navigation',
        action: () => {
          setActivePage(n.page);
          navigate(n.path);
        },
      });
    });

    // 2. Tasks
    tasks.forEach((t) => {
      results.push({
        id: `task-${t.id}`,
        title: t.title,
        category: 'Task',
        description: `Priority: ${t.priority} | Status: ${t.status.replace('_', ' ')}`,
        action: () => {
          setActivePage('tasks');
          navigate('/tasks');
        },
      });
    });

    // 3. Goals
    goals.forEach((g) => {
      results.push({
        id: `goal-${g.id}`,
        title: g.title,
        category: 'Goal',
        description: `Target: ${g.target_date || 'No Date'} | Status: ${g.status}`,
        action: () => {
          setActivePage('goals');
          navigate('/goals');
        },
      });
    });

    // 4. Notes
    notes.forEach((n) => {
      results.push({
        id: `note-${n.id}`,
        title: n.title,
        category: 'Note',
        description: n.content ? n.content.substring(0, 40) + '...' : 'Empty content',
        action: () => {
          setActivePage('notes');
          navigate('/notes');
        },
      });
    });

    // Filter based on input
    if (!search) {
      // return only navigation items when search is empty
      return results.filter((r) => r.category === 'Navigation');
    }

    const query = search.toLowerCase();
    return results.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
    );
  };

  const filteredResults = getSearchResults();

  const triggerResult = (item: SearchResultItem) => {
    if (item.action) {
      item.action();
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Main command bar box */}
      <div
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-slate-900/90 shadow-2xl backdrop-blur-xl animate-fade-in scale-100 flex flex-col"
        onKeyDown={handleKeyDown}
      >
        {/* Search header bar */}
        <div className="flex items-center border-b border-border px-4 py-3 bg-slate-950/40">
          <Search size={18} className="text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Type a command, search tasks, goals, notes, pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-border shrink-0 select-none">
            ESC
          </span>
        </div>

        {/* Results Pane */}
        <div
          ref={resultsRef}
          className="max-h-[350px] overflow-y-auto p-2"
        >
          {filteredResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No results found for "{search}"
            </div>
          ) : (
            filteredResults.map((item, index) => (
              <div
                key={item.id}
                onClick={() => triggerResult(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 select-none',
                  {
                    'bg-accent text-accent-foreground': index === selectedIndex,
                    'text-slate-300 hover:bg-slate-800/40': index !== selectedIndex,
                  }
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.category === 'Navigation' && <Terminal size={15} className="shrink-0 text-slate-400" />}
                  {item.category === 'Task' && <CheckSquare size={15} className="shrink-0 text-indigo-400" />}
                  {item.category === 'Goal' && <Target size={15} className="shrink-0 text-emerald-400" />}
                  {item.category === 'Note' && <BookOpen size={15} className="shrink-0 text-amber-400" />}
                  
                  <div className="truncate">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    {item.description && (
                      <p className={cn("text-xs mt-0.5 truncate", {
                        'text-slate-200': index === selectedIndex,
                        'text-slate-500': index !== selectedIndex
                      })}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn('text-[9px] px-2 py-0.5 font-bold tracking-wider uppercase rounded-full shrink-0 border', {
                    'bg-slate-900 border-white/20 text-white': index === selectedIndex,
                    'bg-slate-800 border-border text-slate-400': index !== selectedIndex,
                  })}>
                    {item.category}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-slate-950/40 text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>FlowDesk Command Center</span>
        </div>
      </div>
    </div>
  );
};
