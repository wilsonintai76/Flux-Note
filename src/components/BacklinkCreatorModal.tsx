import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Note, NotebookFolder } from '../types/note';
import {
  Link2,
  Search,
  Plus,
  FileText,
  LayoutGrid,
  BookOpen,
  FileCheck,
  Flame,
  ArrowRight,
  X,
  Sparkles,
  GitFork,
  Check
} from 'lucide-react';

interface BacklinkCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNote: Note;
  allNotes: Note[];
  folders: NotebookFolder[];
  onInsertBacklink: (targetNoteTitle: string, customLabel?: string) => void;
  onCreateAndLinkNewNote: (title: string, folderId: string) => void;
  selectedText?: string;
}

export const BacklinkCreatorModal: React.FC<BacklinkCreatorModalProps> = ({
  isOpen,
  onClose,
  currentNote,
  allNotes,
  folders,
  onInsertBacklink,
  onCreateAndLinkNewNote,
  selectedText = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(selectedText || '');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(currentNote.folderId || folders[0]?.id || 'university');
  const [activeTab, setActiveTab] = useState<'search' | 'graph'>('search');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(selectedText || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, selectedText]);

  // Compute connections metadata for visual cues
  const connectionsMap = useMemo(() => {
    const outgoingTitles = new Set<string>();
    const incomingIds = new Set<string>();

    // Outgoing from current note
    const outgoingMatches = currentNote.content.match(/\[\[(.*?)\]\]/g) || [];
    outgoingMatches.forEach(m => {
      outgoingTitles.add(m.replace(/^\[\[/, '').replace(/\]\]$/, '').toLowerCase().trim());
    });

    // Incoming to current note
    const currentTitle = currentNote.title.toLowerCase().trim();
    const currentId = currentNote.id;
    allNotes.forEach(other => {
      if (other.id === currentNote.id) return;
      const combined = (other.content || '') + ' ' + (other.canvasNodes?.map(cn => cn.content).join(' ') || '');
      const regex = new RegExp(`\\[\\[(${currentTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${currentId})\\]\\]`, 'i');
      if (regex.test(combined)) {
        incomingIds.add(other.id);
      }
    });

    return { outgoingTitles, incomingIds };
  }, [currentNote, allNotes]);

  // Filter notes based on query
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const otherNotes = allNotes.filter(n => n.id !== currentNote.id && !n.isArchived);

    if (!q) {
      // Prioritize notes already in the same folder or recently updated
      return otherNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return otherNotes
      .map(note => {
        let score = 0;
        const titleLower = note.title.toLowerCase();
        if (titleLower === q) score += 100;
        else if (titleLower.startsWith(q)) score += 50;
        else if (titleLower.includes(q)) score += 30;

        if (note.tags.some(t => t.toLowerCase().includes(q))) score += 20;
        if (note.content.toLowerCase().includes(q)) score += 10;

        return { note, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.note);
  }, [allNotes, currentNote.id, searchQuery]);

  const exactMatchExists = allNotes.some(
    n => n.title.toLowerCase().trim() === searchQuery.toLowerCase().trim()
  );

  const getNoteIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'research': return <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'pdf': return <FileCheck className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'scratchpad': return <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      default: return <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    }
  };

  const handleSelectNote = (targetTitle: string) => {
    onInsertBacklink(targetTitle, selectedText && selectedText !== targetTitle ? selectedText : undefined);
    onClose();
  };

  const handleCreateNew = () => {
    if (!searchQuery.trim()) return;
    onCreateAndLinkNewNote(searchQuery.trim(), selectedFolderId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-200/90 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Create Knowledge Connection
              </h3>
              <p className="text-[11px] text-stone-500">
                Link to an existing note or spawn a new connected note
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-stone-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (filteredNotes.length > 0) {
                    handleSelectNote(filteredNotes[0].title);
                  } else if (searchQuery.trim()) {
                    handleCreateNew();
                  }
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
              placeholder="Search notes to link, or type new title..."
              className="w-full text-sm pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>

          {selectedText && (
            <p className="text-[11px] text-amber-800 mt-2 bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200/50 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Will link selected text: <strong className="font-semibold">"{selectedText}"</strong></span>
            </p>
          )}
        </div>

        {/* Search Results / Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 max-h-96">
          {/* Quick Create option when query doesn't match an existing note exactly */}
          {searchQuery.trim() && !exactMatchExists && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/70 text-left transition-all flex items-center justify-between group mb-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-900 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-amber-900 block truncate">
                    Create new note: "{searchQuery.trim()}"
                  </span>
                  <span className="text-[10px] text-amber-700">
                    Spawns page note and links it bidirectionally
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-amber-800 group-hover:translate-x-0.5 transition-transform shrink-0">
                Create & Link &rarr;
              </span>
            </button>
          )}

          {filteredNotes.length === 0 && !searchQuery.trim() && (
            <div className="py-8 text-center text-xs text-stone-400 italic">
              No notes available to link.
            </div>
          )}

          {filteredNotes.length === 0 && searchQuery.trim() && exactMatchExists && (
            <div className="py-8 text-center text-xs text-stone-400">
              No other matches found.
            </div>
          )}

          {filteredNotes.map(targetNote => {
            const isOutgoing = connectionsMap.outgoingTitles.has(targetNote.title.toLowerCase().trim());
            const isIncoming = connectionsMap.incomingIds.has(targetNote.id);
            const folder = folders.find(f => f.id === targetNote.folderId);

            return (
              <button
                key={targetNote.id}
                type="button"
                onClick={() => handleSelectNote(targetNote.title)}
                className="w-full p-2.5 rounded-xl border border-stone-200/70 hover:border-amber-300 bg-white hover:bg-amber-50/40 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="mt-0.5">{getNoteIcon(targetNote.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-900 truncate">
                        {targetNote.title}
                      </span>
                      {folder && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
                          {folder.name}
                        </span>
                      )}
                    </div>
                    {targetNote.content && (
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {targetNote.content.replace(/^#+\s+/gm, '').slice(0, 90)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connection Status Badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isOutgoing && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60" title="Already linked in this document">
                      <Check className="w-2.5 h-2.5" />
                      <span>Linked</span>
                    </span>
                  )}
                  {isIncoming && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60" title="This note links back to you">
                      <GitFork className="w-2.5 h-2.5" />
                      <span>Backlink</span>
                    </span>
                  )}
                  <span className="opacity-0 group-hover:opacity-100 text-stone-400 group-hover:text-amber-700 transition-opacity p-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-stone-200/80 bg-stone-50 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Tip: Press <kbd className="px-1 py-0.5 rounded bg-stone-200 font-mono text-[10px]">Enter</kbd> to select or create</span>
          <span>Syntax: <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">[[Note Title]]</code></span>
        </div>
      </div>
    </div>
  );
};
