import { describe, it, expect } from 'vitest';
import { getFFmpegArgs, getOriginalExtension } from '../src/lib/ffmpegUtils';

describe('ffmpegUtils', () => {
  describe('getFFmpegArgs', () => {
    it('should return correct args for mp3', () => {
      const args = getFFmpegArgs('input.mp4', 'output.mp3', 'mp3');
      expect(args).toContain('libmp3lame');
      expect(args).toContain('192k');
      expect(args[args.length - 1]).toBe('output.mp3');
    });

    it('should return correct args for flac', () => {
      const args = getFFmpegArgs('input.mp4', 'output.flac', 'flac');
      expect(args).toContain('flac');
      expect(args).toContain('8');
    });

    it('should return correct args for original copy', () => {
      const args = getFFmpegArgs('input.mp4', 'output.m4a', 'original');
      expect(args).toContain('copy');
    });

    it('should include metadata mapping', () => {
      const args = getFFmpegArgs('input.mp4', 'output.mp3', 'mp3');
      expect(args).toContain('-map_metadata');
      expect(args).toContain('0');
    });
  });

  describe('getOriginalExtension', () => {
    it('should detect m4a for aac codec', () => {
      const metadata = {
        streams: [{ codec_type: 'audio', codec_name: 'aac' }]
      };
      expect(getOriginalExtension(metadata)).toBe('m4a');
    });

    it('should detect wav for pcm_s16le codec', () => {
      const metadata = {
        streams: [{ codec_type: 'audio', codec_name: 'pcm_s16le' }]
      };
      expect(getOriginalExtension(metadata)).toBe('wav');
    });

    it('should default to m4a for unknown codec', () => {
      const metadata = {
        streams: [{ codec_type: 'audio', codec_name: 'unknown' }]
      };
      expect(getOriginalExtension(metadata)).toBe('m4a');
    });
  });
});
