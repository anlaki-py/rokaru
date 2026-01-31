import React from 'react';
import { Shield, Upload, Check, Terminal } from 'lucide-react';

export const LandingSEO = () => {
  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-32 space-y-32 border-t border-white/5 bg-gradient-to-b from-transparent to-black/20">
      
      {/* H1 & Intro */}
      <div className="space-y-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-highlight/20 border border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">
          FFmpeg WASM Core
        </div>
        <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-primary leading-[1.1]">
          Media processing <br className="hidden md:block" /> 
          without the cloud <br className="hidden md:block" />
          <span className="text-zinc-600">. Local-only by design.</span>
        </h1>
        <p className="text-xl text-secondary max-w-3xl leading-relaxed font-medium mx-auto">
          Rōkaru uses your browser's own compute power to extract audio streams. By eliminating the upload step, we've built a tool that is fast, secure, and works entirely offline once loaded.
        </p>
      </div>

      {/* 3-Column Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-highlight/30 flex items-center justify-center border border-white/5">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-primary">100% Private</h3>
          <p className="text-secondary text-sm leading-relaxed">
            Unlike other online converters, Rōkaru doesn't use cloud servers. Your sensitive media never leaves your device, ensuring total privacy.
          </p>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-highlight/30 flex items-center justify-center border border-white/5">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-primary">No File Size Limits</h3>
          <p className="text-secondary text-sm leading-relaxed">
            Since we use local processing, there are no arbitrary upload limits. Convert gigabyte-sized recordings with ease and speed.
          </p>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-highlight/30 flex items-center justify-center border border-white/5">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-primary">Lossless Quality</h3>
          <p className="text-secondary text-sm leading-relaxed">
            Extract the original audio stream directly without re-encoding using our "Original" mode, or choose from pro formats like FLAC and WAV.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-surface-highlight/10 rounded-[2.5rem] p-8 md:p-12 border border-white/5 space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">How Rōkaru Works Locally</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <p className="text-secondary leading-relaxed">
              Client-side video conversion processes files entirely in your browser using WebAssembly technology (ffmpeg.wasm). Unlike traditional converters that upload files to servers:
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <strong>No upload required:</strong> Your files never leave your computer
              </li>
              <li className="flex items-center gap-3 text-sm text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <strong>Complete privacy:</strong> Zero data transmission to servers
              </li>
              <li className="flex items-center gap-3 text-sm text-primary">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <strong>No file limits:</strong> Process files of any size using your CPU
              </li>
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-black/40 font-mono text-xs text-zinc-400 leading-relaxed border border-white/5 shadow-inner">
            <div className="flex items-center gap-2 mb-4 text-zinc-500">
              <Terminal className="w-3.5 h-3.5" />
              <span>FFmpeg Engine Execution</span>
            </div>
            <span className="text-primary">$</span> ffmpeg -i input.mp4 -vn -c:a copy output.m4a <br />
            <span className="text-zinc-600">[info]</span> Analyzing stream codecs... <br />
            <span className="text-zinc-600">[info]</span> Mapping audio stream #0:1 <br />
            <span className="text-green-500/80">[success]</span> Extraction complete (0.4s)
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="space-y-8">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Supported Output Formats</h2>
          <p className="text-secondary mt-2">Professional encoders for every use case.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'MP3', desc: 'Universal compatibility' },
            { label: 'WAV', desc: 'Uncompressed PCM' },
            { label: 'FLAC', desc: 'Lossless compression' },
            { label: 'OGG', desc: 'Vorbis/Opus high-def' },
            { label: 'M4A', desc: 'Apple/AAC standard' }
          ].map(fmt => (
            <div key={fmt.label} className="p-6 rounded-2xl bg-surface-highlight/10 border border-white/5 text-center space-y-2">
              <div className="font-bold text-primary text-xl">{fmt.label}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{fmt.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-12 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-primary text-center">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              q: "Is Rōkaru really private?",
              a: "Yes. Rōkaru processes all conversions client-side using ffmpeg.wasm. Your files never upload to our servers. You can verify this by monitoring network traffic in your browser's developer tools—no upload requests occur."
            },
            {
              q: "How does client-side conversion work?",
              a: "Rōkaru uses ffmpeg.wasm to process your video files entirely in your browser. Unlike traditional converters that upload files to servers, your video file never leaves your device and processing happens using your computer's CPU."
            },
            {
              q: "Is there a file size limit?",
              a: "No. Since conversion happens locally on your device, there are no arbitrary file size restrictions typically found in cloud converters. It's only limited by your device's storage."
            },
             {
              q: "What video formats are supported?",
              a: "We support most major video containers including MP4, MOV, WEBM, MKV, and AVI. If your browser can read the file, Rōkaru can likely extract audio from it."
            }
          ].map((item, i) => (
            <div key={i} className="space-y-3 p-6 rounded-2xl bg-surface-highlight/5 border border-white/5">
              <h4 className="font-bold text-primary flex items-center gap-3">
                 <div className="w-1 h-4 bg-primary rounded-full" />
                 {item.q}
              </h4>
              <p className="text-secondary text-sm leading-relaxed pl-4">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
