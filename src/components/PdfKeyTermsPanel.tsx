import React, { useState, useMemo } from 'react';
import { PDFKeyTerm } from '../utils/keyTermsExtractor';
import { 
  Sparkles, 
  Search, 
  X, 
  ExternalLink, 
  BookOpen, 
  HelpCircle, 
  Bookmark, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';

interface PdfKeyTermsPanelProps {
  terms: PDFKeyTerm[];
  currentPage: number;
  onSelectTerm: (term: PDFKeyTerm) => void;
  onClose: () => void;
}

export const PdfKeyTermsPanel: React.FC<PdfKeyTermsPanelProps> = ({
  terms,
  currentPage,
  onSelectTerm,
  onClose,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCopiedId, setActiveCopiedId] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    return terms.filter((item) => {
      const matchesQuery = 
        !filterQuery.trim() ||
        item.term.toLowerCase().includes(filterQuery.toLowerCase()) ||
        item.snippet.toLowerCase().includes(filterQuery.toLowerCase());

      const matchesCat = 
        selectedCategory === 'all' || 
        (selectedCategory === 'headings' && (item.category === 'heading' || item.category === 'problem')) ||
        (selectedCategory === 'theorems' && item.category === 'theorem') ||
        (selectedCategory === 'concepts' && (item.category === 'concept' || item.category === 'definition'));

      return matchesQuery && matchesCat;
    });
  }, [terms, filterQuery, selectedCategory]);

  const handleCopyTerm = (e: React.MouseEvent, term: PDFKeyTerm) => {
    e.stopPropagation();
    navigator.clipboard.writeText(term.term);
    setActiveCopiedId(term.id);
    setTimeout(() => setActiveCopiedId(null), 1500);
  };

  const getCategoryBadge = (category: PDFKeyTerm['category']) => {
    switch (category) {
      case 'heading':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">Heading</span>;
      case 'problem':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">Problem</span>;
      case 'theorem':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">Theorem</span>;
      case 'definition':
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Definition</span>;
      case 'concept':
      default:
        return <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">Key Concept</span>;
    }
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-88 max-w-[90vw] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 z-40 flex flex-col p-4 animate-in slide-in-from-right duration-150 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-900">Document Key Terms</h3>
            <p className="text-[10px] text-stone-500">{terms.length} technical terms & headings extracted</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          title="Close Key Terms Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter search */}
      <div className="my-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search key terms, theorems, topics..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium placeholder:text-stone-400"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 text-[11px]">
          {[
            { id: 'all', label: 'All' },
            { id: 'headings', label: 'Headings & Problems' },
            { id: 'theorems', label: 'Theorems' },
            { id: 'concepts', label: 'Concepts' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terms List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredTerms.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 italic">
            No terms found matching your query.
          </div>
        ) : (
          filteredTerms.map((term) => {
            const isCurrentPage = term.page === currentPage;
            return (
              <div
                key={term.id}
                onClick={() => onSelectTerm(term)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer group text-left ${
                  isCurrentPage
                    ? 'border-amber-400 bg-amber-50/40 shadow-xs ring-1 ring-amber-300'
                    : 'border-stone-200/90 hover:border-amber-300 hover:bg-stone-50/80 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getCategoryBadge(term.category)}
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 font-medium">
                      Page {term.page}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopyTerm(e, term)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-opacity"
                    title="Copy term name"
                  >
                    {activeCopiedId === term.id ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Bookmark className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <h4 className="text-xs font-bold text-stone-900 group-hover:text-amber-900 leading-snug">
                  {term.term}
                </h4>

                <p className="text-[11px] font-serif text-stone-600 mt-1 leading-relaxed line-clamp-2">
                  {term.snippet}
                </p>

                <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-400 group-hover:text-amber-800">
                  <span>{isCurrentPage ? '📍 On this page' : `Jump to Page ${term.page}`}</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
