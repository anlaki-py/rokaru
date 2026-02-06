import React from 'react';
import { Shield, Upload, Terminal, Cpu, Globe, Zap } from 'lucide-react';

export const LandingSEO = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-24 md:py-40 space-y-32">
      
      {/* Hero / Vision */}
      <div className="relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent/5 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
        <div className="space-y-6 text-center md:text-left">
          <h1 className="text-5xl md:text-8xl font-display font-bold tracking-tight text-primary leading-[1.2] pb-2">
            Media processing <br /> 
            <span className="text-zinc-700">on your terms.</span>
          </h1>
          <p className="text-lg md:text-xl text-secondary max-w-2xl leading-relaxed font-medium">
            Rōkaru bypasses the cloud entirely. By leveraging WebAssembly, we extract high-fidelity audio directly on your hardware. No uploads. No logs. No compromises.
          </p>
        </div>
      </div>

      {/* Bento Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        
        {/* Card 1: Privacy */}
        <div className="md:col-span-3 group p-8 rounded-[2.5rem] bg-surface-highlight/10 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between min-h-[320px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield className="w-48 h-48 text-primary" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-surface-highlight/30 flex items-center justify-center border border-white/5 mb-8">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-display font-bold text-primary mb-3">100% Sovereign Data</h3>
            <p className="text-secondary text-sm leading-relaxed max-w-[280px]">
              Your files never touch a server. Processing happens in a sandboxed browser environment, ensuring your data remains yours alone.
            </p>
          </div>
        </div>

        {/* Card 2: Speed/No Limits */}
        <div className="md:col-span-3 group p-8 rounded-[2.5rem] bg-surface-highlight/10 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between min-h-[320px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-48 h-48 text-primary" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-surface-highlight/30 flex items-center justify-center border border-white/5 mb-8">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-display font-bold text-primary mb-3">Zero Artificial Limits</h3>
            <p className="text-secondary text-sm leading-relaxed max-w-[280px]">
              Convert 10GB 4K files as easily as a 10MB clip. Since we don't pay for bandwidth, you don't pay for limits.
            </p>
          </div>
        </div>

        {/* Card 3: Terminal / Logic (Wide) */}
        <div className="md:col-span-4 p-8 rounded-[2.5rem] bg-black/40 border border-white/5 flex flex-col md:flex-row gap-8 items-center overflow-hidden">
          <div className="flex-1 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20">
              <Cpu className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-2xl font-display font-bold text-primary">Local FFmpeg Engine</h3>
            <p className="text-secondary text-sm leading-relaxed">
              We've compiled the world's most powerful media framework to WebAssembly. This allows professional-grade extraction to run at native speeds directly in your browser.
            </p>
          </div>
          <div className="w-full md:w-80 bg-black/60 rounded-2xl p-6 border border-white/5 font-mono text-[11px] leading-tight shadow-2xl relative group shrink-0">
            <div className="flex gap-1.5 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-accent">$</span>
                <span className="text-zinc-300">ffmpeg -i source.mov</span>
              </div>
              <div className="text-zinc-500 italic">... analyzing streams</div>
              <div className="flex gap-2">
                <span className="text-green-500">→</span>
                <span className="text-zinc-300">extracting audio...</span>
              </div>
              <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-accent/40 flex justify-between font-bold uppercase tracking-widest">
                <span>OPFS_OK</span>
                <span>WASM_THREADS_ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Formats (Square-ish) */}
        <div className="md:col-span-2 group p-8 rounded-[2.5rem] bg-surface-highlight/10 border border-white/5 hover:border-white/10 transition-colors flex flex-col justify-between min-h-[320px]">
          <div className="w-12 h-12 rounded-2xl bg-surface-highlight/30 flex items-center justify-center border border-white/5">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-display font-bold text-primary">Pro Formats</h3>
            <div className="flex flex-wrap gap-2">
              {['FLAC', 'WAV', 'MP3', 'OGG', 'M4A'].map(f => (
                <span key={f} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-zinc-400">
                  {f}
                </span>
              ))}
            </div>
            <p className="text-secondary text-[11px] leading-relaxed">
              Supports everything from lossless PCM to high-efficiency Opus encoders.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ - Refined */}
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-primary">The Protocol</h2>
          <p className="text-secondary font-medium">Common questions about client-side processing.</p>
        </div>
        
        <div className="grid gap-4">
          {[
            {
              q: "How is it free and unlimited?",
              a: "Standard converters pay for massive server bandwidth and storage. Rōkaru costs us almost nothing because your computer does all the work. We pass those savings directly to you."
            },
            {
              q: "Is it really private?",
              a: "Yes. Rōkaru processes all conversions client-side using ffmpeg.wasm. Your files never upload to our servers. You can verify this by monitoring network traffic in your browser's developer tools: no upload requests occur."
            },
            {
              q: "Does it work offline?",
              a: "Once the application is loaded, you can disconnect from the internet and continue converting files. It's a fully functional PWA (Progressive Web App)."
            }
          ].map((item, i) => (
            <div key={i} className="group p-8 rounded-[2rem] bg-surface-highlight/5 border border-white/5 hover:bg-surface-highlight/10 transition-all duration-300">
              <h4 className="text-lg font-display font-bold text-primary mb-4 flex items-center gap-4">
                <span className="text-accent text-sm font-mono opacity-50">0{i+1}</span>
                {item.q}
              </h4>
              <p className="text-secondary text-sm leading-relaxed pl-10 border-l border-white/5">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};