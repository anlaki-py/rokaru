import { formatBytes } from './utils';

// Constants for file size limits
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const RECOMMENDED_MAX_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Validates file size against maximum and recommended limits.
 * Helps prevent browser crashes on devices with limited memory.
 * 
 * @param {File} file - The file object to validate.
 * @returns {{ valid: boolean; error?: string; warning?: string }} Validation result with optional error/warning.
 */
export function validateFileSize(file: File): { valid: boolean; error?: string; warning?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${formatBytes(MAX_FILE_SIZE)}`
    };
  }
  
  if (file.size > RECOMMENDED_MAX_SIZE) {
    return {
      valid: true,
      warning: `Large file detected (${formatBytes(file.size)}). Processing may be slow or fail on low-memory devices.`
    };
  }
  
  return { valid: true };
}

/**
 * Sanitizes a filename by removing illegal characters and restricting length.
 * Ensures the filename is safe for OPFS and potential local downloads.
 * 
 * @param {string} fileName - The original filename.
 * @returns {string} The sanitized filename.
 * 
 * @updated 2026-02-07: Added intelligent truncation that preserves file extensions.
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path components and illegal characters
  const sanitized = fileName
    .replace(/[/\\]/g, '') // No slashes
    .replace(/[<>:"|?*]/g, '_') // Common illegal chars in Windows
    .replace(/[\x00-\x1F\x7F]/g, '_') // Control characters
    .trim();
  
  // Truncate to safe length (255 is common filesystem limit)
  if (sanitized.length > 255) {
    const extIndex = sanitized.lastIndexOf('.');
    if (extIndex > -1 && sanitized.length - extIndex < 10) {
      const ext = sanitized.substring(extIndex);
      return sanitized.substring(0, 255 - ext.length) + ext;
    }
    return sanitized.substring(0, 255);
  }
  
  return sanitized || 'unnamed_file';
}

/**
 * Validates a file by checking its first few bytes (magic numbers).
 * This is more robust than relying on MIME types or extensions alone.
 * 
 * @param {File} file - The file object to inspect.
 * @returns {Promise<{ valid: boolean; format?: string; error?: string }>} Async validation result.
 * 
 * @updated 2026-02-07: Added support for MPEG-TS and AVI signatures.
 */
export const validateFileType = async (file: File): Promise<{ valid: boolean; format?: string; error?: string }> => {
  const header = file.slice(0, 16);
  
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(header);
  });

  // Helper to check for byte patterns at specific offsets
  const check = (signature: number[], offset = 0) => {
    for (let i = 0; i < signature.length; i++) {
      if (bytes[offset + i] !== signature[i]) return false;
    }
    return true;
  };

  // 1. Video Formats
  
  // MP4 / MOV check (ftyp box usually starts at offset 4)
  if (check([0x66, 0x74, 0x79, 0x70], 4)) {
    return { valid: true, format: 'mp4/mov' };
  }

  // WebM / MKV (EBML header starts with 0x1A45DFA3)
  if (check([0x1A, 0x45, 0xDF, 0xA3])) {
    return { valid: true, format: 'webm/mkv' };
  }

  // AVI (RIFF header at 0, AVI tag at 8)
  if (check([0x52, 0x49, 0x46, 0x46]) && check([0x41, 0x56, 0x49, 0x20], 8)) {
    return { valid: true, format: 'avi' };
  }

  // MPEG-TS (Sync byte 0x47)
  if (check([0x47])) {
    return { valid: true, format: 'mpeg-ts' };
  }

  // 2. Audio Formats
  
  // MP3 (ID3v2 'ID3' or Frame Sync 0xFFE0)
  if (check([0x49, 0x44, 0x33]) || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) {
    return { valid: true, format: 'mp3' };
  }

  // WAV (RIFF header at 0, WAVE tag at 8)
  if (check([0x52, 0x49, 0x46, 0x46]) && check([0x57, 0x41, 0x56, 0x45], 8)) {
    return { valid: true, format: 'wav' };
  }

  // FLAC (fLaC signature)
  if (check([0x66, 0x4C, 0x61, 0x43])) {
    return { valid: true, format: 'flac' };
  }

  // OGG (OggS signature)
  if (check([0x4F, 0x67, 0x67, 0x53])) {
    return { valid: true, format: 'ogg' };
  }

  // Fallback to basic type check if signature not matched but file is video/* or audio/*
  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    return { valid: true, format: `${file.type} (inferred)` };
  }

  return { valid: false, error: 'Unsupported or invalid file format' };
};

/**
 * Legacy export for backward compatibility
 */
export const validateVideoFile = validateFileType;
