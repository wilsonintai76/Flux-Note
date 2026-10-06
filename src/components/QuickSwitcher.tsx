import React, { useState, useEffect, useRef } from 'react';
import { Note, NoteType } from '../types/note';
import { 
  Search, 
  FileText, 
  LayoutGrid, 
  BookOpen, 
  Flame, 
  FileCheck, 
  Tag, 
  ArrowRight, 
  Plus, 
  Pin,
  Clock
} from 'lucide-react';

interface QuickSwitcherProps {
  isOpen: boolean;
  notes: Note[];
  onClose: () => void;
  onSelectNote: (note: Note) => void;
  onCreateNote: (title: string, type: NoteType) => void;
}

export const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  isOpen,
  notes,
  onClose,
  onSelectNote,
  onCreateNote,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | NoteType>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredNotes = notes.filter(n => {
    if (n.isArchived) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;

    if (!query.trim()) return true;

    const q = query.toLowerCase();
    const inTitle = n.title.toLowerCase().includes(q);
    const inContent = n.content.toLowerCase().includes(q);
    const inTags = n.tags.some(t => t.toLowerCase().includes(q));

    // Deep search in research quotes or canvas nodes
    const inQuotes = n.researchData?.quotes.some(qu => qu.quote.toLowerCase().includes(q));
    const inCanvas = n.canvasNodes?.some(cn => cn.content.toLowerCase().includes(q) || cn.title?.toLowerCase().includes(q));

    return inTitle || inContent || inTags || inQuotes || inCanvas;
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredNotes.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredNotes.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNotes[selectedIndex]) {
        onSelectNote(filteredNotes[selectedIndex]);
        onClose();
      } else if (query.trim()) {
        onCreateNote(query.trim(), typeFilter === 'all' ? 'page' : typeFilter);
        onClose();
      }
    }
  };

  const getIcon = (type: NoteType) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-4 h-4 text-purple-600" />;
      case 'research': return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'pdf': return <FileCheck className="w-4 h-4 text-red-500" />;
      case 'scratchpad': return <Flame className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200">
          <Search className="w-5 h-5 text-stone-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type note title, content, quote, #tag, or press Enter to create..."
            className="w-full text-sm text-stone-900 bg-transparent border-none focus:outline-none placeholder:text-stone-400"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">
            ESC to close
          </kbd>
        </div>

        {/* Quick Type Filter Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-stone-50/80 border-b border-stone-100 overflow-x-auto">
          {[
            { id: 'all', label: 'All Notes' },
            { id: 'page', label: 'Pages' },
            { id: 'canvas', label: 'Canvases' },
            { id: 'research', label: 'Research' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'scratchpad', label: 'Scratchpads' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setTypeFilter(f.id as any);
                setSelectedIndex(0);
              }}
              className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === f.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-stone-500 mb-2">No matching documents found.</p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateNote(query.trim(), typeFilter === 'all' ? 'page' : typeFilter);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create note &quot;{query.trim()}&quot;</span>
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50/80 text-stone-900' : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{getIcon(note.type)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{note.title}</span>
                        {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-current shrink-0" />}
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {note.content.slice(0, 100) || 'Spatial board with nodes'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {note.tags.length > 0 && (
                      <span className="text-[10px] text-stone-400 hidden sm:inline">
                        #{note.tags[0]}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-stone-400">
                      {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-stone-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-white border border-stone-200 px-1 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-white border border-stone-200 px-1 rounded">↵</kbd> open</span>
          </div>
          <span>{filteredNotes.length} results</span>
        </div>
      </div>
    </div>
  );
};
