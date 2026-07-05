import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  logs: {
    get: () => ipcRenderer.invoke('logs:get'),
    clear: () => ipcRenderer.invoke('logs:clear'),
    error: (message: string) => ipcRenderer.invoke('logs:error', message)
  },
  app: {
    version: () => ipcRenderer.invoke('app:version'),
    reset: () => ipcRenderer.invoke('app:reset')
  },
  quotes: {
    getRandom: () => ipcRenderer.invoke('quotes:get-random')
  },
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    save: (mode: string, accent: string) => ipcRenderer.invoke('theme:save', mode, accent)
  },
  tasks: {
    all: () => ipcRenderer.invoke('tasks:all'),
    create: (task: any) => ipcRenderer.invoke('tasks:create', task),
    update: (id: string, updates: any) => ipcRenderer.invoke('tasks:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    bulkComplete: (ids: string[]) => ipcRenderer.invoke('tasks:bulk-complete', ids),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('tasks:bulk-delete', ids)
  },
  goals: {
    all: () => ipcRenderer.invoke('goals:all'),
    create: (goal: any) => ipcRenderer.invoke('goals:create', goal),
    update: (id: string, updates: any) => ipcRenderer.invoke('goals:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('goals:delete', id)
  },
  milestones: {
    create: (mil: any) => ipcRenderer.invoke('milestones:create', mil),
    update: (id: string, status: string) => ipcRenderer.invoke('milestones:update', id, status),
    delete: (id: string) => ipcRenderer.invoke('milestones:delete', id)
  },
  folders: {
    all: () => ipcRenderer.invoke('folders:all'),
    create: (folder: any) => ipcRenderer.invoke('folders:create', folder),
    delete: (id: string) => ipcRenderer.invoke('folders:delete', id)
  },
  notes: {
    all: () => ipcRenderer.invoke('notes:all'),
    create: (note: any) => ipcRenderer.invoke('notes:create', note),
    update: (id: string, updates: any) => ipcRenderer.invoke('notes:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id)
  },
  reflections: {
    all: () => ipcRenderer.invoke('reflections:all'),
    get: (date: string) => ipcRenderer.invoke('reflections:get', date),
    save: (date: string, mood: number, note: string) => ipcRenderer.invoke('reflections:save', date, mood, note)
  },
  achievements: {
    all: () => ipcRenderer.invoke('achievements:all'),
    triggerCheck: (type: string) => ipcRenderer.invoke('achievements:trigger-check', type)
  },
  notifications: {
    all: () => ipcRenderer.invoke('notifications:all'),
    markRead: (id: string) => ipcRenderer.invoke('notifications:mark-read', id),
    clearAll: () => ipcRenderer.invoke('notifications:clear-all')
  },
  backup: {
    exportJson: () => ipcRenderer.invoke('backup:export-json'),
    importJson: () => ipcRenderer.invoke('backup:import-json'),
    exportZip: () => ipcRenderer.invoke('backup:export-zip')
  }
});
