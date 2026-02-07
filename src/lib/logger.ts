/**
 * Log levels supported by the application.
 */
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Standardized logging system that provides:
 * 1. Environment-aware logging (silences debug in production)
 * 2. Data sanitization to prevent sensitive info leakage
 * 3. Consistent formatting with timestamps
 */
class Logger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Internal log method that handles sanitization and level filtering.
   * 
   * @param {LogLevel} level - The severity level of the log.
   * @param {string} message - The main log message.
   * @param {unknown} [data] - Optional metadata to include in the log.
   */
  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.isDevelopment && level === LogLevel.DEBUG) return;
    
    const sanitized = this.sanitizeData(data);
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (sanitized !== undefined) {
      console[level](logMessage, sanitized);
    } else {
      console[level](logMessage);
    }
  }

  /**
   * Redacts sensitive fields and large binary objects from logs.
   * This is critical for privacy and preventing console performance issues.
   * 
   * @param {unknown} data - The data to sanitize.
   * @returns {unknown} The sanitized data object.
   * 
   * @updated 2026-02-07: Added recursive sanitization for nested objects.
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    
    // Create a copy to avoid mutating original data
    const sanitized = Array.isArray(data) 
      ? [...data] 
      : { ...data } as Record<string, unknown>;
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    const largeDataKeys = ['file', 'buffer', 'arraybuffer', 'blob'];
    
    if (!Array.isArray(sanitized)) {
      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        
        // Exact matches for large data containers
        if (largeDataKeys.includes(lowerKey)) {
          sanitized[key] = '[REDACTED]';
        } 
        // Partial matches for credentials
        else if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } 
        // Recursive sanitization for objects
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      });
    }
    
    return sanitized;
  }

  /**
   * Logs an error message and optional metadata.
   */
  error(message: string, data?: unknown) {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Logs a warning message and optional metadata.
   */
  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Logs an informational message and optional metadata.
   */
  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Logs a debug message and optional metadata. Only visible in development mode.
   */
  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }
}

export const logger = new Logger();
