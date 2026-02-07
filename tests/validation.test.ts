import { describe, it, expect, vi } from 'vitest';
import { 
  validateFileSize, 
  MAX_FILE_SIZE, 
  RECOMMENDED_MAX_SIZE, 
  sanitizeFileName,
  validateFileType 
} from '../src/lib/validation';

describe('validateFileSize', () => {
  it('should validate small files correctly', () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    
    const result = validateFileSize(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.warning).toBeUndefined();
  });

  it('should return error for files exceeding MAX_FILE_SIZE', () => {
    const file = new File([''], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
    
    const result = validateFileSize(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum limit');
  });

  it('should return warning for files exceeding RECOMMENDED_MAX_SIZE', () => {
    const file = new File([''], 'large.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: RECOMMENDED_MAX_SIZE + 1 });
    
    const result = validateFileSize(file);
    expect(result.valid).toBe(true);
    expect(result.warning).toContain('Large file detected');
  });
});

describe('sanitizeFileName', () => {
  it('should remove illegal characters', () => {
    expect(sanitizeFileName('test/file.mp4')).toBe('testfile.mp4');
    expect(sanitizeFileName('test:file?.mp4')).toBe('test_file_.mp4');
    expect(sanitizeFileName('  test file.mp4  ')).toBe('test file.mp4');
  });

  it('should handle very long filenames', () => {
    const longName = 'a'.repeat(300) + '.mp4';
    const sanitized = sanitizeFileName(longName);
    expect(sanitized.length).toBe(255);
    expect(sanitized.endsWith('.mp4')).toBe(true);
  });

  it('should provide default for empty names', () => {
    expect(sanitizeFileName('')).toBe('unnamed_file');
    expect(sanitizeFileName('///')).toBe('unnamed_file');
  });
});

describe('validateFileType', () => {
  it('should recognize MP4/MOV by ftyp box', async () => {
    const buffer = new Uint8Array(16);
    buffer.set([0x66, 0x74, 0x79, 0x70], 4);
    const file = new File([buffer], 'test.mp4', { type: 'video/mp4' });
    
    const result = await validateFileType(file);
    expect(result.valid).toBe(true);
    expect(result.format).toBe('mp4/mov');
  });

  it('should recognize WebM/MKV by EBML header', async () => {
    const buffer = new Uint8Array(16);
    buffer.set([0x1A, 0x45, 0xDF, 0xA3], 0);
    const file = new File([buffer], 'test.webm', { type: 'video/webm' });
    
    const result = await validateFileType(file);
    expect(result.valid).toBe(true);
    expect(result.format).toBe('webm/mkv');
  });

  it('should fallback to mime type if signature is unknown', async () => {
    const file = new File(['random content'], 'test.mp4', { type: 'video/mp4' });
    const result = await validateFileType(file);
    expect(result.valid).toBe(true);
    expect(result.format).toContain('video/mp4');
  });

  it('should reject non-media types', async () => {
    const file = new File(['random content'], 'test.txt', { type: 'text/plain' });
    const result = await validateFileType(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
