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

### Batch Processing & Parallelism
The app uses a task-based architecture to support multiple concurrent extractions.
*   **`ConversionTask`**: Each uploaded file is wrapped in a task object tracking its specific status, progress, logs, and metadata.
*   **Queue Management**: Centralized in `App.tsx` via a `useEffect` that monitors `maxConcurrency` (user-adjustable, default 3). It automatically triggers `queued` tasks when slots become available.
*   **Parallel Engines**: Each task is managed by a `TaskRunner` component which instantiates its own `useFFmpegEngine` hook and `FFmpeg` worker.

### Client-Side Processing (The Engine)
The core logic resides in `src/hooks/useFFmpegEngine.ts`.
*   **Decoupled Loading**: File reading and OPFS saving are decoupled from FFmpeg WASM loading to prevent "NotReadableError" on mobile devices (where browser file permissions can expire during long loads).
*   **Memory Management**: 
    *   Uses **OPFS** with unique filenames (`input_${taskId}.mp4`) to prevent race conditions during parallel processing.
    *   Reads files in chunks (50MB) during processing to support multi-gigabyte files.
*   **Caching**: Custom caching strategy (`rokaru-core-v1`) ensures the ~30MB WASM core is shared across tasks and available offline.

### Data Persistence
*   **`src/lib/db.ts`**: Manages the `rokaru_db` IndexedDB for history and settings.

### User Interface Flow
Controlled by a list-based state in `src/views/ConverterView.tsx`:
1.  **`init`**: Initializing application context and secure environment.
2.  **`idle`**: Waiting for user input (Multi-file Drag & Drop area).
3.  **`batch-view`**: Displays a vertical list of `BatchFileItem`s.
    *   **`reading`**: File being saved to OPFS.
    *   **`ready`**: Waiting for user to "Start Queue".
    *   **`queued`**: In the concurrency queue.
    *   **`processing`**: Active FFmpeg extraction.
    *   **`done`**: Extraction complete. Item can be expanded to reveal a `CustomAudioPlayer`.
    *   **`error`**: specific task failure (e.g., codec mismatch).

## 4. Development Workflow

### Commands
*   `npm run dev`: Starts the local development server (handles COOP/COEP headers).
*   `npm run build`: Runs TypeScript validation (`tsc`) and builds the production assets.
*   `npm run preview`: Previews the built production build.

## 5. Directory Structure & Key Files

### `src/`
*   **`components/`**
    *   `converter/`: Batch processing components.
        *   `IdleView.tsx`: Multi-file dropzone.
        *   `BatchFileItem.tsx`: Expandable task item with status and player.
        *   `BatchControls.tsx`: Concurrency slider and global actions (Start/Clear).
    *   `ui/`: Reusable primitives.
        *   `AudioPlayer.tsx`: Full-featured player (expanded view).
        *   `MiniAudioPlayer.tsx`: Compact player (collapsed view).
*   **`hooks/`**
    *   `useFFmpegEngine.ts`: Task-specific FFmpeg orchestration.
*   **`views/`**
    *   `ConverterView.tsx`: Main task list coordinator and background `TaskRunner` host.

## 6. Coding Conventions
*   **Parallelism Safety**: Always use `taskId` for temporary file operations.
*   **UX Responsiveness**: Ensure heavy operations (like FFmpeg loads) don't block the main thread or file reading.
*   **Mobile First**: The batch list and players must remain usable on small screens.
*   **No Auto-Play**: Do not trigger audio playback automatically on expansion.
