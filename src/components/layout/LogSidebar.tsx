import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { LogViewer } from '../ui/LogViewer';
import { useMediaQuery } from '../../lib/utils';
import { useFileConversion } from '../../contexts/FileConversionContext';

interface LogSidebarProps {
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
}

/**
 * LogSidebar component that handles both desktop sidebar and mobile drawer for logs.
 */
export const LogSidebar = ({ showLogs, setShowLogs }: LogSidebarProps) => {
  const { globalLogs, clearLogs } = useFileConversion();
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const mobileDragControls = useDragControls();

  const startResizing = useCallback(() => setIsResizing(true), []);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(e.clientX, 800, window.innerWidth * 0.6));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleMobileDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) setShowLogs(false);
  };

  return (
    <>
      {/* Desktop Sidebar Logs */}
      {!isMobile && (
        <motion.div 
          initial={false}
          animate={{ width: showLogs ? sidebarWidth : 0, opacity: showLogs ? 1 : 0 }}
          className="absolute top-0 right-0 h-full border-l border-border bg-[#0c0c0e] overflow-hidden z-50 group"
        >
          <div style={{ width: sidebarWidth }} className="h-full relative">
            <LogViewer logs={globalLogs} onClear={clearLogs} />
            <div 
              onMouseDown={startResizing} 
              className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="w-0.5 h-8 bg-white/20 rounded-full" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Logs Drawer */}
      <AnimatePresence>
        {showLogs && isMobile && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowLogs(false)} 
              className="fixed inset-0 bg-black/80 z-[60]" 
            />
            <motion.div 
              drag="y" 
              dragControls={mobileDragControls} 
              dragListener={false} 
              dragConstraints={{ top: 0 }} 
              dragElastic={{ top: 0, bottom: 0.2 }}
              onDragEnd={handleMobileDragEnd}
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 h-[60vh] bg-[#0c0c0e] border-t border-border z-[70] rounded-t-3xl overflow-hidden flex flex-col"
            >
              <LogViewer 
                logs={globalLogs} 
                onClear={clearLogs} 
                onClose={() => setShowLogs(false)} 
                dragControls={mobileDragControls} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
