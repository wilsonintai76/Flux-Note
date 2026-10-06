import { Note } from './note';

export type SyncStatus = 'synced' | 'pending_upload' | 'pending_download' | 'conflict' | 'error';

export interface SyncQueueItem {
  id: string;
  noteId: string;
  noteTitle: string;
  noteType: Note['type'];
  action: 'upload' | 'download';
  changeType: 'create' | 'update' | 'delete';
  timestamp: number;
  offlineModifiedAt: number;
  changesSummary: string[];
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  error?: string;
}

export interface SyncConflict {
  id: string;
  noteId: string;
  noteTitle: string;
  detectedAt: number;
  localNote: Note;
  remoteNote: Note;
  localDiffFields: string[];
  remoteDiffFields: string[];
  summary: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: number;
  type: 'upload' | 'download' | 'conflict_detected' | 'conflict_resolved' | 'network_change' | 'sync_all' | 'error';
  title: string;
  details: string;
  success: boolean;
}

export interface SyncState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean; // isOnline && !isSimulatedOffline
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingUploadsCount: number;
  pendingDownloadsCount: number;
  conflictsCount: number;
  queue: SyncQueueItem[];
  conflicts: SyncConflict[];
  logs: SyncLogEntry[];
  syncProgress: number; // 0 to 100
  syncStepMessage?: string;
}

export type ConflictResolutionType = 'keep_local' | 'keep_remote' | 'merge_both';
