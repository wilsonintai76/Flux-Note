import React, { useState, useEffect } from 'react';
import { Note, NotebookFolder, NoteType, ViewFilter } from '../types/note';
import { SyncState } from '../types/sync';
import { syncService } from '../services/syncService';
import {
  Home,
  FileText,
  LayoutGrid,
  BookOpen,
  Flame,
  FileCheck,
  Pin,
  Folder,
  Plus,
  Tag,
  ChevronDown,
  ChevronRight,
  Search,
  Archive,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Clock,
  ArrowDownAZ,
  Check,
  Cloud,
  CloudOff,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export type FolderSortOption = 'alpha' | 'count' | 'default';
export type NoteSortOption = 'modified' | 'created' | 'alpha';

interface SidebarSortConfig {
  folderSort: FolderSortOption;
  noteSort: NoteSortOption;
}

const STORAGE_KEY_SIDEBAR_SORT = 'folio_sidebar_sort_config_v1';

const DEFAULT_SORT_CONFIG: SidebarSortConfig = {
  folderSort: 'default',
  noteSort: 'modified',
};

interface SidebarProps {
  notes: Note[];
  folders: NotebookFolder[];
  activeView: ViewFilter;
  selectedFolderId?: string;
  selectedTag?: string;
  activeNoteId?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectView: (view: ViewFilter, folderId?: string, tag?: string) => void;
  onSelectNote: (note: Note) => void;
  onCreateNewNote: (type: NoteType, folderId?: string) => void;
  onCreateFolder: (name: string, color: string) => void;
  onOpenQuickSwitcher: () => void;
  onOpenSyncManager?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  folders,
  activeView,
  selectedFolderId,
  selectedTag,
  activeNoteId,
  isCollapsed,
  onToggleCollapse,
  onSelectView,
  onSelectNote,
  onCreateNewNote,
  onCreateFolder,
  onOpenQuickSwitcher,
  onOpenSyncManager,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(() => syncService.getState());

  useEffect(() => {
    return syncService.subscribe((state) => setSyncState(state));
  }, []);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({
    university: true,
  });

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortConfig, setSortConfig] = useState<SidebarSortConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SIDEBAR_SORT);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SORT_CONFIG;
  });

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');

  const updateSortConfig = (updates: Partial<SidebarSortConfig>) => {
    const next = { ...sortConfig, ...updates };
    setSortConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR_SORT, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFolderNotesExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Compute tag counts
  const allTagsMap = new Map<string, number>();
  notes.forEach(n => {
    if (!n.isArchived) {
      n.tags.forEach(t => {
        allTagsMap.set(t, (allTagsMap.get(t) || 0) + 1);
      });
    }
  });
  const tagsList = Array.from(allTagsMap.entries()).sort((a, b) => b[1] - a[1]);

  const scratchpadsCount = notes.filter(n => n.type === 'scratchpad' && !n.isArchived && !n.scratchpadData?.isExpired).length;
  const pinnedCount = notes.filter(n => n.isPinned && !n.isArchived).length;

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  // Sort folders
  const sortedFolders = [...folders].sort((a, b) => {
    if (sortConfig.folderSort === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    if (sortConfig.folderSort === 'count') {
      const countA = notes.filter(n => n.folderId === a.id && !n.isArchived).length;
      const countB = notes.filter(n => n.folderId === b.id && !n.isArchived).length;
      return countB - countA;
    }
    return 0; // default order
  });

  // Helper to sort notes for a given folder or view
  const sortNotesList = (notesList: Note[]): Note[] => {
    return [...notesList].sort((a, b) => {
      // Pinned notes always surface to top within folders
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      if (sortConfig.noteSort === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      if (sortConfig.noteSort === 'created') {
        return b.createdAt - a.createdAt;
      }
      // default: modified
      return b.updatedAt - a.updatedAt;
    });
  };

  const getNoteIcon = (type: NoteType) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3 h-3 text-purple-600 shrink-0" />;
      case 'research': return <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />;
      case 'pdf': return <FileCheck className="w-3 h-3 text-red-500 shrink-0" />;
      case 'scratchpad': return <Flame className="w-3 h-3 text-amber-500 shrink-0" />;
      default: return <FileText className="w-3 h-3 text-blue-600 shrink-0" />;
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-14 h-full bg-[#f8f7f4] border-r border-stone-200/80 flex flex-col items-center py-4 justify-between shrink-0 select-none z-20">
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            title="Expand Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenQuickSwitcher}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/60"
            title="Universal Search (Cmd+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-stone-200" />

          <button
            type="button"
            onClick={() => onSelectView('home')}
            className={`p-2 rounded-xl transition-colors ${activeView === 'home' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200/60'}`}
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectView('canvases')}
            className={`p-2 rounded-xl transition-colors ${activeView === 'canvases' ? 'bg-purple-600 text-white' : 'text-stone-600 hover:bg-stone-200/60'}`}
            title="Canvases"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectView('scratchpads')}
            className={`p-2 rounded-xl transition-colors ${activeView === 'scratchpads' ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-200/60'}`}
            title="Scratchpads"
          >
            <Flame className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onCreateNewNote('page')}
          className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-md hover:bg-stone-800"
          title="New Note"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 h-full bg-[#f8f7f4] border-r border-stone-200/80 flex flex-col justify-between shrink-0 select-none z-20">
      {/* Top App Brand & Switcher button */}
      <div className="p-4 border-b border-stone-200/70">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif font-bold text-sm shadow-xs">
              F
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-stone-900">Folio</h1>
              <p className="text-[10px] text-stone-400 font-mono">Workspace & Ink</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search Launcher */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-stone-400 hover:border-stone-300 text-xs shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="text-stone-500">Quick search...</span>
          </span>
          <kbd className="text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">⌘K</kbd>
        </button>
      </div>

      {/* Main Navigation Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Core Views */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectView('home')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeView === 'home' ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-stone-500" />
              <span>Home & Recent</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeView === 'all' && !selectedFolderId && !selectedTag ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>All Documents</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">{notes.filter(n => !n.isArchived).length}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('pinned')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeView === 'pinned' ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-amber-500 fill-current" />
              <span>Pinned Notes</span>
            </span>
            {pinnedCount > 0 && (
              <span className="text-[11px] font-mono text-amber-700 bg-amber-100 px-1.5 rounded-full">{pinnedCount}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectView('canvases')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeView === 'canvases' ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutGrid className="w-4 h-4 text-purple-500" />
              <span>Infinite Canvases</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              {notes.filter(n => n.type === 'canvas' && !n.isArchived).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('research')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeView === 'research' ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Research & Papers</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              {notes.filter(n => n.type === 'research' && !n.isArchived).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('scratchpads')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeView === 'scratchpads' ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Temporary Scratch</span>
            </span>
            {scratchpadsCount > 0 && (
              <span className="text-[11px] font-mono text-amber-800 bg-amber-100 font-semibold px-1.5 py-0.2 rounded-full">
                {scratchpadsCount}
              </span>
            )}
          </button>
        </div>

        {/* Notebooks / Courses Section with Sorting Preference Header */}
        <div className="relative">
          <div className="flex items-center justify-between px-2.5 mb-1.5">
            <button
              type="button"
              onClick={() => setFoldersExpanded(!foldersExpanded)}
              className="flex items-center gap-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider hover:text-stone-700"
            >
              {foldersExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Notebooks</span>
            </button>

            <div className="flex items-center gap-0.5">
              {/* Sorting Preferences Trigger */}
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                title="Sidebar Sorting Preferences"
                className={`p-1 rounded-lg transition-colors ${
                  showSortMenu ? 'bg-stone-300 text-stone-900' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/60'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setShowNewFolderModal(true)}
                title="Add Notebook"
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sorting Preferences Popover Dropdown */}
          {showSortMenu && (
            <div className="absolute right-2 top-8 z-40 w-52 bg-white rounded-xl shadow-xl border border-stone-200 p-2 text-xs text-stone-700 animate-in fade-in">
              <div className="text-[10px] font-bold uppercase text-stone-400 px-2 py-1">
                Folder Sorting
              </div>
              <div className="space-y-0.5 mb-2">
                {[
                  { id: 'alpha', label: 'Alphabetical (A-Z)' },
                  { id: 'count', label: 'Most Notes First' },
                  { id: 'default', label: 'Default Order' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSortConfig({ folderSort: opt.id as FolderSortOption })}
                    className="w-full text-left px-2 py-1 rounded-md hover:bg-stone-100 flex items-center justify-between text-xs"
                  >
                    <span>{opt.label}</span>
                    {sortConfig.folderSort === opt.id && <Check className="w-3 h-3 text-blue-600" />}
                  </button>
                ))}
              </div>

              <div className="text-[10px] font-bold uppercase text-stone-400 px-2 py-1 border-t border-stone-100 pt-1.5">
                Notes Sorting
              </div>
              <div className="space-y-0.5">
                {[
                  { id: 'modified', label: 'Date Modified (Newest)', icon: Clock },
                  { id: 'created', label: 'Date Created (Newest)', icon: Calendar },
                  { id: 'alpha', label: 'Alphabetical (A-Z)', icon: ArrowDownAZ },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSortConfig({ noteSort: opt.id as NoteSortOption })}
                      className="w-full text-left px-2 py-1 rounded-md hover:bg-stone-100 flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-stone-400" />
                        <span>{opt.label}</span>
                      </span>
                      {sortConfig.noteSort === opt.id && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-1 border-t border-stone-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSortMenu(false)}
                  className="text-[11px] text-stone-500 hover:text-stone-800 px-2 py-0.5"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Folder List with Nested Notes Tree */}
          {foldersExpanded && (
            <div className="space-y-1">
              {sortedFolders.map(folder => {
                const isSelected = activeView === 'folder' && selectedFolderId === folder.id;
                const folderNotes = notes.filter(n => n.folderId === folder.id && !n.isArchived);
                const sortedFolderNotes = sortNotesList(folderNotes);
                const isNotesTreeExpanded = !!expandedFolderIds[folder.id];

                return (
                  <div key={folder.id} className="space-y-0.5">
                    {/* Folder Row */}
                    <div
                      onClick={() => onSelectView('folder', folder.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer group ${
                        isSelected ? 'bg-stone-200/80 text-stone-900 font-semibold' : 'text-stone-600 hover:bg-stone-200/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Nested tree expand toggle */}
                        <button
                          type="button"
                          onClick={(e) => toggleFolderNotesExpand(folder.id, e)}
                          className="p-0.5 text-stone-400 hover:text-stone-700 rounded"
                        >
                          {isNotesTreeExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>

                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span className="truncate">{folder.name}</span>
                      </div>

                      <span className="text-[11px] font-mono text-stone-400 ml-1">
                        {folderNotes.length}
                      </span>
                    </div>

                    {/* Nested Notes directly inside the folder in Sidebar */}
                    {isNotesTreeExpanded && folderNotes.length > 0 && (
                      <div className="pl-6 pr-1 space-y-0.5 border-l border-stone-200 ml-3.5 my-0.5">
                        {sortedFolderNotes.map(n => {
                          const isNoteActive = activeNoteId === n.id;
                          return (
                            <div
                              key={n.id}
                              onClick={() => onSelectNote(n)}
                              title={n.title}
                              className={`flex items-center justify-between px-2 py-1 rounded-lg text-[11px] cursor-pointer transition-colors group ${
                                isNoteActive
                                  ? 'bg-stone-200 text-stone-900 font-medium'
                                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {getNoteIcon(n.type)}
                                <span className="truncate">{n.title}</span>
                              </div>

                              {n.isPinned && (
                                <Pin className="w-2.5 h-2.5 text-amber-500 fill-current shrink-0 ml-1" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags Section */}
        {tagsList.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <button
                type="button"
                onClick={() => setTagsExpanded(!tagsExpanded)}
                className="flex items-center gap-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider hover:text-stone-700"
              >
                {tagsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Tags</span>
              </button>
            </div>

            {tagsExpanded && (
              <div className="flex flex-wrap gap-1 px-1.5">
                {tagsList.map(([tag, count]) => {
                  const isSelected = activeView === 'tag' && selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectView('tag', undefined, tag)}
                      className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-stone-900 text-white font-medium'
                          : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200/70'
                      }`}
                    >
                      #{tag} <span className="opacity-60 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3 border-t border-stone-200/70 bg-[#f4f3ef] flex flex-col gap-2">
        {/* Sync Manager Quick Status Bar */}
        <button
          type="button"
          onClick={onOpenSyncManager}
          title="Open Cloud Sync & Offline Manager"
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
            syncState.conflictsCount > 0
              ? 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse font-bold'
              : !syncState.effectiveOnline
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : syncState.pendingUploadsCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {syncState.conflictsCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : syncState.isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            ) : !syncState.effectiveOnline ? (
              <CloudOff className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="text-[11px] truncate">
              {syncState.conflictsCount > 0
                ? `${syncState.conflictsCount} Conflict(s)`
                : syncState.isSyncing
                  ? 'Syncing...'
                  : !syncState.effectiveOnline
                    ? `Offline (${syncState.pendingUploadsCount} pending)`
                    : syncState.pendingUploadsCount > 0
                      ? `${syncState.pendingUploadsCount} pending upload`
                      : 'Cloud Synced'}
            </span>
          </div>

          <span className="text-[10px] text-stone-400 font-medium">Sync Mgr →</span>
        </button>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onCreateNewNote('page')}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>

          <button
            type="button"
            onClick={() => onCreateNewNote('canvas')}
            title="New Infinite Canvas"
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 shadow-2xs transition-colors"
          >
            <LayoutGrid className="w-4 h-4 text-purple-600" />
          </button>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-xl max-w-xs w-full border border-stone-200 animate-in fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-3">
              Create Notebook / Course
            </h4>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. CS402: Distributed Systems"
              className="w-full text-xs p-2.5 rounded-lg border border-stone-300 focus:outline-none mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-stone-500">Color:</span>
              {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewFolderColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${newFolderColor === c ? 'scale-125 ring-2 ring-stone-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="px-3 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
