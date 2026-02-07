# Code Quality Assessment Report

## Executive Summary

This report provides a comprehensive analysis of the provided React-based audio/video conversion application codebase. The analysis identifies critical architectural flaws, performance bottlenecks, security vulnerabilities, type safety issues, and maintainability concerns. Each issue is categorized by severity and includes specific remediation strategies.

**Overall Assessment**: The codebase demonstrates moderate organizational structure but suffers from significant technical debt, inconsistent patterns, missing error boundaries, incomplete type safety, and potential memory leaks that could impact production stability.

---

## Critical Issues

### 1. Memory Leak Vulnerabilities

**Location**: `src/lib/ffmpegService.ts` (lines 59-70, 118-143)

**Issue**: The FFmpeg instance management contains multiple memory leak vectors:
- No cleanup of blob URLs created during file processing
- Event listeners not properly removed on component unmount
- Worker threads potentially persisting after conversion completion
- File objects retained in memory without explicit disposal

**Impact**: Progressive memory consumption during batch processing will degrade performance and potentially crash the browser tab after processing multiple files.

**Remediation**:
```typescript
// Add cleanup tracker
private blobUrls: Set<string> = new Set();
private abortController: AbortController | null = null;

// Modify createBlobUrl method
private createBlobUrl(data: Uint8Array): string {
  const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  this.blobUrls.add(url);
  return url;
}

// Add cleanup method
public cleanup(): void {
  this.blobUrls.forEach(url => URL.revokeObjectURL(url));
  this.blobUrls.clear();
  this.abortController?.abort();
  this.abortController = null;
}

// Ensure cleanup in convertVideo method
finally {
  this.cleanup();
}
```

### 2. Race Condition in FFmpeg Loading

**Location**: `src/lib/ffmpegService.ts` (lines 38-57)

**Issue**: The `load()` method uses a simple boolean check (`this.ffmpeg.loaded`) which creates a race condition when multiple components simultaneously attempt initialization. The current implementation allows concurrent load attempts, potentially causing:
- Multiple simultaneous WebAssembly module instantiations
- Resource contention
- Undefined behavior in FFmpeg core initialization

**Impact**: Application instability during initial load, particularly in batch processing scenarios.

**Remediation**:
```typescript
private loadPromise: Promise<void> | null = null;

async load(): Promise<void> {
  if (this.ffmpeg.loaded) return;
  
  if (this.loadPromise) {
    return this.loadPromise;
  }

  this.loadPromise = (async () => {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      });
    } catch (error) {
      this.loadPromise = null;
      throw error;
    }
  })();

  return this.loadPromise;
}
```

### 3. Unbounded Concurrency in Batch Processing

**Location**: `src/hooks/useBatchConversion.ts` (lines 47-75)

**Issue**: The batch processing implementation uses `Promise.all()` with no actual concurrency limiting mechanism. While `maxConcurrency` is a state variable, it is not enforced in the execution logic. This allows all conversions to run simultaneously regardless of the configured limit.

**Impact**: Browser tab crashes, memory exhaustion, and poor user experience when processing large batches.

**Remediation**:
```typescript
const processBatch = async () => {
  const pending = items.filter(i => i.status === 'pending');
  setIsProcessing(true);

  const queue = [...pending];
  const activeConversions: Map<string, Promise<void>> = new Map();

  while (queue.length > 0 || activeConversions.size > 0) {
    // Start new conversions up to maxConcurrency limit
    while (queue.length > 0 && activeConversions.size < maxConcurrency) {
      const item = queue.shift()!;
      
      const conversionPromise = (async () => {
        try {
          updateItem(item.id, { status: 'processing', progress: 0 });
          
          const result = await convertFile(
            item.file, 
            item.format,
            (progress) => updateItem(item.id, { progress })
          );
          
          updateItem(item.id, { 
            status: 'completed', 
            progress: 100,
            outputUrl: result.url,
            outputSize: result.size 
          });
        } catch (error) {
          updateItem(item.id, { 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Conversion failed'
          });
        } finally {
          activeConversions.delete(item.id);
        }
      })();

      activeConversions.set(item.id, conversionPromise);
    }

    // Wait for at least one conversion to complete
    if (activeConversions.size > 0) {
      await Promise.race(activeConversions.values());
    }
  }

  setIsProcessing(false);
};
```

