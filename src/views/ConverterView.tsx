import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import { haptic } from '../lib/utils';
import { opfs } from '../lib/storage';
import { useFileConversion } from '../contexts/FileConversionContext';
import { logger } from '../lib/logger';

// Lazy load modular components to reduce initial bundle size
const LandingSEO = lazy(() => import('../components/layout/LandingSEO').then(m => ({ default: m.LandingSEO })));
const MetadataModal = lazy(() => import('../components/ui/MetadataModal').then(m => ({ default: m.MetadataModal })));
const IdleView = lazy(() => import('../components/converter/IdleView').then(m => ({ default: m.IdleView })));
const BatchFileItem = lazy(() => import('../components/converter/BatchFileItem').then(m => ({ default: m.BatchFileItem })));
const BatchControls = lazy(() => import('../components/converter/BatchControls').then(m => ({ default: m.BatchControls })));
const ConversionProgress = lazy(() => import('../components/converter/ConversionProgress').then(m => ({ default: m.ConversionProgress })));
const ResultView = lazy(() => import('../components/converter/ResultView').then(m => ({ default: m.ResultView })));
const FFmpegErrorBoundary = lazy(() => import('../components/ui/ErrorBoundaries').then(m => ({ default: m.FFmpegErrorBoundary })));

// Hooks
import { useFFmpegEngine } from '../hooks/useFFmpegEngine';
import { ConversionTask } from '../types';

/**
 * Loading component for small UI segments.
 */
const ComponentLoading = () => (
  <div className="w-full py-12 flex flex-col items-center justify-center gap-3">
    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    <span className="text-xs text-secondary font-medium uppercase tracking-wider">Loading...</span>
  </div>
);

/**
 * TaskRunner component that handles the FFmpeg engine for a specific task.
 * This allows multiple tasks to run in parallel by having their own engine instance.
 */
const TaskRunner = ({ task }: { task: ConversionTask }) => {
  const { updateTask, addLog, setGlobalLoadProgress } = useFileConversion();
  const { fetchMetadata, extractAudio } = useFFmpegEngine({
    task,
    updateTask,
    addLog,
    onGlobalLoadProgress: setGlobalLoadProgress
  });

  useEffect(() => {
    if (task.status === 'processing' && task.triggerExtract) {
      updateTask(task.id, { triggerExtract: false });
      extractAudio();
    }
    // Probe logic for metadata
    if (task.status === 'ready' && task.triggerProbe) {
      updateTask(task.id, { triggerProbe: false });
      fetchMetadata();
    }
  }, [task.status, task.triggerExtract, task.triggerProbe, extractAudio, fetchMetadata, task.id, updateTask]);

  return null;
};

/**
 * Main converter view component.
 * Manages the UI for file selection, conversion progress, and batch operations.
 */
