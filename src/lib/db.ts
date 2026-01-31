import Dexie, { type Table } from 'dexie';

export interface Conversion {
  id?: number;
  fileName: string;
  fileSize: number;
  outputName: string;
  outputSize: number;
  timestamp: number;
  status: 'completed' | 'failed';
  duration?: number;
  audioBlob?: Blob; // Added field for the actual audio data
}

export interface UserSettings {
  key: string;
  value: any;
}

export class RokaruDB extends Dexie {
  conversions!: Table<Conversion>;
  settings!: Table<UserSettings>;

  constructor() {
    super('rokaru_db');
    // Version 2: Added audioBlob (no index change needed but bumping for clarity)
    this.version(2).stores({
      conversions: '++id, timestamp, status',
      settings: 'key'
    });
  }
}

export const db = new RokaruDB();