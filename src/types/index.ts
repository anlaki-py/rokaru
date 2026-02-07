export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'm4a' | 'original';

export type AppStatus = 'init' | 'idle' | 'reading' | 'ready' | 'queued' | 'processing' | 'done' | 'error';

export interface ConversionTask {
  id: string;
  file: File;
  status: AppStatus;
  progress: number;
  logs: string[];
  fileName: string;
  fileSize: number;
  outputUrl: string | null;
  outputExt: string;
  selectedFormat: AudioFormat;
  metadata: any;
  errorMessage: string | null;
  loadProgress: number;
  isMetadataLoading: boolean;
  showMetadata: boolean;
  triggerExtract?: boolean;
  triggerProbe?: boolean;
  manuallySelected?: boolean;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  taskId?: string;
  fileName?: string;
}
