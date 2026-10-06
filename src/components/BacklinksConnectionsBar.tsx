import React, { useState } from 'react';
import { Note, NotebookFolder } from '../types/note';
import {
  Link2,
  GitFork,
  ArrowRight,
  ExternalLink,
  Plus,
  Sparkles,
  ChevronRight,
  FileText,
  LayoutGrid,
  BookOpen,
  FileCheck,
  Flame,
  Hash
} from 'lucide-react';

interface BacklinksConnectionsBarProps {
  currentNote: Note;
  allNotes: Note[];
  folders: NotebookFolder[];
  onNavigateToNote: (title: string) => void;
  onOpenBacklinkCreator: () => void;
  onScrollToLinkedMentions: () => void;
}

export const BacklinksConnectionsBar: React.FC<BacklinksConnectionsBarProps> = ({
  currentNote,
  allNotes,
  folders,
  onNavigateToNote,
  onOpenBacklinkCreator,
  onScrollToLinkedMentions,
}) => {
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null);

  // 1. Outgoing Links (Wiki-links in current document)
  const outgoingTitles: string[] = [];
  const linkMatches = currentNote.content.match(/\[\[(.*?)\]\]/g) || [];
  linkMatches.forEach(m => {
    const raw = m.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
    // Support [[Title|Label]]
    const title = raw.split('|')[0].trim();
    if (!outgoingTitles.includes(title)) {
      outgoingTitles.push(title);
    }
  });

  // 2. Incoming Backlinks (Notes that link to this note)
  const currentTitle = currentNote.title.toLowerCase().trim();
  const currentId = currentNote.id;
  const incomingNotes: Note[] = [];
  const unlinkedMentionNotes: Note[] = [];

  for (const other of allNotes) {
    if (other.id === currentNote.id || other.isArchived) continue;

    let combined = other.content || '';
    if (other.canvasNodes && other.canvasNodes.length > 0) {
      combined += ' ' + other.canvasNodes.map(cn => cn.content).join(' ');
    }

    const regex = new RegExp(`\\[\\[(${currentTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${currentId})\\]\\]`, 'i');
    if (regex.test(combined)) {
      incomingNotes.push(other);
    } else if (currentTitle.length >= 3 && combined.toLowerCase().includes(currentTitle)) {
      unlinkedMentionNotes.push(other);
    }
  }

  const getNoteIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3 h-3 text-purple-600 shrink-0" />;
      case 'research': return <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />;
      case 'pdf': return <FileCheck className="w-3 h-3 text-red-500 shrink-0" />;
      case 'scratchpad': return <Flame className="w-3 h-3 text-amber-500 shrink-0" />;
      default: return <FileText className="w-3 h-3 text-blue-600 shrink-0" />;
    }
  };

  const totalConnections = outgoingTitles.length + incomingNotes.length;

  return (
    <div className="mb-6 p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 shadow-2xs select-none">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
            <Link2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Knowledge Connections</span>
          </div>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-stone-200/80 text-stone-700">
            {totalConnections}
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5">
          {unlinkedMentionNotes.length > 0 && (
            <button
              type="button"
              onClick={onScrollToLinkedMentions}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
              title="Click to view and link unlinked mentions at the bottom"
            >
              <Sparkles className="w-3 h-3 text-amber-700" />
              <span>{unlinkedMentionNotes.length} unlinked mention(s)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBacklinkCreator}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-stone-800 hover:bg-stone-100 border border-stone-300/80 shadow-2xs transition-colors"
            title="Create a new backlink connection"
          >
            <Plus className="w-3 h-3 text-amber-600" />
            <span>Link Note</span>
          </button>
        </div>
      </div>

      {totalConnections === 0 && unlinkedMentionNotes.length === 0 ? (
        <div className="text-[11px] text-stone-400 py-1 flex items-center justify-between">
          <span>No connections yet. Connect this document to build your knowledge graph.</span>
          <button
            type="button"
            onClick={onOpenBacklinkCreator}
            className="text-amber-800 font-semibold hover:underline"
          >
            + Connect first note
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-1 text-xs">
          {/* Outgoing References */}
          {outgoingTitles.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-stone-400 shrink-0">
                References ({outgoingTitles.length}):
              </span>
              {outgoingTitles.map(title => {
                const targetObj = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => onNavigateToNote(title)}
                    onMouseEnter={() => targetObj && setHoveredNote(targetObj)}
                    onMouseLeave={() => setHoveredNote(null)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium text-xs bg-white text-stone-800 border border-stone-200/90 hover:border-amber-400 hover:bg-amber-50/60 shadow-2xs transition-all group"
                  >
                    {getNoteIcon(targetObj?.type || 'page')}
                    <span className="truncate max-w-[160px] group-hover:text-amber-900">{title}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-stone-300 group-hover:text-amber-700" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Incoming Backlinks */}
          {incomingNotes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-stone-400 shrink-0 flex items-center gap-1">
                <GitFork className="w-3 h-3 text-emerald-600" />
                <span>Referenced by ({incomingNotes.length}):</span>
              </span>
              {incomingNotes.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onNavigateToNote(n.title)}
                  onMouseEnter={() => setHoveredNote(n)}
                  onMouseLeave={() => setHoveredNote(null)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium text-xs bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100/70 shadow-2xs transition-all group"
                >
                  {getNoteIcon(n.type)}
                  <span className="truncate max-w-[160px]">{n.title}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hover preview tooltip popup */}
      {hoveredNote && (
        <div className="mt-2 p-2.5 bg-white rounded-xl border border-stone-200 shadow-md text-xs animate-in fade-in">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              {getNoteIcon(hoveredNote.type)}
              <span>{hoveredNote.title}</span>
            </div>
            <span className="text-[10px] text-stone-400 uppercase font-mono">
              {hoveredNote.type}
            </span>
          </div>
          {hoveredNote.content && (
            <p className="text-[11px] text-stone-600 line-clamp-2">
              {hoveredNote.content.replace(/^#+\s+/gm, '').slice(0, 140)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
