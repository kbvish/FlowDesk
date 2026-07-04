import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { useAppStore } from '../../hooks/useStore';

export const ToastContainer: React.FC = () => {
  const { achievementToasts, removeAchievementToast } = useAppStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {achievementToasts.map((title, index) => (
        <ToastItem
          key={`${title}-${index}`}
          title={title}
          onClose={() => removeAchievementToast(index)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  title: string;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ title, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="flex items-center gap-4 bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow-2xl text-foreground animate-fade-in slide-in-from-bottom duration-300 relative overflow-hidden group">
      {/* Dynamic green side-accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_12px_#10b981]" />
      
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-950/50 border border-emerald-500/20 text-emerald-400">
        <Trophy className="h-5 w-5 animate-pulse" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">Achievement Unlocked!</p>
        <h4 className="text-sm font-bold text-white mt-0.5">{title}</h4>
        <p className="text-xs text-slate-400 mt-1">Check your notifications & dashboard stats.</p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150"
      >
        <X size={14} />
      </button>
    </div>
  );
};
