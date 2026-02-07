import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ConversionTask, AudioFormat, AppStatus, LogEntry } from '../types';
import { validateFileSize } from '../lib/validation';

/**
 * Context type defining the global state and actions for file conversion.
 */
interface FileConversionContextType {
  /** List of all conversion tasks currently in the application. */
  tasks: ConversionTask[];
  
  /** 
   * Adds a new file to the conversion queue.
   * Performs initial validation and creates a ConversionTask object.
   * @param {File} file - The video/audio file selected by the user.
   */
  addTask: (file: File) => void;
  
  /**
   * Removes a task and cleans up associated resources.
   * @param {string} id - The unique ID of the task to remove.
   */
  removeTask: (id: string) => void;
  
  /**
   * Updates specific fields of a conversion task.
   * @param {string} id - The task ID.
   * @param {Partial<ConversionTask>} updates - The fields to update.
   */
  updateTask: (id: string, updates: Partial<ConversionTask>) => void;
  
  /** The ID of the currently selected/active task in the UI. */
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  
  /** Overall application status (init, idle, processing, error). */
  globalStatus: AppStatus;
  setGlobalStatus: (status: AppStatus) => void;
  
  /** Progress of the global engine loading state (0-100). */
  globalLoadProgress: number;
  setGlobalLoadProgress: (progress: number) => void;
  
  /** The user's preferred output format (persisted in localStorage). */
  defaultFormat: AudioFormat;
  setDefaultFormat: (format: AudioFormat) => void;
  
  /** Maximum number of concurrent FFmpeg operations (persisted in localStorage). */
  maxConcurrency: number;
  setMaxConcurrency: (n: number) => void;
  
  /** Unified log of all operations across all tasks. */
  globalLogs: LogEntry[];
  
  /**
   * Appends a log message to a specific task and the global log.
   * @param {string} taskId - The ID of the task originating the log.
   * @param {string} message - The log message text.
   */
  addLog: (taskId: string, message: string) => void;
  
  /** Clears all global logs. */
  clearLogs: () => void;
}

const FileConversionContext = createContext<FileConversionContextType | undefined>(undefined);

/**
 * Provider component that manages the global state of the application.
 * Handles task orchestration, concurrency limits, and persistence of user settings.
 * 
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - The child components to be wrapped.
 * 
 * @updated 2026-02-07: Added centralized queue management and persistent settings.
 */
export function FileConversionProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<ConversionTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [globalStatus, setGlobalStatus] = useState<AppStatus>('init');
  const [globalLoadProgress, setGlobalLoadProgress] = useState(0);
  const [globalLogs, setGlobalLogs] = useState<LogEntry[]>([]);
  
  const [maxConcurrency, setMaxConcurrency] = useState(
    parseInt(localStorage.getItem('maxConcurrency') || '3')
  );
  const [defaultFormat, setDefaultFormat] = useState<AudioFormat>(
    (localStorage.getItem('defaultFormat') as AudioFormat) || 'mp3'
  );

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('maxConcurrency', maxConcurrency.toString());
  }, [maxConcurrency]);

  useEffect(() => {
    localStorage.setItem('defaultFormat', defaultFormat);
  }, [defaultFormat]);

  // Update existing ready tasks when default format changes
  useEffect(() => {
    setTasks(prev => prev.map(t => 
      t.status === 'ready' ? { ...t, selectedFormat: defaultFormat } : t
    ));
  }, [defaultFormat]);

  /**
   * Centralized Queue Management.
   * Monitors the task list and automatically transitions 'queued' tasks
   * to 'processing' when concurrency slots become available.
   */
  useEffect(() => {
    const processingCount = tasks.filter(t => t.status === 'processing').length;
    const queuedTasks = tasks.filter(t => t.status === 'queued');

    if (processingCount < maxConcurrency && queuedTasks.length > 0) {
      // Find the first queued task
      const nextTask = queuedTasks[0];
      // Trigger it
      setTasks(prev => prev.map(t => 
        t.id === nextTask.id ? { ...t, status: 'processing', triggerExtract: true } : t
      ));
    }
  }, [tasks, maxConcurrency]);

  // --- App Initialization ---
  useEffect(() => {
    if (globalStatus !== 'init') return;
    
    const init = async () => {
      try {
        if (!window.isSecureContext) {
          throw new Error('Secure context required');
        }
        // Simulate loading for UI smoothness
        for (let i = 0; i <= 100; i += 20) {
          setGlobalLoadProgress(i);
          await new Promise(r => setTimeout(r, 100));
        }
        setGlobalStatus('idle');
      } catch (e) {
        setGlobalStatus('error');
      }
    };
    init();
  }, [globalStatus]);

  /**
   * Adds a new task to the list after validating file size.
   */
  const addTask = useCallback((file: File) => {
    const validation = validateFileSize(file);
    
    if (!validation.valid) {
      // In a real app, we'd use a toast or error display hook
      alert(validation.error);
      return;
    }

    const id = Math.random().toString(36).substring(7);
    const newTask: ConversionTask = {
      id,
      file,
      status: 'reading',
      progress: 0,
      logs: [],
      fileName: file.name,
      fileSize: file.size,
      outputUrl: null,
      outputExt: 'mp3',
      selectedFormat: defaultFormat,
      metadata: null,
      errorMessage: null,
      loadProgress: 0,
      isMetadataLoading: false,
      showMetadata: false,
      manuallySelected: false,
    };
    setTasks(prev => [...prev, newTask]);
    setActiveTaskId(prev => prev ? prev : id);
    setGlobalStatus('processing');
  }, [defaultFormat]);

  /**
   * Removes a task and adjusts the active task ID if necessary.
   */
  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== taskId);
      if (filtered.length === 0) {
        setGlobalStatus('idle');
        setActiveTaskId(null);
      } else if (activeTaskId === taskId) {
        setActiveTaskId(filtered[0]?.id || null);
      }
      return filtered;
    });
  }, [activeTaskId]);

  /**
   * Functional state update for tasks to ensure atomicity.
   */
  const updateTask = useCallback((taskId: string, updates: Partial<ConversionTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  }, []);

  /**
   * Appends a log entry with a timestamp.
   * Limits logs to the last 200 (task) and 500 (global) entries to prevent memory leaks.
   */
  const addLog = useCallback((taskId: string, message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;

      const logMsg = `[${timestamp}] ${message}`;
      const entry: LogEntry = {
        timestamp,
        message,
        taskId,
        fileName: task.fileName
      };

      setGlobalLogs(g => [...g.slice(-499), entry]);

      return prev.map(t => 
        t.id === taskId ? { ...t, logs: [...t.logs.slice(-199), logMsg] } : t
      );
    });
  }, []);

  const clearLogs = useCallback(() => {
    setGlobalLogs([]);
  }, []);

  return (
    <FileConversionContext.Provider value={{
      tasks,
      addTask,
      removeTask,
      updateTask,
      activeTaskId,
      setActiveTaskId,
      globalStatus,
      setGlobalStatus,
      globalLoadProgress,
      setGlobalLoadProgress,
      defaultFormat,
      setDefaultFormat,
      maxConcurrency,
      setMaxConcurrency,
      globalLogs,
      addLog,
      clearLogs
    }}>
      {children}
    </FileConversionContext.Provider>
  );
}

/**
 * Hook to access the file conversion context.
 * @returns {FileConversionContextType} The context value.
 * @throws {Error} If used outside of a FileConversionProvider.
 */
export function useFileConversion() {
  const context = useContext(FileConversionContext);
  if (context === undefined) {
    throw new Error('useFileConversion must be used within a FileConversionProvider');
  }
  return context;
}