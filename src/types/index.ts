export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date: string | null;
  category: string;
  status: 'Todo' | 'In_Progress' | 'Completed';
  recurring: 'None' | 'Daily' | 'Weekly' | 'Monthly';
  parent_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string | null;
  status: 'Active' | 'Completed';
  created_at: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  status: 'Todo' | 'Completed';
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}

export interface DailyReflection {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  note: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked_at: string | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: number; // 0 or 1
  created_at: string;
}

export type AccentColor = 'indigo' | 'blue' | 'green' | 'orange' | 'rose' | 'emerald';

export interface ThemePreferences {
  mode: 'dark' | 'light';
  accent: AccentColor;
}

// Global window api definition for TypeScript
declare global {
  interface Window {
    api: {
      logs: {
        get: () => Promise<string>;
        clear: () => Promise<boolean>;
      };
      app: {
        version: () => Promise<string>;
        reset: () => Promise<boolean>;
      };
      quotes: {
        getRandom: () => Promise<{ text: string; author: string }>;
      };
      theme: {
        get: () => Promise<ThemePreferences>;
        save: (mode: 'dark' | 'light', accent: AccentColor) => Promise<boolean>;
      };
      tasks: {
        all: () => Promise<Task[]>;
        create: (task: Partial<Task>) => Promise<{ success: boolean; unlocked: string[] }>;
        update: (id: string, updates: Partial<Task>) => Promise<{ success: boolean; unlocked: string[] }>;
        delete: (id: string) => Promise<boolean>;
        bulkComplete: (ids: string[]) => Promise<{ success: boolean; unlocked: string[] }>;
        bulkDelete: (ids: string[]) => Promise<boolean>;
      };
      goals: {
        all: () => Promise<Goal[]>;
        create: (goal: Partial<Goal>) => Promise<boolean>;
        update: (id: string, updates: Partial<Goal>) => Promise<{ success: boolean; unlocked: string[] }>;
        delete: (id: string) => Promise<boolean>;
      };
      milestones: {
        create: (mil: Partial<Milestone>) => Promise<boolean>;
        update: (id: string, status: 'Todo' | 'Completed') => Promise<{ success: boolean; unlocked: string[] }>;
        delete: (id: string) => Promise<boolean>;
      };
      folders: {
        all: () => Promise<Folder[]>;
        create: (folder: Partial<Folder>) => Promise<boolean>;
        delete: (id: string) => Promise<boolean>;
      };
      notes: {
        all: () => Promise<Note[]>;
        create: (note: Partial<Note>) => Promise<{ success: boolean; unlocked: string[] }>;
        update: (id: string, updates: Partial<Note>) => Promise<boolean>;
        delete: (id: string) => Promise<boolean>;
      };
      reflections: {
        all: () => Promise<DailyReflection[]>;
        get: (date: string) => Promise<DailyReflection | null>;
        save: (date: string, mood: number, note: string) => Promise<{ success: boolean; unlocked: string[] }>;
      };
      achievements: {
        all: () => Promise<Achievement[]>;
        triggerCheck: (type: string) => Promise<string[]>;
      };
      notifications: {
        all: () => Promise<Notification[]>;
        markRead: (id: string) => Promise<boolean>;
        clearAll: () => Promise<boolean>;
      };
      backup: {
        exportJson: () => Promise<boolean>;
        importJson: () => Promise<boolean>;
        exportZip: () => Promise<boolean>;
      };
    };
  }
}
export {};
