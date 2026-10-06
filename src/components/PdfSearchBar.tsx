import React, { useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface PdfSearchBarProps {
  searchQuery: string;
  onChangeQuery: (query: string) => void;
  currentPageMatchesCount: number;
  totalDocumentMatchesCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onClose: () => void;
}

export const PdfSearchBar: React.FC<PdfSearchBarProps> = ({
  searchQuery,
  onChangeQuery,
  currentPageMatchesCount,
  totalDocumentMatchesCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed top-20 right-6 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 p-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 select-none">
      <div className="flex items-center gap-1.5 pl-2">
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in PDF text..."
          className="text-xs text-stone-800 bg-transparent border-none focus:outline-none w-44 sm:w-56 font-medium placeholder:text-stone-400"
        />
      </div>

      {searchQuery.trim().length > 0 && (
        <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg shrink-0">
          {totalDocumentMatchesCount > 0 ? (
            <span>
              <strong className="text-stone-900">{currentMatchIndex + 1}</strong> of {totalDocumentMatchesCount}
            </span>
          ) : (
            <span className="text-stone-400">0 matches</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrevMatch}
          disabled={totalDocumentMatchesCount === 0}
          title="Previous Match (Shift+Enter)"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNextMatch}
          disabled={totalDocumentMatchesCount === 0}
          title="Next Match (Enter)"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close Search (Esc)"
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