export const ConverterView = () => {
  const { 
    tasks, 
    activeTaskId, 
    setActiveTaskId, 
    addTask, 
    removeTask, 
    updateTask,
    globalStatus, 
    globalLoadProgress,
    maxConcurrency,
    setMaxConcurrency
  } = useFileConversion();

  const [isDragging, setIsDragging] = useState(false);
  const audioPlayerRef = useRef<any>(null);

  // Initialize storage on mount
  useEffect(() => {
    const checkStorage = async () => {
      try {
        await opfs.init();
      } catch (e) {
        logger.error('Storage initialization failed', e);
      }
    };
    checkStorage();
  }, []);

  /**
   * Handles drag events for the dropzone.
   */
  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (globalStatus !== 'init') setIsDragging(active);
  }, [globalStatus]);

  /**
   * Handles drop events for file uploads.
   */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (globalStatus === 'init') return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => addTask(file));
    }
  }, [globalStatus, addTask]);

  /**
   * Handles file selection from the file input.
   */
  const onFilesSelect = (files: FileList) => {
    Array.from(files).forEach(file => addTask(file));
  };

  /**
   * Starts all queued tasks.
   */
  const handleStartAll = useCallback(() => {
    haptic.success();
    tasks.forEach(task => {
      if (task.status === 'ready') {
        updateTask(task.id, { status: 'queued' });
      }
    });
  }, [tasks, updateTask]);

  /**
   * Clears all non-processing tasks from the list.
   */
  const handleClearAll = useCallback(() => {
    haptic.medium();
    tasks.forEach(task => {
      if (task.status !== 'processing') {
        removeTask(task.id);
      }
    });
  }, [tasks, removeTask]);

  const activeTask = tasks.find(t => t.id === activeTaskId) || (tasks.length === 1 ? tasks[0] : null);
  const isProcessingAny = tasks.some(t => t.status === 'processing' || t.status === 'queued');

  return (
    <div 
      className="flex-1 flex flex-col items-center w-full relative"
      onDragOver={(e) => handleDrag(e, true)}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDrop={onDrop}
    >
      {/* Hidden Task Runners for Parallelism */}
      <Suspense fallback={null}>
        <FFmpegErrorBoundary>
          {tasks.map(task => (
            <TaskRunner 
              key={task.id} 
              task={task} 
            />
          ))}
        </FFmpegErrorBoundary>
      </Suspense>

      {/* Main Converter Area */}
      <div className="min-h-[calc(100dvh-6rem)] md:min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
          {/* Initial Loading State */}
          {globalStatus === 'init' && (
            <motion.div 
              key="init" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 m-auto h-fit w-fit flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="wrapper">
                <div className="circle"></div><div className="circle"></div><div className="circle"></div>
                <div className="shadow"></div><div className="shadow"></div><div className="shadow"></div>
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 w-48">
                <p className="text-sm text-secondary font-medium animate-pulse">Initializing Core...</p>
                <div className="h-1.5 w-full bg-surface-highlight rounded-full overflow-hidden border border-white/5">
                  <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${globalLoadProgress}%` }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Idle State (No Tasks) */}
          {tasks.length === 0 && globalStatus !== 'init' && (
            <Suspense fallback={<ComponentLoading />}>
              <IdleView onFilesSelect={onFilesSelect} isDragging={isDragging} />
            </Suspense>
          )}

          {/* Task View (Single or Batch) */}
          {tasks.length > 0 && (
            <motion.div 
              key={tasks.length === 1 ? `single-${tasks[0].status}` : 'batch-view'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col gap-6 items-center"
            >
              <Suspense fallback={<ComponentLoading />}>
                {tasks.length === 1 ? (
                  // Single Task View
                  tasks[0].status === 'done' && tasks[0].outputUrl ? (
                    <ResultView 
                      outputUrl={tasks[0].outputUrl}
                      fileName={tasks[0].fileName}
                      outputExt={tasks[0].outputExt}
                      onReset={() => removeTask(tasks[0].id)}
                      audioPlayerRef={audioPlayerRef}
                    />
                  ) : (
                    <ConversionProgress 
                      status={tasks[0].status as any}
                      fileName={tasks[0].fileName}
                      fileSize={tasks[0].fileSize}
                      progress={tasks[0].progress}
                      selectedFormat={tasks[0].selectedFormat}
                      setSelectedFormat={(f) => updateTask(tasks[0].id, { selectedFormat: f })}
                      onExtract={() => updateTask(tasks[0].id, { status: 'queued' })}
                      onReset={() => removeTask(tasks[0].id)}
                      onProbe={() => updateTask(tasks[0].id, { triggerProbe: true })}
                      isMetadataLoading={tasks[0].isMetadataLoading}
                    />
                  )
                ) : (
                  // Batch Task View
                  <>
                    <div className="w-full max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      <AnimatePresence>
                        {tasks.map(task => (
                          <BatchFileItem 
                            key={task.id}
                            task={task}
                            updateTask={updateTask}
                            removeTask={removeTask}
                            isActive={task.id === activeTaskId}
                            isOnlyTask={tasks.length === 1}
                            onActivate={() => {
                              setActiveTaskId(activeTaskId === task.id ? null : task.id);
                              if (task.status !== 'done') {
                                updateTask(task.id, { triggerProbe: true });
                              } else {
                                updateTask(task.id, { manuallySelected: true });
                              }
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Add More Dropzone */}
                    <div 
                      className={`w-full border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                        isDragging 
                          ? 'border-primary bg-primary/5 scale-[0.99]' 
                          : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                      onClick={() => {
                         const input = document.createElement('input');
                         input.type = 'file';
                         input.accept = 'video/*';
                         input.multiple = true;
                         input.onchange = (e: any) => {
                           if (e.target.files) onFilesSelect(e.target.files);
                         };
                         input.click();
                      }}
                    >
                      <div className="flex items-center gap-3 text-secondary">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm font-medium">Add more videos</span>
                      </div>
                    </div>

                    {/* Batch Actions */}
                    <BatchControls 
                      onStartAll={handleStartAll}
                      onClearAll={handleClearAll}
                      maxConcurrency={maxConcurrency}
                      setMaxConcurrency={setMaxConcurrency}
                      isProcessing={isProcessingAny}
                      hasItems={tasks.some(t => t.status === 'ready' || t.status === 'done')}
                    />
                  </>
                )}
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Suspense fallback={null}>
        <LandingSEO />
      </Suspense>

      <Suspense fallback={null}>
        <MetadataModal 
          isOpen={activeTask?.showMetadata || false} 
          onClose={() => activeTask && updateTask(activeTask.id, { showMetadata: false })} 
          data={activeTask?.metadata} 
        />
      </Suspense>
    </div>
  );
};