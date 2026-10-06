import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Search, 
  Sparkles,
  Maximize2 
} from 'lucide-react';

interface PdfPageNavigationControllerProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onChangeZoom: (zoom: number) => void;
  isThumbnailsOpen: boolean;
  onToggleThumbnails: () => void;
  isKeyTermsOpen: boolean;
  onToggleKeyTerms: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
}

export const PdfPageNavigationController: React.FC<PdfPageNavigationControllerProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onChangeZoom,
  isThumbnailsOpen,
  onToggleThumbnails,
  isKeyTermsOpen,
  onToggleKeyTerms,
  isSearchOpen,
  onToggleSearch,
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-35 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 px-3 py-1.5 flex items-center gap-2 select-none text-stone-700">
      {/* Sidebar Thumbnails Toggle */}
      <button
        type="button"
        onClick={onToggleThumbnails}
        title={isThumbnailsOpen ? "Hide Thumbnails Sidebar" : "Show Thumbnails Sidebar"}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
          isThumbnailsOpen
            ? 'bg-stone-900 text-white shadow-xs'
            : 'hover:bg-stone-100 text-stone-600'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Thumbnails</span>
      </button>

      {/* Key Terms Toggle */}
      <button
        type="button"
        onClick={onToggleKeyTerms}
        title={isKeyTermsOpen ? "Hide Key Terms Panel" : "View Extracted Key Terms"}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
          isKeyTermsOpen
            ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
            : 'hover:bg-stone-100 text-stone-600'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <span className="hidden sm:inline">Key Terms</span>
      </button>

      <div className="w-px h-4 bg-stone-200" />

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First Page (Home)"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Previous Page (Left Arrow)"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Direct Page Input Form */}
        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 font-mono text-xs">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageInputSubmit}
            className="w-9 text-center font-bold text-stone-900 bg-stone-100 border border-stone-300 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            title="Type page number and press Enter"
          />
          <span className="text-stone-400 font-sans text-xs">/ {totalPages}</span>
        </form>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          title="Next Page (Right Arrow)"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last Page (End)"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-px h-4 bg-stone-200" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChangeZoom(Math.max(0.6, Math.round((zoom - 0.15) * 100) / 100))}
          title="Zoom Out"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onChangeZoom(1.0)}
          title="Reset Zoom to 100%"
          className="text-[11px] font-mono font-medium text-stone-600 hover:text-stone-900 px-1 py-0.5 rounded hover:bg-stone-100 w-11 text-center"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={() => onChangeZoom(Math.min(2.0, Math.round((zoom + 0.15) * 100) / 100))}
          title="Zoom In"
          className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-px h-4 bg-stone-200" />

      {/* Search Trigger */}
      <button
        type="button"
        onClick={onToggleSearch}
        title={isSearchOpen ? "Hide Search" : "Search in Document"}
        className={`p-1.5 rounded-xl transition-all ${
          isSearchOpen ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'hover:bg-stone-100 text-stone-600'
        }`}
      >
        <Search className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
