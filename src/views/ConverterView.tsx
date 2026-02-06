import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronDown, Plus, Upload } from 'lucide-react';
import { haptic } from '../lib/utils';
import { opfs } from '../lib/storage';
import { AudioFormat, ConversionTask, AppStatus } from '../App';

// Modular Components
import { LandingSEO } from '../components/layout/LandingSEO';
import { MetadataModal } from '../components/ui/MetadataModal';
import { IdleView } from '../components/converter/IdleView';
import { BatchFileItem } from '../components/converter/BatchFileItem';
import { BatchControls } from '../components/converter/BatchControls';

// Hooks
import { useFFmpegEngine } from '../hooks/useFFmpegEngine';

interface TaskRunnerProps {
  task: ConversionTask;
  updateTask: (taskId: string, updates: Partial<ConversionTask>) => void;
  addLog: (taskId: string, msg: string) => void;
  onGlobalLoadProgress?: (p: number) => void;
}

const TaskRunner = ({ task, updateTask, addLog, onGlobalLoadProgress }: TaskRunnerProps) => {
  const { fetchMetadata, extractAudio } = useFFmpegEngine({
    task,
    updateTask,
    addLog,
    onGlobalLoadProgress
  });

  useEffect(() => {
    if (task.status === 'processing' && task.triggerExtract) {
      updateTask(task.id, { triggerExtract: false });
      extractAudio();
    }
    // Probe logic if needed in future (currently unused in batch view but kept for safety)
    if (task.status === 'ready' && task.triggerProbe) {
      updateTask(task.id, { triggerProbe: false });
      fetchMetadata();
    }
  }, [task.status, task.triggerExtract, task.triggerProbe, extractAudio, fetchMetadata, task.id, updateTask]);

  return null;
};

interface ConverterViewProps {
  tasks: ConversionTask[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  addTask: (file: File) => void;
  removeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<ConversionTask>) => void;
  addLog: (taskId: string, msg: string) => void;
  globalStatus: AppStatus;
  setGlobalStatus: (s: AppStatus) => void;
  globalLoadProgress: number;
  setGlobalLoadProgress: (p: number) => void;
  maxConcurrency: number;
  setMaxConcurrency: (n: number) => void;
}

export const ConverterView = (props: ConverterViewProps) => {
  const { 
    tasks, activeTaskId, setActiveTaskId, addTask, removeTask, updateTask,
    addLog, globalStatus, globalLoadProgress, setGlobalLoadProgress,
    maxConcurrency, setMaxConcurrency
  } = props;

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      try {
        await opfs.init();
      } catch (e) {
        console.error('Storage initialization failed', e);
      }
    };
    checkStorage();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent, active: boolean) => {
    e.preventDefault(); e.stopPropagation();
    if (globalStatus !== 'init') setIsDragging(active);
  }, [globalStatus]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (globalStatus === 'init') return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => addTask(file));
    }
  }, [globalStatus, addTask]);

  const onFilesSelect = (files: FileList) => {
    Array.from(files).forEach(file => addTask(file));
  };

  const handleStartAll = () => {
    haptic.success();
    // Move all 'ready' tasks to 'queued'
    tasks.forEach(task => {
      if (task.status === 'ready') {
        updateTask(task.id, { status: 'queued' });
      }
    });
  };

  const handleClearAll = () => {
    haptic.medium();
    // Remove all tasks that are not processing
    tasks.forEach(task => {
      if (task.status !== 'processing') {
        removeTask(task.id);
      }
    });
  };

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
      {tasks.map(task => (
        <TaskRunner 
          key={task.id} 
          task={task} 
          updateTask={updateTask} 
          addLog={addLog} 
          onGlobalLoadProgress={setGlobalLoadProgress}
        />
      ))}

      {/* Main Converter Area */}
      <div className="min-h-[calc(100dvh-6rem)] md:min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
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

          {tasks.length === 0 && globalStatus !== 'init' && (
            <IdleView onFilesSelect={onFilesSelect} isDragging={isDragging} />
          )}

          {tasks.length > 0 && (
            <motion.div 
              key="batch-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col gap-6 items-center"
            >
              {/* Batch List */}
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
                        updateTask(task.id, { manuallySelected: true });
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Add More Area (Mini Dropzone) */}
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

              {/* Controls */}
              <BatchControls 
                onStartAll={handleStartAll}
                onClearAll={handleClearAll}
                maxConcurrency={maxConcurrency}
                setMaxConcurrency={setMaxConcurrency}
                isProcessing={isProcessingAny}
                hasItems={tasks.some(t => t.status === 'ready' || t.status === 'done')}
              />

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LandingSEO />

      <MetadataModal 
        isOpen={false} // Disabled in batch view for now to keep UI clean
        onClose={() => {}} 
        data={null} 
      />
    </div>
  );
};
