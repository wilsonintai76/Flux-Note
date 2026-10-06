import React, { useState, useEffect } from 'react';
import { Note } from '../types/note';
import { 
  SyncState, 
  SyncQueueItem, 
  SyncConflict, 
  ConflictResolutionType 
} from '../types/sync';
import { syncService } from '../services/syncService';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Upload, 
  Download, 
  FileText, 
  LayoutGrid, 
  BookOpen, 
  Flame, 
  FileCheck, 
  Clock, 
  Wifi, 
  WifiOff, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Split, 
  ShieldCheck, 
  History, 
  Sparkles, 
  Trash2,
  GitBranch,
  Copy,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';

interface SyncManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onNotesUpdated: (newNotes: Note[]) => void;
  activeNote?: Note | null;
  onSelectNote?: (note: Note) => void;
}

export const SyncManagerModal: React.FC<SyncManagerModalProps> = ({
  isOpen,
  onClose,
  notes,
  onNotesUpdated,
  activeNote,
  onSelectNote,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(() => syncService.getState());
  const [activeTab, setActiveTab] = useState<'queue' | 'conflicts' | 'logs' | 'playground'>('queue');
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<SyncQueueItem | null>(null);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Subscribe to sync service state updates
  useEffect(() => {
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
      // Auto switch to conflicts tab if new conflicts arrive
      if (state.conflicts.length > 0 && activeTab !== 'conflicts') {
        setSelectedConflictId(state.conflicts[0].id);
      }
    });
    return unsubscribe;
  }, [activeTab]);

  // If selected conflict no longer exists, select first available
  useEffect(() => {
    if (syncState.conflicts.length > 0) {
      if (!selectedConflictId || !syncState.conflicts.some((c) => c.id === selectedConflictId)) {
        setSelectedConflictId(syncState.conflicts[0].id);
      }
    } else {
      setSelectedConflictId(null);
    }
  }, [syncState.conflicts, selectedConflictId]);

  if (!isOpen) return null;

  const totalPending = syncState.pendingUploadsCount + syncState.pendingDownloadsCount;
  const activeConflict = syncState.conflicts.find((c) => c.id === selectedConflictId) || syncState.conflicts[0];

  const handleManualSyncNow = async () => {
    setSyncFeedback(null);
    setIsSyncingLocal(true);
    const result = await syncService.syncNow(notes, (updated) => {
      onNotesUpdated(updated);
    });
    setIsSyncingLocal(false);

    if (result.success) {
      setSyncFeedback({
        type: result.conflictsFound > 0 ? 'info' : 'success',
        message: result.message,
      });
      if (result.conflictsFound > 0) {
        setActiveTab('conflicts');
      }
    } else {
      setSyncFeedback({
        type: 'error',
        message: result.message,
      });
    }

    setTimeout(() => setSyncFeedback(null), 6000);
  };

  const handleResolveConflict = (resolution: ConflictResolutionType) => {
    if (!activeConflict) return;
    const { updatedNotes, message } = syncService.resolveConflict(activeConflict.id, resolution, notes);
    onNotesUpdated(updatedNotes);
    setSyncFeedback({ type: 'success', message });
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const getNoteTypeIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />;
      case 'research': return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />;
      case 'pdf': return <FileCheck className="w-3.5 h-3.5 text-red-500" />;
      case 'scratchpad': return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      default: return <FileText className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs ${
              syncState.conflictsCount > 0
                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                : syncState.effectiveOnline
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {syncState.conflictsCount > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : syncState.effectiveOnline ? (
                <Cloud className="w-5 h-5" />
              ) : (
                <CloudOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Cloud Sync & Offline Manager
                </h3>
                {syncState.conflictsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
                    {syncState.conflictsCount} Conflict{syncState.conflictsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                Manage offline mutations, inspect queue diffs, and resolve concurrent edits.
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Network Mode Switch */}
            <button
              type="button"
              onClick={() => syncService.setSimulatedOffline(!syncState.isSimulatedOffline)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                syncState.isSimulatedOffline
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
              title={syncState.isSimulatedOffline ? 'Switch back to online mode' : 'Simulate offline status to test offline queuing'}
            >
              {syncState.isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Simulated Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Online Network</span>
                </>
              )}
            </button>

            {/* Sync Now Button */}
            <button
              type="button"
              onClick={handleManualSyncNow}
              disabled={syncState.isSyncing || !syncState.effectiveOnline}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                syncState.isSyncing
                  ? 'bg-stone-700 cursor-wait'
                  : !syncState.effectiveOnline
                    ? 'bg-stone-300 cursor-not-allowed opacity-60'
                    : 'bg-stone-900 hover:bg-stone-800 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncState.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Progress Banner (when syncing) */}
        {syncState.isSyncing && (
          <div className="bg-stone-900 text-white px-4 py-2 flex flex-col gap-1.5 shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                {syncState.syncStepMessage || 'Synchronizing with cloud...'}
              </span>
              <span className="font-mono text-stone-300 font-bold">{syncState.syncProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${syncState.syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Sync Notification Banner */}
        {syncFeedback && (
          <div className={`px-4 py-2 text-xs font-medium flex items-center justify-between shrink-0 animate-in slide-in-from-top-1 ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : syncFeedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
          }`}>
            <span className="flex items-center gap-2">
              {syncFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {syncFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600" />}
              {syncFeedback.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600" />}
              {syncFeedback.message}
            </span>
            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              className="text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-stone-200/80 border-b border-stone-200 bg-white text-stone-800 shrink-0 text-xs">
          <div className="p-3 sm:px-4 flex flex-col">
            <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">Storage Health</span>
            <span className="font-bold text-stone-900 mt-0.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${syncState.effectiveOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {syncState.effectiveOnline ? 'Online (Synced)' : 'Offline / Queued'}
            </span>
          </div>

          <div className="p-3 sm:px-4 flex flex-col">
            <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">Pending Uploads</span>
            <span className={`font-bold mt-0.5 flex items-center gap-1 ${
              syncState.pendingUploadsCount > 0 ? 'text-amber-700' : 'text-stone-700'
            }`}>
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              {syncState.pendingUploadsCount} note{syncState.pendingUploadsCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="p-3 sm:px-4 flex flex-col">
            <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">Remote Updates</span>
            <span className={`font-bold mt-0.5 flex items-center gap-1 ${
              syncState.pendingDownloadsCount > 0 ? 'text-blue-700' : 'text-stone-700'
            }`}>
              <Download className="w-3.5 h-3.5 text-blue-500" />
              {syncState.pendingDownloadsCount} incoming
            </span>
          </div>

          <div className="p-3 sm:px-4 flex flex-col">
            <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">Conflicts</span>
            <span className={`font-bold mt-0.5 flex items-center gap-1 ${
              syncState.conflictsCount > 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}>
              {syncState.conflictsCount > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  {syncState.conflictsCount} to resolve
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  0 conflicts
                </>
              )}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 sm:px-4 flex flex-col border-t sm:border-t-0 border-stone-200">
            <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">Last Cloud Sync</span>
            <span className="text-stone-700 font-medium mt-0.5 truncate flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              {syncState.lastSyncTime 
                ? new Date(syncState.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Never'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-50/50 px-4 gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'queue'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Pending Queue</span>
            {totalPending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
                {totalPending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('conflicts')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'conflicts'
                ? 'border-rose-600 text-rose-700 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Split className="w-3.5 h-3.5 text-rose-500" />
            <span>Conflict Resolution</span>
            {syncState.conflictsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                {syncState.conflictsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'logs'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Activity Log</span>
            <span className="text-stone-400 text-[10px]">({syncState.logs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'playground'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Testing Playground</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50/30 min-h-[340px]">
          {/* TAB 1: PENDING QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Offline & Pending Queue ({syncState.queue.length})
                  </h4>
                  <p className="text-xs text-stone-500">
                    Documents edited while offline or awaiting cloud replication.
                  </p>
                </div>
                {syncState.queue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => syncService.clearAllPendingQueue()}
                    className="text-xs text-stone-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors"
                  >
                    Clear Queue
                  </button>
                )}
              </div>

              {syncState.queue.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-stone-200/80 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-900 mb-1">Queue is Clear!</h5>
                  <p className="text-xs text-stone-500 max-w-md mb-4">
                    All your local notes and modifications are fully up-to-date with cloud storage.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeNote) {
                        syncService.recordLocalNoteChange(
                          { ...activeNote, content: activeNote.content + '\n\n*(Offline draft paragraph)*', updatedAt: Date.now() },
                          'update',
                          activeNote
                        );
                      } else if (notes[0]) {
                        syncService.recordLocalNoteChange(notes[0], 'update');
                      }
                    }}
                    className="text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    + Simulate Queueing an Offline Edit
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {syncState.queue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl p-4 border border-stone-200/80 shadow-2xs hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          item.action === 'upload' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {item.action === 'upload' ? <Upload className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {getNoteTypeIcon(item.noteType)}
                            <h5 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                              {item.noteTitle}
                            </h5>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              item.action === 'upload' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.action === 'upload' ? 'Pending Upload' : 'Incoming Download'}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-stone-600">
                            {item.changesSummary.map((sum, i) => (
                              <span key={i} className="inline-flex items-center bg-stone-100 px-2 py-0.5 rounded text-stone-700 font-medium">
                                • {sum}
                              </span>
                            ))}
                          </div>

                          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-stone-400">
                            <span>Queued {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span>•</span>
                            <span className="font-mono">ID: {item.noteId.slice(0, 14)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            const noteObj = notes.find((n) => n.id === item.noteId);
                            if (noteObj && onSelectNote) {
                              onSelectNote(noteObj);
                              onClose();
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                        >
                          Open Note
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONFLICT RESOLUTION */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Split className="w-4 h-4 text-rose-500" />
                    Conflict Resolution Workspace ({syncState.conflicts.length})
                  </h4>
                  <p className="text-xs text-stone-500">
                    Compare divergent offline changes against cloud versions and resolve without data loss.
                  </p>
                </div>
              </div>

              {syncState.conflicts.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 border border-stone-200/80 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h5 className="text-base font-bold text-stone-900 mb-1">No Divergent Conflicts Found</h5>
                  <p className="text-xs text-stone-500 max-w-md mb-5">
                    Your local database is clean. If you would like to test the visual diff and three-way conflict resolver, click below.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeNote || notes[0];
                      if (target) {
                        syncService.simulateRemoteConflictOnNote(target);
                      }
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-xl shadow-2xs transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Simulate Sample Conflict on "{activeNote?.title || notes[0]?.title || 'Note'}"
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* If multiple conflicts, conflict selector tabs */}
                  {syncState.conflicts.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {syncState.conflicts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedConflictId(c.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                            selectedConflictId === c.id
                              ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          ⚠️ {c.noteTitle}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeConflict && (
                    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
                      {/* Conflict Header & Resolution Bar */}
                      <div className="p-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                              Concurrent Conflict
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {activeConflict.noteTitle}
                            </h4>
                          </div>
                          <p className="text-[11px] text-stone-300 mt-0.5">
                            {activeConflict.summary}
                          </p>
                        </div>

                        {/* 3 Resolution Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResolveConflict('keep_local')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs transition-colors"
                            title="Overwrite remote version with this device's offline edits"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Keep Local</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResolveConflict('keep_remote')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-2xs transition-colors"
                            title="Discard offline edits and adopt remote version from cloud"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Keep Remote</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResolveConflict('merge_both')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-2xs transition-colors"
                            title="Merge both contents and preserve a conflict backup copy"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Merge Both & Backup</span>
                          </button>
                        </div>
                      </div>

                      {/* Side-by-Side Diff Inspector */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200">
                        {/* LEFT: Local Offline Version */}
                        <div className="p-4 sm:p-5 flex flex-col bg-emerald-50/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                Local Version (This Device)
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                              Offline Draft
                            </span>
                          </div>

                          <div className="space-y-2 mb-4 text-xs">
                            <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block">Title</span>
                              <span className="font-semibold text-stone-900">{activeConflict.localNote.title}</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block">Tags</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {activeConflict.localNote.tags.map((t) => (
                                  <span key={t} className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-200">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 flex-1 min-h-[140px] max-h-[220px] overflow-y-auto font-mono text-[11px] text-stone-800 whitespace-pre-wrap">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block font-sans mb-1">Markdown Body Content</span>
                              {activeConflict.localNote.content || '<Empty Content>'}
                            </div>
                          </div>

                          <div className="mt-auto pt-2 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
                            <span>Modified: {new Date(activeConflict.localNote.updatedAt).toLocaleTimeString()}</span>
                            <span className="font-mono">{activeConflict.localNote.content?.length || 0} chars</span>
                          </div>
                        </div>

                        {/* RIGHT: Remote Cloud Version */}
                        <div className="p-4 sm:p-5 flex flex-col bg-blue-50/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                Remote Version (Cloud Server)
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md font-semibold">
                              Remote Revision
                            </span>
                          </div>

                          <div className="space-y-2 mb-4 text-xs">
                            <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block">Title</span>
                              <span className="font-semibold text-stone-900">{activeConflict.remoteNote.title}</span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block">Tags</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {activeConflict.remoteNote.tags.map((t) => (
                                  <span key={t} className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 text-[10px] font-medium border border-blue-200">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 flex-1 min-h-[140px] max-h-[220px] overflow-y-auto font-mono text-[11px] text-stone-800 whitespace-pre-wrap">
                              <span className="text-[10px] text-stone-400 font-bold uppercase block font-sans mb-1">Markdown Body Content</span>
                              {activeConflict.remoteNote.content || '<Empty Content>'}
                            </div>
                          </div>

                          <div className="mt-auto pt-2 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
                            <span>Modified: {new Date(activeConflict.remoteNote.updatedAt).toLocaleTimeString()}</span>
                            <span className="font-mono">{activeConflict.remoteNote.content?.length || 0} chars</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIVITY LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Sync & Audit Activity Log
                  </h4>
                  <p className="text-xs text-stone-500">
                    Chronological history of background synchronization, network status changes, and conflict actions.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden divide-y divide-stone-100">
                {syncState.logs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400">
                    No sync events recorded yet.
                  </div>
                ) : (
                  syncState.logs.map((log) => (
                    <div key={log.id} className="p-3.5 sm:px-4 flex items-start gap-3 hover:bg-stone-50/80 transition-colors">
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        log.type === 'sync_all'
                          ? 'bg-emerald-50 text-emerald-600'
                          : log.type === 'conflict_detected'
                            ? 'bg-rose-50 text-rose-600'
                            : log.type === 'conflict_resolved'
                              ? 'bg-indigo-50 text-indigo-600'
                              : log.type === 'upload'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-stone-100 text-stone-600'
                      }`}>
                        {log.type === 'sync_all' && <Check className="w-3.5 h-3.5" />}
                        {log.type === 'conflict_detected' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {log.type === 'conflict_resolved' && <GitBranch className="w-3.5 h-3.5" />}
                        {log.type === 'upload' && <Upload className="w-3.5 h-3.5" />}
                        {log.type === 'download' && <Download className="w-3.5 h-3.5" />}
                        {log.type === 'network_change' && <Wifi className="w-3.5 h-3.5" />}
                        {log.type === 'error' && <AlertTriangle className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h6 className="text-xs font-bold text-stone-900">
                            {log.title}
                          </h6>
                          <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">
                          {log.details}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TESTING PLAYGROUND */}
          {activeTab === 'playground' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Sync & Conflict Simulation Playground
                </h4>
                <p className="text-xs text-stone-500">
                  Instant tools to test offline queues, conflict resolutions, and multi-device simulation scenarios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Simulation Card 1: Toggle Offline */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <WifiOff className="w-4 h-4 text-amber-600" />
                      <h5 className="text-xs font-bold text-stone-900">Simulate Offline Mode</h5>
                    </div>
                    <p className="text-xs text-stone-500 mb-3">
                      Forces the app to behave as if internet connection was lost. Edits made in this state will remain in the pending queue.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => syncService.setSimulatedOffline(!syncState.isSimulatedOffline)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                      syncState.isSimulatedOffline
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {syncState.isSimulatedOffline ? 'Switch to Online Mode' : 'Enable Offline Simulation'}
                  </button>
                </div>

                {/* Simulation Card 2: Create Realistic Conflict */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Split className="w-4 h-4 text-rose-500" />
                      <h5 className="text-xs font-bold text-stone-900">Simulate Concurrent Conflict</h5>
                    </div>
                    <p className="text-xs text-stone-500 mb-3">
                      Simulates a scenario where a teammate edited this note in the cloud while you were writing offline on another device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeNote || notes[0];
                      if (target) {
                        syncService.simulateRemoteConflictOnNote(target);
                        setActiveTab('conflicts');
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                  >
                    Create Sample Conflict on Current Note
                  </button>
                </div>

                {/* Simulation Card 3: Incoming Remote Update */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Download className="w-4 h-4 text-blue-500" />
                      <h5 className="text-xs font-bold text-stone-900">Simulate Incoming Remote Note</h5>
                    </div>
                    <p className="text-xs text-stone-500 mb-3">
                      Generates a new note on the cloud server ready to be pulled into your local database on next sync.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      syncService.simulateIncomingRemoteNote();
                      setActiveTab('queue');
                    }}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    Queue Incoming Remote Note
                  </button>
                </div>

                {/* Simulation Card 4: Run Manual Sync */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <RefreshCw className="w-4 h-4 text-emerald-600" />
                      <h5 className="text-xs font-bold text-stone-900">Force Cloud Sync</h5>
                    </div>
                    <p className="text-xs text-stone-500 mb-3">
                      Executes full reconciliation algorithm: validates checksums, uploads local drafts, pulls remote revisions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualSyncNow}
                    disabled={syncState.isSyncing}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    Run Full Sync Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-stone-200 bg-stone-50/80 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-stone-400" />
            <span>Local Store: IndexedDB & LocalStorage</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
