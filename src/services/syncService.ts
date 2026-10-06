import { Note } from '../types/note';
import { 
  SyncState, 
  SyncQueueItem, 
  SyncConflict, 
  SyncLogEntry, 
  ConflictResolutionType 
} from '../types/sync';

const STORAGE_KEY_SYNC_QUEUE = 'folio_sync_queue_v1';
const STORAGE_KEY_REMOTE_MIRROR = 'folio_remote_cloud_mirror_v1';
const STORAGE_KEY_CONFLICTS = 'folio_sync_conflicts_v1';
const STORAGE_KEY_LOGS = 'folio_sync_logs_v1';
const STORAGE_KEY_LAST_SYNC = 'folio_last_sync_timestamp_v1';
const STORAGE_KEY_SIMULATED_OFFLINE = 'folio_simulated_offline_v1';

type SyncListener = (state: SyncState) => void;

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private syncProgress: number = 0;
  private syncStepMessage: string = '';
  private listeners: Set<SyncListener> = new Set();
  private queue: SyncQueueItem[] = [];
  private conflicts: SyncConflict[] = [];
  private logs: SyncLogEntry[] = [];
  private lastSyncTime: number | null = null;
  private initialized: boolean = false;

  constructor() {
    this.loadPersistedState();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.addLog('network_change', 'Network Connection Restored', 'Device is back online.', true);
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.addLog('network_change', 'Network Connection Lost', 'Device went offline. Changes will queue locally.', false);
        this.notify();
      });
    }
  }

  private loadPersistedState() {
    try {
      const q = localStorage.getItem(STORAGE_KEY_SYNC_QUEUE);
      this.queue = q ? JSON.parse(q) : [];

      const c = localStorage.getItem(STORAGE_KEY_CONFLICTS);
      this.conflicts = c ? JSON.parse(c) : [];

      const l = localStorage.getItem(STORAGE_KEY_LOGS);
      this.logs = l ? JSON.parse(l) : [];

      const t = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      this.lastSyncTime = t ? parseInt(t, 10) : Date.now() - 1000 * 60 * 35; // Default ~35 min ago

      const sim = localStorage.getItem(STORAGE_KEY_SIMULATED_OFFLINE);
      this.isSimulatedOffline = sim === 'true';
    } catch (e) {
      console.error('Error loading sync storage', e);
    }
  }

  public init() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Seed initial mock sync log if empty
    if (this.logs.length === 0) {
      this.addLog(
        'sync_all',
        'Initial Cloud Handshake Completed',
        'Local database connected with Folio Cloud Storage engine.',
        true
      );
    }
    this.notify();
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  public getState(): SyncState {
    const pendingUploads = this.queue.filter((q) => q.action === 'upload' && q.status === 'pending');
    const pendingDownloads = this.queue.filter((q) => q.action === 'download' && q.status === 'pending');
    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;

    return {
      isOnline: this.isOnline,
      isSimulatedOffline: this.isSimulatedOffline,
      effectiveOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingUploadsCount: pendingUploads.length,
      pendingDownloadsCount: pendingDownloads.length,
      conflictsCount: this.conflicts.length,
      queue: [...this.queue],
      conflicts: [...this.conflicts],
      logs: [...this.logs],
      syncProgress: this.syncProgress,
      syncStepMessage: this.syncStepMessage,
    };
  }

  public setSimulatedOffline(offline: boolean) {
    this.isSimulatedOffline = offline;
    try {
      localStorage.setItem(STORAGE_KEY_SIMULATED_OFFLINE, String(offline));
    } catch (e) {
      console.error(e);
    }
    this.addLog(
      'network_change',
      offline ? 'Simulated Offline Mode Enabled' : 'Simulated Offline Mode Disabled',
      offline 
        ? 'App is operating in offline simulation mode. Note edits will accrue in the pending upload queue.'
        : 'App returned to active network mode.',
      !offline
    );
    this.notify();
  }

  // Record a local note edit, creation, or deletion
  public recordLocalNoteChange(note: Note, changeType: 'create' | 'update' | 'delete', previousNote?: Note) {
    const now = Date.now();
    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;

    // Detect what changed for summary
    const changesSummary: string[] = [];
    if (changeType === 'create') {
      changesSummary.push(`Created new ${note.type} note`);
    } else if (changeType === 'delete') {
      changesSummary.push(`Deleted note`);
    } else if (previousNote) {
      if (previousNote.title !== note.title) {
        changesSummary.push(`Renamed to "${note.title}"`);
      }
      if (previousNote.content !== note.content) {
        const diffLen = Math.abs((note.content || '').length - (previousNote.content || '').length);
        changesSummary.push(`Updated text content (${diffLen} bytes diff)`);
      }
      if (JSON.stringify(previousNote.tags) !== JSON.stringify(note.tags)) {
        changesSummary.push(`Updated tags: [${note.tags.join(', ')}]`);
      }
      if (previousNote.folderId !== note.folderId) {
        changesSummary.push(`Moved folder`);
      }
      if (previousNote.isPinned !== note.isPinned) {
        changesSummary.push(note.isPinned ? 'Pinned note' : 'Unpinned note');
      }
      if (previousNote.pdfData?.annotations !== note.pdfData?.annotations) {
        changesSummary.push('Modified PDF ink annotations / stamps');
      }
      if (previousNote.canvasNodes?.length !== note.canvasNodes?.length) {
        changesSummary.push(`Canvas nodes updated (${note.canvasNodes?.length || 0} nodes)`);
      }
      if (changesSummary.length === 0) {
        changesSummary.push('Updated note contents');
      }
    } else {
      changesSummary.push('Modified note data');
    }

    // Upsert into queue
    const existingIndex = this.queue.findIndex(
      (q) => q.noteId === note.id && q.action === 'upload' && q.status === 'pending'
    );

    const queueItem: SyncQueueItem = {
      id: existingIndex >= 0 ? this.queue[existingIndex].id : `queue-${now}-${Math.random().toString(36).substr(2, 5)}`,
      noteId: note.id,
      noteTitle: note.title || 'Untitled Note',
      noteType: note.type,
      action: 'upload',
      changeType,
      timestamp: now,
      offlineModifiedAt: now,
      changesSummary,
      status: 'pending',
    };

    if (existingIndex >= 0) {
      // Merge summaries
      const combined = Array.from(new Set([...this.queue[existingIndex].changesSummary, ...changesSummary]));
      this.queue[existingIndex] = {
        ...queueItem,
        changesSummary: combined,
      };
    } else {
      this.queue.unshift(queueItem);
    }

    this.saveQueue();

    // If online, we can optionally auto-sync or keep in pending until synced
    // If offline, it explicitly stays pending
    if (!effectiveOnline) {
      this.addLog(
        'upload',
        `Offline Edit Queued: "${note.title}"`,
        `${changesSummary.join(' • ')} (Queued for cloud upload upon reconnect).`,
        true
      );
    }

    this.notify();
  }

  // Primary Manual / Triggered "Sync Now" Engine
  public async syncNow(
    currentNotes: Note[],
    onNotesUpdated?: (newNotes: Note[]) => void,
    onProgressUpdate?: (step: string, percent: number) => void
  ): Promise<{ success: boolean; conflictsFound: number; syncedCount: number; message: string }> {
    if (this.isSyncing) {
      return { success: false, conflictsFound: 0, syncedCount: 0, message: 'Sync already in progress.' };
    }

    const effectiveOnline = this.isOnline && !this.isSimulatedOffline;
    if (!effectiveOnline) {
      const msg = this.isSimulatedOffline
        ? 'Cannot sync: App is currently in Simulated Offline Mode. Disable offline mode to sync.'
        : 'Cannot sync: No active internet connection detected. Please check network connectivity.';
      this.addLog('error', 'Sync Aborted', msg, false);
      return { success: false, conflictsFound: 0, syncedCount: 0, message: msg };
    }

    this.isSyncing = true;
    this.syncProgress = 10;
    this.syncStepMessage = 'Initiating cloud handshake...';
    this.notify();
    onProgressUpdate?.(this.syncStepMessage, this.syncProgress);

    await new Promise((r) => setTimeout(r, 400));

    // Step 1: Load Remote Cloud Mirror
    this.syncProgress = 25;
    this.syncStepMessage = 'Inspecting cloud storage repository & remote revisions...';
    this.notify();
    onProgressUpdate?.(this.syncStepMessage, this.syncProgress);

    const remoteMirror = this.getRemoteMirror();
    let updatedNotes = [...currentNotes];
    let syncedCount = 0;
    let conflictsFound = 0;

    await new Promise((r) => setTimeout(r, 450));

    // Step 2: Conflict Detection & Upload Processing
    this.syncProgress = 50;
    this.syncStepMessage = 'Comparing local offline diffs against cloud revision vector...';
    this.notify();
    onProgressUpdate?.(this.syncStepMessage, this.syncProgress);

    const pendingUploads = this.queue.filter((q) => q.action === 'upload' && q.status === 'pending');

    for (const item of pendingUploads) {
      const localNote = updatedNotes.find((n) => n.id === item.noteId);
      const remoteNote = remoteMirror[item.noteId];

      if (!localNote) {
        // Note was deleted locally
        delete remoteMirror[item.noteId];
        item.status = 'synced';
        syncedCount++;
        continue;
      }

      // Check if remote version also changed independently since last sync
      const remoteChanged = remoteNote && 
        remoteNote.updatedAt > (this.lastSyncTime || 0) &&
        (remoteNote.content !== localNote.content || remoteNote.title !== localNote.title);

      if (remoteChanged) {
        // True Conflict!
        conflictsFound++;
        item.status = 'conflict';
        this.registerConflict(localNote, remoteNote);
      } else {
        // Safe to push local to remote cloud mirror
        remoteMirror[localNote.id] = { ...localNote, updatedAt: Date.now() };
        item.status = 'synced';
        syncedCount++;
      }
    }

    await new Promise((r) => setTimeout(r, 450));

    // Step 3: Check for Remote Downloads (notes in remote that aren't in local or have newer remote timestamps)
    this.syncProgress = 75;
    this.syncStepMessage = 'Downloading remote updates and delta patches...';
    this.notify();
    onProgressUpdate?.(this.syncStepMessage, this.syncProgress);

    const pendingDownloads = this.queue.filter((q) => q.action === 'download' && q.status === 'pending');
    for (const item of pendingDownloads) {
      const remoteNote = remoteMirror[item.noteId];
      if (remoteNote) {
        const localIdx = updatedNotes.findIndex((n) => n.id === item.noteId);
        if (localIdx >= 0) {
          updatedNotes[localIdx] = remoteNote;
        } else {
          updatedNotes.unshift(remoteNote);
        }
        item.status = 'synced';
        syncedCount++;
      }
    }

    // Save Remote Mirror
    this.saveRemoteMirror(remoteMirror);

    await new Promise((r) => setTimeout(r, 350));

    // Step 4: Finalize Queue and Logs
    this.syncProgress = 100;
    this.syncStepMessage = conflictsFound > 0 
      ? `Sync complete with ${conflictsFound} conflict(s) requiring attention.` 
      : 'All notes synchronized with cloud!';
    this.lastSyncTime = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(this.lastSyncTime));
    } catch (e) {
      console.error(e);
    }

    // Clean up synced items from queue after brief retention
    this.queue = this.queue.filter((q) => q.status !== 'synced');
    this.saveQueue();

    if (conflictsFound > 0) {
      this.addLog(
        'conflict_detected',
        `Sync Finished with ${conflictsFound} Conflict(s)`,
        `${syncedCount} item(s) uploaded/downloaded. ${conflictsFound} divergent notes flagged for manual review.`,
        false
      );
    } else {
      this.addLog(
        'sync_all',
        'Cloud Synchronization Successful',
        `${syncedCount} offline change(s) seamlessly uploaded and verified. All repositories matching.`,
        true
      );
    }

    if (onNotesUpdated) {
      onNotesUpdated(updatedNotes);
    }

    this.isSyncing = false;
    this.notify();

    return {
      success: true,
      conflictsFound,
      syncedCount,
      message: conflictsFound > 0
        ? `Synced ${syncedCount} item(s). ${conflictsFound} conflict(s) require review.`
        : `Successfully synced ${syncedCount} note(s)!`,
    };
  }

  // Register conflict
  private registerConflict(localNote: Note, remoteNote: Note) {
    const existingIdx = this.conflicts.findIndex((c) => c.noteId === localNote.id);
    const localDiffs: string[] = [];
    const remoteDiffs: string[] = [];

    if (localNote.title !== remoteNote.title) {
      localDiffs.push(`Title: "${localNote.title}"`);
      remoteDiffs.push(`Title: "${remoteNote.title}"`);
    }
    if (localNote.content !== remoteNote.content) {
      localDiffs.push(`Content modified (${localNote.content.length} chars)`);
      remoteDiffs.push(`Content modified (${remoteNote.content.length} chars)`);
    }
    if (JSON.stringify(localNote.tags) !== JSON.stringify(remoteNote.tags)) {
      localDiffs.push(`Tags: [${localNote.tags.join(', ')}]`);
      remoteDiffs.push(`Tags: [${remoteNote.tags.join(', ')}]`);
    }

    const conflict: SyncConflict = {
      id: `conflict-${Date.now()}-${localNote.id}`,
      noteId: localNote.id,
      noteTitle: localNote.title || 'Untitled Note',
      detectedAt: Date.now(),
      localNote,
      remoteNote,
      localDiffFields: localDiffs.length ? localDiffs : ['Document structure modified offline'],
      remoteDiffFields: remoteDiffs.length ? remoteDiffs : ['Document structure modified on cloud'],
      summary: `Concurrent edits detected on "${localNote.title}" while offline.`,
    };

    if (existingIdx >= 0) {
      this.conflicts[existingIdx] = conflict;
    } else {
      this.conflicts.unshift(conflict);
    }

    this.saveConflicts();
  }

  // Conflict Resolution Action
  public resolveConflict(
    conflictId: string,
    resolution: ConflictResolutionType,
    currentNotes: Note[]
  ): { updatedNotes: Note[]; message: string } {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict) {
      return { updatedNotes: currentNotes, message: 'Conflict not found or already resolved.' };
    }

    let updatedNotes = [...currentNotes];
    const remoteMirror = this.getRemoteMirror();
    let logMsg = '';

    if (resolution === 'keep_local') {
      // Local version becomes authoritative
      remoteMirror[conflict.noteId] = { ...conflict.localNote, updatedAt: Date.now() };
      logMsg = `Resolved conflict on "${conflict.noteTitle}" by retaining Local Version. Cloud mirror updated.`;
    } else if (resolution === 'keep_remote') {
      // Remote version overwrites local
      const idx = updatedNotes.findIndex((n) => n.id === conflict.noteId);
      if (idx >= 0) {
        updatedNotes[idx] = { ...conflict.remoteNote, updatedAt: Date.now() };
      } else {
        updatedNotes.unshift(conflict.remoteNote);
      }
      remoteMirror[conflict.noteId] = conflict.remoteNote;
      logMsg = `Resolved conflict on "${conflict.noteTitle}" by accepting Remote Version from cloud.`;
    } else if (resolution === 'merge_both') {
      // Intelligent Merge + Conflict Backup Note
      const mergedTags = Array.from(new Set([...conflict.localNote.tags, ...conflict.remoteNote.tags]));
      
      // Combine markdown content with clear delineation
      const mergedContent = [
        conflict.localNote.content,
        '\n\n---\n\n### ☁️ Remote Cloud Content Merged\n',
        conflict.remoteNote.content,
      ].join('\n');

      const mergedNote: Note = {
        ...conflict.localNote,
        tags: mergedTags,
        content: mergedContent,
        updatedAt: Date.now(),
      };

      // Create backup note for the remote copy so nothing is lost
      const backupNote: Note = {
        ...conflict.remoteNote,
        id: `note-conflict-backup-${Date.now()}`,
        title: `[Conflict Copy] ${conflict.remoteNote.title}`,
        tags: [...conflict.remoteNote.tags, 'conflict-backup'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const idx = updatedNotes.findIndex((n) => n.id === conflict.noteId);
      if (idx >= 0) {
        updatedNotes[idx] = mergedNote;
      } else {
        updatedNotes.unshift(mergedNote);
      }
      updatedNotes.unshift(backupNote);

      remoteMirror[conflict.noteId] = mergedNote;
      remoteMirror[backupNote.id] = backupNote;

      logMsg = `Resolved conflict on "${conflict.noteTitle}" by merging changes and generating safety copy "[Conflict Copy] ${conflict.remoteNote.title}".`;
    }

    // Remove from conflicts
    this.conflicts = this.conflicts.filter((c) => c.id !== conflictId);
    this.saveConflicts();
    this.saveRemoteMirror(remoteMirror);

    // Remove any pending queue items for this note
    this.queue = this.queue.filter((q) => q.noteId !== conflict.noteId);
    this.saveQueue();

    this.addLog('conflict_resolved', `Conflict Resolved: "${conflict.noteTitle}"`, logMsg, true);
    this.notify();

    return { updatedNotes, message: logMsg };
  }

  // Simulation Helpers for easy testing & demoing
  public simulateRemoteConflictOnNote(targetNote: Note) {
    const remoteCopy: Note = {
      ...targetNote,
      title: `${targetNote.title} (Cloud Revision v2)`,
      content: `${targetNote.content}\n\n## 📝 Remote Edit by Collaborator\nAdded new theorem notes and problem solutions from Cloud device at ${new Date().toLocaleTimeString()}.`,
      tags: [...targetNote.tags, 'cloud-edit'],
      updatedAt: Date.now() + 1000,
    };

    // Store in remote mirror
    const remote = this.getRemoteMirror();
    remote[targetNote.id] = remoteCopy;
    this.saveRemoteMirror(remote);

    // Register local offline queue item as well
    this.recordLocalNoteChange(
      {
        ...targetNote,
        title: `${targetNote.title} (Local Offline Draft)`,
        content: `${targetNote.content}\n\n## ✍️ My Offline Additions\nAdded local handwritten proofs and annotations while offline on flight.`,
        updatedAt: Date.now(),
      },
      'update',
      targetNote
    );

    this.addLog(
      'conflict_detected',
      `Simulated Conflict Created for "${targetNote.title}"`,
      'Created diverging offline draft vs cloud revision. Click "Sync Now" or check the Conflicts tab.',
      true
    );

    this.notify();
  }

  public simulateIncomingRemoteNote() {
    const now = Date.now();
    const incomingNote: Note = {
      id: `remote-note-${now}`,
      title: `CS402: Cloud Architecture & Replication Notes`,
      type: 'page',
      folderId: 'university',
      tags: ['cloud', 'distributed', 'sync'],
      isPinned: false,
      isArchived: false,
      createdAt: now - 3600000,
      updatedAt: now,
      content: `# CS402: Cloud Replication Protocols\n\n## Multi-Master & Conflict Resolution\n- **CRDTs (Conflict-free Replicated Data Types)** allow convergent concurrent merges.\n- **Last-Write-Wins (LWW)** resolves by Wall-clock or Lamport timestamp.\n- **Operational Transformation (OT)** for character-level collaborative editing.`,
    };

    // Add to remote mirror
    const remote = this.getRemoteMirror();
    remote[incomingNote.id] = incomingNote;
    this.saveRemoteMirror(remote);

    // Add to queue as pending download
    const queueItem: SyncQueueItem = {
      id: `queue-dl-${now}`,
      noteId: incomingNote.id,
      noteTitle: incomingNote.title,
      noteType: incomingNote.type,
      action: 'download',
      changeType: 'create',
      timestamp: now,
      offlineModifiedAt: now,
      changesSummary: ['New note published from desktop client'],
      status: 'pending',
    };

    this.queue.unshift(queueItem);
    this.saveQueue();

    this.addLog(
      'download',
      `Remote Note Available: "${incomingNote.title}"`,
      'New remote revision queued for download.',
      true
    );

    this.notify();
  }

  public clearAllPendingQueue() {
    this.queue = [];
    this.saveQueue();
    this.addLog('sync_all', 'Pending Queue Cleared', 'All pending sync queue items cleared manually.', true);
    this.notify();
  }

  private addLog(
    type: SyncLogEntry['type'],
    title: string,
    details: string,
    success: boolean = true
  ) {
    const entry: SyncLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      type,
      title,
      details,
      success,
    };
    this.logs.unshift(entry);
    // Keep max 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(0, 50);
    }
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
    } catch (e) {
      console.error(e);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY_SYNC_QUEUE, JSON.stringify(this.queue));
    } catch (e) {
      console.error(e);
    }
  }

  private saveConflicts() {
    try {
      localStorage.setItem(STORAGE_KEY_CONFLICTS, JSON.stringify(this.conflicts));
    } catch (e) {
      console.error(e);
    }
  }

  private getRemoteMirror(): Record<string, Note> {
    try {
      const data = localStorage.getItem(STORAGE_KEY_REMOTE_MIRROR);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private saveRemoteMirror(mirror: Record<string, Note>) {
    try {
      localStorage.setItem(STORAGE_KEY_REMOTE_MIRROR, JSON.stringify(mirror));
    } catch (e) {
      console.error(e);
    }
  }
}

export const syncService = new SyncService();
