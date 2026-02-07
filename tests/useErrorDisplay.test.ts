import { renderHook, act } from '@testing-library/react';
import { useErrorDisplay } from '../src/hooks/useErrorDisplay';
import { ApplicationError } from '../src/lib/errors';
import { vi, describe, it, expect } from 'vitest';

describe('useErrorDisplay', () => {
  it('should initialize with null error', () => {
    const { result } = renderHook(() => useErrorDisplay());
    expect(result.current.error).toBeNull();
  });

  it('should set error when showError is called', () => {
    const { result } = renderHook(() => useErrorDisplay());
    const testError = new Error('Test error');
    
    act(() => {
      result.current.showError(testError, 'test-context');
    });
    
    expect(result.current.error).toBeInstanceOf(ApplicationError);
    expect(result.current.error?.message).toBe('Test error');
  });

  it('should clear error when clearError is called', () => {
    const { result } = renderHook(() => useErrorDisplay());
    
    act(() => {
      result.current.showError(new Error('Test error'), 'test-context');
    });
    
    expect(result.current.error).not.toBeNull();
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should auto-clear recoverable errors after timeout', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useErrorDisplay());
    
    act(() => {
      // ApplicationError by default is recoverable via handleError if not specified otherwise
      result.current.showError(new Error('Recoverable error'), 'test-context');
    });
    
    expect(result.current.error).not.toBeNull();
    
    act(() => {
      vi.advanceTimersByTime(8001);
    });
    
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });
});
