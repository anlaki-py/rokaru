import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileConversionProvider, useFileConversion } from '../src/contexts/FileConversionContext';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.isSecureContext
Object.defineProperty(window, 'isSecureContext', {
  value: true,
  configurable: true
});

describe('FileConversionContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FileConversionProvider>{children}</FileConversionProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useFileConversion(), { wrapper });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.globalStatus).toBe('init');
    expect(result.current.maxConcurrency).toBe(3);
    expect(result.current.defaultFormat).toBe('mp3');
  });

  it('should add a task', () => {
    const { result } = renderHook(() => useFileConversion(), { wrapper });
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });

    act(() => {
      result.current.addTask(file);
    });

    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].fileName).toBe('test.mp4');
    expect(result.current.tasks[0].status).toBe('reading');
    expect(result.current.globalStatus).toBe('processing');
  });

  it('should remove a task', () => {
    const { result } = renderHook(() => useFileConversion(), { wrapper });
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });

    act(() => {
      result.current.addTask(file);
    });

    const taskId = result.current.tasks[0].id;

    act(() => {
      result.current.removeTask(taskId);
    });

    expect(result.current.tasks.length).toBe(0);
    expect(result.current.globalStatus).toBe('idle');
  });

  it('should update task settings and persist to localStorage', () => {
    const { result } = renderHook(() => useFileConversion(), { wrapper });

    act(() => {
      result.current.setMaxConcurrency(5);
      result.current.setDefaultFormat('wav');
    });

    expect(result.current.maxConcurrency).toBe(5);
    expect(result.current.defaultFormat).toBe('wav');
    expect(localStorage.getItem('maxConcurrency')).toBe('5');
    expect(localStorage.getItem('defaultFormat')).toBe('wav');
  });

  it('should add logs correctly', () => {
    const { result } = renderHook(() => useFileConversion(), { wrapper });
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });

    act(() => {
      result.current.addTask(file);
    });

    const taskId = result.current.tasks[0].id;

    act(() => {
      result.current.addLog(taskId, 'Starting conversion');
    });

    expect(result.current.globalLogs.length).toBe(1);
    expect(result.current.globalLogs[0].message).toBe('Starting conversion');
    expect(result.current.tasks[0].logs.length).toBe(1);
    expect(result.current.tasks[0].logs[0]).toContain('Starting conversion');
  });
});
