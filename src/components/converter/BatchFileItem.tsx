import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileAudio, X, AlertCircle, Check, Loader2, Download, Info } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { AudioFormat, ConversionTask } from '../../App';
import { CustomAudioPlayer } from '../ui/AudioPlayer';

interface BatchFileItemProps {
  task: ConversionTask;
  updateTask: (taskId: string, updates: Partial<ConversionTask>) => void;
  removeTask: (taskId: string) => void;
  isActive: boolean;
  isOnlyTask: boolean;
  onActivate: () => void;
}

export const BatchFileItem = ({ task, updateTask, removeTask, isActive, isOnlyTask, onActivate }: BatchFileItemProps) => {
  const isProcessing = task.status === 'processing';
  const isQueued = task.status === 'queued';
  const isDone = task.status === 'done';
  const isError = task.status === 'error';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative w-full rounded-xl border transition-all duration-200 overflow-hidden ${
        isActive 
          ? 'bg-surface-highlight/10 border-primary/20 shadow-lg' 
          : 'bg-surface/30 border-white/5 hover:bg-surface-highlight/10 cursor-pointer'
      }`}
      onClick={onActivate}
    >
      <div className="p-4 flex items-center gap-4">
        {/* Icon / Status */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isDone ? 'bg-green-500/10 text-green-500' :
          isError ? 'bg-red-500/10 text-red-500' :
          isProcessing ? 'bg-primary/10 text-primary' :
          'bg-surface-highlight text-secondary'
        }`}>
          {isDone ? <Check className="w-5 h-5" /> :
           isError ? <AlertCircle className="w-5 h-5" /> :
           isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> :
           <FileAudio className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate text-primary">{task.fileName}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-secondary font-mono">{formatBytes(task.fileSize)}</span>
            {task.status === 'reading' && <span className="text-[10px] text-zinc-500">Reading...</span>}
            {isQueued && <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 rounded">Queued</span>}
            {isProcessing && (
              <div className="w-24 h-1.5 bg-surface-highlight rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary" 
                  initial={{ width: 0 }} 
                  animate={{ width: `${task.progress}%` }} 
                />
              </div>
            )}
            {isDone && <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-wider">Complete</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isDone && !isProcessing && !isQueued && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                updateTask(task.id, { triggerProbe: true });
              }}
              className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              title="View Metadata"
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          {isDone && task.outputUrl && (
            <a 
              href={task.outputUrl} 
              download={`${task.fileName.replace(/\.[^/.]+$/, '')}.${task.outputExt}`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-background text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/10"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Download</span>
            </a>
          )}

          {!isDone && !isProcessing && !isQueued && (
            <select 
              value={task.selectedFormat}
              onChange={(e) => updateTask(task.id, { selectedFormat: e.target.value as AudioFormat })}
              className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-secondary focus:outline-none focus:border-primary/50"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="flac">FLAC</option>
              <option value="m4a">M4A</option>
              <option value="ogg">OGG</option>
              <option value="original">Copy</option>
            </select>
          )}

          <button 
            onClick={(e) => {
              e.stopPropagation();
              removeTask(task.id);
            }}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>


      

      {/* Error Message */}

      {isError && (

        <p className="mt-2 text-xs text-red-400 pl-14 pb-4">{task.errorMessage}</p>

      )}



      {/* Expandable Player Section */}

      <AnimatePresence>

        {isActive && isDone && task.outputUrl && (isOnlyTask || task.manuallySelected) && (

          <motion.div

            initial={{ height: 0, opacity: 0 }}

            animate={{ height: 'auto', opacity: 1 }}

            exit={{ height: 0, opacity: 0 }}

            transition={{ duration: 0.3, ease: 'easeInOut' }}

            className="overflow-hidden bg-black/20 border-t border-white/5"

          >

            <div className="p-4 pt-2" onClick={(e) => e.stopPropagation()}>

              <CustomAudioPlayer 

                src={task.outputUrl} 

                fileName={task.fileName} 

                extension={task.outputExt} 

              />

            </div>

          </motion.div>

        )}

      </AnimatePresence>

    </motion.div>

  );

};
