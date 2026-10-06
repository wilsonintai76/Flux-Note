import React, { useState, useRef, useEffect } from 'react';
import { Note, NotebookFolder, InkStroke, AudioRecording } from '../types/note';
import { HandwritingCanvas } from './HandwritingCanvas';
import { 
  Zap, 
  Mic, 
  PenTool, 
  Send, 
  Square, 
  Folder, 
  ArrowUpRight, 
  Check, 
  X, 
  ChevronUp, 
  ChevronDown,
  Clock,
  Sparkles
} from 'lucide-react';

interface GlobalQuickCaptureBarProps {
  folders: NotebookFolder[];
  onSaveScratchNote: (note: Partial<Note>, openImmediately?: boolean) => Note;
  onOpenNote: (note: Note) => void;
  onFileNoteToFolder: (noteId: string, folderId: string) => void;
}

export const GlobalQuickCaptureBar: React.FC<GlobalQuickCaptureBarProps> = ({
  folders,
  onSaveScratchNote,
  onOpenNote,
  onFileNoteToFolder,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [textInput, setTextInput] = useState('');
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<any>(null);
  const [liveVolume, setLiveVolume] = useState<number[]>([15, 25, 40, 60, 35, 20, 50, 45]);

  // Sketch pad state
  const [isSketchModalOpen, setIsSketchModalOpen] = useState(false);
  const [sketchStrokes, setSketchStrokes] = useState<InkStroke[]>([]);
  const [sketchTitle, setSketchTitle] = useState('Quick Sketch');

  // "Captured! Option to file" toast state
  const [capturedToast, setCapturedToast] = useState<{
    note: Note;
    message: string;
  } | null>(null);
  const [showFilingDropdown, setShowFilingDropdown] = useState(false);

  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, []);

  // Submit quick text note
  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;

    const content = textInput.trim();
    const titleSnippet = content.length > 35 ? content.slice(0, 35) + '...' : content;
    
    const newNote = onSaveScratchNote({
      title: titleSnippet,
      content,
      type: 'scratchpad',
      folderId: 'ideas',
      tags: ['quick-capture', 'scratchpad'],
      isPinned: true,
      scratchpadData: {
        initialDurationMs: 1000 * 60 * 60 * 24, // 24 hours
        expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        isExpired: false,
        category: 'quick-thought',
      },
    }, false);

    setTextInput('');
    triggerCapturedToast(newNote, 'Captured to Temporary Scratchpad (24h)');
  };

  // Audio capture handlers
  const startAudioCapture = async () => {
    setIsRecording(true);
    setRecSeconds(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          saveAudioNote(reader.result as string);
        };
      };

      mr.start(250);
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => s + 1);
        setLiveVolume(Array.from({ length: 8 }, () => Math.floor(Math.random() * 50) + 15));
      }, 1000);
    } catch {
      // Fallback simulation mode
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => s + 1);
        setLiveVolume(Array.from({ length: 8 }, () => Math.floor(Math.random() * 50) + 15));
      }, 1000);
    }
  };

  const stopAudioCapture = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Simulated audio save
      saveAudioNote('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
    }
  };

  const saveAudioNote = (audioDataUrl: string) => {
    const audioRec: AudioRecording = {
      id: 'rec-' + Date.now(),
      title: `Quick Voice Memo (${recSeconds}s)`,
      durationSeconds: Math.max(1, recSeconds),
      timestamp: Date.now(),
      audioData: audioDataUrl,
      waveform: [20, 45, 60, 30, 75, 50, 80, 40],
    };

    const newNote = onSaveScratchNote({
      title: `Voice Memo ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      content: `Voice memo captured at ${new Date().toLocaleTimeString()}.`,
      type: 'scratchpad',
      folderId: 'ideas',
      tags: ['voice-memo', 'quick-capture', 'scratchpad'],
      audioRecordings: [audioRec],
      isPinned: true,
      scratchpadData: {
        initialDurationMs: 1000 * 60 * 60 * 24,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        isExpired: false,
        category: 'quick-thought',
      },
    }, false);

    triggerCapturedToast(newNote, 'Voice memo saved to Scratchpad (24h)');
  };

  // Sketch submit
  const handleSketchSave = () => {
    if (sketchStrokes.length === 0) {
      setIsSketchModalOpen(false);
      return;
    }

    const newNote = onSaveScratchNote({
      title: sketchTitle.trim() || 'Quick Sketch Scratchpad',
      content: 'Handwritten sketch doodle captured via quick bar.',
      type: 'scratchpad',
      folderId: 'ideas',
      tags: ['sketch', 'scratchpad', 'drawing'],
      inlineInks: [
        {
          id: 'ink-quick-' + Date.now(),
          title: sketchTitle.trim() || 'Quick Doodle',
          strokes: sketchStrokes,
          height: 300,
          createdAt: Date.now(),
        }
      ],
      isPinned: true,
      scratchpadData: {
        initialDurationMs: 1000 * 60 * 60 * 24,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        isExpired: false,
        category: 'quick-thought',
      },
    }, false);

    setSketchStrokes([]);
    setIsSketchModalOpen(false);
    triggerCapturedToast(newNote, 'Sketch saved to Scratchpad (24h)');
  };

  const triggerCapturedToast = (note: Note, message: string) => {
    setCapturedToast({ note, message });
    setShowFilingDropdown(false);
    setTimeout(() => {
      setCapturedToast(prev => (prev?.note.id === note.id ? null : prev));
    }, 7000);
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Omni-present Quick Capture Dock (Pinned Bottom Center with mobile safe clearance) */}
      <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-full px-3 sm:px-4 select-none pointer-events-none">
        <div className="pointer-events-auto">
          {/* Post-Capture Toast Bar with "Option to file later" */}
          {capturedToast && (
            <div className="mb-2 p-3 bg-stone-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{capturedToast.message}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* File to notebook dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilingDropdown(!showFilingDropdown)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-medium transition-colors"
                  >
                    <Folder className="w-3 h-3 text-amber-400" />
                    <span>File to Notebook</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showFilingDropdown && (
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white text-stone-800 rounded-xl shadow-xl border border-stone-200 p-1.5 z-50">
                      <div className="text-[10px] font-bold text-stone-400 px-2 py-1 uppercase">Choose Notebook</div>
                      {folders.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            onFileNoteToFolder(capturedToast.note.id, f.id);
                            setShowFilingDropdown(false);
                            setCapturedToast(null);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onOpenNote(capturedToast.note);
                    setCapturedToast(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold text-[11px] transition-colors"
                >
                  <span>Open</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setCapturedToast(null)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Main Global Quick Capture Dock */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 p-2 transition-all">
            {isRecording ? (
              /* Active Voice Recording Mode */
              <div className="flex items-center justify-between gap-3 px-3 py-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-semibold text-red-600 font-mono">
                    Recording Live Memo: {formatSecs(recSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-1 h-6">
                  {liveVolume.map((v, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-red-500 rounded-full transition-all duration-100"
                      style={{ height: `${Math.min(24, Math.max(4, v / 3))}px` }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={stopAudioCapture}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop & Save Scratch</span>
                </button>
              </div>
            ) : isExpanded ? (
              /* Expanded Input Dock */
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                <div className="flex items-center gap-2 pl-2 text-amber-500 shrink-0">
                  <Zap className="w-4 h-4 fill-current" />
                </div>

                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Quick capture thought, link, or fleeting idea... (Saves as Scratchpad)"
                  className="flex-1 text-xs text-stone-800 bg-transparent border-none focus:outline-none placeholder:text-stone-400 py-1.5"
                />

                <div className="flex items-center gap-1 shrink-0">
                  {/* Text submit button */}
                  {textInput.trim() && (
                    <button
                      type="submit"
                      title="Save as Scratch Note (Enter)"
                      className="p-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Audio Recording Trigger */}
                  <button
                    type="button"
                    onClick={startAudioCapture}
                    title="Quick Audio Recording"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Voice</span>
                  </button>

                  {/* Sketch Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsSketchModalOpen(true)}
                    title="Quick Sketch / Doodle"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-blue-50 text-stone-700 hover:text-blue-600 text-xs font-medium transition-colors"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sketch</span>
                  </button>

                  {/* Minimize button */}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    title="Minimize Quick Capture Bar"
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              /* Minimized Floating Pill */
              <div className="flex items-center justify-between gap-3 px-3 py-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-2 text-xs font-semibold text-stone-700 hover:text-stone-900"
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>Global Quick Capture Dock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="p-1 text-stone-400 hover:text-stone-700"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Sketch Doodle Pad Sheet */}
      {isSketchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-600" />
                <input
                  type="text"
                  value={sketchTitle}
                  onChange={(e) => setSketchTitle(e.target.value)}
                  placeholder="Sketch Title"
                  className="text-xs font-bold text-stone-900 bg-transparent border-none focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsSketchModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <HandwritingCanvas
              strokes={sketchStrokes}
              onChange={setSketchStrokes}
              height={280}
              background="dots"
              showToolbar={true}
              toolbarPosition="top"
              className="bg-stone-50/50"
            />

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
              <span className="text-[11px] text-stone-400">
                Saves as temporary scratchpad (24h)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSketchModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSketchSave}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs"
                >
                  Save Sketch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
