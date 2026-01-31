import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, Copy, X } from 'lucide-react';
import { haptic } from '../../lib/utils';

interface MetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export const MetadataModal = ({ isOpen, onClose, data }: MetadataModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    haptic.success();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-[#0c0c0e] border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-highlight/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-secondary" />
                <h3 className="font-bold text-primary text-sm uppercase tracking-wider">File Metadata</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-highlight/50 border border-white/5 text-[10px] font-bold text-secondary hover:text-primary transition-all uppercase tracking-tighter"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-secondary hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] md:text-xs custom-scrollbar bg-black/20">
              <pre className="text-secondary leading-relaxed whitespace-pre-wrap">
                {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t border-border bg-surface-highlight/5 text-center">
              <p className="text-[10px] text-zinc-500 italic">Analyzed securely on your device</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