### 4. Missing Error Boundaries

**Location**: Application-wide (no error boundaries detected)

**Issue**: The entire application lacks React Error Boundaries. Any uncaught error in the component tree will crash the entire application with a white screen, providing no recovery mechanism or user feedback.

**Impact**: Poor user experience, lost work, and no error telemetry.

**Remediation**:
Create error boundary component:
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Send to error tracking service
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-surface/50 backdrop-blur-md rounded-2xl p-8 border border-border shadow-xl text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-primary">Something Went Wrong</h1>
            <p className="text-secondary">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="text-left text-xs bg-surface-highlight/50 p-4 rounded-lg border border-white/5">
                <summary className="cursor-pointer text-secondary font-mono">
                  Error Details
                </summary>
                <pre className="mt-2 text-red-400 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap application:
```typescript
// src/main.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 5. Type Safety Violations

**Location**: Multiple files

**Issue**: Extensive use of `any` types, type assertions without validation, and missing type guards:

1. `src/lib/ffmpegService.ts` (line 25): `plugins: [] as any` - circumventing type system
2. `vite.config.ts` (line 17): `.filter(Boolean) as any` - unsafe type assertion
3. Missing runtime type validation for FFmpeg responses
4. No validation of file type before processing

**Impact**: Runtime type errors, unexpected crashes, and difficult debugging.

**Remediation**:

```typescript
// src/types/index.ts - Add proper types
export interface FFmpegConfig {
  plugins: never[]; // Or proper plugin type if available
}

export interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  error?: string;
}

// src/lib/fileValidator.ts
export const validateVideoFile = (file: File): FileValidationResult => {
  const validMimeTypes = [
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
    'video/x-flv', 'video/webm', 'video/x-matroska'
  ];
  
  if (!validMimeTypes.includes(file.type)) {
    // Check by extension as fallback
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'webm', 'mpeg', 'mpg'];
    
    if (!ext || !validExtensions.includes(ext)) {
      return {
        isValid: false,
        mimeType: file.type,
        error: `Unsupported file type: ${file.type || 'unknown'}. Please use video files.`
      };
    }
  }
  
  return { isValid: true, mimeType: file.type };
};

