import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../src/lib/logger';

describe('Logger', () => {
  const consoleSpy = {
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sanitize sensitive data', () => {
    const data = {
      filename: 'test.mp4',
      file: new File([], 'test.mp4'),
      password: 'secret_password',
      token: 'sensitive_token',
      nested: {
        key: 'secret_key'
      }
    };

    logger.info('Test log', data);

    const callArgs = consoleSpy.info.mock.calls[0];
    const sanitized = callArgs?.[1] as any;

    expect(sanitized.filename).toBe('test.mp4');
    expect(sanitized.file).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.nested.key).toBe('[REDACTED]');
  });

  it('should format logs with timestamp and level', () => {
    logger.error('Critical failure');
    
    const callArgs = consoleSpy.error.mock.calls[0];
    const message = callArgs?.[0] as string;
    
    expect(message).toMatch(/\[.*\] \[ERROR\] Critical failure/);
  });
});
