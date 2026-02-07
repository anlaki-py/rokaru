import { AudioFormat } from '../types';

/**
 * Generates optimized FFmpeg arguments for different audio formats.
 * This function encapsulates the encoding logic for various target formats, 
 * ensuring high quality and compatibility.
 * 
 * @param {string} inputFilename - The name of the input file in FFmpeg's virtual FS.
 * @param {string} outputFilename - The name of the output file in FFmpeg's virtual FS.
 * @param {AudioFormat} format - The target audio format (e.g., 'mp3', 'wav', 'flac').
 * @param {any} [metadata] - Optional metadata from ffprobe to help with 'original' format detection.
 * @returns {string[]} An array of FFmpeg command arguments.
 * 
 * @updated 2026-02-07: Added 'original' format support and optimized bitrates for mobile.
 * @reason Support for lossless extraction and better performance on low-end devices.
 */
export const getFFmpegArgs = (
  inputFilename: string,
  outputFilename: string,
  format: AudioFormat,
  metadata?: any
): string[] => {
  // -vn: Disable video recording
  // -map_metadata 0: Copy metadata from the first input stream
  const baseArgs = ['-i', inputFilename, '-vn', '-map_metadata', '0'];

  switch (format) {
    case 'mp3':
      // libmp3lame: Standard MP3 encoder
      // -b:a 192k: High quality bitrate
      // -q:a 2: VBR quality setting (0-9, lower is better)
      return [
        ...baseArgs,
        '-acodec', 'libmp3lame',
        '-b:a', '192k',
        '-q:a', '2',
        '-id3v2_version', '3',
        outputFilename
      ];
    
    case 'wav':
      // pcm_s16le: Uncompressed 16-bit PCM
      // -ar 44100: CD quality sample rate
      return [
        ...baseArgs,
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        outputFilename
      ];

    case 'flac':
      // flac: Lossless audio codec
      // -compression_level 8: Maximum compression (lossless)
      return [
        ...baseArgs,
        '-acodec', 'flac',
        '-compression_level', '8',
        outputFilename
      ];

    case 'ogg':
      // libvorbis: Open source lossy audio codec
      // -q:a 6: High quality VBR setting
      return [
        ...baseArgs,
        '-acodec', 'libvorbis',
        '-q:a', '6',
        outputFilename
      ];

    case 'm4a':
      // aac: Advanced Audio Coding
      // -movflags +faststart: Relocates metadata for streaming
      return [
        ...baseArgs,
        '-acodec', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        outputFilename
      ];

    case 'original':
      // copy: Direct stream copy without re-encoding
      return [
        ...baseArgs,
        '-acodec', 'copy',
        outputFilename
      ];

    default:
      // Fallback to standard MP3
      return [
        ...baseArgs,
        '-acodec', 'libmp3lame',
        '-b:a', '192k',
        outputFilename
      ];
  }
};

/**
 * Determines the correct output extension for the 'original' format copy
 * by analyzing the input file's metadata.
 * 
 * @param {any} metadata - The JSON metadata object returned by ffprobe.
 * @returns {string} The appropriate file extension (e.g., 'mp3', 'm4a').
 * 
 * @updated 2026-02-07: Added support for opus and vorbis codecs.
 */
export const getOriginalExtension = (metadata: any): string => {
  const audioStream = metadata?.streams?.find((s: any) => s.codec_type === 'audio');
  const codec = audioStream?.codec_name || 'aac';
  
  // Mapping of common audio codecs to their typical file extensions
  const codecMap: Record<string, string> = {
    'aac': 'm4a',
    'mp3': 'mp3',
    'vorbis': 'ogg',
    'opus': 'opus',
    'flac': 'flac',
    'pcm_s16le': 'wav'
  };

  return codecMap[codec] || 'm4a';
};
