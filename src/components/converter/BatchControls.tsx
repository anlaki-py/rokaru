import React from 'react';
import { Play, Trash2, Settings2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface BatchControlsProps {
  onStartAll: () => void;
  onClearAll: () => void;
  maxConcurrency: number;
  setMaxConcurrency: (n: number) => void;
  isProcessing: boolean;
  hasItems: boolean;
}

export const BatchControls = ({ 
  onStartAll, onClearAll, maxConcurrency, setMaxConcurrency, isProcessing, hasItems 
}: BatchControlsProps) => {
  return (
    <div className="w-full max-w-2xl bg-surface/50 backdrop-blur-md rounded-2xl p-4 border border-border flex flex-col md:flex-row items-center gap-4 shadow-xl z-20">
      
      {/* Concurrency Slider */}
      <div className="flex-1 w-full flex items-center gap-3 px-2">
        <Settings2 className="w-4 h-4 text-secondary" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-secondary uppercase font-bold tracking-wider">
            <span>Parallel Tasks</span>
            <span>{maxConcurrency}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="6" 
            value={maxConcurrency} 
            onChange={(e) => setMaxConcurrency(parseInt(e.target.value))}
            className="w-full h-1.5 bg-surface-highlight rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <Button 
          variant="secondary" 
          onClick={onClearAll} 
          disabled={!hasItems || isProcessing}
          className="flex-1 md:flex-none"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear
        </Button>
        <Button 
          onClick={onStartAll} 
          disabled={!hasItems || isProcessing}
          className="flex-1 md:flex-none min-w-[140px]"
        >
          <Play className="w-4 h-4 mr-2 fill-current" /> Start Queue
        </Button>
      </div>
    </div>
  );
};
