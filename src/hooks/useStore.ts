import { create } from 'zustand';
import { Task, Goal, Note, Folder, DailyReflection, Achievement, Notification, AccentColor, ThemePreferences } from '../types';

// ==========================================
// 1. THEME STORE
// ==========================================

const ACCENT_MAP: Record<AccentColor, string> = {
  indigo: '250 95% 66%',
  blue: '217.2 91.2% 59.8%',
  green: '142.1 76.2% 45.3%',
  orange: '24.6 95% 53.1%',
  rose: '346.8 87.2% 56.5%',
  emerald: '162.2 78.8% 40.6%',
};

interface ThemeState {
  mode: 'dark' | 'light';
  accent: AccentColor;
  initTheme: () => Promise<void>;
  setTheme: (mode: 'dark' | 'light', accent: AccentColor) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  accent: 'indigo',
  initTheme: async () => {
    try {
      const prefs = await window.api.theme.get();
      const mode = prefs.mode || 'dark';
      const accent = prefs.accent || 'indigo';
      
      set({ mode, accent });
      applyTheme(mode, accent);
    } catch (err) {
      applyTheme('dark', 'indigo');
    }
  },
  setTheme: async (mode, accent) => {
    try {
      await window.api.theme.save(mode, accent);
      set({ mode, accent });
      applyTheme(mode, accent);
    } catch (err) {
      console.error('Failed to save theme preferences', err);
    }
  },
}));

function applyTheme(mode: 'dark' | 'light', accent: AccentColor) {
  const root = document.documentElement;
  
  // Apply mode class
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  
  // Apply accent HSL variable
  const hslValue = ACCENT_MAP[accent] || ACCENT_MAP.indigo;
  root.style.setProperty('--primary', hslValue);
  root.style.setProperty('--accent', hslValue);
  root.style.setProperty('--ring', hslValue);
}

// ==========================================
// 2. APP STORE
// ==========================================

interface AppState {
  activePage: string;
  sidebarCollapsed: boolean;
  currentQuote: { text: string; author: string } | null;
  notifications: Notification[];
  achievementToasts: string[];
  quickAddOpen: boolean;
  reflectionOpen: boolean;
  setActivePage: (page: string) => void;
  toggleSidebar: () => void;
  loadQuote: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  addAchievementToast: (title: string) => void;
  removeAchievementToast: (index: number) => void;
  setQuickAddOpen: (open: boolean) => void;
  setReflectionOpen: (open: boolean) => void;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activePage: 'dashboard',
  sidebarCollapsed: false,
  currentQuote: null,
  notifications: [],
  achievementToasts: [],
  quickAddOpen: false,
  reflectionOpen: false,
  setActivePage: (page) => set({ activePage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  loadQuote: async () => {
    const quote = await window.api.quotes.getRandom();
    set({ currentQuote: quote });
  },
  loadNotifications: async () => {
    const list = await window.api.notifications.all();
    set({ notifications: list });
  },
  addAchievementToast: (title) => set((state) => ({ achievementToasts: [...state.achievementToasts, title] })),
  removeAchievementToast: (index) => set((state) => ({
    achievementToasts: state.achievementToasts.filter((_, i) => i !== index),
  })),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  setReflectionOpen: (open) => set({ reflectionOpen: open }),
  markNotificationRead: async (id) => {
    await window.api.notifications.markRead(id);
    get().loadNotifications();
  },
  clearNotifications: async () => {
    await window.api.notifications.clearAll();
    get().loadNotifications();
  },
}));

// ==========================================
// 3. DATA PERSISTENCE STORE
// ==========================================

interface DataState {
  tasks: Task[];
  goals: Goal[];
  notes: Note[];
  folders: Folder[];
  reflections: DailyReflection[];
  achievements: Achievement[];
  isLoading: boolean;
  
  loadAllData: () => Promise<void>;
  
