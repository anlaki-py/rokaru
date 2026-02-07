import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { MainLayout } from './components/layout/MainLayout';
import { LogSidebar } from './components/layout/LogSidebar';
import { ReloadPrompt } from './components/ui/ReloadPrompt';
import { useFileConversion } from './contexts/FileConversionContext';

// Lazy load views to improve initial bundle size
const ConverterView = lazy(() => import('./views/ConverterView').then(m => ({ default: m.ConverterView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));

/**
 * Loading fallback for lazy-loaded views.
 */
const ViewLoading = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-secondary animate-pulse">Loading View...</p>
    </div>
  </div>
);

/**
 * Main application component.
 * Handles the high-level layout, navigation, and global UI state.
 */
export default function App() {
  const { globalStatus } = useFileConversion();
  const [showLogs, setShowLogs] = useState(false);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + J to toggle logs
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setShowLogs(prev => !prev);
      }
      // Escape to close logs
      if (e.key === 'Escape' && showLogs) {
        setShowLogs(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogs]);

  return (
    <BrowserRouter>
      <MainLayout status={globalStatus} showLogs={showLogs} setShowLogs={setShowLogs}>
        <Suspense fallback={<ViewLoading />}>
          <Routes>
            <Route path="/" element={<ConverterView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </Suspense>

        <LogSidebar showLogs={showLogs} setShowLogs={setShowLogs} />
      </MainLayout>
      <Analytics />
      <ReloadPrompt />
    </BrowserRouter>
  );
}