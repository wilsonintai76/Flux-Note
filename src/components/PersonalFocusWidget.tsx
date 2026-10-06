import React, { useState, useEffect } from 'react';
import { Note, NotebookFolder, HomeWidgetConfig, NoteType } from '../types/note';
import { NoteStorageService } from '../services/storage';
import { 
  Pin, 
  Clock, 
  SlidersHorizontal, 
  FileText, 
  LayoutGrid, 
  BookOpen, 
  Flame, 
  FileCheck, 
  Check, 
  ChevronDown,
  ExternalLink,
  Sparkles,
  LayoutList,
  Grid
} from 'lucide-react';

interface PersonalFocusWidgetProps {
  notes: Note[];
  folders: NotebookFolder[];
  onSelectNote: (note: Note) => void;
  onTogglePin: (noteId: string) => void;
}

const STORAGE_KEY_WIDGET_CONFIG = 'folio_home_widget_config_v1';

const DEFAULT_CONFIG: HomeWidgetConfig = {
  filterNotebookId: 'all',
  filterTag: 'all',
  viewMode: 'grid',
  limit: 6,
  showPinnedOnly: false,
  sortBy: 'recent',
};

export const PersonalFocusWidget: React.FC<PersonalFocusWidgetProps> = ({
  notes,
  folders,
  onSelectNote,
  onTogglePin,
}) => {
  const [config, setConfig] = useState<HomeWidgetConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WIDGET_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CONFIG;
  });

  const [showConfigPopover, setShowConfigPopover] = useState(false);

  // Save config changes persistently
  const updateConfig = (updates: Partial<HomeWidgetConfig>) => {
    const nextConfig = { ...config, ...updates };
    setConfig(nextConfig);
    try {
      localStorage.setItem(STORAGE_KEY_WIDGET_CONFIG, JSON.stringify(nextConfig));
    } catch (e) {
      console.error(e);
    }
  };

  // Collect all unique tags for filter
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags))).sort();

  // Get recently viewed note IDs
  const recentIds = NoteStorageService.getRecentNoteIds();

  // Filter and sort notes for this widget
  let candidateNotes = notes.filter(n => !n.isArchived);

  // Notebook filter
  if (config.filterNotebookId !== 'all') {
    candidateNotes = candidateNotes.filter(n => n.folderId === config.filterNotebookId);
  }

  // Tag filter
  if (config.filterTag !== 'all') {
    candidateNotes = candidateNotes.filter(n => n.tags.includes(config.filterTag));
  }

  // Pinned only filter
  if (config.showPinnedOnly) {
    candidateNotes = candidateNotes.filter(n => n.isPinned);
  }

  // Sort
  if (config.sortBy === 'recent') {
    // Sort by recent access order
    candidateNotes.sort((a, b) => {
      const idxA = recentIds.indexOf(a.id);
      const idxB = recentIds.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.updatedAt - a.updatedAt;
    });
  } else if (config.sortBy === 'updated') {
    candidateNotes.sort((a, b) => b.updatedAt - a.updatedAt);
  } else {
    candidateNotes.sort((a, b) => a.title.localeCompare(b.title));
  }

  const displayedNotes = candidateNotes.slice(0, config.limit);

  const getNoteTypeIcon = (type: NoteType) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />;
      case 'research': return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />;
      case 'pdf': return <FileCheck className="w-3.5 h-3.5 text-red-500" />;
      case 'scratchpad': return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      default: return <FileText className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs relative">
      {/* Widget Header with Settings Toggle */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Personalized Focus & Jump-In
            </h3>
            <p className="text-[11px] text-stone-600">
              {config.showPinnedOnly ? 'Pinned Notes' : 'Most Recently Viewed'} 
              {config.filterNotebookId !== 'all' && ` • ${folders.find(f => f.id === config.filterNotebookId)?.name}`}
              {config.filterTag !== 'all' && ` • #${config.filterTag}`}
            </p>
          </div>
        </div>

        {/* Customization Button */}
        <div className="flex items-center gap-2">
          {/* Quick toggle view mode */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => updateConfig({ viewMode: 'grid' })}
              title="Grid Cards View"
              className={`p-1 rounded-md transition-colors ${
                config.viewMode === 'grid' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-500'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ viewMode: 'compact' })}
              title="Compact List View"
              className={`p-1 rounded-md transition-colors ${
                config.viewMode === 'compact' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-500'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigPopover(!showConfigPopover)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showConfigPopover ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Customizer Settings Popover */}
      {showConfigPopover && (
        <div className="mb-5 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between font-bold text-stone-700">
            <span>Widget Configuration</span>
            <button
              type="button"
              onClick={() => setShowConfigPopover(false)}
              className="text-stone-400 hover:text-stone-700"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Notebook filter */}
            <div>
              <label className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                Filter by Notebook
              </label>
              <select
                value={config.filterNotebookId}
                onChange={(e) => updateConfig({ filterNotebookId: e.target.value })}
                className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none"
              >
                <option value="all">All Notebooks</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Tag filter */}
            <div>
              <label className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                Filter by Tag
              </label>
              <select
                value={config.filterTag}
                onChange={(e) => updateConfig({ filterTag: e.target.value })}
                className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div>
              <label className="text-[10px] font-bold uppercase text-stone-400 block mb-1">
                Sort Preference
              </label>
              <select
                value={config.sortBy}
                onChange={(e) => updateConfig({ sortBy: e.target.value as any })}
                className="w-full p-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none"
              >
                <option value="recent">Most Recently Viewed</option>
                <option value="updated">Recently Modified</option>
                <option value="title">Alphabetical Title</option>
              </select>
            </div>
          </div>

          {/* Checkboxes row */}
          <div className="flex items-center gap-6 pt-2 border-t border-stone-200/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showPinnedOnly}
                onChange={(e) => updateConfig({ showPinnedOnly: e.target.checked })}
                className="rounded text-stone-900 focus:ring-0"
              />
              <span className="text-stone-700 font-medium">Show pinned notes only</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-stone-500">Show:</span>
              {[4, 6, 8, 12].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => updateConfig({ limit: num })}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                    config.limit === num ? 'bg-stone-900 text-white font-bold' : 'bg-white text-stone-600 border'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Displayed Content */}
      {displayedNotes.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          No documents match this widget filter. Try changing your notebook or tag filter in the Customize panel.
        </div>
      ) : config.viewMode === 'grid' ? (
        /* Grid Card Layout */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="p-4 rounded-2xl border border-stone-200/80 hover:border-amber-300 hover:shadow-md transition-all bg-[#faf9f7] hover:bg-white cursor-pointer group flex flex-col justify-between h-44 relative"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {getNoteTypeIcon(note.type)}
                    <span className="text-[10px] text-stone-400 font-mono capitalize">
                      {note.type}
                    </span>
                  </div>

                  {/* Direct Pin / Unpin button in widget */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                    }}
                    title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                    className={`p-1 rounded-lg transition-colors ${
                      note.isPinned
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-stone-300 hover:text-stone-600 hover:bg-stone-200/60'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h4 className="text-xs font-bold text-stone-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
                  {note.title}
                </h4>

                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1.5 leading-relaxed font-sans">
                  {note.content || 'Canvas nodes and annotations.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/50 text-[10px] text-stone-400">
                <span className="font-mono">
                  {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
                {note.tags.length > 0 && (
                  <span className="truncate max-w-28 text-stone-500">
                    #{note.tags[0]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Compact Row List Layout */
        <div className="divide-y divide-stone-100 border border-stone-200/80 rounded-2xl overflow-hidden bg-[#faf9f7]">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="p-3 hover:bg-white transition-colors cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {getNoteTypeIcon(note.type)}
                <span className="text-xs font-bold text-stone-900 group-hover:text-blue-600 truncate">
                  {note.title}
                </span>
                {note.tags.length > 0 && (
                  <span className="text-[10px] text-stone-400 hidden sm:inline">
                    #{note.tags[0]}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-mono text-stone-400">
                  {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note.id);
                  }}
                  title={note.isPinned ? 'Unpin note' : 'Pin note'}
                  className={`p-1 rounded-lg ${note.isPinned ? 'text-amber-500' : 'text-stone-300 hover:text-stone-600'}`}
                >
                  <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
