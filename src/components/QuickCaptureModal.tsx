import React, { useState } from 'react';
import { Note, NotebookFolder, NoteType } from '../types/note';
import { 
  Zap, 
  FileText, 
  LayoutGrid, 
  BookOpen, 
  Flame, 
  Folder, 
  Clock, 
  Check, 
  X 
} from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  folders: NotebookFolder[];
  onClose: () => void;
  onSave: (noteData: Partial<Note>, openImmediately: boolean) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  folders,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<NoteType>('scratchpad');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState(folders[0]?.id || 'ideas');
  const [scratchDurationHours, setScratchDurationHours] = useState<number>(24);
  const [tagsInput, setTagsInput] = useState('');

  if (!isOpen) return null;

  const handleSave = (openImmediately: boolean) => {
    if (!title.trim() && !content.trim()) return;

    const tags = tagsInput
      .split(/[\s,]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean);

    const now = Date.now();
    const isScratch = type === 'scratchpad';

    const newNote: Partial<Note> = {
      title: title.trim() || (isScratch ? 'Quick Scratchpad' : 'Quick Capture Note'),
      content: content.trim(),
      type,
      folderId,
      tags: isScratch ? [...tags, 'scratchpad'] : tags,
      isPinned: isScratch,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      scratchpadData: isScratch
        ? {
            initialDurationMs: scratchDurationHours * 60 * 60 * 1000,
            expiresAt: now + scratchDurationHours * 60 * 60 * 1000,
            isExpired: false,
            category: 'quick-thought',
          }
        : undefined,
    };

    onSave(newNote, openImmediately);
    setTitle('');
    setContent('');
    setTagsInput('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Quick Capture
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Note Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'scratchpad', label: 'Scratchpad', icon: Flame, color: 'text-amber-500' },
              { id: 'page', label: 'Page Note', icon: FileText, color: 'text-blue-500' },
              { id: 'canvas', label: 'Canvas', icon: LayoutGrid, color: 'text-purple-500' },
              { id: 'research', label: 'Research', icon: BookOpen, color: 'text-emerald-500' },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as NoteType)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    type === t.id
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${type === t.id ? 'text-white' : t.color}`} />
                  <span className="text-[11px] font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Expiration preset selector for scratchpad */}
          {type === 'scratchpad' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Auto-Expire in:</span>
              </span>
              <div className="flex items-center gap-1">
                {[
                  { h: 1, label: '1h' },
                  { h: 6, label: '6h' },
                  { h: 24, label: '24h' },
                  { h: 72, label: '3d' },
                  { h: 168, label: '7d' },
                ].map(p => (
                  <button
                    key={p.h}
                    type="button"
                    onClick={() => setScratchDurationHours(p.h)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                      scratchDurationHours === p.h
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-stone-700 hover:bg-amber-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title or fleeting thought..."
            className="w-full text-sm font-semibold p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />

          {/* Body Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Jot down notes, paste link or quotation, terminal command, or lecture idea..."
            rows={4}
            className="w-full text-xs leading-relaxed p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSave(false);
              }
            }}
          />

          {/* Folder & Tags row */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                Notebook / Course
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full p-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none text-xs text-stone-700"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                Tags (space separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="idea cs402 seminar"
                className="w-full p-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none text-xs text-stone-700"
              />
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 font-mono">
            Press <kbd className="bg-white px-1 border border-stone-200 rounded">⌘↵</kbd> to save
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-200 transition-colors"
            >
              Save to Library
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 shadow-xs transition-colors"
            >
              Save & Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
