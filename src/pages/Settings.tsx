import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Settings as SettingsIcon, Download, Upload, 
  RotateCcw, ShieldCheck, Terminal, Trash2, RefreshCw
} from 'lucide-react';
import { useThemeStore, useDataStore } from '../hooks/useStore';
import { Button } from '../components/ui/Button';
import { AccentColor } from '../types';
import { cn } from '../utils/cn';

export const Settings: React.FC = () => {
  const { mode, accent, setTheme } = useThemeStore();
  const { loadAllData } = useDataStore();

  const [logs, setLogs] = useState('Loading logs...');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [storagePath, setStoragePath] = useState('Loading path...');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchAppVersion();
    fetchStoragePath();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await window.api.logs.get();
      setLogs(data);
    } catch (err) {
      setLogs('Failed to read logs.');
    }
  };

  const fetchAppVersion = async () => {
    try {
      const ver = await window.api.app.version();
      setAppVersion(ver);
    } catch (err) {
      setAppVersion('1.0.0');
    }
  };

  const fetchStoragePath = async () => {
    try {
      const path = await window.api.storage.getPath();
      setStoragePath(path);
    } catch (err) {
      setStoragePath('Failed to load storage path.');
    }
  };

  const handleChangeStoragePath = async () => {
    try {
      const newPath = await window.api.storage.setPath();
      if (newPath) {
        setStoragePath(newPath);
        alert('Data storage relocated successfully! FlowDesk has moved your database and is now running from the new folder.');
        await loadAllData();
      }
    } catch (err: any) {
      alert(`Relocation failed: ${err.message}`);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Clear all local application logs?')) {
      const cleared = await window.api.logs.clear();
      if (cleared) fetchLogs();
    }
  };

  // Backups Handlers
  const handleExportJson = async () => {
    const success = await window.api.backup.exportJson();
    if (success) {
      alert('Backup exported successfully.');
    }
  };

  const handleImportJson = async () => {
    if (confirm('Warning: Importing a backup will overwrite all existing local database tables. Proceed?')) {
      const success = await window.api.backup.importJson();
      if (success) {
        alert('Backup imported successfully. Reloading workspace data.');
        await loadAllData();
      }
    }
  };

  const handleExportZip = async () => {
    const success = await window.api.backup.exportZip();
    if (success) {
      alert('FlowDesk backup ZIP bundle exported successfully.');
    }
  };

  // Reset Application Handler
  const handleAppReset = async () => {
    setIsResetting(true);
    try {
      const reset = await window.api.app.reset();
      if (reset) {
        alert('Application data reset successfully. Seeding default configurations.');
        // Set theme back to default
        await setTheme('dark', 'indigo');
        await loadAllData();
      }
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
      setResetConfirmOpen(false);
    }
  };

  const accentColors: { name: AccentColor; label: string; colorClass: string }[] = [
    { name: 'indigo', label: 'Indigo', colorClass: 'bg-indigo-500' },
    { name: 'blue', label: 'Blue', colorClass: 'bg-blue-500' },
    { name: 'green', label: 'Green', colorClass: 'bg-green-500' },
    { name: 'emerald', label: 'Emerald', colorClass: 'bg-emerald-500' },
    { name: 'orange', label: 'Orange', colorClass: 'bg-orange-500' },
    { name: 'rose', label: 'Rose', colorClass: 'bg-rose-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none animate-fade-in pb-12">
      
      {/* 1. Theme Configuration Panel */}
      <div className="glass-panel border border-border rounded-2xl p-6 shadow-xl space-y-5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <SettingsIcon size={14} className="text-accent" /> Interface Preferences
        </h4>
        
        {/* Dark/Light Modes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/50">
          <div>
            <h5 className="text-sm font-bold text-white">Appearance Theme</h5>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Toggle between dark mode and light mode aesthetics.</p>
          </div>
          <div className="flex bg-slate-900 border border-border p-0.5 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setTheme('dark', accent)}
              className={cn(
                'px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150',
                mode === 'dark' ? 'bg-accent text-accent-foreground shadow' : 'text-slate-400 hover:text-white'
              )}
            >
              Dark Theme
            </button>
            <button
              onClick={() => setTheme('light', accent)}
              className={cn(
                'px-4 py-2 text-xs font-bold rounded-lg transition-all duration-150',
                mode === 'light' ? 'bg-accent text-accent-foreground shadow' : 'text-slate-400 hover:text-white'
              )}
            >
              Light Theme
            </button>
          </div>
        </div>

        {/* Accent Colors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div>
            <h5 className="text-sm font-bold text-white">Accent Highlight Color</h5>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Customize the color of dashboard dials, charts, active tags, and focus widgets.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {accentColors.map((color) => (
              <button
                key={color.name}
                onClick={() => setTheme(mode, color.name)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-95 hover:bg-secondary/40',
                  accent === color.name
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-border bg-slate-950/20 text-slate-400'
                )}
              >
                <span className={cn('h-3.5 w-3.5 rounded-full shrink-0', color.colorClass)} />
                <span>{color.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Data & Backups Configuration Panel */}
      <div className="glass-panel border border-border rounded-2xl p-6 shadow-xl space-y-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Download size={14} className="text-accent" /> Data Backup & Security
        </h4>

        {/* JSON backups */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/50">
          <div>
            <h5 className="text-sm font-bold text-white">Export & Import JSON</h5>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Export database records to an offline JSON file, or restore tables from a backup file.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExportJson} variant="secondary" size="sm" className="font-semibold gap-1.5 border border-border">
              <Download size={13} /> Export JSON
            </Button>
            <Button onClick={handleImportJson} variant="secondary" size="sm" className="font-semibold gap-1.5 border border-border">
              <Upload size={13} /> Import JSON
            </Button>
          </div>
        </div>

        {/* ZIP bundle backups */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/50">
          <div>
            <h5 className="text-sm font-bold text-white">Export ZIP Data Bundle</h5>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Safely packs the live SQLite database file + user preference configs into a compressed ZIP.</p>
          </div>
          <Button onClick={handleExportZip} variant="secondary" size="sm" className="font-semibold gap-1.5 border border-border self-start sm:self-auto">
            <Download size={13} /> Export ZIP Bundle
          </Button>
        </div>

        {/* Application Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div>
            <h5 className="text-sm font-bold text-rose-500">Destructive Factory Reset</h5>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Clears all tasks, goals, markdown notes, reflections, and achievements. Resets back to defaults.</p>
          </div>
          <Button 
            onClick={() => setResetConfirmOpen(true)} 
            variant="destructive" 
            size="sm" 
            className="font-semibold gap-1.5 self-start sm:self-auto bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
          >
            <RotateCcw size={13} /> Reset Application
          </Button>
        </div>
      </div>

      {/* 3. Cloud Sync & Data Storage */}
      <div className="glass-panel border border-border rounded-2xl p-6 shadow-xl space-y-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Upload size={14} className="text-accent" /> Cloud Sync & Storage Path
        </h4>

        <div className="flex flex-col gap-4 py-2">
          <div>
            <h5 className="text-sm font-bold text-white">Data File Location</h5>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Change the storage directory of your tasks and notes (e.g. to a OneDrive, Google Drive, or Dropbox folder) to sync this app across computers.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950 border border-border p-3 rounded-xl font-semibold">
            <span className="flex-1 select-text font-mono text-[10px] text-slate-400 break-all leading-normal font-normal">
              {storagePath}
            </span>
            <Button onClick={handleChangeStoragePath} variant="secondary" size="sm" className="font-semibold shrink-0 border border-border">
              Change Folder...
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Local Application Logs (Developer Info) */}
      <div className="glass-panel border border-border rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal size={14} className="text-accent" /> Developer Diagnostics Logs
          </h4>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchLogs} 
              className="p-1 rounded hover:bg-secondary text-slate-400 hover:text-white transition-colors"
              title="Refresh logs"
            >
              <RefreshCw size={12} />
            </button>
            <button 
              onClick={handleClearLogs} 
              className="p-1 rounded hover:bg-secondary text-slate-400 hover:text-rose-500 transition-colors"
              title="Clear logs"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Code log text area */}
        <div className="bg-slate-950 border border-border rounded-xl p-3 max-h-[160px] overflow-y-auto select-text font-mono text-[10px] text-slate-400 leading-normal scrollbar-thin">
          {logs ? (
            <pre className="whitespace-pre-wrap">{logs}</pre>
          ) : (
            <p className="text-slate-500 italic">No log outputs recorded yet.</p>
          )}
        </div>

        {/* System parameters */}
        <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">
          <span>FlowDesk v{appVersion}</span>
          <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-500 shrink-0" /> JSON Database Active</span>
        </div>
      </div>

      {/* Factory Reset Confirmation Dialog Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setResetConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-rose-500/30 bg-slate-950 p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-rose-500 pb-3 border-b border-border">
              <ShieldAlert size={22} className="animate-bounce" />
              <h3 className="text-sm font-bold">Verify Factory Reset</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mt-4">
              You are about to perform a destructive reset. This will completely wipe all offline database tables. 
              This operation **cannot** be undone. Are you sure?
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setResetConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                size="sm" 
                isLoading={isResetting} 
                onClick={handleAppReset}
              >
                Clear Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