  // Tasks Actions
  createTask: (task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkCompleteTasks: (ids: string[]) => Promise<void>;
  bulkDeleteTasks: (ids: string[]) => Promise<void>;
  
  // Goals Actions
  createGoal: (goal: Partial<Goal>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
  // Milestones Actions
  createMilestone: (mil: Partial<Milestone>) => Promise<void>;
  updateMilestone: (id: string, status: 'Todo' | 'Completed') => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  
  // Folders Actions
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  
  // Notes Actions
  createNote: (note: Partial<Note>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  // Reflections Actions
  saveReflection: (mood: number, note: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  tasks: [],
  goals: [],
  notes: [],
  folders: [],
  reflections: [],
  achievements: [],
  isLoading: false,
  
  loadAllData: async () => {
    set({ isLoading: true });
    try {
      const [tasks, goals, notes, folders, reflections, achievements] = await Promise.all([
        window.api.tasks.all(),
        window.api.goals.all(),
        window.api.notes.all(),
        window.api.folders.all(),
        window.api.reflections.all(),
        window.api.achievements.all(),
      ]);
      set({ tasks, goals, notes, folders, reflections, achievements });
    } catch (err) {
      console.error('Failed to load local data from SQLite', err);
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Tasks Actions
  createTask: async (task) => {
    const id = Math.random().toString(36).substring(2, 11);
    const result = await window.api.tasks.create({ id, ...task });
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
  
  updateTask: async (id, updates) => {
    const result = await window.api.tasks.update(id, updates);
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
  
  deleteTask: async (id) => {
    const success = await window.api.tasks.delete(id);
    if (success) {
      await get().loadAllData();
    }
  },
  
  bulkCompleteTasks: async (ids) => {
    const result = await window.api.tasks.bulkComplete(ids);
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
  
  bulkDeleteTasks: async (ids) => {
    const success = await window.api.tasks.bulkDelete(ids);
    if (success) {
      await get().loadAllData();
    }
  },
  
  // Goals Actions
  createGoal: async (goal) => {
    const id = Math.random().toString(36).substring(2, 11);
    const success = await window.api.goals.create({ id, ...goal });
    if (success) {
      await get().loadAllData();
    }
  },
  
  updateGoal: async (id, updates) => {
    const result = await window.api.goals.update(id, updates);
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
  
  deleteGoal: async (id) => {
    const success = await window.api.goals.delete(id);
    if (success) {
      await get().loadAllData();
    }
  },
  
  // Milestones Actions
  createMilestone: async (mil) => {
    const id = Math.random().toString(36).substring(2, 11);
    const success = await window.api.milestones.create({ id, ...mil });
    if (success) {
      await get().loadAllData();
    }
  },
  
  updateMilestone: async (id, status) => {
    const result = await window.api.milestones.update(id, status);
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
  
  deleteMilestone: async (id) => {
    const success = await window.api.milestones.delete(id);
    if (success) {
      await get().loadAllData();
    }
  },
  
  // Folders Actions
  createFolder: async (name) => {
    const id = Math.random().toString(36).substring(2, 11);
    const success = await window.api.folders.create({ id, name });
    if (success) {
      await get().loadAllData();
    }
  },
  
  deleteFolder: async (id) => {
    const success = await window.api.folders.delete(id);
    if (success) {
      await get().loadAllData();
    }
  },
  
  // Notes Actions
  createNote: async (note) => {
    const id = Math.random().toString(36).substring(2, 11);
    const result = await window.api.notes.create({ id, ...note });
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
  
  updateNote: async (id, updates) => {
    const success = await window.api.notes.update(id, updates);
    if (success) {
      // Direct offline state update for instantaneous responsive feel
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)),
      }));
    }
  },
  
  deleteNote: async (id) => {
    const success = await window.api.notes.delete(id);
    if (success) {
      await get().loadAllData();
    }
  },
  
  // Reflections Actions
  saveReflection: async (mood, note) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const result = await window.api.reflections.save(todayStr, mood, note);
    if (result.success) {
      if (result.unlocked && result.unlocked.length > 0) {
        result.unlocked.forEach(title => useAppStore.getState().addAchievementToast(title));
        useAppStore.getState().loadNotifications();
      }
      await get().loadAllData();
    }
  },
}));
