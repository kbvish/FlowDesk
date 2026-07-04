import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './hooks/useStore';

// View Imports
import { Splash } from './pages/Splash';
import { MainLayout } from './pages/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Calendar } from './pages/Calendar';
import { Goals } from './pages/Goals';
import { Notes } from './pages/Notes';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';

// Global stylesheet
import './styles/index.css';

const App = () => {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    // Initialize Theme settings from database on startup
    initTheme();
  }, [initTheme]);

  return (
    <HashRouter>
      <Routes>
        {/* Splash screen acts as the initial landing redirector */}
        <Route path="/" element={<Splash />} />
        
        {/* Main Application Shell layout wraps internal modules */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* Wildcard redirects back to splash screen */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
