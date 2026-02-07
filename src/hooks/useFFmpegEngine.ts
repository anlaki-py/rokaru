import { useRef, useEffect, useCallback } from 'react';
import { opfs } from '../lib/storage';
import { validateVideoFile } from '../lib/validation';
import { haptic, formatBytes } from '../lib/utils';
import { getFFmpegArgs, getOriginalExtension } from '../lib/ffmpegUtils';
import { ConversionTask } from '../types';
import { useCleanup } from './useCleanup';
import { logger } from '../lib/logger';

const CACHE_NAME = 'rokaru-core-v1';

interface UseFFmpegEngineProps {
  task: ConversionTask;
  updateTask: (taskId: string, updates: Partial<ConversionTask>) => void;
  addLog: (taskId: string, message: string) => void;
  onGlobalLoadProgress?: (p: number) => void;
}

/**
 * Custom hook that orchestrates the FFmpeg engine for a single conversion task.
 * Handles engine loading, file processing, metadata extraction, and audio extraction.
 */
export const useFFmpegEngine = ({
  task, updateTask, addLog, onGlobalLoadProgress
}: UseFFmpegEngineProps) => {
  const ffmpegRef = useRef<any>(null);
  const lastProgressRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(0);
  const { createBlobUrl } = useCleanup();

  /**
   * Fetches a file with progress tracking and caching support.
   */
  const fetchWithProgress = async (url: string, onProgress: (progress: number) => void): Promise<string> => {
    const request = new Request(url);
    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          onProgress(100);
          return createBlobUrl(blob);
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
      return createBlobUrl(blob);
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
      logger.warn('[Cache] Failed to save to cache:', e);
    }

    return createBlobUrl(blob);
  };

  /**
   * Processes the input file, validates it, and saves it to OPFS.
   */
  const processFile = useCallback(async (file: File) => {
    haptic.medium();
    const inputFilename = `input_${task.id}.mp4`;
    
    try {
      // Validate first (reads small chunk)
      const { valid, format } = await validateVideoFile(file);
      if (!valid) throw new Error('Invalid file content. Not a recognized video format.');

      addLog(task.id, `Reading file: ${file.name} (${formatBytes(file.size)})`);

      // Save to OPFS immediately
      await opfs.saveFile(inputFilename, file);
      
      updateTask(task.id, { status: 'ready' });
      haptic.success();
      addLog(task.id, 'File saved to local storage.');
    } catch (e: any) {
      updateTask(task.id, { status: 'error', errorMessage: e.message || 'Failed to process file' });
      haptic.error();
      addLog(task.id, `Read error: ${e.message}`);
    }
  }, [task.id, updateTask, addLog]);

  // Process file immediately on mount if in 'reading' state
  useEffect(() => {
    if (task.status === 'reading') {
      processFile(task.file);
    }
  }, []); 

  // Load FFmpeg Engine on mount
  useEffect(() => {
    /**
     * Loads the FFmpeg engine with retry logic and timeout.
     */
    const loadWithRetry = async (retries = 3, timeout = 30000) => {
      // Dynamic imports for FFmpeg to reduce initial bundle size
      const { FFmpeg } = await import('../vendor/ffmpeg/index.js');
      const { toBlobURL } = await import('../vendor/util/index.js');

      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
      }

      if (ffmpegRef.current.loaded) return;

      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ type, message }: { type: string, message: string }) => {
        if (typeof message === 'string') {
          // Filter out noisy progress logs
          if (!message.startsWith('frame=') && !message.startsWith('size=')) {
            addLog(task.id, `[${type}] ${message}`);
          }
        }
      });

      ffmpeg.on('progress', ({ progress }: { progress: number }) => {
        const p = Math.max(0, Math.min(100, Math.round(progress * 100)));
        
        // Throttle progress updates to avoid excessive re-renders (max every 100ms)
        const now = Date.now();
        if (now - lastProgressTimeRef.current > 100 || p === 100) {
          updateTask(task.id, { progress: p });
          lastProgressRef.current = p;
          lastProgressTimeRef.current = now;
        }
      });

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          if (!window.isSecureContext) {
            throw new Error('This app requires a secure context (HTTPS or localhost) to function.');
          }
          
          const baseURL = window.location.origin + '/core';
          
          await Promise.race([
            (async () => {
              const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
              const wasmURL = await fetchWithProgress(`${baseURL}/ffmpeg-core.wasm`, (p) => {
                updateTask(task.id, { loadProgress: Math.round(p) });
                onGlobalLoadProgress?.(Math.round(p));
              });

              await ffmpeg.load({ coreURL, wasmURL });
            })(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Engine load timeout after ${timeout}ms`)), timeout)
            )
          ]);
          
          return; // Success!
        } catch (error: any) {
          logger.error(`FFmpeg load attempt ${attempt} failed:`, error);
          
          if (attempt === retries) {
            updateTask(task.id, { status: 'error', errorMessage: error?.message || 'Engine failed after multiple attempts' });
            addLog(task.id, `System failed to start: ${error?.message}`);
          } else {
            addLog(task.id, `Engine load attempt ${attempt} failed, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
      }
    };

    loadWithRetry();
  }, []);

  /**
   * Fetches metadata for the input file using ffprobe.
   */
  const fetchMetadata = useCallback(async () => {
    if (task.metadata) {
      updateTask(task.id, { showMetadata: true });
      return;
    }

    updateTask(task.id, { isMetadataLoading: true });
    haptic.medium();
    const ffmpeg = ffmpegRef.current;
    const probeFilename = `probe_${task.id}_${Date.now()}.mp4`;
    const inputFilename = `input_${task.id}.mp4`;
    
    const stdout: string[] = [];
    const stderr: string[] = [];
    const logCollector = ({ type, message }: { type: string, message: string }) => {
      if (type === 'stdout') stdout.push(message);
      else stderr.push(message);
    };

    try {
      addLog(task.id, 'Analyzing file...');
      const inputFile = await opfs.readFile(inputFilename);
      const CHUNK_SIZE = 50 * 1024 * 1024;
      const totalSize = inputFile.size;
      let offset = 0;

      // Write file to FFmpeg virtual filesystem in chunks
      await ffmpeg.writeFile(probeFilename, new Uint8Array(0));
      while (offset < totalSize) {
        const chunk = inputFile.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        await (ffmpeg as any).appendFile(probeFilename, new Uint8Array(buffer), offset);
        offset += CHUNK_SIZE;
      }

      addLog(task.id, 'Extracting audio info...');
      ffmpeg.on('log', logCollector);
      const ret = await (ffmpeg as any).ffprobe([
        '-hide_banner', '-show_format', '-show_streams', '-print_format', 'json', probeFilename
      ]);
      ffmpeg.off('log', logCollector);

      const combinedStdout = stdout.join('').trim();
      const combinedStderr = stderr.join('\n').trim();

      let metadata = null;
      try {
        if (combinedStdout) {
          metadata = JSON.parse(combinedStdout);
        } else {
          metadata = combinedStderr || 'No info output received.';
        }
      } catch (parseError) {
        metadata = combinedStdout || combinedStderr || 'Failed to parse info.';
      }

      updateTask(task.id, { metadata, showMetadata: true });
      addLog(task.id, 'Audio information extracted successfully.');
    } catch (e: any) {
      addLog(task.id, `Failed to extract metadata: ${e.message}`);
      haptic.error();
    } finally {
      ffmpeg.off('log', logCollector);
      try { await ffmpeg.deleteFile(probeFilename); } catch (e) {}
      updateTask(task.id, { isMetadataLoading: false });
    }
  }, [task.id, task.metadata, addLog, updateTask]);

  /**
   * Performs the audio extraction/conversion using FFmpeg.
   */
  const extractAudio = useCallback(async () => {
    haptic.medium();
    updateTask(task.id, { status: 'processing', progress: 0 });
    const ffmpeg = ffmpegRef.current;
    const inputFilename = `input_${task.id}.mp4`;

    try {
      addLog(task.id, 'Preparing file for secure processing...');
      const inputFile = await opfs.readFile(inputFilename);
      const CHUNK_SIZE = 50 * 1024 * 1024;
      const totalSize = inputFile.size;
      let offset = 0;

      // Write file to FFmpeg virtual filesystem in chunks to avoid memory issues
      await ffmpeg.writeFile(inputFilename, new Uint8Array(0));
      while (offset < totalSize) {
        const chunk = inputFile.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        await (ffmpeg as any).appendFile(inputFilename, new Uint8Array(buffer), offset);
        offset += CHUNK_SIZE;
        if (offset % (CHUNK_SIZE * 5) === 0 || offset >= totalSize) {
           addLog(task.id, `Loading: ${Math.min(100, Math.round((offset / totalSize) * 100))}%`);
        }
      }
      
      addLog(task.id, 'Extracting high-quality audio...');
      
      const outputExt = task.selectedFormat === 'original' 
        ? getOriginalExtension(task.metadata) 
        : task.selectedFormat;
        
      const outputFileName = `output_${task.id}.${outputExt}`;
      const ffmpegArgs = getFFmpegArgs(inputFilename, outputFileName, task.selectedFormat, task.metadata);

      const ret = await ffmpeg.exec(ffmpegArgs);
      if (ret !== 0) throw new Error(`FFmpeg exited with code ${ret}`);

      addLog(task.id, 'Conversion successful. Generating blob...');
      const data = await ffmpeg.readFile(outputFileName);
      
      const typeMap: Record<string, string> = {
        mp3: 'audio/mp3', wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/opus', flac: 'audio/flac', m4a: 'audio/mp4'
      };
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { 
        type: typeMap[outputExt] || 'audio/mpeg' 
      });
      const url = createBlobUrl(blob);
      
      updateTask(task.id, { status: 'done', outputUrl: url, outputExt });
      haptic.success();
      addLog(task.id, 'Process complete.');
      
      // Cleanup FFmpeg virtual files
      try {
        await ffmpeg.deleteFile(inputFilename);
        await ffmpeg.deleteFile(outputFileName);
      } catch (e) {}
    } catch (e: any) {
      updateTask(task.id, { status: 'error', errorMessage: e.message });
      haptic.error();
      addLog(task.id, `Conversion failed: ${e.message}`);
    }
  }, [task.id, task.selectedFormat, task.metadata, addLog, updateTask, createBlobUrl]);

  return { fetchMetadata, processFile, extractAudio };
};
