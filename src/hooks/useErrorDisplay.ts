import { useState, useCallback } from 'react';
import { ApplicationError, handleError } from '../lib/errors';

/**
 * Hook for managing and displaying application-level errors.
 * Useful for global errors like FFmpeg loading failures.
 */
export function useErrorDisplay() {
  const [error, setError] = useState<ApplicationError | null>(null);

  /**
   * Displays an error and optionally auto-clears it.
   */
  const showError = useCallback((err: unknown, context: string) => {
    const appError = handleError(err, context);
    setError(appError);
    
    // Auto-clear recoverable errors after 8 seconds
    if (appError.recoverable) {
      setTimeout(() => {
        setError(prev => prev?.id === appError.id ? null : prev);
      }, 8000);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { 
    error, 
    showError, 
    clearError 
  };
}
