// src/lib/storage.ts

export class OPFSStorage {
  private root: FileSystemDirectoryHandle | null = null;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.root) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!navigator.storage || !navigator.storage.getDirectory) {
        // Re-check once after a tiny delay in case of race during load
        await new Promise(r => setTimeout(r, 100));
        if (!navigator.storage || !navigator.storage.getDirectory) {
          throw new Error(
            'Storage API not available. This app requires a secure context (HTTPS or localhost) and a modern browser.'
          );
        }
      }
      
      try {
        this.root = await navigator.storage.getDirectory();
      } catch (e: any) {
        this.initPromise = null;
        throw new Error(`Failed to initialize storage: ${e.message}`);
      }
    })();

    return this.initPromise;
  }

  async saveFile(filename: string, data: ArrayBuffer | Uint8Array | Blob): Promise<void> {
    const executeSave = async (isRetry = false): Promise<void> => {
      try {
        if (!this.root) await this.init();
        
        let fileHandle: FileSystemFileHandle;
        try {
          fileHandle = await this.root!.getFileHandle(filename, { create: true });
        } catch (e: any) {
          if (isRetry) throw e;
          this.root = null;
          await this.init();
          fileHandle = await this.root!.getFileHandle(filename, { create: true });
        }

        // Check for Synchronous Access Handle (Worker only)
        // @ts-ignore
        if (fileHandle.createSyncAccessHandle) {
          let accessHandle: any;
          try {
            // @ts-ignore
            accessHandle = await fileHandle.createSyncAccessHandle();
            
            if (data instanceof Blob) {
              const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
              let offset = 0;
              while (offset < data.size) {
                const chunk = data.slice(offset, offset + CHUNK_SIZE);
                const buffer = await chunk.arrayBuffer();
                accessHandle.write(new Uint8Array(buffer), { at: offset });
                offset += CHUNK_SIZE;
              }
            } else {
              const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
              accessHandle.write(buffer);
            }
            accessHandle.flush();
          } finally {
            if (accessHandle) {
              try {
                accessHandle.close();
              } catch (e) {
                console.warn('Error closing access handle:', e);
              }
            }
          }
        } else {
          // Main thread fallback: Use createWritable
          // @ts-ignore
          const writable = await fileHandle.createWritable();
          try {
            await writable.write(data);
            await writable.close();
          } catch (e) {
            try {
              await writable.abort();
            } catch (abortErr) {}
            throw e;
          }
        }
      } catch (e: any) {
        if (!isRetry && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.name === 'InvalidStateError')) {
          console.warn(`[OPFS] saveFile transient error, retrying...`, e);
          this.root = null;
          return executeSave(true);
        }
        throw e;
      }
    };

    try {
      await executeSave();
    } catch (e: any) {
      console.error(`[OPFS] saveFile critical failure for ${filename}:`, e);
      throw e;
    }
  }

  async readFile(filename: string): Promise<File> {
    const executeRead = async (isRetry = false): Promise<File> => {
      try {
        if (!this.root) await this.init();
        const fileHandle = await this.root!.getFileHandle(filename);
        return await fileHandle.getFile();
      } catch (e: any) {
        if (!isRetry && e.name !== 'NotFoundError') {
          this.root = null;
          await this.init();
          return executeRead(true);
        }
        throw e;
      }
    };
    return executeRead();
  }
  
  async deleteFile(filename: string): Promise<void> {
    const executeDelete = async (isRetry = false): Promise<void> => {
      try {
        if (!this.root) await this.init();
        await this.root!.removeEntry(filename);
      } catch (e: any) {
        if (e.name === 'NotFoundError') return;
        if (!isRetry) {
          this.root = null;
          await this.init();
          return executeDelete(true);
        }
      }
    };
    await executeDelete();
  }
  
  async clearAll(): Promise<void> {
     try {
       if (!this.root) await this.init();
       // @ts-ignore
       for await (const [name] of this.root!.entries()) {
          await this.deleteFile(name);
       }
     } catch (e) {
       this.root = null;
       console.warn('[OPFS] clearAll encountered issues:', e);
     }
  }
}

export const opfs = new OPFSStorage();