// Use in component
const handleFileSelect = (file: File) => {
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    setError(validation.error);
    return;
  }
  // Proceed with processing
};
```

---

## High Priority Issues

### 6. Inadequate Error Handling

**Location**: `src/lib/ffmpegService.ts`, `src/hooks/useConversion.ts`, `src/hooks/useBatchConversion.ts`

**Issue**: Error handling is inconsistent and incomplete:
- Generic error messages without context
- No error categorization (network, file format, memory, etc.)
- Missing user-actionable guidance
- No retry mechanisms for transient failures
- Errors silently caught in some promise chains

**Impact**: Poor user experience, difficult troubleshooting, and inability to recover from transient failures.

**Remediation**:

```typescript
// src/lib/errors.ts
export enum ConversionErrorType {
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FFMPEG_LOAD_ERROR = 'FFMPEG_LOAD_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  INVALID_FILE = 'INVALID_FILE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ConversionError extends Error {
  constructor(
    public type: ConversionErrorType,
    public message: string,
    public userMessage: string,
    public canRetry: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

// Error factory
export const createConversionError = (error: unknown): ConversionError => {
  if (error instanceof ConversionError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('out of memory') || lowerMessage.includes('quota')) {
    return new ConversionError(
      ConversionErrorType.MEMORY_ERROR,
      errorMessage,
      'Not enough memory available. Try closing other tabs or processing a smaller file.',
      false,
      error
    );
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return new ConversionError(
      ConversionErrorType.NETWORK_ERROR,
      errorMessage,
      'Network error occurred. Please check your connection and try again.',
      true,
      error
    );
  }

  if (lowerMessage.includes('unsupported') || lowerMessage.includes('invalid')) {
    return new ConversionError(
      ConversionErrorType.UNSUPPORTED_FORMAT,
      errorMessage,
      'This file format is not supported. Please try a different file.',
      false,
      error
    );
  }

  return new ConversionError(
    ConversionErrorType.UNKNOWN_ERROR,
    errorMessage,
    'An unexpected error occurred. Please try again.',
    true,
    error
  );
};

// Add retry logic
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const conversionError = createConversionError(error);
      
      if (!conversionError.canRetry || attempt === maxAttempts) {
        throw conversionError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw createConversionError(lastError);
};
```

### 7. Performance: Unnecessary Re-renders

**Location**: Multiple components

**Issue**: Several components have optimization issues:
- `ConversionProgress` receives entire objects as props that change references unnecessarily
- No memoization of callback functions passed to child components
- `useBatchConversion` recreates handlers on every render
- Missing dependency arrays or overly broad dependencies in effects

**Impact**: Excessive re-renders degrading performance, especially during batch processing.

**Remediation**:

```typescript
// src/hooks/useConversion.ts
export const useConversion = () => {
  // Memoize callbacks
  const handleConvert = useCallback(async (file: File, format: AudioFormat) => {
    try {
      setStatus('processing');
      const result = await ffmpegService.convertVideo(file, format, setProgress);
      return result;
    } catch (error) {
      throw createConversionError(error);
    }
  }, []);

  const handleProbe = useCallback(async (file: File) => {
    try {
      setMetadataLoading(true);
      const metadata = await ffmpegService.probeFile(file);
      setMetadata(metadata);
    } catch (error) {
      console.error('Probe failed:', error);
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  const resetConversion = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setCurrentFile(null);
    setMetadata(null);
  }, []);

  return {
    handleConvert,
    handleProbe,
    resetConversion,
    status,
    progress,
    metadata,
  };
};

// In components, use stable references
const ConversionPage = () => {
  const { handleConvert, handleProbe, resetConversion } = useConversion();
  
  // Memoize format selection to prevent unnecessary rerenders
  const handleFormatSelect = useCallback((format: AudioFormat) => {
    setSelectedFormat(format);
  }, []);

  return (
    <ConversionProgress
      onExtract={handleConvert}
      onProbe={handleProbe}
      onReset={resetConversion}
      onFormatChange={handleFormatSelect}
      // ... other props
    />
  );
};
```

### 8. Security: Content Security Policy Violations

**Location**: `vite.config.ts` (lines 84-88, 99-103)

**Issue**: The CSP configuration contains several security concerns:
- `unsafe-inline` for scripts defeats the purpose of CSP
- Missing nonce-based approach for inline scripts
- `wasm-unsafe-eval` necessary for FFmpeg but not documented as security risk
- No report-uri configured for CSP violations

**Impact**: Increased XSS attack surface, inability to detect CSP violations.

**Remediation**:

```typescript
// Generate nonce for each request
const generateNonce = () => {
  return crypto.randomBytes(16).toString('base64');
};

// Update CSP to use nonce
const nonce = generateNonce();

server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' blob: https://va.vercel-scripts.com`,
      "style-src 'self' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "connect-src 'self' blob: https://va.vercel-scripts.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report", // Add CSP violation reporting
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  },
},

// Add CSP documentation comment
/*
 * SECURITY NOTE: 'wasm-unsafe-eval' is required for FFmpeg WebAssembly execution.
 * This is a necessary trade-off for client-side video processing.
 * All WASM modules are loaded from trusted sources only.
 */
```

### 9. Missing Accessibility Features

**Location**: All interactive components

**Issue**: The codebase lacks comprehensive accessibility features:
- No ARIA labels on interactive elements
- Missing keyboard navigation support
- No screen reader announcements for dynamic content changes
- Progress indicators lack accessible text
- File upload has no accessible error announcements

**Impact**: Application is unusable for users relying on assistive technologies, violating WCAG guidelines.

**Remediation**:

```typescript
// src/components/converter/ConversionProgress.tsx
export const ConversionProgress = React.memo(({ ... }: ConversionProgressProps) => {
  // Add live region for screen readers
  const [announcement, setAnnouncement] = React.useState('');

  React.useEffect(() => {
    if (status === 'processing') {
      setAnnouncement(`Processing: ${progress}% complete`);
    } else if (status === 'ready') {
      setAnnouncement('File ready for conversion');
    }
  }, [status, progress]);

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <motion.div 
        role="region"
        aria-label="File conversion controls"
        // ... existing props
      >
        {/* Format selection with proper labels */}
        <fieldset className="space-y-4">
          <legend className="text-[10px] font-bold text-secondary uppercase tracking-widest">
            Select Format
          </legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'original'] as AudioFormat[]).map((fmt) => (
              <button
                key={fmt}
                role="radio"
                aria-checked={selectedFormat === fmt}
                aria-label={`Convert to ${fmt === 'original' ? 'original format' : fmt.toUpperCase()}`}
                onClick={() => setSelectedFormat(fmt)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedFormat(fmt);
                  }
                }}
                tabIndex={selectedFormat === fmt ? 0 : -1}
                // ... existing className
              >
                {fmt === 'original' ? 'Original' : fmt}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Progress bar with accessible label */}
        {status === 'processing' && (
          <div 
            role="progressbar" 
            aria-valuenow={progress} 
            aria-valuemin={0} 
            aria-valuemax={100}
            aria-label={`Conversion progress: ${progress}%`}
          >
            {/* ... existing progress bar */}
          </div>
        )}

