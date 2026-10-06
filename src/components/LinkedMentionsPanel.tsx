import React, { useState, useMemo } from 'react';
import { Note } from '../types/note';
import {
  Link2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  FileText,
  LayoutGrid,
  BookOpen,
  FileCheck,
  Flame,
  ArrowRight,
  Plus,
  Sparkles,
  Check
} from 'lucide-react';

interface LinkedMentionsPanelProps {
  currentNote: Note;
  allNotes: Note[];
  onNavigateToNote: (noteTitle: string) => void;
  onOpenBacklinkCreator?: () => void;
  onUpdateNote?: (note: Note) => void;
}

interface MentionItem {
  note: Note;
  snippet: {
    before: string;
    matched: string;
    after: string;
  };
  isExplicitLink: boolean;
}

export const LinkedMentionsPanel: React.FC<LinkedMentionsPanelProps> = ({
  currentNote,
  allNotes,
  onNavigateToNote,
  onOpenBacklinkCreator,
  onUpdateNote,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'linked' | 'unlinked'>('linked');
  const [searchQuery, setSearchQuery] = useState('');
  const [convertedNotes, setConvertedNotes] = useState<Set<string>>(new Set());

  // Extract snippet around matched phrase
  const extractSnippet = (fullText: string, targetPhrase: string) => {
    const lowerText = fullText.toLowerCase();
    const lowerPhrase = targetPhrase.toLowerCase();
    const matchIdx = lowerText.indexOf(lowerPhrase);

    if (matchIdx === -1) {
      return {
        before: '',
        matched: targetPhrase,
        after: fullText.slice(0, 120) + (fullText.length > 120 ? '...' : ''),
      };
    }

    const start = Math.max(0, matchIdx - 60);
    const end = Math.min(fullText.length, matchIdx + targetPhrase.length + 80);

    const before = (start > 0 ? '...' : '') + fullText.slice(start, matchIdx);
    const matched = fullText.slice(matchIdx, matchIdx + targetPhrase.length);
    const after = fullText.slice(matchIdx + targetPhrase.length, end) + (end < fullText.length ? '...' : '');

    return { before, matched, after };
  };

  // Compute linked and unlinked mentions
  const { linkedMentions, unlinkedMentions } = useMemo(() => {
    const linked: MentionItem[] = [];
    const unlinked: MentionItem[] = [];

    const title = currentNote.title.trim();
    if (!title) return { linkedMentions: [], unlinkedMentions: [] };

    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const explicitRegex = new RegExp(`\\[\\[(${escapedTitle}|${currentNote.id})\\]\\]`, 'i');

    for (const otherNote of allNotes) {
      if (otherNote.id === currentNote.id || otherNote.isArchived) continue;

      let combinedText = otherNote.content || '';
      if (otherNote.canvasNodes && otherNote.canvasNodes.length > 0) {
        combinedText += ' ' + otherNote.canvasNodes.map(cn => cn.content || '').join(' ');
      }

      // Check explicit wiki-link: [[Title]]
      const explicitMatch = explicitRegex.exec(combinedText);
      if (explicitMatch) {
        linked.push({
          note: otherNote,
          snippet: extractSnippet(combinedText, explicitMatch[0]),
          isExplicitLink: true,
        });
      } else {
        // Check unlinked mention: title appears in text as whole phrase (min length 3)
        if (title.length >= 3 && combinedText.toLowerCase().includes(title.toLowerCase())) {
          unlinked.push({
            note: otherNote,
            snippet: extractSnippet(combinedText, title),
            isExplicitLink: false,
          });
        }
      }
    }

    return { linkedMentions: linked, unlinkedMentions: unlinked };
  }, [currentNote.id, currentNote.title, allNotes]);

  const activeMentions = activeTab === 'linked' ? linkedMentions : unlinkedMentions;
  const filteredMentions = activeMentions.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.note.title.toLowerCase().includes(q) ||
      m.snippet.before.toLowerCase().includes(q) ||
      m.snippet.after.toLowerCase().includes(q)
    );
  });

  const getNoteIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'research': return <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'pdf': return <FileCheck className="w-3.5 h-3.5 text-red-500 shrink-0" />;
      case 'scratchpad': return <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      default: return <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    }
  };

  // Convert unlinked text mention to explicit [[Note Title]] backlink in source note
  const handleConvertUnlinked = (targetNote: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateNote) return;

    const escaped = currentNote.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[\\[)(${escaped})(?!\\]\\])`, 'i');
    const newContent = targetNote.content.replace(regex, `[[${currentNote.title}]]`);

    onUpdateNote({
      ...targetNote,
      content: newContent,
      updatedAt: Date.now(),
    });

    setConvertedNotes(prev => new Set(prev).add(targetNote.id));
  };

  const totalCount = linkedMentions.length + unlinkedMentions.length;

  return (
    <div id="linked-mentions-section" className="mt-16 pt-8 border-t border-stone-200 select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Linked Mentions & Backlinks
          </h4>
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
            {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenBacklinkCreator && (
            <button
              type="button"
              onClick={onOpenBacklinkCreator}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Connect Note</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 animate-in fade-in">
          {/* Sub-tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('linked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'linked'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Linked Backlinks ({linkedMentions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unlinked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'unlinked'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Unlinked Mentions ({unlinkedMentions.length})</span>
              </button>
            </div>

            {activeMentions.length > 2 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter mentions..."
                  className="text-xs pl-8 pr-3 py-1 rounded-lg bg-stone-50 border border-stone-200/90 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-44"
                />
              </div>
            )}
          </div>

          {/* Mentions Cards List */}
          {filteredMentions.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-stone-50/60 border border-dashed border-stone-200">
              <p className="text-xs text-stone-500 font-medium">
                {activeTab === 'linked'
                  ? `No other notes currently backlink to [[${currentNote.title}]].`
                  : `No unlinked text mentions of "${currentNote.title}" found.`}
              </p>
              <p className="text-[11px] text-stone-400 mt-1">
                Type <code className="bg-stone-200/70 px-1 py-0.2 rounded font-mono text-[10px]">[[{currentNote.title}]]</code> in any document to connect them bidirectionally.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMentions.map((item) => {
                const isConverted = convertedNotes.has(item.note.id);
                return (
                  <div
                    key={item.note.id}
                    onClick={() => onNavigateToNote(item.note.title)}
                    className="p-3.5 rounded-xl border border-stone-200/90 bg-white hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Note Title & Type Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getNoteIcon(item.note.type)}
                          <span className="text-xs font-semibold text-stone-800 group-hover:text-amber-900 truncate">
                            {item.note.title}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-800 shrink-0 transition-colors" />
                      </div>

                      {/* Excerpt with matched mention highlighted */}
                      <div className="text-[11px] leading-relaxed text-stone-600 bg-stone-50/80 p-2.5 rounded-lg border border-stone-100 font-sans">
                        <span>{item.snippet.before}</span>
                        <mark className="bg-amber-100 text-amber-900 font-semibold px-1 py-0.2 rounded border border-amber-200/60 mx-0.5">
                          {item.snippet.matched}
                        </mark>
                        <span>{item.snippet.after}</span>
                      </div>
                    </div>

                    {/* Footer metadata & Convert Button for unlinked mentions */}
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100/80">
                      <span className="capitalize">{item.note.type} document</span>

                      <div className="flex items-center gap-2">
                        {/* 1-Click Convert Unlinked to Backlink */}
                        {!item.isExplicitLink && onUpdateNote && (
                          <button
                            type="button"
                            onClick={(e) => handleConvertUnlinked(item.note, e)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] transition-colors ${
                              isConverted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200'
                            }`}
                            title="Turn this text mention into an explicit [[Note Link]] in the source document"
                          >
                            {isConverted ? (
                              <>
                                <Check className="w-2.5 h-2.5" />
                                <span>Connected!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-2.5 h-2.5 text-amber-700" />
                                <span>Link Now</span>
                              </>
                            )}
                          </button>
                        )}

                        <span className="flex items-center gap-0.5 text-stone-500 group-hover:text-amber-900 font-medium">
                          <span>Open Note</span>
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
