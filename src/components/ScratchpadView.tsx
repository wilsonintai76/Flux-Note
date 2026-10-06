import React, { useState, useEffect } from 'react';
import { Note, ScratchpadData } from '../types/note';
import { 
  Flame, 
  Clock, 
  ArrowUpRight, 
  Trash2, 
  Check, 
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface ScratchpadViewProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
  onPromoteToPermanent: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const ScratchpadView: React.FC<ScratchpadViewProps> = ({
  note,
  onUpdateNote,
  onPromoteToPermanent,
  onDeleteNote,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');
  const [percentRemaining, setPercentRemaining] = useState<number>(100);

  const scratchpad: ScratchpadData = note.scratchpadData || {
    expiresAt: Date.now() + 1000 * 60 * 60 * 2,
    initialDurationMs: 1000 * 60 * 60 * 2,
    isExpired: false,
  };

  useEffect(() => {
    const calculateTime = () => {
      if (!scratchpad.expiresAt) {
        setTimeLeftStr('Never expires');
        setPercentRemaining(100);
        return;
      }

      const diff = scratchpad.expiresAt - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('Expired');
        setPercentRemaining(0);
        if (!scratchpad.isExpired) {
          onUpdateNote({
            ...note,
            scratchpadData: { ...scratchpad, isExpired: true },
          });
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeftStr(`${days}d ${hours % 24}h remaining`);
      } else if (hours > 0) {
        setTimeLeftStr(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeLeftStr(`${minutes}m ${seconds}s remaining`);
      }

      if (scratchpad.initialDurationMs) {
        const pct = Math.max(0, Math.min(100, (diff / scratchpad.initialDurationMs) * 100));
        setPercentRemaining(pct);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [scratchpad.expiresAt, scratchpad.isExpired]);

  const extendTime = (additionalMs: number) => {
    const currentExpiry = scratchpad.expiresAt || Date.now();
    const newExpiry = currentExpiry + additionalMs;
    const newInitial = (scratchpad.initialDurationMs || 0) + additionalMs;

    onUpdateNote({
      ...note,
      updatedAt: Date.now(),
      scratchpadData: {
        ...scratchpad,
        expiresAt: newExpiry,
        initialDurationMs: newInitial,
        isExpired: false,
      },
    });
  };

  const setExpiryPreset = (durationMs: number | null) => {
    onUpdateNote({
      ...note,
      updatedAt: Date.now(),
      scratchpadData: {
        ...scratchpad,
        expiresAt: durationMs ? Date.now() + durationMs : null,
        initialDurationMs: durationMs || undefined,
        isExpired: false,
      },
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 md:px-20 lg:px-28 bg-[#fdfcfa]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Expiration Banner Header */}
        <div className={`p-5 rounded-2xl border transition-all ${
          scratchpad.isExpired
            ? 'bg-stone-100 border-stone-300'
            : percentRemaining < 20
            ? 'bg-rose-50 border-rose-200 shadow-xs'
            : 'bg-amber-50/70 border-amber-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                scratchpad.isExpired ? 'bg-stone-200 text-stone-600' : 'bg-amber-500 text-white'
              }`}>
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Temporary Scratchpad
                  </h3>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    scratchpad.isExpired
                      ? 'bg-stone-200 text-stone-600'
                      : 'bg-amber-200/80 text-amber-900'
                  }`}>
                    {timeLeftStr}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ephemeral thoughts, temporary credentials, or quick lecture questions.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPromoteToPermanent(note)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 rounded-xl shadow-xs transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Keep as Permanent Note</span>
              </button>
            </div>
          </div>

          {/* Expiration Progress Bar */}
          {scratchpad.expiresAt && !scratchpad.isExpired && (
            <div className="mt-4">
              <div className="w-full bg-amber-200/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>
            </div>
          )}

          {/* Presets and Extends */}
          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-stone-400">Set Timer:</span>
              <button
                type="button"
                onClick={() => setExpiryPreset(1000 * 60 * 60)}
                className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-50"
              >
                1 Hour
              </button>
              <button
                type="button"
                onClick={() => setExpiryPreset(1000 * 60 * 60 * 24)}
                className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-50"
              >
                24 Hours
              </button>
              <button
                type="button"
                onClick={() => setExpiryPreset(1000 * 60 * 60 * 24 * 7)}
                className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-50"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setExpiryPreset(null)}
                className="px-2 py-0.5 rounded bg-white border border-stone-200 hover:bg-stone-50"
              >
                Never
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => extendTime(1000 * 60 * 60 * 2)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 rounded"
              >
                <RefreshCw className="w-3 h-3" />
                <span>+2 Hours</span>
              </button>
            </div>
          </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdateNote({ ...note, title: e.target.value, updatedAt: Date.now() })}
          placeholder="Scratchpad Title"
          className="w-full text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 bg-transparent border-none focus:outline-none"
        />

        {/* Content area */}
        <div className="p-6 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
          <textarea
            value={note.content}
            onChange={(e) => onUpdateNote({ ...note, content: e.target.value, updatedAt: Date.now() })}
            placeholder="Write temporary thoughts, command snippets, meeting items, quick calculation..."
            rows={10}
            className="w-full text-sm leading-relaxed text-stone-800 bg-transparent resize-none border-none focus:outline-none font-sans"
          />
        </div>

        {/* Delete button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onDeleteNote(note.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Discard Scratchpad</span>
          </button>
        </div>
      </div>
    </div>
  );
};
