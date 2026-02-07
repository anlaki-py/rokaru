import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationError, handleError, safeAsync } from '../src/lib/errors';
import { logger } from '../src/lib/logger';

vi.mock('../src/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ApplicationError', () => {
  it('should create an error with a random id', () => {
    const error = new ApplicationError('Test message', 'TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.id).toBeDefined();
    expect(error.id.length).toBeGreaterThan(5);
  });
});

describe('handleError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return ApplicationError as-is', () => {
    const original = new ApplicationError('Already app error', 'CODE');
    const result = handleError(original, 'test');
    expect(result).toBe(original);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should wrap Error into ApplicationError and log it', () => {
    const error = new Error('Normal error');
    const result = handleError(error, 'test-context');
    
    expect(result).toBeInstanceOf(ApplicationError);
    expect(result.message).toBe('Normal error');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in test-context'), expect.any(Object));
  });

  it('should handle non-error objects', () => {
    const result = handleError('just a string', 'context');
    expect(result.message).toBe('An unexpected error occurred');
    expect(result.recoverable).toBe(false);
  });
});

describe('safeAsync', () => {
  it('should return data on success', async () => {
    const fn = async () => 'success';
    const { data, error } = await safeAsync(fn, 'context');
    
    expect(data).toBe('success');
    expect(error).toBeNull();
  });

  it('should return handled error on failure', async () => {
    const fn = async () => { throw new Error('fail'); };
    const { data, error } = await safeAsync(fn, 'context');
    
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error?.message).toBe('fail');
  });
});
