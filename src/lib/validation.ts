/**
 * Validates a file by checking its first few bytes (magic numbers)
 * to ensure it matches expected video formats.
 */
export const validateVideoFile = async (file: File): Promise<{ valid: boolean; format?: string }> => {
  const header = file.slice(0, 16);
  const buffer = await header.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Helper to check for byte patterns
  const check = (signature: number[], offset = 0) => {
    for (let i = 0; i < signature.length; i++) {
      if (bytes[offset + i] !== signature[i]) return false;
    }
    return true;
  };

  // MP4 / MOV check (ftyp box)
  // ftyp starts at index 4
  if (check([0x66, 0x74, 0x79, 0x70], 4)) {
    return { valid: true, format: 'mp4/mov' };
  }

  // WebM / MKV (EBML header starts with 0x1A 0x45 0xDF 0xA3)
  if (check([0x1A, 0x45, 0xDF, 0xA3])) {
    return { valid: true, format: 'webm/mkv' };
  }

  // AVI (RIFF starts at 0, followed by size, then AVI )
  if (check([0x52, 0x49, 0x46, 0x46]) && check([0x41, 0x56, 0x49, 0x20], 8)) {
    return { valid: true, format: 'avi' };
  }

  // Fallback to basic type check if signature not matched but file is video/*
  if (file.type.startsWith('video/')) {
    return { valid: true, format: 'unknown (video type)' };
  }

  return { valid: false };
};