        {/* Buttons with proper labels */}
        <Button
          aria-label={status === 'reading' ? 'Loading file' : `Extract audio as ${selectedFormat.toUpperCase()}`}
          aria-busy={status === 'reading' || status === 'processing'}
          // ... existing props
        >
          {/* ... existing content */}
        </Button>
      </motion.div>
    </>
  );
});
```

### 10. Inconsistent State Management

**Location**: Multiple hooks and components

**Issue**: State management patterns are inconsistent across the application:
- Some components use local state for shared concerns
- No centralized state for global application state (FFmpeg loading status, errors)
- Duplicate state between components
- No single source of truth for conversion queue state

**Impact**: State synchronization bugs, difficult debugging, and potential race conditions.

**Remediation**:

```typescript
// src/store/conversionStore.ts - Using Zustand for cleaner state management
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ConversionState {
  // FFmpeg state
  isFFmpegLoaded: boolean;
  ffmpegLoadError: string | null;
  
  // Conversion queue
  queue: ConversionItem[];
  activeConversions: number;
  maxConcurrency: number;
  
  // Actions
  setFFmpegLoaded: (loaded: boolean) => void;
  setFFmpegLoadError: (error: string | null) => void;
  addToQueue: (item: ConversionItem) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<ConversionItem>) => void;
  clearQueue: () => void;
  setMaxConcurrency: (n: number) => void;
}

export const useConversionStore = create<ConversionState>()(
  devtools(
    persist(
      (set) => ({
        isFFmpegLoaded: false,
        ffmpegLoadError: null,
        queue: [],
        activeConversions: 0,
        maxConcurrency: 3,

        setFFmpegLoaded: (loaded) => set({ isFFmpegLoaded: loaded }),
        setFFmpegLoadError: (error) => set({ ffmpegLoadError: error }),

        addToQueue: (item) => 
          set((state) => ({ queue: [...state.queue, item] })),

        removeFromQueue: (id) =>
          set((state) => ({ queue: state.queue.filter((i) => i.id !== id) })),

        updateQueueItem: (id, updates) =>
          set((state) => ({
            queue: state.queue.map((i) =>
              i.id === id ? { ...i, ...updates } : i
            ),
          })),

        clearQueue: () => set({ queue: [] }),

        setMaxConcurrency: (n) => set({ maxConcurrency: n }),
      }),
      {
        name: 'conversion-storage',
        partialize: (state) => ({ maxConcurrency: state.maxConcurrency }),
      }
    )
  )
);
```

---

## Medium Priority Issues

### 11. Missing Input Validation

**Location**: File upload handlers, format selection

**Issue**: No validation for:
- Maximum file size limits
- File name length restrictions
- Special characters in filenames
- Duplicate files in batch queue

**Remediation**:

```typescript
// src/lib/validation.ts
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const MAX_FILENAME_LENGTH = 255;

