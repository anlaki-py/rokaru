# Rōkaru Project Context

## 1. Project Overview
**Rōkaru** (Japanese for "Local") is a privacy-first, client-side video-to-audio converter. It allows users to convert video files to various audio formats (MP3, WAV, FLAC, etc.) entirely within their browser, ensuring no data is ever uploaded to a server.

*   **Core Technology:** `ffmpeg.wasm` (WebAssembly port of FFmpeg).
*   **Key Value Prop:** Complete privacy via local processing, no file size limits (thanks to OPFS), and PWA (Progressive Web App) support for offline use.
*   **Target Audience:** Privacy advocates, content creators, and professionals requiring lossless extraction.

## 2. Tech Stack
*   **Framework:** React 18 (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4, `clsx`, `tailwind-merge`
    *   **Theme:** Dark mode only, defined in `src/index.css` via CSS variables (`--color-background`, `--color-primary`, etc.) and Tailwind v4 `@theme`.
    *   **Font:** 'Syne' (Display) and 'Inter' (Body).
*   **Animation:** Framer Motion (complex state transitions, layout animations).
*   **Routing:** React Router v6.
*   **State/Storage:** 
    *   `Dexie.js`: IndexedDB wrapper for persisting conversion history (`rokaru_db`).
    *   `OPFS` (Origin Private File System): Used in `src/lib/storage.ts` to handle large video files without crashing browser memory.
*   **Media Processing:** `@ffmpeg/ffmpeg`, `@ffmpeg/util` (hosted locally in `src/vendor` and `public/core`).

## 3. Architecture & Key Concepts

### Client-Side Processing (The Engine)
The core logic resides in `src/hooks/useFFmpegEngine.ts`.
*   **Initialization:** Loads `ffmpeg-core.wasm` and `ffmpeg-core.js` from `public/core/`.
*   **Caching:** Implements a custom caching strategy (`rokaru-core-v1`) to cache the large WASM binary (~30MB) for offline use.
*   **Memory Management:** 
    *   Uses **OPFS** to write input files to disk (`input.mp4`) instead of keeping them in RAM.
    *   Reads files in chunks (50MB) during processing to support multi-gigabyte files.
*   **Security:** 
    *   Strict `COOP` (Cross-Origin-Opener-Policy) and `COEP` (Cross-Origin-Embedder-Policy) headers are **mandatory** in `vite.config.ts` to enable `SharedArrayBuffer`.
    *   **Do not remove these headers.**

### Data Persistence
*   **`src/lib/db.ts`**: Manages the `rokaru_db` IndexedDB.
    *   `conversions` table: Stores history (filename, size, duration, status).
    *   `settings` table: Stores user preferences.

### User Interface Flow
Controlled by `src/views/ConverterView.tsx` via a strict state machine:
1.  **`init`**: Loading WASM core.
2.  **`idle`**: Waiting for user input (Drag & Drop area).
3.  **`reading`**: Validating and writing file to OPFS.
4.  **`processing`**: FFmpeg conversion in progress (shows progress bar & logs).
5.  **`done`**: Conversion complete, download available.
6.  **`error`**: System failure state.

## 4. Development Workflow

### Commands
*   `npm run dev`: Starts the local development server (handles COOP/COEP headers).
*   `npm run build`: Runs TypeScript validation (`tsc`) and builds the production assets.
*   `npm run preview`: Previews the built production build.

### User Preferences & Protocols
*   **Manual Build:** The user prefers to run `npm run build` manually. **Do not** automatically trigger a build after making changes unless explicitly requested.
*   **Execution Protocol:** See `rules/EXECUTION_PROTOCOL.md`.
    *   **Scope Isolation:** Never modify code outside the specific task scope.
    *   **Pre-Execution Forecasting:** Always plan and verify before acting.
    *   **No Automatic Execution:** You are a static analysis tool; do not run servers or tests yourself.
*   **SEO Strategy:** See `docs/SEO-strategy-2026.md`. Focuses on "AI Search Optimization" (structuring content for LLMs/Perplexity) and detailed technical "Deep Dives" to build authority.

## 5. Directory Structure & Key Files

### `src/`
*   **`components/`**
    *   `converter/`: Core logic views.
        *   `IdleView.tsx`: Drag & drop zone.
        *   `ConversionProgress.tsx`: Progress bars, log toggles.
        *   `ResultView.tsx`: Success state with download/playback.
    *   `ui/`: Reusable primitives (`LogViewer`, `Button`, `MetadataModal`).
    *   `layout/`: `MainLayout` and `LandingSEO` (SEO content injection).
*   **`hooks/`**
    *   `useFFmpegEngine.ts`: **CRITICAL**. Contains the FFmpeg instantiation, file handling, and conversion logic.
*   **`lib/`**
    *   `db.ts`: Database schema definition.
    *   `storage.ts`: OPFS helper functions.
    *   `utils.ts`: Formatter helpers.
*   **`vendor/`**: Local copies of `@ffmpeg` types and utilities (to prevent CDN reliance).
*   **`views/`**: Top-level route components (`ConverterView`, `SettingsView`).

### `public/core/`
*   Contains the binary artifacts (`ffmpeg-core.wasm`, `ffmpeg-core.js`). These are large files excluded from git LFS in some setups, but crucial for the app.

### `rules/`
*   `EXECUTION_PROTOCOL.md`: Governs how the agent should behave (safety, precision).
*   `SKILLS/`: Contains specific coding standards (e.g., Vercel/React best practices).

## 6. Coding Conventions
*   **Styling:** Use `clsx` and `tailwind-merge` for class manipulation.
*   **Type Safety:** Strict TypeScript usage. No `any` unless absolutely necessary (e.g., legacy interaction).
*   **Performance:** Prefer `useEffect` sparingly; use `useCallback` for event handlers passed to children.
*   **File Handling:** Always assume files can be >2GB. Use streams or chunks; never load full files into memory if possible.