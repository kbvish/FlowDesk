import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className }) => {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Dialog content box */}
      <div className={cn(
        'relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl transition-all duration-300 scale-100 opacity-100 animate-fade-in',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          {title ? (
            <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
              {title}
            </h3>
          ) : <div />}
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 active:scale-90"
          >
            <X size={16} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};