export interface FileValidation {
  isValid: boolean;
  errors: string[];
}

export const validateFile = (file: File, existingFiles: File[] = []): FileValidation => {
  const errors: string[] = [];

  // Size validation
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File exceeds maximum size of ${formatBytes(MAX_FILE_SIZE)}`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Filename validation
  if (file.name.length > MAX_FILENAME_LENGTH) {
    errors.push(`Filename exceeds maximum length of ${MAX_FILENAME_LENGTH} characters`);
  }

  const dangerousChars = /[<>:"|?*\x00-\x1f]/g;
  if (dangerousChars.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }

  // Duplicate check
  if (existingFiles.some(f => f.name === file.name && f.size === file.size)) {
    errors.push('File already in queue');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

### 12. Hardcoded Configuration Values

**Location**: Multiple files

**Issue**: Configuration values are scattered throughout the codebase:
- CDN URLs hardcoded in `ffmpegService.ts`
- Magic numbers in components (chunk sizes, limits)
- No environment-based configuration

**Remediation**:

```typescript
// src/config/app.config.ts
export const config = {
  ffmpeg: {
    baseURL: import.meta.env.VITE_FFMPEG_CDN || 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm',
    version: '0.12.6',
  },
  conversion: {
    maxConcurrency: 3,
    maxFileSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
    supportedFormats: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'original'] as const,
    defaultFormat: 'mp3' as const,
  },
  ui: {
    maxFileNameDisplay: 50,
    progressUpdateThrottle: 100, // ms
    toastDuration: 5000, // ms
  },
  security: {
    allowedOrigins: import.meta.env.VITE_ALLOWED_ORIGINS?.split(',') || [],
  },
} as const;

