import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import quotes from './quotes.json';

// Keep a global reference of the window object to avoid garbage collection
let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let logFilePath = '';

// Setup Logging
function initLogging() {
  const userDataPath = app.getPath('userData');
  const logDir = path.join(userDataPath, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  logFilePath = path.join(logDir, 'app.log');
  
  // Rotate log if it gets too large (> 5MB)
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

// Database Management
function initDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'flowdesk.db');
    log('info', `Opening database at: ${dbPath}`);

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        app_version TEXT NOT NULL,
        db_version INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS theme_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mode TEXT DEFAULT 'dark',
        accent TEXT DEFAULT 'indigo'
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT CHECK(priority IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
        due_date TEXT,
        category TEXT DEFAULT 'Inbox',
        status TEXT CHECK(status IN ('Todo', 'In_Progress', 'Completed')) DEFAULT 'Todo',
        recurring TEXT DEFAULT 'None',
        parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        target_date TEXT,
        status TEXT CHECK(status IN ('Active', 'Completed')) DEFAULT 'Active',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT CHECK(status IN ('Todo', 'Completed')) DEFAULT 'Todo',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS daily_reflections (
        date TEXT PRIMARY KEY,
        mood INTEGER CHECK(mood BETWEEN 1 AND 5),
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        unlocked_at TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Seed Achievements if not exist
    const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get() as { count: number };
    if (achievementCount.count === 0) {
      log('info', 'Seeding achievements...');
      const insertAch = db.prepare('INSERT INTO achievements (id, title, description, unlocked_at) VALUES (?, ?, ?, ?)');
      const achs = [
        ['first_task', 'First Step Taken', 'Create your first productivity task', null],
        ['first_complete', 'Productivity Spark', 'Complete your first task', null],
        ['streak_3', 'Building Momentum', 'Achieve a 3-day completion streak', null],
        ['streak_7', 'Productive Habit', 'Achieve a 7-day completion streak', null],
        ['goal_crusher', 'Goal Crusher', 'Complete a goal and all milestones', null],
        ['note_taker', 'Documentarian', 'Create your first rich markdown note', null],
        ['reflection_done', 'Mindful Mind', 'Save your first daily reflection', null],
        ['productivity_master', 'Productivity Master', 'Complete 5 tasks in a single day', null]
      ];
      const transaction = db.transaction((list) => {
        for (const ach of list) {
          insertAch.run(ach[0], ach[1], ach[2], ach[3]);
        }
      });
      transaction(achs);
    }

    // Seed Quotes setting
    const quoteCount = db.prepare('SELECT COUNT(*) as count FROM settings WHERE key = ?').get('quotes_seeded') as { count: number } | undefined;
    if (!quoteCount || quoteCount.count === 0) {
      log('info', `Seeding ${quotes.length} quotes...`);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('quotes', JSON.stringify(quotes));
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('quotes_seeded', '1');
    }

    // Seed Theme preference
    const themeCount = db.prepare('SELECT COUNT(*) as count FROM theme_preferences').get() as { count: number };
    if (themeCount.count === 0) {
      db.prepare('INSERT INTO theme_preferences (id, mode, accent) VALUES (1, \'dark\', \'indigo\')').run();
    }

    // Seed Initial App Metadata
    const metadataCount = db.prepare('SELECT COUNT(*) as count FROM app_metadata').get() as { count: number };
    if (metadataCount.count === 0) {
      db.prepare('INSERT INTO app_metadata (id, app_version, db_version) VALUES (1, ?, ?)').run('1.0.0', 1);
    }

    log('info', 'Database initialized and seeded successfully.');
  } catch (err: any) {
    log('error', `Failed to initialize database: ${err?.message || err}`);
  }
}

// Helper to check and unlock achievement
function checkAndUnlockAchievement(id: string): string[] {
  if (!db) return [];
  const newlyUnlocked: string[] = [];
  try {
    const ach = db.prepare('SELECT unlocked_at, title FROM achievements WHERE id = ?').get(id) as { unlocked_at: string | null; title: string } | undefined;
    if (ach && !ach.unlocked_at) {
      const nowStr = new Date().toISOString();
      db.prepare('UPDATE achievements SET unlocked_at = ? WHERE id = ?').run(nowStr, id);
      // Insert notification
      const notifId = Math.random().toString(36).substring(2, 9);
      db.prepare('INSERT INTO notifications (id, title, message) VALUES (?, ?, ?)')
        .run(notifId, 'Achievement Unlocked! 🏆', `You unlocked the achievement: ${ach.title}`);
      newlyUnlocked.push(ach.title);
      log('info', `Achievement unlocked: ${ach.title}`);
    }
  } catch (err: any) {
    log('error', `Error checking achievement ${id}: ${err.message}`);
  }
  return newlyUnlocked;
}

function checkStreakAchievements(): string[] {
  if (!db) return [];
  const newlyUnlocked: string[] = [];
  try {
    // Compute current completion streak
    // Find all distinct dates when tasks were completed
    const completedDates = db.prepare(`
      SELECT DISTINCT substr(completed_at, 1, 10) as dateVal 
      FROM tasks 
      WHERE status = 'Completed' AND completed_at IS NOT NULL
      ORDER BY dateVal DESC
    `).all() as { dateVal: string }[];

    if (completedDates.length === 0) return [];

    let currentStreak = 0;
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    
    // Check if the most recent completion is today or yesterday
    const latestDate = completedDates[0].dateVal;
    if (latestDate === todayStr || latestDate === yesterdayStr) {
      currentStreak = 1;
      let checkDate = new Date(latestDate);
      for (let i = 1; i < completedDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expectedStr = checkDate.toISOString().substring(0, 10);
        if (completedDates[i].dateVal === expectedStr) {
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
  if (!db) return [];
  const newlyUnlocked: string[] = [];
  try {
    const todayStr = new Date().toISOString().substring(0, 10);
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE status = 'Completed' 
        AND completed_at IS NOT NULL 
        AND substr(completed_at, 1, 10) = ?
    `).get(todayStr) as { count: number } | undefined;

    if (completedToday && completedToday.count >= 5) {
      newlyUnlocked.push(...checkAndUnlockAchievement('productivity_master'));
    }
  } catch (err: any) {
    log('error', `Daily count checking failed: ${err.message}`);
  }
  return newlyUnlocked;
}

// Window creation
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: true, // Native title bar
    show: false, // Don't show until ready
    backgroundColor: '#0F172A',
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
    // Open DevTools in development
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
  if (db) {
    db.close();
    log('info', 'Database connection closed.');
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS (SQLite Access API)
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

// App Version
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// Quotes
ipcMain.handle('quotes:get-random', () => {
  if (!db) return { text: 'Keep moving forward.', author: 'Unknown' };
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('quotes') as { value: string } | undefined;
    if (row) {
      const parsedQuotes = JSON.parse(row.value);
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
  if (!db) return { mode: 'dark', accent: 'indigo' };
  try {
    const theme = db.prepare('SELECT mode, accent FROM theme_preferences WHERE id = 1').get() as { mode: string; accent: string } | undefined;
    return theme || { mode: 'dark', accent: 'indigo' };
  } catch (err) {
    return { mode: 'dark', accent: 'indigo' };
  }
});

ipcMain.handle('theme:save', (_, mode: string, accent: string) => {
  if (!db) return false;
  try {
    db.prepare('UPDATE theme_preferences SET mode = ?, accent = ? WHERE id = 1').run(mode, accent);
    log('info', `Saved theme: mode=${mode}, accent=${accent}`);
    return true;
  } catch (err: any) {
    log('error', `Error saving theme: ${err.message}`);
    return false;
  }
});

// Tasks
ipcMain.handle('tasks:all', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM tasks ORDER BY due_date ASC, created_at DESC').all();
  } catch (err: any) {
    log('error', `Error fetching tasks: ${err.message}`);
    return [];
  }
});

ipcMain.handle('tasks:create', (_, task: any) => {
  if (!db) return { success: false, unlocked: [] };
  try {
    const stmt = db.prepare(`
      INSERT INTO tasks (id, title, description, priority, due_date, category, status, recurring, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.title,
      task.description || '',
      task.priority || 'Medium',
      task.due_date || null,
      task.category || 'Inbox',
      task.status || 'Todo',
      task.recurring || 'None',
      task.parent_id || null,
      task.created_at || new Date().toISOString()
    );
    log('info', `Task created: ${task.id} - ${task.title}`);
    
    // Check first task achievement
    const unlocked = checkAndUnlockAchievement('first_task');
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error creating task: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('tasks:update', (_, id: string, updates: any) => {
  if (!db) return { success: false, unlocked: [] };
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return { success: true, unlocked: [] };

    // Capture completion date if status transitions to completed
    if (updates.status === 'Completed') {
      updates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'Completed') {
      updates.completed_at = null;
    }

    const updateKeys = Object.keys(updates);
    const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
    const values = updateKeys.map(k => updates[k]);
    values.push(id);

    db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...values);
    log('info', `Task updated: ${id}`);

    const unlocked: string[] = [];
    if (updates.status === 'Completed') {
      unlocked.push(...checkAndUnlockAchievement('first_complete'));
      unlocked.push(...checkDailyCountAchievements());
      unlocked.push(...checkStreakAchievements());
    }

    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error updating task: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('tasks:delete', (_, id: string) => {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM tasks WHERE id = ? OR parent_id = ?').run(id, id);
    log('info', `Task deleted: ${id}`);
    return true;
  } catch (err: any) {
    log('error', `Error deleting task: ${err.message}`);
    return false;
  }
});

ipcMain.handle('tasks:bulk-complete', (_, ids: string[]) => {
  if (!db || !ids.length) return { success: false, unlocked: [] };
  try {
    const nowStr = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`
      UPDATE tasks 
      SET status = 'Completed', completed_at = ? 
      WHERE id IN (${placeholders})
    `).run(nowStr, ...ids);
    log('info', `Bulk completed tasks: ${ids.join(', ')}`);

    const unlocked: string[] = [];
    unlocked.push(...checkAndUnlockAchievement('first_complete'));
    unlocked.push(...checkDailyCountAchievements());
    unlocked.push(...checkStreakAchievements());

    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error bulk completing tasks: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('tasks:bulk-delete', (_, ids: string[]) => {
  if (!db || !ids.length) return false;
  try {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...ids);
    log('info', `Bulk deleted tasks: ${ids.join(', ')}`);
    return true;
  } catch (err: any) {
    log('error', `Error bulk deleting tasks: ${err.message}`);
    return false;
  }
});

// Goals
ipcMain.handle('goals:all', () => {
  if (!db) return [];
  try {
    const goalsList = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all() as any[];
    for (const g of goalsList) {
      g.milestones = db.prepare('SELECT * FROM milestones WHERE goal_id = ?').all(g.id);
    }
    return goalsList;
  } catch (err: any) {
    log('error', `Error fetching goals: ${err.message}`);
    return [];
  }
});

ipcMain.handle('goals:create', (_, goal: any) => {
  if (!db) return false;
  try {
    db.prepare('INSERT INTO goals (id, title, description, target_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(goal.id, goal.title, goal.description || '', goal.target_date || null, goal.status || 'Active', goal.created_at || new Date().toISOString());
    log('info', `Goal created: ${goal.title}`);
    return true;
  } catch (err: any) {
    log('error', `Error creating goal: ${err.message}`);
    return false;
  }
});

ipcMain.handle('goals:update', (_, id: string, updates: any) => {
  if (!db) return { success: false, unlocked: [] };
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return { success: true, unlocked: [] };
    
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(id);

    db.prepare(`UPDATE goals SET ${setClause} WHERE id = ?`).run(...values);
    log('info', `Goal updated: ${id}`);

    const unlocked: string[] = [];
    if (updates.status === 'Completed') {
      // Check if all milestones are completed as well
      db.prepare('UPDATE milestones SET status = \'Completed\' WHERE goal_id = ?').run(id);
      unlocked.push(...checkAndUnlockAchievement('goal_crusher'));
    }

    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error updating goal: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('goals:delete', (_, id: string) => {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
    log('info', `Goal deleted: ${id}`);
    return true;
  } catch (err: any) {
    log('error', `Error deleting goal: ${err.message}`);
    return false;
  }
});

// Milestones
ipcMain.handle('milestones:create', (_, mil: any) => {
  if (!db) return false;
  try {
    db.prepare('INSERT INTO milestones (id, goal_id, title, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(mil.id, mil.goal_id, mil.title, mil.status || 'Todo', mil.created_at || new Date().toISOString());
    log('info', `Milestone created: ${mil.title}`);
    return true;
  } catch (err: any) {
    log('error', `Error creating milestone: ${err.message}`);
    return false;
  }
});

ipcMain.handle('milestones:update', (_, id: string, status: string) => {
  if (!db) return { success: false, unlocked: [] };
  try {
    db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run(status, id);
    
    // Check if goal needs to be completed / check goal crusher
    const mil = db.prepare('SELECT goal_id FROM milestones WHERE id = ?').get(id) as { goal_id: string } | undefined;
    const unlocked: string[] = [];
    if (mil) {
      const goalId = mil.goal_id;
      // If all milestones of this goal are completed
      const totalMils = db.prepare('SELECT COUNT(*) as count FROM milestones WHERE goal_id = ?').get(goalId) as { count: number };
      const completedMils = db.prepare('SELECT COUNT(*) as count FROM milestones WHERE goal_id = ? AND status = \'Completed\'').get(goalId) as { count: number };
      
      if (totalMils.count > 0 && totalMils.count === completedMils.count) {
        db.prepare('UPDATE goals SET status = \'Completed\' WHERE id = ?').run(goalId);
        unlocked.push(...checkAndUnlockAchievement('goal_crusher'));
      }
    }

    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error updating milestone: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('milestones:delete', (_, id: string) => {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM milestones WHERE id = ?').run(id);
    return true;
  } catch (err: any) {
    log('error', `Error deleting milestone: ${err.message}`);
    return false;
  }
});

// Folders
ipcMain.handle('folders:all', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM folders ORDER BY name ASC').all();
  } catch (err: any) {
    log('error', `Error loading folders: ${err.message}`);
    return [];
  }
});

ipcMain.handle('folders:create', (_, folder: any) => {
  if (!db) return false;
  try {
    db.prepare('INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)')
      .run(folder.id, folder.name, folder.created_at || new Date().toISOString());
    log('info', `Folder created: ${folder.name}`);
    return true;
  } catch (err: any) {
    log('error', `Error creating folder: ${err.message}`);
    return false;
  }
});

ipcMain.handle('folders:delete', (_, id: string) => {
  if (!db) return false;
  try {
    // Note that ON DELETE SET NULL is set on notes.folder_id
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
    log('info', `Folder deleted: ${id}`);
    return true;
  } catch (err: any) {
    log('error', `Error deleting folder: ${err.message}`);
    return false;
  }
});

// Notes
ipcMain.handle('notes:all', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
  } catch (err: any) {
    log('error', `Error fetching notes: ${err.message}`);
    return [];
  }
});

ipcMain.handle('notes:create', (_, note: any) => {
  if (!db) return { success: false, unlocked: [] };
  try {
    db.prepare('INSERT INTO notes (id, title, content, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(note.id, note.title, note.content || '', note.folder_id || null, note.created_at || new Date().toISOString(), note.updated_at || new Date().toISOString());
    log('info', `Note created: ${note.title}`);

    const unlocked = checkAndUnlockAchievement('note_taker');
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error creating note: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

ipcMain.handle('notes:update', (_, id: string, updates: any) => {
  if (!db) return false;
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return true;

    updates.updated_at = new Date().toISOString();
    const updateKeys = Object.keys(updates);
    const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
    const values = updateKeys.map(k => updates[k]);
    values.push(id);

    db.prepare(`UPDATE notes SET ${setClause} WHERE id = ?`).run(...values);
    return true;
  } catch (err: any) {
    log('error', `Error updating note: ${err.message}`);
    return false;
  }
});

ipcMain.handle('notes:delete', (_, id: string) => {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    log('info', `Note deleted: ${id}`);
    return true;
  } catch (err: any) {
    log('error', `Error deleting note: ${err.message}`);
    return false;
  }
});

// Daily Reflections
ipcMain.handle('reflections:all', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM daily_reflections ORDER BY date DESC').all();
  } catch (err: any) {
    log('error', `Error fetching reflections: ${err.message}`);
    return [];
  }
});

ipcMain.handle('reflections:get', (_, date: string) => {
  if (!db) return null;
  try {
    return db.prepare('SELECT * FROM daily_reflections WHERE date = ?').get(date) || null;
  } catch (err: any) {
    log('error', `Error fetching reflection for ${date}: ${err.message}`);
    return null;
  }
});

ipcMain.handle('reflections:save', (_, date: string, mood: number, note: string) => {
  if (!db) return { success: false, unlocked: [] };
  try {
    db.prepare(`
      INSERT INTO daily_reflections (date, mood, note, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET mood = excluded.mood, note = excluded.note
    `).run(date, mood, note);
    log('info', `Reflection saved for date: ${date}, mood=${mood}`);

    const unlocked = checkAndUnlockAchievement('reflection_done');
    return { success: true, unlocked };
  } catch (err: any) {
    log('error', `Error saving reflection: ${err.message}`);
    return { success: false, error: err.message, unlocked: [] };
  }
});

// Achievements
ipcMain.handle('achievements:all', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM achievements').all();
  } catch (err: any) {
    log('error', `Error fetching achievements: ${err.message}`);
    return [];
  }
});

ipcMain.handle('achievements:trigger-check', (_, type: string) => {
  if (!db) return [];
  if (type === 'stats') {
    return checkAndUnlockAchievement('stats_viewer');
  }
  return [];
});

// Notifications
ipcMain.handle('notifications:all', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all();
  } catch (err: any) {
    log('error', `Error loading notifications: ${err.message}`);
    return [];
  }
});

ipcMain.handle('notifications:mark-read', (_, id: string) => {
  if (!db) return false;
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    return true;
  } catch (err: any) {
    log('error', `Error marking notification read: ${err.message}`);
    return false;
  }
});

ipcMain.handle('notifications:clear-all', () => {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM notifications').run();
    return true;
  } catch (err: any) {
    return false;
  }
});

// Backup System
ipcMain.handle('backup:export-json', async () => {
  if (!db || !mainWindow) return false;
  try {
    const tables = ['theme_preferences', 'folders', 'tasks', 'goals', 'milestones', 'notes', 'daily_reflections', 'achievements', 'notifications', 'settings'];
    const backupData: any = {};
    
    for (const table of tables) {
      backupData[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export FlowDesk Backup',
      defaultPath: `flowdesk-backup-${new Date().toISOString().substring(0,10)}.json`,
      filters: [{ name: 'JSON files', extensions: ['json'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
      log('info', `Backup exported to: ${filePath}`);
      return true;
    }
  } catch (err: any) {
    log('error', `Backup export failed: ${err.message}`);
  }
  return false;
});

ipcMain.handle('backup:import-json', async () => {
  if (!db || !mainWindow) return false;
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import FlowDesk Backup',
      filters: [{ name: 'JSON files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (filePaths.length > 0) {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      const backupData = JSON.parse(content);
      
      const tables = ['theme_preferences', 'folders', 'tasks', 'goals', 'milestones', 'notes', 'daily_reflections', 'achievements', 'notifications', 'settings'];
      
      // Basic check
      if (typeof backupData !== 'object') {
        throw new Error('Invalid backup file structure.');
      }

      // Write in transaction
      const restoreTx = db.transaction((data) => {
        // Clear old tables
        for (const table of tables) {
          // Do not delete achievements seeded structure, but update state
          if (table === 'achievements') {
            continue;
          }
          db!.prepare(`DELETE FROM ${table}`).run();
        }

        // Insert new data
        for (const table of tables) {
          const list = data[table];
          if (!Array.isArray(list) || list.length === 0) continue;
          
          if (table === 'achievements') {
            const updateAch = db!.prepare('UPDATE achievements SET unlocked_at = ? WHERE id = ?');
            for (const item of list) {
              updateAch.run(item.unlocked_at, item.id);
            }
            continue;
          }

          const cols = Object.keys(list[0]);
          const placeholders = cols.map(() => '?').join(', ');
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
          const insertStmt = db!.prepare(sql);
          
          for (const item of list) {
            const vals = cols.map(c => item[c]);
            insertStmt.run(...vals);
          }
        }
      });

      restoreTx(backupData);
      log('info', `Backup imported successfully from: ${filePaths[0]}`);
      return true;
    }
  } catch (err: any) {
    log('error', `Backup import failed: ${err.message}`);
    dialog.showErrorBox('Import Failed', `Could not import backup file: ${err.message}`);
  }
  return false;
});

// ZIP Backup
ipcMain.handle('backup:export-zip', async () => {
  if (!db || !mainWindow) return false;
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'database', 'flowdesk.db');
    const themePref = db.prepare('SELECT mode, accent FROM theme_preferences WHERE id = 1').get() as { mode: string; accent: string } | undefined;
    
    const settingsBackup = {
      theme: themePref || { mode: 'dark', accent: 'indigo' },
      backup_timestamp: new Date().toISOString()
    };

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export FlowDesk Bundle',
      defaultPath: `flowdesk-data-bundle-${new Date().toISOString().substring(0,10)}.zip`,
      filters: [{ name: 'ZIP files', extensions: ['zip'] }]
    });

    if (filePath) {
      // Due to better-sqlite3 locks, create a temporary copy of the DB first
      const tempDbPath = path.join(userDataPath, 'flowdesk.db.temp');
      db.backup(tempDbPath); // Safe backup operation that locks cleanly
      
      const dbBuffer = fs.readFileSync(tempDbPath);
      const settingsBuffer = Buffer.from(JSON.stringify(settingsBackup, null, 2), 'utf-8');

      // Native simple ZIP writing using adm-zip if it exists.
      // If adm-zip is not installed or errors, we will fallback to a custom packed file
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        zip.addFile('flowdesk.db', dbBuffer);
        zip.addFile('settings.json', settingsBuffer);
        zip.writeZip(filePath);
        log('info', `Data ZIP exported to: ${filePath}`);
      } catch (zipErr) {
        // Fallback: package in custom format (binary blob of database + JSON header)
        // Format: [16 bytes header size][JSON header string][database bytes]
        log('warn', `adm-zip load failed, using fallback custom package format: ${filePath}`);
        const headerSize = Buffer.alloc(16);
        headerSize.writeUInt32LE(settingsBuffer.length, 0);
        const outputBuffer = Buffer.concat([headerSize, settingsBuffer, dbBuffer]);
        fs.writeFileSync(filePath, outputBuffer);
      } finally {
        if (fs.existsSync(tempDbPath)) {
          fs.unlinkSync(tempDbPath);
        }
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
  if (!db) return false;
  try {
    log('warn', 'Starting application reset...');
    const tables = ['theme_preferences', 'folders', 'tasks', 'goals', 'milestones', 'notes', 'daily_reflections', 'achievements', 'notifications', 'settings'];
    
    db.transaction(() => {
      for (const table of tables) {
        db!.prepare(`DELETE FROM ${table}`).run();
      }
      // Re-seed default settings
      db!.prepare('INSERT INTO theme_preferences (id, mode, accent) VALUES (1, \'dark\', \'indigo\')').run();
      db!.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('quotes', JSON.stringify(quotes));
      db!.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('quotes_seeded', '1');
      
      // Reseed achievements
      const insertAch = db!.prepare('INSERT INTO achievements (id, title, description, unlocked_at) VALUES (?, ?, ?, ?)');
      const achs = [
        ['first_task', 'First Step Taken', 'Create your first productivity task', null],
        ['first_complete', 'Productivity Spark', 'Complete your first task', null],
        ['streak_3', 'Building Momentum', 'Achieve a 3-day completion streak', null],
        ['streak_7', 'Productive Habit', 'Achieve a 7-day completion streak', null],
        ['goal_crusher', 'Goal Crusher', 'Complete a goal and all milestones', null],
        ['note_taker', 'Documentarian', 'Create your first rich markdown note', null],
        ['reflection_done', 'Mindful Mind', 'Save your first daily reflection', null],
        ['productivity_master', 'Productivity Master', 'Complete 5 tasks in a single day', null]
      ];
      for (const ach of achs) {
        insertAch.run(ach[0], ach[1], ach[2], ach[3]);
      }
    })();

    log('info', 'Application reset complete.');
    return true;
  } catch (err: any) {
    log('error', `Application reset failed: ${err.message}`);
    return false;
  }
});
