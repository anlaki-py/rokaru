# Rōkaru - Privacy-First Video to Audio Converter

**Rōkaru** (Japanese for "Local") is a secure, client-side media extraction tool that allows you to convert video files to high-quality audio formats entirely within your browser.

## Key Features

-   **Complete Privacy:** All processing happens locally in your browser. No files are ever uploaded to a server.
-   **No File Size Limits:** Utilizes the Origin Private File System (OPFS) to handle multi-gigabyte files without crashing browser memory.
-   **Batch Processing:** Convert multiple files simultaneously with adjustable concurrency.
-   **Wide Format Support:** Export to MP3, WAV, FLAC, OGG, and M4A.
-   **Lossless Extraction:** Use the "Original" format option to extract audio streams without re-encoding (where supported).
-   **Offline Ready:** Fully functional as a Progressive Web App (PWA).

## Tech Stack

-   **Framework:** React 18 (Vite)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS v4
-   **Engine:** `ffmpeg.wasm` (WebAssembly port of FFmpeg)
-   **Storage:** OPFS (Origin Private File System) and IndexedDB (Dexie.js)
-   **Animation:** Framer Motion

## Getting Started

### Prerequisites

-   **Node.js:** v18 or later
-   **Browser:** Modern browser with `SharedArrayBuffer` support (Chrome 92+, Firefox 89+, Safari 15.2+, Edge 92+).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/anlaki-py/rokaru.git
    cd rokaru
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1.  **Drop Files:** Drag and drop video files onto the main area or click to select them.
2.  **Configure:** Choose your desired output format for each file or set a global default in Settings.
3.  **Convert:** Click "Start Queue" to begin the extraction process.
4.  **Download:** Once complete, play the audio in the app or download it to your device.

## Security & Architecture

Rōkaru uses a "SharedArrayBuffer" enabled environment (via COOP/COEP headers) to run FFmpeg multi-threaded in your browser.

-   **OPFS:** Files are temporarily stored in a private browser filesystem, ensuring they are not accessible to other websites.
-   **WASM Isolation:** The FFmpeg core runs in a separate worker thread, keeping the UI responsive even during heavy processing.
-   **Zero Tracking:** We do not collect any data. Your files and metadata stay on your machine.

## Testing

The project uses Vitest for unit and integration testing.

```bash
npm run test
```

## License

MIT License - See `LICENSE` for details.

---
Built for privacy.