// Type-safe access
export type AudioFormat = typeof config.conversion.supportedFormats[number];
```

### 13. Insufficient Logging

**Location**: Application-wide

**Issue**: Minimal logging throughout the application:
- No structured logging
- Console.logs in production
- No performance metrics
- No user action tracking for debugging

**Remediation**:

```typescript
// src/lib/logger.ts
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    if (level < this.level) return;

    const logContext: LogContext = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
      error,
    };

    // In production, send to logging service
    if (!this.isDevelopment) {
      this.sendToLoggingService(logContext);
    }

    // Console output in development
    if (this.isDevelopment) {
      const logFn = level === LogLevel.ERROR ? console.error : 
                    level === LogLevel.WARN ? console.warn : console.log;
      logFn(`[${logContext.level}] ${message}`, context || '', error || '');
    }
  }

  private sendToLoggingService(log: LogContext) {
    // Implement your logging service integration
    // Example: Sentry, LogRocket, etc.
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

export const logger = new Logger();
```

### 14. No Testing Infrastructure

**Location**: `vitest.config.ts` configuration exists but no tests found

**Issue**: Testing configuration is present but no actual tests are implemented. This indicates:
- No unit tests for critical conversion logic
- No integration tests for FFmpeg service
- No component tests
- No end-to-end tests

**Remediation**:

```typescript
// tests/lib/ffmpegService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FFmpegService } from '../../src/lib/ffmpegService';

describe('FFmpegService', () => {
  let service: FFmpegService;

  beforeEach(() => {
    service = new FFmpegService();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('load', () => {
    it('should load FFmpeg only once', async () => {
      await service.load();
      const loaded1 = service.isLoaded();
      
      await service.load();
      const loaded2 = service.isLoaded();
      
      expect(loaded1).toBe(true);
      expect(loaded2).toBe(true);
    });

    it('should handle concurrent load attempts', async () => {
      const loads = [
        service.load(),
        service.load(),
        service.load(),
      ];

      await Promise.all(loads);
      expect(service.isLoaded()).toBe(true);
    });
  });

  describe('convertVideo', () => {
    it('should reject files larger than maximum size', async () => {
      const largeFile = new File(['x'.repeat(3 * 1024 * 1024 * 1024)], 'large.mp4');
      
      await expect(
        service.convertVideo(largeFile, 'mp3', () => {})
      ).rejects.toThrow('File too large');
    });

    it('should call progress callback during conversion', async () => {
      const file = new File(['dummy'], 'test.mp4', { type: 'video/mp4' });
      const progressCallback = vi.fn();

      await service.convertVideo(file, 'mp3', progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});

// tests/components/ConversionProgress.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversionProgress } from '../../src/components/converter/ConversionProgress';

describe('ConversionProgress', () => {
  const defaultProps = {
    status: 'ready' as const,
    fileName: 'test.mp4',
    fileSize: 1024 * 1024,
    progress: 0,
    selectedFormat: 'mp3' as const,
    setSelectedFormat: vi.fn(),
    onExtract: vi.fn(),
    onReset: vi.fn(),
    onProbe: vi.fn(),
    isMetadataLoading: false,
  };

  it('should render file information', () => {
    render(<ConversionProgress {...defaultProps} />);
    
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();
  });

  it('should call onExtract when extract button is clicked', () => {
    render(<ConversionProgress {...defaultProps} />);
    
    const extractButton = screen.getByRole('button', { name: /extract/i });
    fireEvent.click(extractButton);
    
    expect(defaultProps.onExtract).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons during processing', () => {
    render(<ConversionProgress {...defaultProps} status="processing" />);
    
    const extractButton = screen.getByRole('button', { name: /extract/i });
    expect(extractButton).toBeDisabled();
  });
});
```

### 15. PWA Configuration Issues

**Location**: `vite.config.ts` (lines 21-45)

**Issue**: PWA configuration has several problems:
- Workbox mode set to 'development' in production builds
- No offline fallback page
- No skip waiting prompt implementation
- Large cache size (35MB) without cache expiration strategy

**Remediation**:

```typescript
VitePWA({
  registerType: 'prompt',
  includeAssets: ['favicon.svg', 'core/ffmpeg-core.js', 'core/ffmpeg-core.wasm'],
  manifest: {
    name: 'Rōkaru',
    short_name: 'Rōkaru',
    description: 'Privacy-first video to audio converter with client-side processing.',
    theme_color: '#000000',
    background_color: '#000000',
    display: 'standalone',
    start_url: '/',
    icons: [
      {
        src: 'favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      },
      {
        src: 'favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ]
  },
  workbox: {
    mode: mode === 'production' ? 'production' : 'development',
    globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
    maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/unpkg\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'ffmpeg-cdn-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api/],
  },
  devOptions: {
    enabled: mode === 'development',
    type: 'module',
  },
})
```

---

## Code Organization and Architecture Issues

### 16. Missing Separation of Concerns

**Issue**: Business logic, UI logic, and side effects are mixed throughout components. For example:
- File conversion logic embedded directly in components
- FFmpeg service contains both low-level FFmpeg operations and high-level business logic
- No clear domain layer separation

**Remediation**:

Restructure into clear layers:

```
src/
├── domain/              # Business logic layer
│   ├── conversion/
│   │   ├── ConversionService.ts
│   │   ├── ConversionQueue.ts
│   │   └── types.ts
│   └── metadata/
│       └── MetadataService.ts
├── infrastructure/      # External dependencies
│   ├── ffmpeg/
│   │   ├── FFmpegAdapter.ts
│   │   └── FFmpegLoader.ts
│   └── storage/
│       └── BlobStorage.ts
├── application/         # Use cases
│   ├── convertFile.ts
│   ├── batchConvert.ts
│   └── probeMetadata.ts
├── presentation/        # UI layer
│   ├── components/
│   ├── hooks/
│   └── pages/
└── shared/             # Shared utilities
    ├── errors/
    ├── validation/
    └── utils/
```

### 17. Lack of Dependency Injection

**Issue**: Direct instantiation of services creates tight coupling and makes testing difficult. For example, components directly import and use `ffmpegService` singleton.

**Remediation**:

```typescript
// src/providers/ServiceProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { FFmpegService } from '../infrastructure/ffmpeg/FFmpegAdapter';
import { ConversionService } from '../domain/conversion/ConversionService';
import { MetadataService } from '../domain/metadata/MetadataService';

interface Services {
  ffmpegService: FFmpegService;
  conversionService: ConversionService;
  metadataService: MetadataService;
}

const ServiceContext = createContext<Services | null>(null);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const services = useMemo(() => {
    const ffmpegService = new FFmpegService();
    const metadataService = new MetadataService(ffmpegService);
    const conversionService = new ConversionService(ffmpegService, metadataService);

    return {
      ffmpegService,
      conversionService,
      metadataService,
    };
  }, []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within ServiceProvider');
  }
  return context;
};

// Usage in components
const ConversionPage = () => {
  const { conversionService } = useServices();
  // Use conversionService instead of directly imported singleton
};
```

---

## Performance Optimization Recommendations

### 18. Implement Code Splitting

**Current State**: All code is bundled together, increasing initial load time.

**Recommendation**:

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const ConversionPage = lazy(() => import('./pages/ConversionPage'));
const BatchPage = lazy(() => import('./pages/BatchPage'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<ConversionPage />} />
        <Route path="/batch" element={<BatchPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 19. Optimize Bundle Size

**Issue**: Large dependencies loaded unnecessarily.

**Recommendations**:

```typescript
// Replace lucide-react with selective imports
// Instead of: import { FileAudio, Info, X } from 'lucide-react';
// Use tree-shakeable imports if available, or consider using SVG files directly

// Analyze bundle with existing visualizer plugin
// Run: npm run build
// Check: dist/stats.html for large dependencies

// Consider alternatives:
// - Replace framer-motion with lighter animation library for simple animations
// - Use native CSS animations where possible
// - Lazy load heavy dependencies only when needed
```

### 20. Implement Virtual Scrolling for Batch Queue

**Issue**: Rendering hundreds of batch items will cause performance degradation.

**Recommendation**:

```typescript
// Install react-virtual
// npm install @tanstack/react-virtual

// src/components/batch/BatchQueue.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const BatchQueue = ({ items }: { items: ConversionItem[] }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated item height
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <BatchItem item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Implementation Priority and Roadmap

### Phase 1: Critical Stability (Week 1-2)

1. Implement Error Boundaries
2. Fix memory leaks in FFmpegService
3. Fix race condition in FFmpeg loading
4. Implement proper concurrency limiting in batch processing
5. Add comprehensive error handling with user-friendly messages

### Phase 2: Security and Type Safety (Week 3-4)

1. Add runtime type validation
2. Implement file validation
3. Fix CSP security issues
4. Remove all `any` types
5. Add input sanitization

### Phase 3: Testing and Quality (Week 5-6)

1. Implement unit tests for core services
2. Add integration tests
3. Add component tests
4. Set up CI/CD with test coverage requirements
5. Add E2E tests for critical paths

### Phase 4: Performance and UX (Week 7-8)

1. Implement code splitting
2. Add performance monitoring
3. Optimize re-renders with proper memoization
4. Implement virtual scrolling
5. Add accessibility features
6. Implement structured logging

### Phase 5: Architecture Refactoring (Week 9-10)

1. Separate concerns into domain/infrastructure/application layers
2. Implement dependency injection
3. Centralize state management
4. Extract configuration
5. Document architecture decisions

---

## Specific Instructions for LLM Code Fixer

### Priority Order for Fixes

Execute fixes in the following order to minimize breaking changes and ensure stability:

1. **Start with Error Boundaries**: Wrap the application first to catch any errors introduced during refactoring.

2. **Fix Memory Leaks**: Address FFmpegService cleanup issues before tackling other service-level changes.

3. **Implement Type Safety**: Remove all `any` types and add proper interfaces before refactoring logic.

4. **Add Error Handling**: Implement comprehensive error handling system before changing business logic.

5. **Fix Concurrency Issues**: Correct the batch processing concurrency before optimizing performance.

6. **Refactor State Management**: Centralize state after fixing individual component issues.

7. **Add Testing**: Write tests progressively as you fix each module.

8. **Optimize Performance**: Only after stability is achieved, focus on performance optimizations.

### Code Style Guidelines

When fixing code, adhere to these standards:

```typescript
// Use explicit return types
function processFile(file: File): Promise<ConversionResult> {
  // Implementation
}

// Use const for immutable references
const result = await convert(file);

// Prefer async/await over promises
// Bad:
return ffmpeg.load().then(() => ffmpeg.convert());

// Good:
await ffmpeg.load();
return await ffmpeg.convert();

// Use optional chaining and nullish coalescing
const size = file?.size ?? 0;

// Avoid nested ternaries
// Bad:
const status = isLoading ? 'loading' : hasError ? 'error' : 'idle';

// Good:
let status = 'idle';
if (isLoading) status = 'loading';
else if (hasError) status = 'error';

// Use descriptive variable names
// Bad:
const x = await conv(f);

// Good:
const conversionResult = await convertFile(inputFile);
```

### Testing Requirements

Every new function and component must have corresponding tests:

```typescript
// For each service method:
describe('ServiceName.methodName', () => {
  it('should handle success case', () => {});
  it('should handle error case', () => {});
  it('should validate inputs', () => {});
  it('should clean up resources', () => {});
});

// For each React component:
describe('ComponentName', () => {
  it('should render correctly', () => {});
  it('should handle user interactions', () => {});
  it('should update on prop changes', () => {});
  it('should be accessible', () => {});
});
```

### Documentation Requirements

Add JSDoc comments to all public APIs:

```typescript
/**
 * Converts a video file to the specified audio format.
 * 
 * @param file - The input video file to convert
 * @param format - Target audio format (mp3, wav, ogg, flac, m4a, or original)
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise resolving to conversion result with output URL and metadata
 * @throws {ConversionError} If file is invalid, too large, or conversion fails
 * 
 * @example
 * ```typescript
 * const result = await convertFile(
 *   videoFile, 
 *   'mp3',
 *   (progress) => console.log(`${progress}% complete`)
 * );
 * console.log(`Output size: ${result.size} bytes`);
 * ```
 */
export async function convertFile(
  file: File,
  format: AudioFormat,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  // Implementation
}
```

### Git Commit Strategy

Structure commits logically:

```
fix(ffmpeg): prevent memory leaks in blob URL creation

- Add blobUrls Set to track created URLs
- Implement cleanup method to revoke all URLs
- Call cleanup in finally block of convertVideo
- Add tests for cleanup behavior

Closes #123
```

### Validation Checklist

Before considering a fix complete, verify:

- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass
- [ ] New tests added for changed code
- [ ] No new ESLint warnings
- [ ] Bundle size has not increased significantly
- [ ] Performance has not degraded
- [ ] Accessibility has been maintained or improved
- [ ] Documentation updated
- [ ] Error messages are user-friendly
- [ ] Console warnings removed from production build

---

## Conclusion

This codebase requires significant refactoring to achieve production-grade quality. The most critical issues are memory leaks, race conditions, missing error boundaries, and inadequate error handling. These must be addressed before any performance optimizations or feature additions.

The recommended approach is to execute fixes in phases, starting with stability and safety, then moving to performance and architecture improvements. Each phase should include comprehensive testing to prevent regressions.

Estimated effort: 8-10 weeks for complete remediation with a team of 2-3 developers.

Priority areas requiring immediate attention:
1. Memory leak fixes
2. Error boundary implementation
3. Race condition resolution
4. Comprehensive error handling
5. Type safety improvements
