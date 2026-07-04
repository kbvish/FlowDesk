import React, { useState, useEffect } from 'react';
import { useDataStore } from '../hooks/useStore';
import { Dialog } from './ui/Dialog';
import { Textarea } from './ui/Input';
import { Button } from './ui/Button';

interface DailyReflectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyReflectionDialog: React.FC<DailyReflectionDialogProps> = ({ isOpen, onClose }) => {
  const { saveReflection } = useDataStore();
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);

  const todayStr = new Date().toISOString().substring(0, 10);

  // Fetch today's reflection if it already exists
  useEffect(() => {
    const fetchTodayReflection = async () => {
      if (isOpen) {
        try {
          const existing = await window.api.reflections.get(todayStr);
          if (existing) {
            setMood(existing.mood);
            setNote(existing.note);
            setAlreadySaved(true);
          } else {
            setMood(null);
            setNote('');
            setAlreadySaved(false);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchTodayReflection();
  }, [isOpen, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mood === null) return;

    setIsLoading(true);
    try {
      await saveReflection(mood, note);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const moods = [
    { value: 1, label: '😢', text: 'Terrible' },
    { value: 2, label: '😕', text: 'Bad' },
    { value: 3, label: '😐', text: 'Okay' },
    { value: 4, label: '🙂', text: 'Good' },
    { value: 5, label: '😁', text: 'Fantastic' },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Daily Reflection" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-slate-400">
            {alreadySaved 
              ? "Update your logs for today's reflection." 
              : "Take a moment to reflect on your day. How did it feel?"}
          </p>
        </div>

        {/* Mood Selector Grid */}
        <div className="flex justify-around gap-2 py-2">
          {moods.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 w-16 active:scale-95 ${
                mood === m.value
                  ? 'border-accent bg-accent/10 scale-105 shadow-[0_0_12px_rgba(99,102,241,0.15)] text-foreground'
                  : 'border-border bg-card/40 hover:bg-secondary/40 text-muted-foreground'
              }`}
            >
              <span className="text-2xl mb-1">{m.label}</span>
              <span className="text-[10px] font-semibold">{m.text}</span>
            </button>
          ))}
        </div>

        {/* Note Editor */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">What went well? Any obstacles or thoughts?</label>
          <Textarea
            placeholder="Write a brief journal note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 resize-none"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={mood === null} isLoading={isLoading}>
            {alreadySaved ? 'Update Reflection' : 'Save Reflection'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
