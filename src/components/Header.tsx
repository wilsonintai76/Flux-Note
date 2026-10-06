import React, { useState, useEffect } from 'react';
import { Note, NotebookFolder } from '../types/note';
import { SyncState } from '../types/sync';
import { UserProfile } from '../types/auth';
import { syncService } from '../services/syncService';
import {
  Search,
  Zap,
  Share2,
  FileText,
  LayoutGrid,
  BookOpen,
  Flame,
  FileCheck,
  X,
  Menu,
  ChevronLeft,
  Download,
  Check,
  Loader2,
  AlertCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Lock,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Brain
} from 'lucide-react';

export type AutoSaveStatus = 'saved' | 'saving' | 'error';

interface HeaderProps {
  activeNote: Note | null;
  folders: NotebookFolder[];
  openTabs: Note[];
  currentUser?: UserProfile | null;
  saveStatus?: AutoSaveStatus;
  lastSavedTime?: number;
  onSelectTab: (note: Note) => void;
  onCloseTab: (noteId: string) => void;
  onOpenQuickSwitcher: () => void;
  onOpenQuickCapture: () => void;
  onOpenExport: () => void;
  onOpenSyncManager?: () => void;
  onOpenFlashcards?: () => void;
  onSignOut?: () => void;
  onLockVault?: () => void;
  onToggleMobileSidebar?: () => void;
  onBackFromNote?: () => void;
  canInstall?: boolean;
  onInstallApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNote,
  folders,
  openTabs,
  currentUser,
  saveStatus = 'saved',
  lastSavedTime,
  onSelectTab,
  onCloseTab,
  onOpenQuickSwitcher,
  onOpenQuickCapture,
  onOpenExport,
  onOpenSyncManager,
  onOpenFlashcards,
  onSignOut,
  onLockVault,
  onToggleMobileSidebar,
  onBackFromNote,
  canInstall,
  onInstallApp,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(() => syncService.getState());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    return syncService.subscribe((state) => {
      setSyncState(state);
    });
  }, []);

  const getTabIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3 h-3 text-purple-600" />;
      case 'research': return <BookOpen className="w-3 h-3 text-emerald-600" />;
      case 'pdf': return <FileCheck className="w-3 h-3 text-red-500" />;
      case 'scratchpad': return <Flame className="w-3 h-3 text-amber-500" />;
      default: return <FileText className="w-3 h-3 text-blue-600" />;
    }
  };

  const totalPending = syncState.pendingUploadsCount + syncState.pendingDownloadsCount;

  return (
    <header className="h-12 bg-white border-b border-stone-200/80 flex items-center justify-between px-3 sm:px-4 z-20 select-none shrink-0 gap-2 sm:gap-4">
      {/* Mobile-Only Navigation Controls */}
      <div className="flex md:hidden items-center gap-1.5 min-w-0">
        {activeNote ? (
          <button
            type="button"
            onClick={onBackFromNote}
            className="flex items-center gap-1 text-xs font-semibold text-stone-700 p-1.5 -ml-1 rounded-lg hover:bg-stone-100"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-[120px]">{activeNote.title || 'Back'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
            title="Open Notebooks Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tablet & Laptop: Open Tabs for fast switching */}
      <div className="hidden md:flex items-center gap-1.5 overflow-x-auto flex-1 max-w-2xl py-1 no-scrollbar">
        {openTabs.map((tabNote) => {
          const isActive = activeNote?.id === tabNote.id;
          return (
            <div
              key={tabNote.id}
              onClick={() => onSelectTab(tabNote)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 max-w-44 group border ${
                isActive
                  ? 'bg-stone-100 text-stone-900 border-stone-300/80 shadow-2xs font-semibold'
                  : 'bg-white hover:bg-stone-50 text-stone-600 border-transparent hover:border-stone-200'
              }`}
            >
              {getTabIcon(tabNote.type)}
              <span className="truncate">{tabNote.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tabNote.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 p-0.5 rounded hover:bg-stone-200/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right: Auto-Save Indicator & Quick actions for all viewports */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Visual Auto-Save Status Indicator */}
        <div className="flex items-center mr-1">
          {saveStatus === 'saving' && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-medium animate-pulse shadow-2xs"
              title="Saving changes to local store..."
            >
              <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
              <span className="hidden sm:inline">Saving...</span>
            </div>
          )}

          {saveStatus === 'saved' && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 text-[11px] font-medium transition-all"
              title={lastSavedTime ? `All changes saved (${new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})` : 'All changes saved locally'}
            >
              <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              <span className="hidden sm:inline">Saved</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-red-700 bg-red-50 border border-red-200 text-[11px] font-medium"
              title="Save error occurred"
            >
              <AlertCircle className="w-3 h-3 text-red-600" />
              <span className="hidden sm:inline">Error</span>
            </div>
          )}
        </div>

        {/* Visual Cloud Sync Status Pill & Manager Trigger */}
        <button
          type="button"
          onClick={onOpenSyncManager}
          title={
            syncState.conflictsCount > 0
              ? `${syncState.conflictsCount} conflict(s) detected. Click to resolve.`
              : syncState.isSyncing
                ? 'Synchronizing with cloud...'
                : !syncState.effectiveOnline
                  ? `Offline Mode: ${totalPending} pending upload(s). Click to view Sync Manager.`
                  : totalPending > 0
                    ? `${totalPending} pending change(s). Click to Sync Now.`
                    : 'Cloud sync active & up-to-date. Click to open Sync Manager.'
          }
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all shadow-2xs ${
            syncState.conflictsCount > 0
              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse hover:bg-rose-100'
              : syncState.isSyncing
                ? 'bg-stone-900 text-white border-stone-800 animate-pulse'
                : !syncState.effectiveOnline
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : totalPending > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
          }`}
        >
          {syncState.conflictsCount > 0 ? (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>{syncState.conflictsCount} Conflict{syncState.conflictsCount > 1 ? 's' : ''}</span>
            </>
          ) : syncState.isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              <span className="hidden sm:inline">Syncing...</span>
            </>
          ) : !syncState.effectiveOnline ? (
            <>
              <CloudOff className="w-3 h-3 text-amber-600" />
              <span className="hidden sm:inline">Offline</span>
              {totalPending > 0 && <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1 rounded-sm">{totalPending}</span>}
            </>
          ) : totalPending > 0 ? (
            <>
              <Cloud className="w-3 h-3 text-blue-600" />
              <span className="hidden sm:inline">Sync</span>
              <span className="text-[10px] bg-blue-200 text-blue-900 px-1 rounded-sm font-bold">{totalPending}</span>
            </>
          ) : (
            <>
              <Cloud className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Synced</span>
            </>
          )}
        </button>

        {/* PWA Install Button */}
        {canInstall && (
          <button
            type="button"
            onClick={onInstallApp}
            title="Install Folio App"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Quick Capture Button */}
        <button
          type="button"
          onClick={onOpenQuickCapture}
          title="Quick Capture (Cmd+Shift+C)"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 text-xs font-semibold shadow-2xs transition-colors"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
          <span className="hidden lg:inline">Quick Capture</span>
        </button>

        {/* Universal Search Button */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          title="Search / Switch Note (Cmd+K)"
          className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Flashcard Study Mode Button (when note is active) */}
        {activeNote && (
          <button
            type="button"
            onClick={onOpenFlashcards}
            title="Study Flashcards for this note"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 hover:bg-amber-100 text-xs font-bold shadow-2xs transition-colors"
          >
            <Brain className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Flashcards</span>
          </button>
        )}

        {/* Export Button (when note is active) */}
        {activeNote && (
          <button
            type="button"
            onClick={onOpenExport}
            title="Export / Share Note"
            className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {/* User Account / Vault Security Dropdown */}
        {currentUser && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-xl hover:bg-stone-100 transition-colors"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              <div className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 text-xs animate-in fade-in zoom-in-95">
                  <div className="p-2.5 border-b border-stone-100 mb-1">
                    <div className="font-bold text-stone-900 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-stone-500 truncate">{currentUser.email}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-semibold font-mono">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Vault Encrypted ({currentUser.role})</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onLockVault?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors text-left"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lock Vault (Cmd+L)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out to Landing Page</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
