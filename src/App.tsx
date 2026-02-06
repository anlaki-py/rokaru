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
import { useMediaQuery } from './lib/utils'; // I'll update utils to include this

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'm4a' | 'original';
type AppStatus = 'init' | 'idle' | 'reading' | 'ready' | 'processing' | 'done' | 'error';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('init');
  const [loadProgress, setLoadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  // Persistent Converter State
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<AudioFormat>(
    (localStorage.getItem('defaultFormat') as AudioFormat) || 'mp3'
  );
  const [outputExt, setOutputExt] = useState<string>('mp3');
  
  const ffmpegRef = useRef(new FFmpeg());
  const isMobile = useMediaQuery('(max-width: 768px)');
  const mobileDragControls = useDragControls();

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-199), `[${timestamp}] ${msg}`]);
  }, []);

  // Desktop Resize Logic
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

  // Global Keyboard Shortcuts
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

  // Auto-manage logs based on status
  useEffect(() => {
    if (status === 'processing') {
      setShowLogs(true);
    } else if (status === 'done') {
      setShowLogs(false);
    }
  }, [status]);

  const handleMobileDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) setShowLogs(false);
  };

  return (
    <BrowserRouter>
      <MainLayout status={status} showLogs={showLogs} setShowLogs={setShowLogs}>
        <Routes>
          <Route path="/" element={
            <ConverterView 
              status={status} setStatus={setStatus} 
              addLog={addLog} setLogs={setLogs} 
              setProgress={setProgress} progress={progress}
              ffmpegRef={ffmpegRef}
              loadProgress={loadProgress} setLoadProgress={setLoadProgress}
              fileName={fileName} setFileName={setFileName}
              fileSize={fileSize} setFileSize={setFileSize}
              outputUrl={outputUrl} setOutputUrl={setOutputUrl}
              metadata={metadata} setMetadata={setMetadata}
              isMetadataLoading={isMetadataLoading} setIsMetadataLoading={setIsMetadataLoading}
              showMetadata={showMetadata} setShowMetadata={setShowMetadata}
              errorMessage={errorMessage} setErrorMessage={setErrorMessage}
              selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat}
              outputExt={outputExt} setOutputExt={setOutputExt}
            />
          } />
          <Route path="/settings" element={
            <SettingsView 
              selectedFormat={selectedFormat} 
              setSelectedFormat={setSelectedFormat} 
            />
          } />
        </Routes>

        {/* --- TERMINAL OVERLAYS --- */}
        
        {/* Desktop Sidebar Terminal */}
        {!isMobile && (
          <motion.div 
            initial={false}
            animate={{ width: showLogs ? sidebarWidth : 0, opacity: showLogs ? 1 : 0 }}
            className="absolute top-0 right-0 h-full border-l border-border bg-[#0c0c0e] overflow-hidden z-50 group"
          >
            <div style={{ width: sidebarWidth }} className="h-full relative">
              <LogViewer logs={logs} onClear={() => setLogs([])} />
              <div onMouseDown={startResizing} className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-0.5 h-8 bg-white/20 rounded-full" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Mobile Bottom Sheet Terminal */}
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
                <LogViewer logs={logs} onClear={() => setLogs([])} onClose={() => setShowLogs(false)} dragControls={mobileDragControls} />
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
