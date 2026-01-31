import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';

export const ReloadPrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      if (r) {
        setInterval(() => {
          console.log('Checking for sw update');
          r.update();
        }, 30 * 1000 /* Check every minute */);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 p-4 rounded-lg border border-white/10 bg-[#0c0c0e] shadow-2xl flex flex-col gap-2 max-w-[300px]"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-white">Update Available</h3>
            <p className="text-xs text-white/60">A new version of rōkaru is available.</p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              className="flex-1 px-3 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-white/90 transition-colors"
              onClick={() => updateServiceWorker(true)}
            >
              Update
            </button>
            <button
              className="px-3 py-1.5 bg-white/5 text-white text-xs font-medium rounded hover:bg-white/10 transition-colors border border-white/10"
              onClick={close}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
