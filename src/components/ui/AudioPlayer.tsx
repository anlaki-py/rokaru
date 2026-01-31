import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Volume1 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, haptic } from '../../lib/utils';

export interface AudioPlayerHandle {
  togglePlay: () => void;
  toggleMute: () => void;
}

interface AudioPlayerProps {
  src: string;
  fileName: string;
  autoPlay?: boolean;
  extension?: string;
}

export const CustomAudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(({ src, fileName, autoPlay, extension = 'MP3' }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isScrubbingVolume, setIsScrubbingVolume] = useState(false);

  useImperativeHandle(ref, () => ({
    togglePlay: () => togglePlay(),
    toggleMute: () => toggleMute()
  }));

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isScrubbing) setCurrentTime(audio.currentTime);
    };
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
  }, [isScrubbing]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(console.error);
    setIsPlaying(!isPlaying);
    haptic.medium();
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
    haptic.light();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    audio.volume = val;
    if (val > 0 && isMuted) {
      setIsMuted(false);
      audio.muted = false;
    }
  };

  const handleSeekStart = () => setIsScrubbing(true);
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };
  const handleSeekEnd = () => setIsScrubbing(false);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-surface/30 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 shadow-2xl overflow-hidden relative group">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg truncate text-primary tracking-tight">
              {fileName.replace(/\.[^/.]+$/, '')}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">{extension}</span>
              <span className="text-[10px] text-secondary font-mono uppercase tracking-widest opacity-60">High Quality</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
             <span className="text-xs font-mono text-secondary font-bold tracking-tighter">
               {formatTime(currentTime)} <span className="opacity-30 mx-0.5">/</span> {formatTime(duration)}
             </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative h-6 flex items-center group/slider">
            {/* The actual draggable input */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            
            {/* The visual progress bar */}
            <div className="w-full h-1.5 bg-surface-highlight/50 rounded-full relative z-10">
               <motion.div 
                 className="h-full bg-primary relative rounded-full" 
                 initial={false}
                 animate={{ width: `${progressPercent}%` }}
                 transition={isScrubbing ? { duration: 0 } : { type: "tween", ease: "linear", duration: 0.1 }}
               >
                 {/* Draggable Thumb - Always visible for better UX */}
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-primary z-30 translate-x-1/2" />
               </motion.div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-2xl bg-primary text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>

            <div className="flex-1 flex items-center gap-3 px-4 h-14 rounded-2xl bg-surface-highlight/30 border border-white/5 relative overflow-hidden group/volume">
              <button 
                onClick={toggleMute}
                className="text-secondary hover:text-primary transition-colors relative z-20"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : 
                 volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              <div className="flex-1 relative h-6 flex items-center z-20">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onMouseDown={() => setIsScrubbingVolume(true)}
                  onMouseUp={() => setIsScrubbingVolume(false)}
                  onTouchStart={() => setIsScrubbingVolume(true)}
                  onTouchEnd={() => setIsScrubbingVolume(false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                />
                
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative z-10">
                   <motion.div 
                     className="h-full bg-primary/60" 
                     initial={false}
                     animate={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                     transition={isScrubbingVolume ? { duration: 0 } : { type: "tween", ease: "linear", duration: 0.1 }}
                   />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
CustomAudioPlayer.displayName = 'CustomAudioPlayer';