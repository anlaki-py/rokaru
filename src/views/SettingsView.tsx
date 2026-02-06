import React from 'react';
import { Database, AlertTriangle, RefreshCw, Sliders, Coffee, Heart, ExternalLink } from 'lucide-react';
import { db } from '../lib/db';
import { opfs } from '../lib/storage';
import { Button } from '../components/ui/Button';
import { haptic, cn } from '../lib/utils';
import { AudioFormat } from '../App';

interface SettingsViewProps {
  selectedFormat: AudioFormat;
  setSelectedFormat: (f: AudioFormat) => void;
  maxConcurrency: number;
  setMaxConcurrency: (n: number) => void;
}

export const SettingsView = ({ 
  selectedFormat, setSelectedFormat, maxConcurrency, setMaxConcurrency 
}: SettingsViewProps) => {
  const handleDefaultFormatChange = (fmt: AudioFormat) => {
    haptic.light();
    setSelectedFormat(fmt);
  };

  const factoryReset = async () => {
    const confirmed = confirm(
      'DANGER: This will permanently delete ALL data, including any locally saved engine files and preferences. The app will reload and start fresh. Continue?'
    );

    if (!confirmed) return;

    try {
      haptic.error();
      
      // 1. Clear Database
      await db.conversions.clear();
      
      // 2. Clear OPFS
      try {
        await opfs.init();
        await opfs.clearAll();
      } catch (e) {
        console.warn('OPFS clear failed', e);
      }

      // 3. Clear Caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }

      // 4. Clear LocalStorage
      localStorage.clear();

      // 5. Final Notification and Reload
      alert('Application has been reset. Reloading now...');
      window.location.href = '/';
    } catch (err) {
      console.error('Reset failed', err);
      alert('An error occurred during reset. Please clear your browser data manually.');
    }
  };

  return (
    <div className="flex-1 p-6 md:p-12 max-w-5xl mx-auto w-full space-y-12">
      <div>
        <h1 className="text-3xl font-bold font-display">Settings</h1>
        <p className="text-secondary mt-1">Manage your local preferences and application state</p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3 text-lg font-semibold text-primary">
          <Sliders className="w-5 h-5" />
          <h2>Preferences</h2>
        </div>

        <div className="p-6 rounded-2xl bg-surface/30 border border-border space-y-4">
          <div>
            <h3 className="font-medium">Default Format</h3>
            <p className="text-xs text-secondary mt-1">Select the audio format that will be pre-selected for new conversions.</p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'original'] as AudioFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleDefaultFormatChange(fmt)}
                className={cn(
                  "py-2.5 rounded-xl border text-[10px] font-bold transition-all uppercase tracking-tighter",
                  selectedFormat === fmt 
                    ? "bg-primary text-background border-transparent shadow-lg shadow-primary/20" 
                    : "bg-surface/50 text-secondary border-white/5 hover:border-white/20 hover:text-primary"
                )}
              >
                {fmt === 'original' ? 'Original' : fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-surface/30 border border-border space-y-4">
          <div>
            <h3 className="font-medium">Parallel Extractions</h3>
            <p className="text-xs text-secondary mt-1">Maximum number of videos to process at the same time.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <input 
              type="range" 
              min="1" 
              max="6" 
              value={maxConcurrency} 
              onChange={(e) => setMaxConcurrency(parseInt(e.target.value))}
              className="flex-1 h-2 bg-surface-highlight rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="w-12 text-center font-mono text-xl font-bold text-primary bg-surface-highlight/50 px-3 py-1 rounded-lg border border-white/5">
              {maxConcurrency}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 text-lg font-semibold text-primary">
          <Heart className="w-5 h-5 text-red-500" />
          <h2>Support the Project</h2>
        </div>

        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-primary/10 via-surface/30 to-surface/30 border border-primary/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Coffee className="w-32 h-32 text-primary" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="max-w-xl">
              <h3 className="text-xl font-bold text-primary tracking-tight">Keep rōkaru Free & Private</h3>
              <p className="text-secondary mt-3 leading-relaxed">
                rōkaru is a labor of love, built to provide a fast, private, and high-quality conversion tool without any tracking or server-side processing. 
                If this tool has saved you time, consider supporting its development. Your contribution helps keep the engine running and the updates coming.
              </p>
              <p className="text-primary/80 font-medium mt-4 italic">
                Thank you for being part of this journey! ❤️
              </p>
            </div>

            <a 
              href="https://ko-fi.com/unluky" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-4 bg-primary text-background rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 group/btn"
              onClick={() => haptic.success()}
            >
              <Coffee className="w-5 h-5 fill-current" />
              <span>Buy me a coffee on Ko-fi</span>
              <ExternalLink className="w-4 h-4 opacity-50 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 text-lg font-semibold text-primary">
          <Database className="w-5 h-5" />
          <h2>Storage Management</h2>
        </div>
        
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-red-500">Danger Zone</h3>
              <p className="text-sm text-secondary mt-1 max-w-md">
                This action is irreversible. All local application data and cached engine files will be wiped.
              </p>
            </div>
          </div>
          
          <div className="max-w-xs pt-2">
            <div className="p-4 rounded-xl bg-surface/50 border border-white/5 space-y-3">
              <div>
                <h4 className="text-sm font-semibold">Factory Reset</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Wipes everything: local files and core engine cache.</p>
              </div>
              <Button 
                variant="danger" 
                className="w-full text-xs h-10"
                onClick={factoryReset}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Full Factory Reset
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
