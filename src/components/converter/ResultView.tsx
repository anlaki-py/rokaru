import React from 'react';
import { motion } from 'framer-motion';
import { Check, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { CustomAudioPlayer } from '../ui/AudioPlayer';
import { haptic } from '../../lib/utils';

interface ResultViewProps {
  outputUrl: string;
  fileName: string;
  outputExt: string;
  onReset: () => void;
  audioPlayerRef: React.RefObject<any>;
}

export const ResultView = React.memo(({ outputUrl, fileName, outputExt, onReset, audioPlayerRef }: ResultViewProps) => {
  return (
    <motion.div 
      key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md space-y-8"
    >
      <div className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
          <Check className="w-8 h-8" />
        </motion.div>
        <h2 className="text-2xl font-bold text-primary">Conversion Complete</h2>
      </div>
      
      <CustomAudioPlayer 
        ref={audioPlayerRef} 
        src={outputUrl} 
        fileName={fileName} 
        extension={outputExt} 
      />
      
      <div className="flex flex-col gap-3">
        <a 
          href={outputUrl} 
          download={`${fileName.replace(/\.[^/.]+$/, '')}.${outputExt}`} 
          className="w-full" 
          onClick={() => haptic.success()}
        >
          <Button className="w-full h-14 text-lg">
            <Download className="w-5 h-5" /> Download {outputExt.toUpperCase()}
          </Button>
        </a>
        <Button variant="ghost" onClick={onReset}>Convert Another File</Button>
      </div>
    </motion.div>
  );
});
