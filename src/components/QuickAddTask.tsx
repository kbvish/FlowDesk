import React, { useState } from 'react';
import { useDataStore, useAppStore } from '../hooks/useStore';
import { Dialog } from './ui/Dialog';
import { Input, Textarea, Select } from './ui/Input';
import { Button } from './ui/Button';

interface QuickAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({ isOpen, onClose, defaultDate }) => {
  const { createTask } = useDataStore();
  const { loadNotifications } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [dueDate, setDueDate] = useState(defaultDate || '');
  const [category, setCategory] = useState('Inbox');
  const [recurring, setRecurring] = useState<'None' | 'Daily' | 'Weekly' | 'Monthly'>('None');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await createTask({
        title,
        description,
        priority,
        due_date: dueDate || null,
        category,
        recurring,
        status: 'Todo',
        completed_at: null,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setDueDate('');
      setCategory('Inbox');
      setRecurring('None');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { label: 'Inbox 📥', value: 'Inbox' },
    { label: 'Work 💼', value: 'Work' },
    { label: 'Study 🎓', value: 'Study' },
    { label: 'Personal 🏠', value: 'Personal' },
    { label: 'Health 🍏', value: 'Health' },
  ];

  const priorities = [
    { label: 'Low 🟢', value: 'Low' },
    { label: 'Medium 🟡', value: 'Medium' },
    { label: 'High 🔴', value: 'High' },
  ];

  const recurrings = [
    { label: 'No Recurrence ⏱️', value: 'None' },
    { label: 'Daily 🔁', value: 'Daily' },
    { label: 'Weekly 🔄', value: 'Weekly' },
    { label: 'Monthly 📆', value: 'Monthly' },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create New Task" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-400">Task Title</label>
          <Input
            required
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400">Description (Optional)</label>
          <Textarea
            placeholder="Add details, links, or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 resize-none"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400">Category</label>
            <Select
              options={categories}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400">Priority</label>
            <Select
              options={priorities}
              value={priority}
              onChange={(e: any) => setPriority(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400">Recurring</label>
            <Select
              options={recurrings}
              value={recurring}
              onChange={(e: any) => setRecurring(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Create Task
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
