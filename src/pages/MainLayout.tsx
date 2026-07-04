import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CheckSquare, Calendar, Target, 
  BookOpen, BarChart2, Settings, ChevronLeft, ChevronRight, 
  Plus, Bell, LogOut, Moon, Sun, Search, ShieldCheck
} from 'lucide-react';
import { useAppStore, useThemeStore, useDataStore } from '../hooks/useStore';
import { QuickAddTask } from '../components/QuickAddTask';
import { DailyReflectionDialog } from '../components/DailyReflectionDialog';
import { CommandPalette } from '../components/CommandPalette';
import { ToastContainer } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    activePage, setActivePage, sidebarCollapsed, toggleSidebar,
    quickAddOpen, setQuickAddOpen, reflectionOpen, setReflectionOpen,
    notifications, loadNotifications, markNotificationRead, clearNotifications
  } = useAppStore();

  const { mode } = useThemeStore();
  const { loadAllData } = useDataStore();

  const [notifOpen, setNotifOpen] = useState(false);
  const [greeting, setGreeting] = useState('Welcome');

  // Synchronize initial data pulls
  useEffect(() => {
    loadAllData();
    loadNotifications();
    
    // Set greeting based on local time
    const hr = new Date().getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Polling triggers for end-of-day reflections check
    const checkReflectionTrigger = () => {
      const now = new Date();
      if (now.getHours() === 20 && now.getMinutes() === 0) { // 8:00 PM
        setReflectionOpen(true);
      }
    };
    const interval = setInterval(checkReflectionTrigger, 60000);
    return () => clearInterval(interval);
  }, [loadAllData, loadNotifications, setReflectionOpen]);

  // Synchronize route-path changes back to Zustand activePage state
  useEffect(() => {
    const path = location.pathname.substring(1);
    if (path) {
      setActivePage(path);
    }
  }, [location, setActivePage]);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { id: 'tasks', name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { id: 'calendar', name: 'Calendar', path: '/calendar', icon: Calendar },
    { id: 'goals', name: 'Goals', path: '/goals', icon: Target },
    { id: 'notes', name: 'Notes', path: '/notes', icon: BookOpen },
    { id: 'statistics', name: 'Statistics', path: '/statistics', icon: BarChart2 },
    { id: 'settings', name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleNav = (item: typeof navItems[0]) => {
    setActivePage(item.id);
    navigate(item.path);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-all duration-300">
      
      {/* Sidebar navigation */}
      <aside className={cn(
        'glass-panel border-r border-border flex flex-col justify-between transition-all duration-300 select-none z-20 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        <div>
          {/* Logo Brand area */}
          <div className={cn("flex items-center p-4 border-b border-border gap-3 height-[64px]", 
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}>
            {!sidebarCollapsed && (
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-accent to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" /> FlowDesk
              </span>
            )}
            {sidebarCollapsed && (
              <ShieldCheck className="h-6 w-6 text-accent animate-pulse" />
            )}
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg text-slate-400 hover:bg-secondary hover:text-white transition-all duration-150"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 outline-none select-none relative',
                    isActive 
                      ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/25'
                      : 'text-slate-400 hover:bg-secondary/40 hover:text-foreground'
                  )}
                >
                  <Icon size={18} className={cn("shrink-0", isActive ? "scale-105" : "text-slate-400")} />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile / bottom actions */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 truncate">
              <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-bold text-accent text-xs">
                FD
              </div>
              <div className="truncate">
                <p className="text-xs font-bold truncate">Offline Space</p>
                <p className="text-[10px] text-slate-500 font-semibold truncate">Offline local database</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-bold text-accent text-xs">
              FD
            </div>
          )}
        </div>
      </aside>

      {/* Main content frame */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top bar header */}
        <header className="h-[64px] border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-md z-10 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight text-white capitalize">
              {activePage === 'dashboard' ? `${greeting}, Creator` : activePage}
            </h2>
            {activePage === 'dashboard' && (
              <span className="text-xs text-slate-500 font-semibold border border-border bg-card/45 px-2 py-0.5 rounded-md hidden sm:inline">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Quick Search & Notification Bell */}
          <div className="flex items-center gap-4">
            {/* Search command pallet trigger */}
            <button
              onClick={() => {
                // Dispatch ctrl+k event manually
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
              className="flex items-center gap-2 border border-border bg-card hover:bg-secondary/40 text-muted-foreground px-3 py-1.5 rounded-lg text-xs transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Search size={14} />
              <span className="hidden md:inline font-semibold">Search actions</span>
              <kbd className="bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-border text-[9px]">Ctrl+K</kbd>
            </button>

            {/* Reflection quick-trigger */}
            <button
              onClick={() => setReflectionOpen(true)}
              className="text-xs bg-slate-900 border border-border hover:bg-slate-800 text-slate-300 font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-150 active:scale-95 hidden sm:block"
            >
              Daily Reflection
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg text-slate-400 hover:bg-secondary/60 hover:text-white transition-all duration-150 relative active:scale-90"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-lg animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Box dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-slate-950/90 backdrop-blur-xl shadow-2xl z-30 overflow-hidden animate-fade-in p-1">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <h4 className="text-xs font-bold text-white">Notifications</h4>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-[10px] text-emerald-400 font-semibold hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={cn(
                            'p-3 border-b border-border/50 text-xs transition-colors duration-150 cursor-pointer',
                            notif.read ? 'opacity-60 hover:bg-secondary/20' : 'bg-slate-900/60 hover:bg-secondary/40 font-semibold'
                          )}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-semibold text-slate-200">{notif.title}</span>
                            {!notif.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-slate-400 mt-0.5 font-normal">{notif.message}</p>
                          <span className="text-[9px] text-slate-500 block mt-1.5">
                            {new Date(notif.created_at).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Routed views load here */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <Outlet />
        </div>

        {/* Global Floating Action Button (FAB) for adding tasks */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-2xl hover:scale-105 transition-all duration-200 active:scale-95 hover:shadow-accent/40 shadow-accent/20 cursor-pointer"
          title="Quick Add Task"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Floating Modals overlay mounts */}
        <QuickAddTask
          isOpen={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
        />
        <DailyReflectionDialog
          isOpen={reflectionOpen}
          onClose={() => setReflectionOpen(false)}
        />
        <CommandPalette />
        <ToastContainer />
      </main>
    </div>
  );
};
