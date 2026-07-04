import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Trash2, Folder as FolderIcon, BookOpen, 
  Edit3, Eye, FileText, ChevronRight, Save, Clock
} from 'lucide-react';
import { useDataStore } from '../hooks/useStore';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Note, Folder } from '../types';
import { cn } from '../utils/cn';

export const Notes: React.FC = () => {
  const { 
    notes, folders, loadAllData, createNote, updateNote, deleteNote, 
    createFolder, deleteFolder 
  } = useDataStore();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>('All');
  const [search, setSearch] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  
  // Folder Creation state
  const [folderName, setFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);

  // Local editor draft states (to avoid rapid re-rendering during typing)
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftFolder, setDraftFolder] = useState('');

  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle active note selection
  const activeNote = notes.find((n) => n.id === activeNoteId);

  // Synchronize drafts when note changes
  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
      setDraftFolder(activeNote.folder_id || 'None');
    } else {
      setDraftTitle('');
      setDraftContent('');
      setDraftFolder('None');
    }
  }, [activeNoteId]);

  // Debounced Autosave (500ms)
  const triggerAutosave = (updatedFields: Partial<Note>) => {
    if (!activeNoteId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await updateNote(activeNoteId, updatedFields);
    }, 500);
  };

  const handleTitleChange = (val: string) => {
    setDraftTitle(val);
    triggerAutosave({ title: val });
  };

  const handleContentChange = (val: string) => {
    setDraftContent(val);
    triggerAutosave({ content: val });
  };

  const handleFolderChange = (val: string) => {
    setDraftFolder(val);
    const folder_id = val === 'None' ? null : val;
    triggerAutosave({ folder_id });
  };

  // Folder creation handler
  const handleAddFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    await createFolder(folderName);
    setFolderName('');
    setShowAddFolder(false);
  };

  // Add Note handler
  const handleAddNote = async () => {
    const defaultFolder = activeFolderId === 'All' ? null : activeFolderId;
    await createNote({
      title: 'Untitled Note',
      content: '',
      folder_id: defaultFolder,
    });

    // Auto-select newly created note (latest in list)
    if (notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  };

  // Compile filtered notes list
  const getFilteredNotes = (): Note[] => {
    let list = [...notes];

    // Folder Filter
    if (activeFolderId !== 'All') {
      list = list.filter((n) => n.folder_id === activeFolderId);
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const filteredNotes = getFilteredNotes();

  // Simple Markdown Parser for Preview Pane
  const parseMarkdown = (markdownText: string): string => {
    if (!markdownText) return '<p class="text-slate-500 italic">No content. Start typing to write notes...</p>';

    let html = markdownText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-200 mt-4 mb-2">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-base font-extrabold text-white mt-5 mb-2.5 border-b border-border pb-1">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-white mt-6 mb-3 border-b border-border pb-2">$1</h2>');

    // Bold & Italics
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong class="font-extrabold text-white">$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em class="italic text-slate-300">$1</em>');

    // Code Blocks
    html = html.replace(/`([^`]+)`/gim, '<code class="bg-slate-800 border border-border px-1.5 py-0.5 rounded font-mono text-xs text-indigo-400">$1</code>');

    // Unordered Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="list-disc list-inside text-slate-300 ml-4 py-0.5">$1</li>');

    // Paragraphs (split by double enters)
    html = html.split('\n\n').map(p => {
      if (p.trim().startsWith('<h') || p.trim().startsWith('<li') || p.trim().startsWith('<code')) return p;
      return `<p class="text-sm text-slate-300 leading-relaxed mb-3">${p.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    return html;
  };

  return (
    <div className="flex h-full gap-6 animate-fade-in select-none">
      
      {/* 1. Folders Pane */}
      <aside className="w-52 shrink-0 hidden md:block">
        <div className="glass-panel border border-border rounded-2xl p-4 flex flex-col justify-between h-full max-h-[75vh]">
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between px-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notebooks</h4>
              <button 
                onClick={() => setShowAddFolder(!showAddFolder)}
                className="text-[10px] text-accent font-bold hover:underline"
              >
                + Folder
              </button>
            </div>

            {/* Folder creation box */}
            {showAddFolder && (
              <form onSubmit={handleAddFolderSubmit} className="px-2.5 space-y-2 animate-fade-in">
                <Input
                  required
                  placeholder="Folder name..."
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="h-8 text-xs bg-slate-950/40"
                />
                <div className="flex justify-end gap-1.5">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowAddFolder(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" size="sm" className="h-7 text-[10px] font-semibold">
                    Create
                  </Button>
                </div>
              </form>
            )}

            {/* Folders navigation list */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveFolderId('All');
                  setActiveNoteId(null);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-between',
                  activeFolderId === 'All'
                    ? 'bg-accent/15 border border-accent/20 text-accent'
                    : 'text-slate-400 hover:bg-secondary/40 hover:text-white border border-transparent'
                )}
              >
                <span>All Notes 📓</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  {notes.length}
                </span>
              </button>

              {folders.map((f) => (
                <div 
                  key={f.id}
                  className={cn(
                    'group flex items-center justify-between rounded-xl border border-transparent pr-1.5 hover:bg-secondary/20 transition-all duration-150',
                    activeFolderId === f.id ? 'bg-accent/15 border-accent/20 text-accent font-bold' : ''
                  )}
                >
                  <button
                    onClick={() => {
                      setActiveFolderId(f.id);
                      setActiveNoteId(null);
                    }}
                    className={cn(
                      'flex-1 text-left px-3 py-2 text-xs font-bold truncate flex items-center gap-1.5',
                      activeFolderId === f.id ? 'text-accent' : 'text-slate-400 group-hover:text-white'
                    )}
                  >
                    <FolderIcon size={12} className="shrink-0 text-slate-500" />
                    <span className="truncate">{f.name}</span>
                  </button>
                  <button
                    onClick={() => deleteFolder(f.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-all duration-150 shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Notes List Pane */}
      <section className="w-64 shrink-0 flex flex-col min-w-0">
        <div className="glass-panel border border-border rounded-2xl p-4 flex flex-col h-full max-h-[75vh] shadow-xl">
          
          {/* List header search and add buttons */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Note Lists</span>
            <Button onClick={handleAddNote} variant="secondary" size="sm" className="h-7 px-2 font-semibold flex items-center gap-1">
              <Plus size={12} /> New Note
            </Button>
          </div>

          <div className="relative mb-3.5">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-950/20"
            />
          </div>

          {/* Notes mapping list */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                No notes found.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={cn(
                    'p-3 rounded-xl border border-border/50 bg-card/25 cursor-pointer transition-all duration-150 hover:border-slate-800 flex flex-col justify-between gap-1.5 select-none relative group',
                    activeNoteId === note.id ? 'border-accent bg-accent/5 hover:border-accent' : ''
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn(
                      'text-xs font-bold truncate text-slate-200',
                      activeNoteId === note.id ? 'text-accent' : ''
                    )}>
                      {note.title || 'Untitled Note'}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-2 truncate font-normal mt-0.5">
                      {note.content ? note.content.substring(0, 80) : 'No content...'}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                      {new Date(note.updated_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this note?')) {
                          deleteNote(note.id);
                          if (activeNoteId === note.id) {
                            setActiveNoteId(null);
                          }
                        }
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 transition-all duration-150"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. Editor Pane */}
      <section className="flex-1 flex flex-col min-w-0">
        {activeNote ? (
          <div className="glass-panel border border-border rounded-2xl p-5 flex flex-col h-full max-h-[75vh] shadow-2xl relative">
            
            {/* Editor header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-border mb-4">
              <div className="flex-1 min-w-0 w-full">
                <Input
                  required
                  value={draftTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="bg-transparent border-0 text-base font-extrabold focus-visible:ring-0 p-0 text-white truncate w-full"
                  placeholder="Untitled Note"
                />
              </div>

              {/* Toolbar and folder assignments */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Folder Select */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Folder</span>
                  <Select
                    options={[
                      { label: 'None', value: 'None' },
                      ...folders.map((f) => ({ label: f.name, value: f.id })),
                    ]}
                    value={draftFolder}
                    onChange={(e) => handleFolderChange(e.target.value)}
                    className="w-32 h-8 text-xs bg-slate-950/40"
                  />
                </div>

                {/* Edit vs Preview Toggle */}
                <div className="flex items-center bg-slate-900 border border-border p-0.5 rounded-lg">
                  <button
                    onClick={() => setEditorMode('edit')}
                    className={cn(
                      'p-1.5 rounded-md text-slate-400 hover:text-white transition-all duration-150',
                      editorMode === 'edit' ? 'bg-accent text-white shadow' : ''
                    )}
                    title="Edit Markdown"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => setEditorMode('preview')}
                    className={cn(
                      'p-1.5 rounded-md text-slate-400 hover:text-white transition-all duration-150',
                      editorMode === 'preview' ? 'bg-accent text-white shadow' : ''
                    )}
                    title="Live Preview"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Textarea */}
            <div className="flex-1 overflow-hidden relative">
              {editorMode === 'edit' ? (
                <Textarea
                  placeholder="Write note here (supports basic markdown)..."
                  value={draftContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full min-h-[45vh] bg-transparent border-0 focus-visible:ring-0 resize-none font-mono text-sm leading-relaxed p-0 text-slate-300"
                />
              ) : (
                <div 
                  className="w-full h-full overflow-y-auto max-h-[48vh] pr-2 text-slate-300 select-text"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(draftContent) }}
                />
              )}
            </div>

            {/* Autosave status indicator footer */}
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider pt-3 border-t border-border/40 select-none">
              <Clock size={11} className="text-slate-500 shrink-0" />
              <span>Autosave active. Markdown syntax: # H1, ## H2, **bold**, *italic*, `code`, - bullet points.</span>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="notes"
            title="No Note Selected"
            description="Select an existing markdown note or create a new one to start writing."
            actionText="Create Note"
            onAction={handleAddNote}
          />
        )}
      </section>
    </div>
  );
};
