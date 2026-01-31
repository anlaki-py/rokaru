import { useRef, useEffect, useCallback } from 'react';
import { FFmpeg } from '../vendor/ffmpeg/index.js';
import { toBlobURL } from '../vendor/util/index.js';
import { opfs } from '../lib/storage';
import { validateVideoFile } from '../lib/validation';
import { haptic, formatBytes } from '../lib/utils';
import { AudioFormat } from '../App';

type AppStatus = 'init' | 'idle' | 'reading' | 'ready' | 'processing' | 'done' | 'error';

const CACHE_NAME = 'rokaru-core-v1';

interface UseFFmpegEngineProps {
  status: AppStatus;
  setStatus: (s: AppStatus) => void;
  addLog: (msg: string) => void;
  setLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  setProgress: (p: number) => void;
  setLoadProgress: (p: number) => void;
  ffmpegRef: React.MutableRefObject<FFmpeg>;
  setFileName: (s: string) => void;
  setFileSize: (n: number) => void;
  setMetadata: (m: any) => void;
  setIsMetadataLoading: (b: boolean) => void;
  setShowMetadata: (b: boolean) => void;
  setErrorMessage: (s: string | null) => void;
  setOutputUrl: (s: string | null) => void;
  setOutputExt: (s: string) => void;
  selectedFormat: AudioFormat;
  metadata: any;
  fileName: string;
}

