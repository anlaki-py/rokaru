# Service Worker Build Fix Report

## Issue Description
During the production build (`npm run build`), the process failed during the PWA service worker generation phase with the following error:

```
Error: Unable to write the service worker file. 'Unexpected early exit. This happens when Promises returned by plugins cannot resolve. Unfinished hook action(s) on exit:
(terser) renderChunk
(terser) renderChunk'
```

## Root Cause Analysis
The error originated from `workbox-build`, which is used by `vite-plugin-pwa`. When Vite builds for production, it signals `workbox-build` to also operate in production mode. 

Internally, `workbox-build` uses a standalone Rollup process to bundle the service worker, and in production mode, it automatically attaches `@rollup/plugin-terser` for minification. 

In this specific environment, `terser`'s minification process (which often runs in a child process) failed to resolve its promises or was terminated unexpectedly, causing Rollup to hang and Vite to exit with an "Unexpected early exit" error.

## Resolution
The issue was resolved by explicitly setting the `workbox` mode to `'development'` within the `VitePWA` configuration in `vite.config.ts`.

```typescript
// vite.config.ts
VitePWA({
  // ... other config
  workbox: {
    mode: 'development', // Bypasses internal terser minification for SW
    // ...
  }
})
```

### Why this works:
1. **Bypasses Terser:** Setting the mode to `development` for Workbox prevents it from adding the problematic `@rollup/plugin-terser` to the service worker bundling pipeline.
2. **Maintains App Performance:** This change only affects the Service Worker file (`sw.js`). The rest of the application is still minified by Vite using `esbuild`, which is significantly faster and did not suffer from this issue.
3. **Preserves Functionality:** The service worker remains fully functional; it is simply not minified. For a local-first application where the SW primarily manages caching for large assets (like the 31MB FFmpeg WASM core), the lack of minification on the small SW control logic is negligible.

## Verification Results
- **Build Status:** Success
- **PWA Status:** Service worker and manifest generated correctly.
- **Precache Manifest:** Correcty includes large assets (`ffmpeg-core.wasm`) up to the configured `maximumFileSizeToCacheInBytes` (35MB).
- **Execution Time:** Build completed in ~37 seconds.
