import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import quotes from './quotes.json';

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null;
let logFilePath = '';

// Interfaces
interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string;
  category: string;
  status: 'Todo' | 'In_Progress' | 'Completed';
  recurring: string;
  parent_id?: string;
  created_at: string;
  completed_at?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'Active' | 'Completed';
  created_at: string;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  status: 'Todo' | 'Completed';
  created_at: string;
}

interface Note {
  id: string;
  title: string;
  content?: string;
  folder_id?: string;
  created_at: string;
  updated_at: string;
}

interface DailyReflection {
  date: string;
  mood: number;
  note?: string;
  created_at: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked_at?: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

interface FlowDeskData {
  app_metadata: {
    app_version: string;
    db_version: number;
  };
  theme_preferences: {
    mode: 'dark' | 'light';
    accent: string;
  };
  folders: Folder[];
  tasks: Task[];
  goals: Goal[];
  milestones: Milestone[];
  notes: Note[];
  daily_reflections: DailyReflection[];
  achievements: Achievement[];
  notifications: Notification[];
  settings: Record<string, string>;
}

// In-Memory Database State
let flowData: FlowDeskData = {
  app_metadata: {
    app_version: '1.0.0',
    db_version: 1,
  },
  theme_preferences: {
    mode: 'dark',
    accent: 'indigo',
  },
  folders: [],
  tasks: [],
  goals: [],
  milestones: [],
  notes: [],
  daily_reflections: [],
  achievements: [
    { id: 'first_task', title: 'First Step Taken', description: 'Create your first productivity task', unlocked_at: null },
    { id: 'first_complete', title: 'Productivity Spark', description: 'Complete your first task', unlocked_at: null },
    { id: 'streak_3', title: 'Building Momentum', description: 'Achieve a 3-day completion streak', unlocked_at: null },
    { id: 'streak_7', title: 'Productive Habit', description: 'Achieve a 7-day completion streak', unlocked_at: null },
    { id: 'goal_crusher', title: 'Goal Crusher', description: 'Complete a goal and all milestones', unlocked_at: null },
    { id: 'note_taker', title: 'Documentarian', description: 'Create your first rich markdown note', unlocked_at: null },
    { id: 'reflection_done', title: 'Mindful Mind', description: 'Save your first daily reflection', unlocked_at: null },
    { id: 'productivity_master', title: 'Productivity Master', description: 'Complete 5 tasks in a single day', unlocked_at: null }
  ],
  notifications: [],
  settings: {
    quotes: JSON.stringify(quotes),
    quotes_seeded: '1'
  }
};

// Config Settings Schema
interface AppConfig {
  storageDirectory: string;
}

const defaultUserDataPath = app.getPath('userData');
const configFilePath = path.join(defaultUserDataPath, 'flowdesk_config.json');
let appConfig: AppConfig = {
  storageDirectory: ''
};

// Setup Logging
function initLogging() {
  const userDataPath = app.getPath('userData');
  const logDir = path.join(userDataPath, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logFilePath = path.join(logDir, 'app.log');
  
  if (fs.existsSync(logFilePath) && fs.statSync(logFilePath).size > 5 * 1024 * 1024) {
    fs.renameSync(logFilePath, path.join(logDir, `app.log.old-${Date.now()}`));
  }

  log('info', 'Logging initialized.');
  log('info', `AppData Path: ${userDataPath}`);
}

function log(level: 'info' | 'warn' | 'error', message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  if (logFilePath) {
    fs.appendFileSync(logFilePath, logLine);
  }
  console.log(logLine.trim());
}

// Portable Mode: Detect executable path and check if writable
function getDefaultStorageDirectory(): string {
  const exeDir = path.dirname(process.execPath);
  
  // In development, default to local AppData to keep sources clean
  if (!app.isPackaged) {
    return path.join(app.getPath('userData'), 'database');
  }

  // Writable test in folder of executable
  const testPath = path.join(exeDir, '.flowdesk_write_test');
  try {
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    log('info', `Local folder writable. Activating portable storage folder at: ${exeDir}`);
    return path.join(exeDir, 'data');
  } catch (err) {
    log('info', `Local folder not writable (e.g. Program Files). Defaulting storage to AppData.`);
    return path.join(app.getPath('userData'), 'database');
  }
}

// Config file management
function loadConfig() {
  appConfig.storageDirectory = getDefaultStorageDirectory();
  try {
    if (fs.existsSync(configFilePath)) {
      const content = fs.readFileSync(configFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.storageDirectory) {
        appConfig.storageDirectory = parsed.storageDirectory;
        log('info', `Loaded database path from config: ${appConfig.storageDirectory}`);
      }
    } else {
      saveConfig();
    }
  } catch (err) {
    log('error', `Failed to load config file: ${err}`);
  }
}

function saveConfig() {
  try {
    const parentDir = path.dirname(configFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(configFilePath, JSON.stringify(appConfig, null, 2), 'utf-8');
  } catch (err) {
    log('error', `Failed to save config file: ${err}`);
  }
}

// Database Initialization (JSON Storage)
function initDatabase() {
  loadConfig();
  const dbDir = appConfig.storageDirectory;
  const dbPath = path.join(dbDir, 'flowdesk_data.json');
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(content);
      // Basic validation check to verify correct root keys exist
      if (parsed.tasks && parsed.theme_preferences && parsed.folders) {
        flowData = parsed;
        log('info', `Database loaded successfully from: ${dbPath}`);
      } else {
        throw new Error('Database schema structure is invalid.');
      }
    } else {
      log('info', `Database file not found. Seeding initial data at: ${dbPath}`);
      saveData();
    }
  } catch (err: any) {
    log('error', `Database loading failed: ${err?.message || err}. Re-initializing default database.`);
    saveData();
  }
}

// Atomic Write Engine
function saveData() {
  const dbDir = appConfig.storageDirectory;
  const dbPath = path.join(dbDir, 'flowdesk_data.json');
  const tmpPath = `${dbPath}.tmp`;
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(tmpPath, JSON.stringify(flowData, null, 2), 'utf-8');
    fs.renameSync(tmpPath, dbPath);
  } catch (err: any) {
    log('error', `Failed to write database file atomically: ${err?.message || err}`);
  }
}

