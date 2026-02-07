import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage resource cleanup, specifically for blob URLs.
 * Ensures that all created blob URLs are revoked when the component unmounts.
 */
export function useCleanup() {
  // Store all created URLs in a ref to persist across renders
  const urlsRef = useRef<string[]>([]);

  /**
   * Creates a blob URL and registers it for automatic cleanup.
   * @param blob The blob to create a URL for
   * @returns The generated blob URL string
   */
  const createBlobUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.push(url);
    return url;
  }, []);

  /**
   * Revokes a specific blob URL and removes it from the cleanup registry.
   * @param url The blob URL to revoke
   */
  const revokeBlobUrl = useCallback((url: string) => {
    URL.revokeObjectURL(url);
    urlsRef.current = urlsRef.current.filter(u => u !== url);
  }, []);

  // Cleanup effect: revoke all registered URLs on unmount
  useEffect(() => {
    return () => {
      // Create a copy to avoid mutation issues during cleanup
      const currentUrls = [...urlsRef.current];
      currentUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Failed to revoke blob URL during cleanup:', url, e);
        }
      });
      urlsRef.current = [];
    };
  }, []);

  return { createBlobUrl, revokeBlobUrl };
}
