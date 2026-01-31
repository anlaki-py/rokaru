import React from 'react';
import { motion } from 'framer-motion';
import { FileAudio, Info, X, AlertCircle } from 'lucide-react';
import { formatBytes } from '../../lib/utils';
import { Button } from '../ui/Button';
import { AudioFormat } from '../../App';

interface ConversionProgressProps {
  status: 'reading' | 'ready' | 'processing';
  fileName: string;
  fileSize: number;
  progress: number;
  selectedFormat: AudioFormat;
  setSelectedFormat: (f: AudioFormat) => void;
  onExtract: () => void;
  onReset: () => void;
  onProbe: () => void;
  isMetadataLoading: boolean;
}

export const ConversionProgress = ({
  status, fileName, fileSize, progress, selectedFormat, setSelectedFormat,
  onExtract, onReset, onProbe, isMetadataLoading
}: ConversionProgressProps) => {
  return (
    <motion.div 
      key="processing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md space-y-6"
    >
      <div className="bg-surface/50 backdrop-blur-md rounded-2xl p-5 border border-border flex items-center gap-5 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-surface-highlight to-black flex items-center justify-center flex-shrink-0 shadow-inner border border-white/5">
          <FileAudio className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate text-primary text-lg">{fileName}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-secondary font-mono">{formatBytes(fileSize)}</p>
            {status === 'ready' && (
              <button 
                onClick={onProbe}
                disabled={isMetadataLoading}
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-surface-highlight/50 border border-white/5 text-secondary hover:text-primary hover:bg-surface-highlight transition-all"
              >
                <Info className="w-3 h-3" />
                {isMetadataLoading ? 'Probing...' : 'Metadata'}
              </button>
            )}
          </div>
        </div>
        <button onClick={onReset} className="p-2 text-secondary hover:text-primary hover:bg-white/5 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {status === 'ready' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Select Format</span>
            {selectedFormat === 'original' && (
              <span className="text-[10px] text-primary font-medium animate-pulse">Lossless Passthrough</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'original'] as AudioFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`py-2.5 rounded-xl border text-[11px] font-bold transition-all uppercase tracking-tighter ${
                  selectedFormat === fmt 
                    ? "bg-primary text-background border-transparent shadow-lg shadow-primary/20" 
                    : "bg-surface/50 text-secondary border-white/5 hover:border-white/20 hover:text-primary"
                }`}
              >
                {fmt === 'original' ? 'Original' : fmt}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === 'processing' ? (
        <div className="space-y-3 px-1">
          <div className="flex justify-between text-xs font-medium text-secondary uppercase tracking-wider">
            <span>Processing</span><span>{progress}%</span>
          </div>
          <div className="h-3 w-full bg-surface-highlight/50 rounded-full overflow-hidden border border-white/5">
            <motion.div className="h-full bg-primary rounded-full box-shadow-glow" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 text-sm flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">Your files are processed securely in your browser. Nothing is ever uploaded.</p>
        </div>
      )}

      <div className="pt-4">
        <Button 
          className="w-full h-14 text-lg shadow-xl shadow-primary/5" 
          onClick={onExtract} 
          disabled={status === 'processing'} 
          isLoading={status === 'reading'}
        >
          {status === 'reading' ? 'Loading File...' : `Extract ${selectedFormat === 'original' ? 'Original' : selectedFormat.toUpperCase()}`}
        </Button>
      </div>
    </motion.div>
  );
};