// Achievements Check Helpers
function checkAndUnlockAchievement(id: string): string[] {
  const newlyUnlocked: string[] = [];
  try {
    const ach = flowData.achievements.find((a) => a.id === id);
    if (ach && !ach.unlocked_at) {
      const nowStr = new Date().toISOString();
      ach.unlocked_at = nowStr;

      const notifId = Math.random().toString(36).substring(2, 9);
      flowData.notifications.push({
        id: notifId,
        title: 'Achievement Unlocked! 🏆',
        message: `You unlocked the achievement: ${ach.title}`,
        read: 0,
        created_at: nowStr,
      });
      flowData.notifications.sort((a, b) => b.created_at.localeCompare(a.created_at));
      newlyUnlocked.push(ach.title);
      log('info', `Achievement unlocked: ${ach.title}`);
      saveData();
    }
  } catch (err: any) {
    log('error', `Error checking achievement ${id}: ${err.message}`);
  }
  return newlyUnlocked;
}

function checkStreakAchievements(): string[] {
  const newlyUnlocked: string[] = [];
  try {
    const completedDates = Array.from(
      new Set(
        flowData.tasks
          .filter((t) => t.status === 'Completed' && t.completed_at)
          .map((t) => t.completed_at!.substring(0, 10))
      )
    ).sort((a, b) => b.localeCompare(a));

    if (completedDates.length === 0) return [];

    let currentStreak = 0;
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    const latestDate = completedDates[0];
    if (latestDate === todayStr || latestDate === yesterdayStr) {
      currentStreak = 1;
      let checkDate = new Date(latestDate);
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

    if (currentStreak >= 3) {
      newlyUnlocked.push(...checkAndUnlockAchievement('streak_3'));
    }
    if (currentStreak >= 7) {
      newlyUnlocked.push(...checkAndUnlockAchievement('streak_7'));
    }
  } catch (err: any) {
    log('error', `Streak checking failed: ${err.message}`);
  }
  return newlyUnlocked;
}

function checkDailyCountAchievements(): string[] {
  const newlyUnlocked: string[] = [];
  try {
    const todayStr = new Date().toISOString().substring(0, 10);
    const completedToday = flowData.tasks.filter((t) => 
      t.status === 'Completed' && 
      t.completed_at && 
      t.completed_at.substring(0, 10) === todayStr
    ).length;

    if (completedToday >= 5) {
      newlyUnlocked.push(...checkAndUnlockAchievement('productivity_master'));
    }
  } catch (err: any) {
    log('error', `Daily task count achievements check failed: ${err.message}`);
  }
  return newlyUnlocked;
}

// Window creation
function createWindow() {
  const iconPath = app.isPackaged 
    ? path.join(__dirname, '../icon.png')
    : path.join(__dirname, '../../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: true, // Native title bar
    show: false, // Don't show until ready
    backgroundColor: '#0F172A',
    icon: iconPath, // Fixed taskbar icon loading
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Load app
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log('info', 'Window shown.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Application Lifecycle
app.whenReady().then(() => {
  initLogging();
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  log('info', 'Application shutting down.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS (JSON Data API)
// ==========================================

// Logs
ipcMain.handle('logs:get', () => {
  if (fs.existsSync(logFilePath)) {
    return fs.readFileSync(logFilePath, 'utf-8');
  }
  return 'No logs available.';
});

ipcMain.handle('logs:clear', () => {
  if (fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
    return true;
  }
  return false;
});

ipcMain.handle('logs:error', (_, message: string) => {
  log('error', `[RENDERER] ${message}`);
  return true;
});

// App Version
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// Quotes
ipcMain.handle('quotes:get-random', () => {
  try {
    const rawQuotes = flowData.settings.quotes;
    if (rawQuotes) {
      const parsedQuotes = JSON.parse(rawQuotes);
      if (Array.isArray(parsedQuotes) && parsedQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * parsedQuotes.length);
        return parsedQuotes[randomIndex];
      }
    }
  } catch (err: any) {
    log('error', `Error loading random quote: ${err.message}`);
  }
  return { text: 'Every day is a fresh start.', author: 'Unknown' };
});

// Theme Preferences
ipcMain.handle('theme:get', () => {
  return flowData.theme_preferences || { mode: 'dark', accent: 'indigo' };
});

ipcMain.handle('theme:save', (_, mode: 'dark' | 'light', accent: string) => {
  try {
    flowData.theme_preferences = { mode, accent };
    log('info', `Saved theme: mode=${mode}, accent=${accent}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error saving theme: ${err.message}`);
    return false;
  }
});

// Tasks
ipcMain.handle('tasks:all', () => {
  const list = [...flowData.tasks];
  // Sort by due_date ASC (nulls last), then created_at DESC
  return list.sort((a, b) => {
    if (a.due_date && b.due_date) {
      const dateDiff = a.due_date.localeCompare(b.due_date);
      if (dateDiff !== 0) return dateDiff;
    } else if (a.due_date) {
      return -1;
    } else if (b.due_date) {
      return 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
});

ipcMain.handle('tasks:create', (_, task: any) => {
  try {
    const newTask: Task = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'Medium',
      due_date: task.due_date || undefined,
      category: task.category || 'Inbox',
      status: task.status || 'Todo',
      recurring: task.recurring || 'None',
      parent_id: task.parent_id || undefined,
      created_at: task.created_at || new Date().toISOString(),
      completed_at: task.status === 'Completed' ? new Date().toISOString() : undefined
    };
    flowData.tasks.push(newTask);
    log('info', `Task created: ${task.id} - ${task.title}`);

    // Check first task achievement
    const unlocked = checkAndUnlockAchievement('first_task');
    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error creating task: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('tasks:update', (_, id: string, updates: any) => {
  try {
    const task = flowData.tasks.find((t) => t.id === id);
    if (!task) return { success: false, error: 'Task not found', unlocked: [] };

    // Set completed_at timestamp
    if (updates.status === 'Completed' && task.status !== 'Completed') {
      updates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'Completed') {
      updates.completed_at = undefined;
    }

    Object.assign(task, updates);
    log('info', `Task updated: ${id}`);

    const unlocked: string[] = [];
    if (updates.status === 'Completed') {
      unlocked.push(...checkAndUnlockAchievement('first_complete'));
      unlocked.push(...checkDailyCountAchievements());
      unlocked.push(...checkStreakAchievements());
    }

    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error updating task: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('tasks:delete', (_, id: string) => {
  try {
    // Cascading delete for subtasks
    flowData.tasks = flowData.tasks.filter((t) => t.id !== id && t.parent_id !== id);
    log('info', `Task deleted: ${id}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error deleting task: ${err.message}`);
    return false;
  }
});

ipcMain.handle('tasks:bulk-complete', (_, ids: string[]) => {
  if (!ids.length) return { success: false, unlocked: [] };
  try {
    const nowStr = new Date().toISOString();
    flowData.tasks.forEach((t) => {
      if (ids.includes(t.id)) {
        t.status = 'Completed';
        t.completed_at = nowStr;
      }
    });
    log('info', `Bulk completed tasks: ${ids.join(', ')}`);

    const unlocked: string[] = [];
    unlocked.push(...checkAndUnlockAchievement('first_complete'));
    unlocked.push(...checkDailyCountAchievements());
    unlocked.push(...checkStreakAchievements());

    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error bulk completing tasks: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('tasks:bulk-delete', (_, ids: string[]) => {
  if (!ids.length) return false;
  try {
    // Delete parent tasks and matching subtasks
    flowData.tasks = flowData.tasks.filter((t) => !ids.includes(t.id) && !(t.parent_id && ids.includes(t.parent_id)));
    log('info', `Bulk deleted tasks: ${ids.join(', ')}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error bulk deleting tasks: ${err.message}`);
    return false;
  }
});

// Goals
ipcMain.handle('goals:all', () => {
  const goalsList = [...flowData.goals];
  // Nest milestones inside goals
  goalsList.forEach((g) => {
    g.milestones = flowData.milestones.filter((m) => m.goal_id === g.id);
  });
  return goalsList.sort((a, b) => b.created_at.localeCompare(a.created_at));
});

ipcMain.handle('goals:create', (_, goal: any) => {
  try {
    const newGoal: Goal = {
      id: goal.id,
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || undefined,
      status: goal.status || 'Active',
      created_at: goal.created_at || new Date().toISOString()
    };
    flowData.goals.push(newGoal);
    log('info', `Goal created: ${goal.title}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error creating goal: ${err.message}`);
    return false;
  }
});

ipcMain.handle('goals:update', (_, id: string, updates: any) => {
  try {
    const goal = flowData.goals.find((g) => g.id === id);
    if (!goal) return { success: false, error: 'Goal not found', unlocked: [] };

    Object.assign(goal, updates);
    log('info', `Goal updated: ${id}`);

    const unlocked: string[] = [];
    if (updates.status === 'Completed') {
      // Force complete all related milestones
      flowData.milestones.forEach((m) => {
        if (m.goal_id === id) m.status = 'Completed';
      });
      unlocked.push(...checkAndUnlockAchievement('goal_crusher'));
    }

    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error updating goal: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('goals:delete', (_, id: string) => {
  try {
    flowData.goals = flowData.goals.filter((g) => g.id !== id);
    // Cascade milestones delete
    flowData.milestones = flowData.milestones.filter((m) => m.goal_id !== id);
    log('info', `Goal deleted: ${id}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error deleting goal: ${err.message}`);
    return false;
  }
});

// Milestones
ipcMain.handle('milestones:create', (_, mil: any) => {
  try {
    const newMilestone: Milestone = {
      id: mil.id,
      goal_id: mil.goal_id,
      title: mil.title,
      status: mil.status || 'Todo',
      created_at: mil.created_at || new Date().toISOString()
    };
    flowData.milestones.push(newMilestone);
    log('info', `Milestone created: ${mil.title}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error creating milestone: ${err.message}`);
    return false;
  }
});

ipcMain.handle('milestones:update', (_, id: string, status: 'Todo' | 'Completed') => {
  try {
    const mil = flowData.milestones.find((m) => m.id === id);
    if (!mil) return { success: false, unlocked: [] };

    mil.status = status;
    const goalId = mil.goal_id;

    const unlocked: string[] = [];
    // If all milestones for this goal are completed, set Goal status to completed
    const goalMils = flowData.milestones.filter((m) => m.goal_id === goalId);
    const completedMils = goalMils.filter((m) => m.status === 'Completed');

    if (goalMils.length > 0 && goalMils.length === completedMils.length) {
      const goal = flowData.goals.find((g) => g.id === goalId);
      if (goal && goal.status !== 'Completed') {
        goal.status = 'Completed';
        unlocked.push(...checkAndUnlockAchievement('goal_crusher'));
      }
    }

    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error updating milestone: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('milestones:delete', (_, id: string) => {
  try {
    flowData.milestones = flowData.milestones.filter((m) => m.id !== id);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error deleting milestone: ${err.message}`);
    return false;
  }
});

// Folders
ipcMain.handle('folders:all', () => {
  return [...flowData.folders].sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle('folders:create', (_, folder: any) => {
  try {
    const newFolder: Folder = {
      id: folder.id,
      name: folder.name,
      created_at: folder.created_at || new Date().toISOString()
    };
    flowData.folders.push(newFolder);
    log('info', `Folder created: ${folder.name}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error creating folder: ${err.message}`);
    return false;
  }
});

// Folders delete cascading logic
ipcMain.handle('folders:delete', (_, id: string) => {
  try {
    flowData.folders = flowData.folders.filter((f) => f.id !== id);
    // Orphan folder_id for associated notes
    flowData.notes.forEach((n) => {
      if (n.folder_id === id) n.folder_id = undefined;
    });
    log('info', `Folder deleted: ${id}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error deleting folder: ${err.message}`);
    return false;
  }
});

// Notes
ipcMain.handle('notes:all', () => {
  return [...flowData.notes].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
});

ipcMain.handle('notes:create', (_, note: any) => {
  try {
    const newNote: Note = {
      id: note.id,
      title: note.title,
      content: note.content || '',
      folder_id: note.folder_id || undefined,
      created_at: note.created_at || new Date().toISOString(),
      updated_at: note.updated_at || new Date().toISOString()
    };
    flowData.notes.push(newNote);
    log('info', `Note created: ${note.title}`);

    const unlocked = checkAndUnlockAchievement('note_taker');
    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error creating note: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('notes:update', (_, id: string, updates: any) => {
  try {
    const note = flowData.notes.find((n) => n.id === id);
    if (!note) return false;

    updates.updated_at = new Date().toISOString();
    Object.assign(note, updates);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error updating note: ${err.message}`);
    return false;
  }
});

ipcMain.handle('notes:delete', (_, id: string) => {
  try {
    flowData.notes = flowData.notes.filter((n) => n.id !== id);
    log('info', `Note deleted: ${id}`);
    saveData();
    return true;
  } catch (err: any) {
    log('error', `Error deleting note: ${err.message}`);
    return false;
  }
});

// Daily Reflections
ipcMain.handle('reflections:all', () => {
  return [...flowData.daily_reflections].sort((a, b) => b.date.localeCompare(a.date));
});

ipcMain.handle('reflections:get', (_, date: string) => {
  const ref = flowData.daily_reflections.find((r) => r.date === date);
  return ref || null;
});

ipcMain.handle('reflections:save', (_, date: string, mood: number, note: string) => {
  try {
    let ref = flowData.daily_reflections.find((r) => r.date === date);
    if (ref) {
      ref.mood = mood;
      ref.note = note;
    } else {
      flowData.daily_reflections.push({
        date,
        mood,
        note,
        created_at: new Date().toISOString()
      });
    }
    log('info', `Reflection saved for date: ${date}, mood=${mood}`);

    const unlocked = checkAndUnlockAchievement('reflection_done');
    saveData();
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error saving reflection: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

// Achievements
ipcMain.handle('achievements:all', () => {
  return flowData.achievements || [];
});

ipcMain.handle('achievements:trigger-check', (_, type: string) => {
  if (type === 'stats') {
    return checkAndUnlockAchievement('stats_viewer');
  }
  return [];
});

// Notifications
ipcMain.handle('notifications:all', () => {
  return [...flowData.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
});

ipcMain.handle('notifications:mark-read', (_, id: string) => {
  try {
    const notif = flowData.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = 1;
      saveData();
      return true;
    }
  } catch (err: any) {
    log('error', `Error marking notification read: ${err.message}`);
  }
  return false;
});

ipcMain.handle('notifications:clear-all', () => {
  try {
    flowData.notifications = [];
    saveData();
    return true;
  } catch (err: any) {
    return false;
  }
});

// Backup System
ipcMain.handle('backup:export-json', async () => {
  if (!mainWindow) return false;
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export FlowDesk Backup',
      defaultPath: `flowdesk-backup-${new Date().toISOString().substring(0, 10)}.json`,
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
      log('info', `Backup JSON exported to: ${filePath}`);
      return true;
    }
  } catch (err: any) {
    log('error', `Backup JSON export failed: ${err.message}`);
  }
  return false;
});

ipcMain.handle('backup:import-json', async () => {
  if (!mainWindow) return false;
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import FlowDesk Backup',
      filters: [{ name: 'JSON files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (filePaths.length > 0) {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      const backupData = JSON.parse(content);
      
      // Basic structure validation
      if (backupData && typeof backupData === 'object' && backupData.tasks && backupData.folders) {
        flowData = backupData;
        log('info', `Backup imported successfully from: ${filePaths[0]}`);
        saveData();
        return true;
      } else {
        throw new Error('Imported backup file does not contain correct FlowDesk database structures.');
      }
    }
  } catch (err: any) {
    log('error', `Backup import failed: ${err.message}`);
    dialog.showErrorBox('Import Failed', `Could not import backup file: ${err.message}`);
  }
  return false;
});

// ZIP Backup
ipcMain.handle('backup:export-zip', async () => {
  if (!mainWindow) return false;
  try {
    const settingsBackup = {
      theme: flowData.theme_preferences || { mode: 'dark', accent: 'indigo' },
      backup_timestamp: new Date().toISOString()
    };

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export FlowDesk Bundle',
      defaultPath: `flowdesk-data-bundle-${new Date().toISOString().substring(0, 10)}.zip`,
      filters: [{ name: 'ZIP files', extensions: ['zip'] }]
    });

    if (filePath) {
      const dataBuffer = fs.readFileSync(path.join(appConfig.storageDirectory, 'flowdesk_data.json'));
      const settingsBuffer = Buffer.from(JSON.stringify(settingsBackup, null, 2), 'utf-8');

      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        zip.addFile('flowdesk_data.json', dataBuffer);
        zip.addFile('settings.json', settingsBuffer);
        zip.writeZip(filePath);
        log('info', `Data ZIP bundle exported to: ${filePath}`);
      } catch (zipErr) {
        // Fallback: package in simple binary block
        log('warn', `adm-zip load failed, using fallback custom package format: ${filePath}`);
        const headerSize = Buffer.alloc(16);
        headerSize.writeUInt32LE(settingsBuffer.length, 0);
        const outputBuffer = Buffer.concat([headerSize, settingsBuffer, dataBuffer]);
        fs.writeFileSync(filePath, outputBuffer);
      }
      return true;
    }
  } catch (err: any) {
    log('error', `Backup ZIP export failed: ${err.message}`);
  }
  return false;
});

// Reset Database API
ipcMain.handle('app:reset', async () => {
  try {
    log('warn', 'Starting application reset...');
    flowData = {
      app_metadata: {
        app_version: '1.0.0',
        db_version: 1,
      },
      theme_preferences: {
        mode: 'dark',
        accent: 'indigo',
      },
      folders: [],
      tasks: [],
      goals: [],
      milestones: [],
      notes: [],
      daily_reflections: [],
      achievements: [
        { id: 'first_task', title: 'First Step Taken', description: 'Create your first productivity task', unlocked_at: null },
        { id: 'first_complete', title: 'Productivity Spark', description: 'Complete your first task', unlocked_at: null },
        { id: 'streak_3', title: 'Building Momentum', description: 'Achieve a 3-day completion streak', unlocked_at: null },
        { id: 'streak_7', title: 'Productive Habit', description: 'Achieve a 7-day completion streak', unlocked_at: null },
        { id: 'goal_crusher', title: 'Goal Crusher', description: 'Complete a goal and all milestones', unlocked_at: null },
        { id: 'note_taker', title: 'Documentarian', description: 'Create your first rich markdown note', unlocked_at: null },
        { id: 'reflection_done', title: 'Mindful Mind', description: 'Save your first daily reflection', unlocked_at: null },
        { id: 'productivity_master', title: 'Productivity Master', description: 'Complete 5 tasks in a single day', unlocked_at: null }
      ],
      notifications: [],
      settings: {
        quotes: JSON.stringify(quotes),
        quotes_seeded: '1'
      }
    };
    saveData();
    log('info', 'Application reset complete.');
    return true;
  } catch (err: any) {
    log('error', `Application reset failed: ${err.message}`);
    return false;
  }
});

// Relocation Path Storage Config handles
ipcMain.handle('storage:get-path', () => {
  return path.join(appConfig.storageDirectory, 'flowdesk_data.json');
});

ipcMain.handle('storage:set-path', async () => {
  if (!mainWindow) return null;
  try {
    const filePaths = dialog.showOpenDialogSync(mainWindow, {
      title: 'Select Directory to Store Database',
      properties: ['openDirectory', 'createDirectory']
    });

    if (filePaths && filePaths.length > 0) {
      const newDir = filePaths[0];
      const oldPath = path.join(appConfig.storageDirectory, 'flowdesk_data.json');
      const newPath = path.join(newDir, 'flowdesk_data.json');

      // Copy database to new location if it exists, otherwise initialize it there
      if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        log('info', `Database file copied from ${oldPath} to ${newPath}`);
      }

      // Update configuration & save config file
      appConfig.storageDirectory = newDir;
      saveConfig();
      log('info', `Relocated database storage directory to: ${newDir}`);

      // Reload database from new folder path
      initDatabase();
      return newPath;
    }
  } catch (err: any) {
    log('error', `Failed to relocate database path: ${err.message}`);
    throw err;
  }
  return null;
});