export const useFFmpegEngine = ({
  status, setStatus, addLog, setLogs, setProgress, setLoadProgress, ffmpegRef,
  setFileName, setFileSize, setMetadata, setIsMetadataLoading, setShowMetadata,
  setErrorMessage, setOutputUrl, setOutputExt, selectedFormat, metadata, fileName
}: UseFFmpegEngineProps) => {

  const fetchWithProgress = async (url: string, onProgress: (progress: number) => void): Promise<string> => {
    const request = new Request(url);
    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          onProgress(100);
          return URL.createObjectURL(blob);
        }
      }
    } catch (e) {
      console.warn('[Cache] Error checking cache', e);
    }

    const response = await fetch(request);
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.statusText}`);

    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    if (!response.body || total === 0) {
      const blob = await response.blob();
      onProgress(100);
      return URL.createObjectURL(blob);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(Math.min(100, (loaded / total) * 100));
      }
    }

    const blob = new Blob(chunks, { type: 'application/wasm' });

    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const responseToCache = new Response(blob, {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/wasm',
            'Content-Length': blob.size.toString()
          }
        });
        await cache.put(request, responseToCache);
      }
    } catch (e) {
      console.warn('[Cache] Failed to save to cache:', e);
    }

    return URL.createObjectURL(blob);
  };

  useEffect(() => {
    if (status !== 'init') return;
    
    const load = async () => {
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ type, message }: { type: string, message: string }) => {
        if (typeof message === 'string') {
          if (!message.startsWith('frame=') && !message.startsWith('size=')) {
            setLogs(prev => [...prev.slice(-199), `[${type}] ${message}`]);
          }
        }
      });

      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        const p = Math.max(0, Math.min(100, Math.round(progress * 100)));
        setProgress(p);
      });

      try {
        if (!window.isSecureContext) {
          throw new Error('This app requires a secure context (HTTPS or localhost) to function.');
        }
        
        if (!navigator.storage || !navigator.storage.getDirectory) {
          throw new Error('Your browser does not support the required Storage API. Please use a modern browser.');
        }

        const baseURL = window.location.origin + '/core';
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await fetchWithProgress(`${baseURL}/ffmpeg-core.wasm`, (p) => setLoadProgress(Math.round(p)));

        await ffmpeg.load({ coreURL, wasmURL });
        setStatus('idle');
        addLog('Engine ready. Select a video to begin.');
      } catch (error: any) {
        console.error(error);
        setErrorMessage(error?.message || 'System failed to start');
        setStatus('error');
        addLog(`System failed to start: ${error?.message}`);
      }
    };
    load();
  }, []);

  const fetchMetadata = async () => {
    if (metadata) {
      setShowMetadata(true);
      return;
    }

    setIsMetadataLoading(true);
    haptic.medium();
    const ffmpeg = ffmpegRef.current;
    const probeFilename = `probe_${Date.now()}.mp4`;
    
    const stdout: string[] = [];
    const stderr: string[] = [];
    const logCollector = ({ type, message }: { type: string, message: string }) => {
      if (type === 'stdout') stdout.push(message);
      else stderr.push(message);
    };

    try {
      addLog('Analyzing file...');
      const inputFile = await opfs.readFile('input.mp4');
      const CHUNK_SIZE = 50 * 1024 * 1024;
      const totalSize = inputFile.size;
      let offset = 0;

      await ffmpeg.writeFile(probeFilename, new Uint8Array(0));
      while (offset < totalSize) {
        const chunk = inputFile.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        await (ffmpeg as any).appendFile(probeFilename, new Uint8Array(buffer), offset);
        offset += CHUNK_SIZE;
      }

      addLog('Extracting audio info...');
      ffmpeg.on('log', logCollector);
      const ret = await ffmpeg.ffprobe([
        '-hide_banner', '-show_format', '-show_streams', '-print_format', 'json', probeFilename
      ]);
      ffmpeg.off('log', logCollector);

      const combinedStdout = stdout.join('').trim();
      const combinedStderr = stderr.join('\n').trim();

      try {
        if (combinedStdout) {
          const json = JSON.parse(combinedStdout);
          setMetadata(json);
        } else {
          setMetadata(combinedStderr || 'No info output received.');
        }
      } catch (parseError) {
        setMetadata(combinedStdout || combinedStderr || 'Failed to parse info.');
      }

      setShowMetadata(true);
      addLog('Audio information extracted successfully.');
    } catch (e: any) {
      addLog(`Failed to extract metadata: ${e.message}`);
      haptic.error();
    } finally {
      ffmpeg.off('log', logCollector);
      try { await ffmpeg.deleteFile(probeFilename); } catch (e) {}
      setIsMetadataLoading(false);
    }
  };

  const processFile = async (file: File) => {
    haptic.medium();
    setErrorMessage(null);
    setStatus('reading');
    
    try {
      const { valid, format } = await validateVideoFile(file);
      if (!valid) throw new Error('Invalid file content. Not a recognized video format.');

      setFileName(file.name);
      setFileSize(file.size);
      setLogs([]);
      setMetadata(null);
      addLog(`Reading file: ${file.name} (${formatBytes(file.size)})`);

      await opfs.saveFile('input.mp4', file);
      setStatus('ready');
      haptic.success();
      addLog('File saved to local storage.');
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to process file');
      setStatus('error');
      haptic.error();
      addLog(`Read error: ${e.message}`);
    }
  };

  const extractAudio = async () => {
    haptic.medium();
    setStatus('processing');
    const ffmpeg = ffmpegRef.current;

    try {
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('output.mp3');
      } catch (e) {}

      addLog('Preparing file for secure processing...');
      const inputFile = await opfs.readFile('input.mp4');
      const CHUNK_SIZE = 50 * 1024 * 1024;
      const totalSize = inputFile.size;
      let offset = 0;

      await ffmpeg.writeFile('input.mp4', new Uint8Array(0));
      while (offset < totalSize) {
        const chunk = inputFile.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        await (ffmpeg as any).appendFile('input.mp4', new Uint8Array(buffer), offset);
        offset += CHUNK_SIZE;
        if (offset % (CHUNK_SIZE * 5) === 0 || offset >= totalSize) {
           addLog(`Loading: ${Math.min(100, Math.round((offset / totalSize) * 100))}%`);
        }
      }
      
      addLog('Extracting high-quality audio...');
      let outputExt = selectedFormat;
      let ffmpegArgs: string[] = ['-i', 'input.mp4', '-vn', '-map', 'a'];

      if (selectedFormat === 'original') {
        const audioStream = metadata?.streams?.find((s: any) => s.codec_type === 'audio');
        const codec = audioStream?.codec_name || 'aac';
        const codecMap: Record<string, string> = { 'aac': 'm4a', 'mp3': 'mp3', 'vorbis': 'ogg', 'opus': 'opus', 'flac': 'flac', 'pcm_s16le': 'wav' };
        outputExt = codecMap[codec] || 'm4a';
        ffmpegArgs.push('-c:a', 'copy');
      } else {
        const formatConfig: Record<string, string[]> = {
          mp3: ['-acodec', 'libmp3lame', '-q:a', '2'],
          wav: ['-acodec', 'pcm_s16le'],
          ogg: ['-acodec', 'libvorbis', '-q:a', '4'],
          flac: ['-acodec', 'flac'],
          m4a: ['-acodec', 'aac', '-b:a', '192k']
        };
        ffmpegArgs.push(...(formatConfig[selectedFormat] || formatConfig.mp3));
      }

      setOutputExt(outputExt);
      const outputFileName = `output.${outputExt}`;
      ffmpegArgs.push(outputFileName);

      const ret = await ffmpeg.exec(ffmpegArgs);
      if (ret !== 0) throw new Error(`FFmpeg exited with code ${ret}`);

      addLog('Conversion successful. Generating blob...');
      const data = await ffmpeg.readFile(outputFileName);
      
      const typeMap: Record<string, string> = {
        mp3: 'audio/mp3', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/opus', flac: 'audio/flac', m4a: 'audio/mp4'
      };
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: typeMap[outputExt] || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      setOutputUrl(url);
      setStatus('done');
      haptic.success();
      addLog('Process complete.');
    } catch (e: any) {
      setStatus('error');
      haptic.error();
      addLog(`Conversion failed: ${e.message}`);
    }
  };

  return { fetchMetadata, processFile, extractAudio };
};
