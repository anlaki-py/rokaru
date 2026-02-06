import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptic } from '../../lib/utils';

interface MiniAudioPlayerProps {
  src: string;
}

export const MiniAudioPlayer = ({ src }: MiniAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnd);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
    haptic.light();
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 bg-black/20 rounded-full pl-1 pr-3 py-1 border border-white/5 h-8 min-w-[100px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className="w-6 h-6 rounded-full bg-primary text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
      >
        {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative min-w-[40px]">
        <motion.div 
          className="h-full bg-primary" 
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: "tween", ease: "linear", duration: 0.1 }}
        />
      </div>
      <span className="text-[10px] font-mono text-secondary tabular-nums opacity-60">
        {Math.floor(currentTime)}s
      </span>
    </div>
  );
};
