import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IdleViewProps {
  onFilesSelect: (files: FileList) => void;
  isDragging: boolean;
}

export const IdleView = React.memo(({ onFilesSelect, isDragging }: IdleViewProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onFilesSelect(files);
  };

  return (
    <motion.div 
      key="idle" 
      initial={{ opacity: 0, scale: 0.98, y: 20 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.98, y: 10 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1
      }}
      className="flex flex-col items-center w-full max-w-xl"
    >
      <div className="text-center mb-12 space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
          In-browser audio extraction
        </h2>
        <p className="text-secondary text-sm md:text-base max-w-sm mx-auto leading-relaxed">
          A simple tool to convert video to audio locally. No servers, no tracking, no bytes ever leave your device.
        </p>
      </div>
      <input 
        ref={inputRef} 
        type="file" 
        accept="video/*" 
        onChange={handleFileInput} 
        className="hidden" 
        multiple
        aria-label="Upload video files"
      />
      <button 
        onClick={() => inputRef.current?.click()}
        aria-label="Select video files for conversion"
        aria-describedby="upload-description"
        className={cn(
          "aspect-square w-full max-w-[320px] md:max-w-[400px] border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-8 transition-all duration-300 group relative overflow-hidden",
          isDragging ? "border-primary bg-surface-highlight/30 scale-[0.98]" : "border-border hover:border-secondary hover:bg-surface-highlight/10 bg-surface/30"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
        <div className="w-24 h-24 rounded-full bg-surface-highlight shadow-lg group-hover:scale-110 transition-transform duration-300 flex items-center justify-center relative z-10">
          <Upload className="w-10 h-10 text-secondary group-hover:text-primary transition-colors" />
        </div>
        <div id="upload-description" className="text-center px-4 relative z-10">
          <h3 className="font-bold text-primary text-xl md:text-2xl tracking-tight">Select Video</h3>
          <p className="text-sm text-secondary mt-2 font-mono uppercase tracking-wide opacity-70">MP4 • MOV • WEBM</p>
        </div>
      </button>
    </motion.div>
  );
});