import { logger } from './logger';

/**
 * Base class for application-specific errors.
 * Provides a unique ID for error tracking and metadata for recovery strategies.
 * 
 * @param {string} message - Human-readable error message.
 * @param {string} code - Machine-readable error code (e.g., 'FFMPEG_ERROR').
 * @param {boolean} [recoverable=true] - Whether the application can attempt to recover/retry.
 * @param {Error} [originalError] - The underlying error that triggered this one.
 */
export class ApplicationError extends Error {
  public id: string;

  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.id = Math.random().toString(36).substring(2, 11);
  }
}

/**
 * Specialized error for FFmpeg engine failures.
 * Used for loading timeouts, execution errors, or WASM crashes.
 * 
 * @extends ApplicationError
 */
export class FFmpegError extends ApplicationError {
  constructor(message: string, originalError?: Error) {
    super(message, 'FFMPEG_ERROR', true, originalError);
    this.name = 'FFmpegError';
  }
}

/**
 * Specialized error for file system or OPFS operations.
 * Triggered when reading input files or saving output blobs fails.
 * 
 * @extends ApplicationError
 */
export class FileReadError extends ApplicationError {
  constructor(message: string, originalError?: Error) {
    super(message, 'FILE_READ_ERROR', true, originalError);
    this.name = 'FileReadError';
  }
}

/**
 * Global error handler that normalizes various error types into ApplicationError.
 * Logs the error details and provides a consistent interface for UI feedback.
 * 
 * @param {unknown} error - The caught error object.
 * @param {string} context - A description of where the error occurred (e.g., 'FFmpeg Load').
 * @returns {ApplicationError} A normalized application error instance.
 * 
 * @updated 2026-02-07: Added enhanced logging with context metadata.
 */
export function handleError(error: unknown, context: string): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }
  
  if (error instanceof Error) {
    logger.error(`Error in ${context}: ${error.message}`, {
      stack: error.stack,
      context
    });
    
    return new ApplicationError(
      error.message,
      'UNKNOWN_ERROR',
      true,
      error
    );
  }
  
  logger.error(`Unknown error in ${context}`, { error, context });
  return new ApplicationError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    false
  );
}

/**
 * A utility wrapper for async operations that returns a tuple of [data, error].
 * This pattern simplifies error handling in components by avoiding deeply nested try-catch blocks.
 * 
 * @template T - The expected return type of the operation.
 * @param {() => Promise<T>} fn - The async function to execute.
 * @param {string} context - Context for error reporting.
 * @returns {Promise<{ data: T | null; error: ApplicationError | null }>} Result/Error object.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string
): Promise<{ data: T | null; error: ApplicationError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: handleError(error, context) };
  }
}
