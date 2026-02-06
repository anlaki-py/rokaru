import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LogEntry } from '../../App';

interface LogViewerProps {
  logs: LogEntry[];
  onClear: () => void;
  onClose?: () => void;
  dragControls?: any;
}

export const LogViewer = ({ logs, onClear, onClose, dragControls }: LogViewerProps) => {
  const logRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLButtonElement;
    const originalText = btn.innerText;
    
    const text = logs.map(l => `[${l.timestamp}]${l.fileName ? ` [${l.fileName}]` : ''} ${l.message}`).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      btn.innerText = 'COPIED!';
      setTimeout(() => { btn.innerText = originalText; }, 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      {/* Header / Drag Handle */}
      <div 
        className="h-12 flex items-center justify-between px-4 bg-surface-highlight/10 border-b border-border/50 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => dragControls?.start(e)}
      >
        <div className="flex items-center gap-2">
          {onClose && <div className="md:hidden w-1 h-4 bg-surface-highlight rounded-full mr-1 opacity-50" />}
          <TerminalIcon className="w-4 h-4 text-secondary" />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">System Logs</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={copyToClipboard} 
            className="text-[10px] text-secondary hover:text-primary transition-colors"
          >
            COPY
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); }} 
            className="text-[10px] text-secondary hover:text-primary transition-colors"
          >
            CLEAR
          </button>
          {onClose && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="md:hidden p-1 text-secondary hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div 
        ref={logRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 min-h-0 custom-scrollbar overscroll-contain"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-2">
            <TerminalIcon className="w-8 h-8 opacity-20" />
            <span className="italic">No logs generated yet.</span>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-zinc-400 break-words border-l-2 border-transparent hover:border-zinc-700 pl-3 -ml-3 py-0.5 transition-colors group">
              <div className="flex items-start gap-3">
                <span className="opacity-40 select-none text-[10px] shrink-0 mt-0.5">{log.timestamp}</span>
                
                <div className="flex flex-col gap-1 min-w-0">
                  {log.fileName && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-2.5 h-3 text-primary/40" />
                      <span className="text-[9px] text-primary/60 font-bold truncate uppercase tracking-tighter max-w-[150px]">
                        {log.fileName}
                      </span>
                    </div>
                  )}
                  
                  <span className={cn(
                    "leading-relaxed",
                    log.message.toLowerCase().includes('error') ? "text-red-400" :
                    log.message.toLowerCase().includes('success') || log.message.toLowerCase().includes('complete') ? "text-green-400" :
                    log.message.toLowerCase().includes('processing') ? "text-blue-400" :
                    "text-zinc-300"
                  )}>
                    {log.message}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
