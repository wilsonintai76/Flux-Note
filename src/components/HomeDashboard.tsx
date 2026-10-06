import React, { useState } from 'react';
import { Note, NotebookFolder, NoteType } from '../types/note';
import { PersonalFocusWidget } from './PersonalFocusWidget';
import {
  FileText,
  LayoutGrid,
  BookOpen,
  Flame,
  FileCheck,
  Pin,
  Clock,
  Sparkles,
  Plus,
  ArrowRight,
  Search,
  Folder,
  Tag,
  PenTool,
  SlidersHorizontal
} from 'lucide-react';

interface HomeDashboardProps {
  notes: Note[];
  folders: NotebookFolder[];
  onSelectNote: (note: Note) => void;
  onCreateNewNote: (type: NoteType, folderId?: string) => void;
  onOpenQuickSwitcher: () => void;
  onOpenQuickCapture: () => void;
  onSelectFolder: (folderId: string) => void;
  onTogglePin: (noteId: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  notes,
  folders,
  onSelectNote,
  onCreateNewNote,
  onOpenQuickSwitcher,
  onOpenQuickCapture,
  onSelectFolder,
  onTogglePin,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const pinnedNotes = notes.filter(n => n.isPinned && !n.isArchived);
  const scratchpads = notes.filter(n => n.type === 'scratchpad' && !n.isArchived);
  
  // Sorted by recent update
  const recentNotes = [...notes]
    .filter(n => !n.isArchived)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const filteredNotes = recentNotes.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = n.title.toLowerCase().includes(q);
      const inContent = n.content.toLowerCase().includes(q);
      const inTags = n.tags.some(t => t.toLowerCase().includes(q));
      return inTitle || inContent || inTags;
    }
    return true;
  });

  const getNoteTypeIcon = (type: NoteType) => {
    switch (type) {
      case 'canvas':
        return <LayoutGrid className="w-4 h-4 text-purple-600" />;
      case 'research':
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'pdf':
        return <FileCheck className="w-4 h-4 text-red-500" />;
      case 'scratchpad':
        return <Flame className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const getNoteTypeBadge = (type: NoteType) => {
    switch (type) {
      case 'canvas':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">Canvas</span>;
      case 'research':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Research</span>;
      case 'pdf':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">PDF Annotate</span>;
      case 'scratchpad':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Scratchpad</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Page</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 md:px-20 lg:px-24 bg-[#faf9f6]">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Top Welcome & Quick Action Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-stone-600 font-semibold block mb-1">
              Workspace Overview
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
              Good day, Scholar.
            </h1>
            <p className="text-xs text-stone-600 mt-1">
              {notes.length} total documents • {scratchpads.filter(s => !s.scratchpadData?.isExpired).length} active scratchpads • {pinnedNotes.length} pinned
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenQuickCapture}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Capture</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuickSwitcher}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200/90 text-stone-700 hover:bg-stone-50 text-xs font-medium shadow-xs"
            >
              <Search className="w-4 h-4 text-stone-400" />
              <span className="hidden sm:inline">Search / Jump</span>
              <kbd className="text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">⌘K</kbd>
            </button>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onCreateNewNote('page')}
            className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-blue-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-stone-900">New Page Note</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Typed text & ink sketch</p>
          </button>

          <button
            type="button"
            onClick={() => onCreateNewNote('canvas')}
            className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-purple-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-stone-900">Infinite Canvas</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Mindmaps & spatial ink</p>
          </button>

          <button
            type="button"
            onClick={() => onCreateNewNote('research')}
            className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-emerald-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-stone-900">Research Entry</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Quotes, links & synthesis</p>
          </button>

          <button
            type="button"
            onClick={() => onCreateNewNote('scratchpad')}
            className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-stone-900">Quick Scratchpad</div>
            <p className="text-[11px] text-stone-400 mt-0.5">Expiring ephemeral note</p>
          </button>
        </div>

        {/* Personalized Focus & Starting Point Widget */}
        <PersonalFocusWidget
          notes={notes}
          folders={folders}
          onSelectNote={onSelectNote}
          onTogglePin={onTogglePin}
        />

        {/* Pinned Notes Shelf */}
        {pinnedNotes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-stone-700">
              <Pin className="w-4 h-4 text-amber-500 fill-current" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Pinned Documents</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="p-4 rounded-2xl bg-white border border-stone-200/90 hover:border-amber-400 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-40"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {getNoteTypeBadge(note.type)}
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-stone-900 group-hover:text-blue-600 line-clamp-2 leading-snug">
                      {note.title}
                    </h3>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {note.content || 'Canvas nodes and annotations.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {note.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiring Scratchpads Shelf */}
        {scratchpads.length > 0 && (
          <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Active Scratchpads ({scratchpads.length})
                </h2>
              </div>
              <span className="text-[11px] text-amber-700">Auto-expiring temporary thoughts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {scratchpads.map(sc => {
                const isExp = sc.scratchpadData?.isExpired;
                return (
                  <div
                    key={sc.id}
                    onClick={() => onSelectNote(sc)}
                    className="p-3.5 rounded-xl bg-white border border-amber-200 hover:border-amber-400 cursor-pointer shadow-xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                        isExp ? 'bg-stone-100 text-stone-500' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isExp ? 'Expired' : 'Expiring soon'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-stone-900 truncate">{sc.title}</h4>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                      {sc.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notebooks & Folders Navigation */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-stone-700">
            <Folder className="w-4 h-4 text-stone-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Notebooks & Seminars</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {folders.map(folder => {
              const count = notes.filter(n => n.folderId === folder.id && !n.isArchived).length;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  className="p-3.5 rounded-xl bg-white border border-stone-200/80 hover:border-stone-400 hover:shadow-xs transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="text-xs font-semibold text-stone-800 truncate">{folder.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400 ml-2">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Jump Back In: All Recent Documents with Filter Tabs */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-stone-700">
              <Clock className="w-4 h-4 text-stone-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Recent Documents</h2>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'page', label: 'Pages' },
                { id: 'canvas', label: 'Canvases' },
                { id: 'research', label: 'Research' },
                { id: 'pdf', label: 'PDFs' },
                { id: 'scratchpad', label: 'Scratch' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                    filterType === tab.id
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes list / cards */}
          <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-100 overflow-hidden shadow-xs">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                No notes match the current filter.
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="p-4 hover:bg-stone-50/70 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {getNoteTypeIcon(note.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-blue-600 truncate">
                          {note.title}
                        </h4>
                        {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-current shrink-0" />}
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5 font-sans">
                        {note.content || 'Visual canvas & spatial annotations'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden md:flex items-center gap-1">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <span className="text-[11px] text-stone-400 font-mono w-16 text-right">
                      {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
