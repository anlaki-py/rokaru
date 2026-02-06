import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { FFmpeg } from './vendor/ffmpeg/index.js';
import { MainLayout } from './components/layout/MainLayout';
import { ReloadPrompt } from './components/ui/ReloadPrompt';
import { LogViewer } from './components/ui/LogViewer';
import { ConverterView } from './views/ConverterView';
import { SettingsView } from './views/SettingsView';
import { useMediaQuery } from './lib/utils';

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'm4a' | 'original';
export type AppStatus = 'init' | 'idle' | 'reading' | 'ready' | 'queued' | 'processing' | 'done' | 'error';

export interface ConversionTask {
  id: string;
  file: File;
  status: AppStatus;
  progress: number;
  logs: string[];
  fileName: string;
  fileSize: number;
  outputUrl: string | null;
  outputExt: string;
  selectedFormat: AudioFormat;
  metadata: any;
  errorMessage: string | null;
  loadProgress: number;
  isMetadataLoading: boolean;
  showMetadata: boolean;
  triggerExtract?: boolean;
  triggerProbe?: boolean;
  manuallySelected?: boolean;
}

export default function App() {
  const [globalStatus, setGlobalStatus] = useState<AppStatus>('init');
  const [globalLoadProgress, setGlobalLoadProgress] = useState(0);
  const [maxConcurrency, setMaxConcurrency] = useState(
    parseInt(localStorage.getItem('maxConcurrency') || '3')
  );
  const [defaultFormat, setDefaultFormat] = useState<AudioFormat>(
    (localStorage.getItem('defaultFormat') as AudioFormat) || 'mp3'
  );

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('maxConcurrency', maxConcurrency.toString());
  }, [maxConcurrency]);

  useEffect(() => {
    localStorage.setItem('defaultFormat', defaultFormat);
  }, [defaultFormat]);

  useEffect(() => {
    if (globalStatus !== 'init') return;
    
    const init = async () => {
      try {
        if (!window.isSecureContext) {
          throw new Error('Secure context required');
        }
        for (let i = 0; i <= 100; i += 20) {
          setGlobalLoadProgress(i);
          await new Promise(r => setTimeout(r, 100));
        }
        setGlobalStatus('idle');
      } catch (e) {
        setGlobalStatus('error');
      }
    };
    init();
  }, [globalStatus]);

  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  const [showLogs, setShowLogs] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const mobileDragControls = useDragControls();

  // --- Queue Management ---
  useEffect(() => {
    const processingCount = tasks.filter(t => t.status === 'processing').length;
    const queuedTasks = tasks.filter(t => t.status === 'queued');

    if (processingCount < maxConcurrency && queuedTasks.length > 0) {
      // Find the first queued task
      const nextTask = queuedTasks[0];
      // Trigger it
      setTasks(prev => prev.map(t => 
        t.id === nextTask.id ? { ...t, status: 'processing', triggerExtract: true } : t
      ));
    }
  }, [tasks, maxConcurrency]);

  const addLog = useCallback((taskId: string, msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, logs: [...t.logs.slice(-199), `[${timestamp}] ${msg}`] } : t
    ));
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<ConversionTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  }, []);

  const addTask = (file: File) => {
    const id = Math.random().toString(36).substring(7);
    const newTask: ConversionTask = {
      id,
      file,
      status: 'reading',
      progress: 0,
      logs: [],
      fileName: file.name,
      fileSize: file.size,
      outputUrl: null,
      outputExt: 'mp3',
      selectedFormat: defaultFormat,
      metadata: null,
      errorMessage: null,
      loadProgress: 0,
      isMetadataLoading: false,
      showMetadata: false,
      manuallySelected: false,
    };
    setTasks(prev => [...prev, newTask]);
    // Do NOT set activeTaskId automatically if we are in batch mode,
    // but maybe set it if it's the first one.
    setActiveTaskId(prev => prev ? prev : id);
    setGlobalStatus('processing');
  };

  const removeTask = (taskId: string) => {
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== taskId);
      if (filtered.length === 0) {
        setGlobalStatus('idle');
        setActiveTaskId(null);
      } else if (activeTaskId === taskId) {
        setActiveTaskId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  // Update existing ready tasks when default format changes
  useEffect(() => {
    setTasks(prev => prev.map(t => 
      t.status === 'ready' ? { ...t, selectedFormat: defaultFormat } : t
    ));
  }, [defaultFormat]);

  const activeTask = tasks.find(t => t.id === activeTaskId);

  const startResizing = useCallback(() => setIsResizing(true), []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(e.clientX, 800, window.innerWidth * 0.6));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setShowLogs(prev => !prev);
      }
      if (e.key === 'Escape' && showLogs) {
        setShowLogs(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogs]);

  useEffect(() => {
    if (activeTask?.status === 'processing') {
      // Don't auto-open logs in batch mode, it's annoying
      // setShowLogs(true);
    }
  }, [activeTask?.status]);

  const handleMobileDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) setShowLogs(false);
  };

  return (
    <BrowserRouter>
      <MainLayout status={globalStatus} showLogs={showLogs} setShowLogs={setShowLogs}>
        <Routes>
          <Route path="/" element={
            <ConverterView 
              tasks={tasks}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              addTask={addTask}
              removeTask={removeTask}
              updateTask={updateTask}
              addLog={addLog}
              globalStatus={globalStatus}
              setGlobalStatus={setGlobalStatus}
              globalLoadProgress={globalLoadProgress}
              setGlobalLoadProgress={setGlobalLoadProgress}
              maxConcurrency={maxConcurrency}
              setMaxConcurrency={setMaxConcurrency}
            />
          } />
          <Route path="/settings" element={
            <SettingsView 
              selectedFormat={defaultFormat} 
              setSelectedFormat={setDefaultFormat} 
              maxConcurrency={maxConcurrency}
              setMaxConcurrency={setMaxConcurrency}
            />
          } />
        </Routes>

        {!isMobile && (
          <motion.div 
            initial={false}
            animate={{ width: showLogs ? sidebarWidth : 0, opacity: showLogs ? 1 : 0 }}
            className="absolute top-0 right-0 h-full border-l border-border bg-[#0c0c0e] overflow-hidden z-50 group"
          >
            <div style={{ width: sidebarWidth }} className="h-full relative">
              <LogViewer logs={activeTask?.logs || []} onClear={() => activeTaskId && updateTask(activeTaskId, { logs: [] })} />
              <div onMouseDown={startResizing} className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-0.5 h-8 bg-white/20 rounded-full" />
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showLogs && isMobile && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogs(false)} className="fixed inset-0 bg-black/80 z-[60]" />
              <motion.div 
                drag="y" dragControls={mobileDragControls} dragListener={false} dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.2 }}
                onDragEnd={handleMobileDragEnd}
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 h-[60vh] bg-[#0c0c0e] border-t border-border z-[70] rounded-t-3xl overflow-hidden flex flex-col"
              >
                <LogViewer logs={activeTask?.logs || []} onClear={() => activeTaskId && updateTask(activeTaskId, { logs: [] })} onClose={() => setShowLogs(false)} dragControls={mobileDragControls} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </MainLayout>
      <Analytics />
      <ReloadPrompt />
    </BrowserRouter>
  );
}