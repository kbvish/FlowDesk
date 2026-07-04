import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAppStore } from '../hooks/useStore';

export const Splash: React.FC = () => {
  const navigate = useNavigate();
  const { currentQuote, loadQuote } = useAppStore();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadQuote();

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 80);

    // Timeout redirection after 2.6s
    const timeout = setTimeout(() => {
      navigate('/dashboard');
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loadQuote, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 text-foreground p-6 select-none animate-fade-in relative overflow-hidden">
      
      {/* Background ambient blurs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Main Logo Content */}
      <div className="z-10 flex flex-col items-center max-w-lg text-center space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-10 w-10 text-accent animate-pulse" />
          <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-accent to-indigo-400 bg-clip-text text-transparent">
            FlowDesk
          </h1>
        </div>

        {/* Quote Block */}
        {currentQuote && (
          <div className="space-y-3 px-6 animate-fade-in duration-700">
            <p className="text-lg md:text-xl font-medium text-slate-200 italic leading-relaxed">
              "{currentQuote.text}"
            </p>
            <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">
              — {currentQuote.author}
            </p>
          </div>
        )}

        {/* Loading Progress Bar Container */}
        <div className="w-64 space-y-3 pt-6">
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent to-indigo-400 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Loading Workspace</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Manual continue button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-accent hover:underline hover:text-accent/80 transition-colors pt-4 active:scale-95"
        >
          Continue to Workspace →
        </button>
      </div>

      {/* Footer Branding info */}
      <div className="absolute bottom-8 text-[10px] text-slate-600 font-bold uppercase tracking-widest z-10">
        Offline Productivity Suite v1.0.0
      </div>
    </div>
  );
};
