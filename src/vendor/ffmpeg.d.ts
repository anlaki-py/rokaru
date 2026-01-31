declare module '*/vendor/ffmpeg/index.js' {
  export class FFmpeg {
    load(config: any): Promise<void>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    readFile(path: string): Promise<any>;
    exec(args: string[]): Promise<number>;
    on(event: string, callback: (data: any) => void): void;
    terminate(): void;
  }
}
declare module '*/vendor/util/index.js' {
    export function toBlobURL(url: string, mimeType: string): Promise<string>;
}
