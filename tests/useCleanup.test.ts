import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCleanup } from '../src/hooks/useCleanup';

describe('useCleanup', () => {
  it('should create and register blob URLs', () => {
    const { result } = renderHook(() => useCleanup());
    const blob = new Blob(['test'], { type: 'text/plain' });
    
    const url = result.current.createBlobUrl(blob);
    
    expect(url).toBe('mock-url');
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('should revoke a specific blob URL', () => {
    const { result } = renderHook(() => useCleanup());
    const blob = new Blob(['test'], { type: 'text/plain' });
    const url = result.current.createBlobUrl(blob);
    
    result.current.revokeBlobUrl(url);
    
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('should clean up all registered URLs on unmount', () => {
    const { result, unmount } = renderHook(() => useCleanup());
    const blob = new Blob(['test'], { type: 'text/plain' });
    
    result.current.createBlobUrl(blob);
    result.current.createBlobUrl(blob);
    
    unmount();
    
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
