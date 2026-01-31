import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { FFmpeg } from '../vendor/ffmpeg/index.js';
import { haptic } from '../lib/utils';
import { opfs } from '../lib/storage';
import { AudioFormat } from '../App';

// Modular Components
import { LandingSEO } from '../components/layout/LandingSEO';
import { MetadataModal } from '../components/ui/MetadataModal';
import { IdleView } from '../components/converter/IdleView';
import { ConversionProgress } from '../components/converter/ConversionProgress';
import { ResultView } from '../components/converter/ResultView';
import { Button } from '../components/ui/Button';

// Hooks
import { useFFmpegEngine } from '../hooks/useFFmpegEngine';

type AppStatus = 'init' | 'idle' | 'reading' | 'ready' | 'processing' | 'done' | 'error';

interface ConverterViewProps {
  status: AppStatus;
  setStatus: (s: AppStatus) => void;
  addLog: (msg: string) => void;
  setLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  setProgress: (p: number) => void;
  progress: number;
  ffmpegRef: React.MutableRefObject<FFmpeg>;
  loadProgress: number;
  setLoadProgress: (p: number) => void;
  fileName: string;
  setFileName: (s: string) => void;
  fileSize: number;
  setFileSize: (n: number) => void;
  outputUrl: string | null;
  setOutputUrl: (s: string | null) => void;
  metadata: any;
  setMetadata: (m: any) => void;
  isMetadataLoading: boolean;
  setIsMetadataLoading: (b: boolean) => void;
  showMetadata: boolean;
  setShowMetadata: (b: boolean) => void;
  errorMessage: string | null;
  setErrorMessage: (s: string | null) => void;
  selectedFormat: AudioFormat;
  setSelectedFormat: (f: AudioFormat) => void;
  outputExt: string;
  setOutputExt: (s: string) => void;
}

export const ConverterView = (props: ConverterViewProps) => {
  const { 
    status, setStatus, addLog, progress, loadProgress, 
    fileName, setFileName, fileSize, outputUrl, setOutputUrl, metadata,
    isMetadataLoading, showMetadata, setShowMetadata, errorMessage, setErrorMessage,
    selectedFormat, setSelectedFormat, outputExt
  } = props;

  const [isDragging, setIsDragging] = useState(false);
  const audioPlayerRef = useRef<any>(null);

  const { fetchMetadata, processFile, extractAudio } = useFFmpegEngine(props);

  // --- Navigation State Management ---
  useEffect(() => {
    const checkState = async () => {
      try {
        await opfs.init();
        if (status === 'ready' || status === 'processing') {
          await opfs.readFile('input.mp4');
        }
      } catch (e) {
        if (['reading', 'ready', 'processing'].includes(status)) {
          console.warn('State inconsistency detected. Resetting to idle.');
          setStatus('idle');
        }
      }
    };
    checkState();
    
    if (status === 'done' && !outputUrl) {
       setStatus('idle');
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => {
    e.preventDefault(); e.stopPropagation();
    if (status === 'idle') setIsDragging(active);
  }, [status]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (status !== 'idle') return;
    const files = e.dataTransfer.files;
    if (files && files[0]) processFile(files[0]);
  }, [status, processFile]);

  const reset = () => {
    haptic.light();
    setFileName('');
    props.setFileSize(0);
    props.setMetadata(null);
    const defaultFmt = (localStorage.getItem('defaultFormat') as AudioFormat) || 'mp3';
    setSelectedFormat(defaultFmt);
    setOutputUrl(null);
    props.setProgress(0);
    setStatus('idle');
    addLog('Reset state. Ready for new task.');
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center w-full relative"
      onDragOver={(e) => handleDrag(e, true)}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDrop={onDrop}
    >
      {/* Main Converter Area */}
      <div className="min-h-[calc(100dvh-6rem)] md:min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-5xl relative">
        <AnimatePresence mode="wait">
          {status === 'init' && (
            <motion.div 
              key="init" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="wrapper">
                <div className="circle"></div><div className="circle"></div><div className="circle"></div>
                <div className="shadow"></div><div className="shadow"></div><div className="shadow"></div>
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 w-48">
                <p className="text-sm text-secondary font-medium animate-pulse">Initializing Core...</p>
                <div className="h-1.5 w-full bg-surface-highlight rounded-full overflow-hidden border border-white/5">
                  <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${loadProgress}%` }} />
                </div>
                <p className="text-[10px] text-zinc-600 font-mono tracking-wider">{loadProgress}%</p>
              </div>
            </motion.div>
          )}

          {status === 'idle' && (
            <IdleView onFileSelect={processFile} isDragging={isDragging} />
          )}

          {['reading', 'ready', 'processing'].includes(status) && (
            <ConversionProgress 
              status={status as any}
              fileName={fileName}
              fileSize={fileSize}
              progress={progress}
              selectedFormat={selectedFormat}
              setSelectedFormat={setSelectedFormat}
              onExtract={extractAudio}
              onReset={reset}
              onProbe={fetchMetadata}
              isMetadataLoading={isMetadataLoading}
            />
          )}

          {status === 'error' && (
            <motion.div 
              key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-2xl text-red-500">System Error</h3>
                <p className="text-secondary max-w-[300px] mx-auto leading-relaxed text-sm">
                  {errorMessage || 'Something went wrong during the conversion.'}
                </p>
                {errorMessage?.includes('secure context') && (
                  <div className="mt-4 p-3 rounded-xl bg-surface-highlight/50 border border-white/5 text-[11px] text-zinc-400 max-w-[280px] mx-auto">
                    <p>Try using <code className="text-primary">http://localhost:5173</code> instead of your local IP address.</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                <Button variant="secondary" onClick={() => { setStatus('idle'); setErrorMessage(null); }}>
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}

          {status === 'done' && outputUrl && (
            <ResultView 
              outputUrl={outputUrl}
              fileName={fileName}
              outputExt={outputExt}
              onReset={reset}
              audioPlayerRef={audioPlayerRef}
            />
          )}
        </AnimatePresence>

        {/* Scroll Down Indicator */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute bottom-12 flex flex-col items-center gap-2 text-secondary opacity-40 hover:opacity-100 transition-opacity cursor-default select-none group"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] group-hover:text-primary transition-colors">Scroll Down</span>
          <ChevronDown className="w-4 h-4 group-hover:text-primary transition-colors" />
        </motion.div>
      </div>

      <LandingSEO />

      <MetadataModal 
        isOpen={showMetadata} 
        onClose={() => setShowMetadata(false)} 
        data={metadata} 
      />
    </div>
  );
};
