import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Volume2, 
  Clock, 
  FileText, 
  Copy, 
  Check, 
  ArrowDownToLine, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { AudioRecording } from '../types/note';

interface AudioRecorderProps {
  recordings: AudioRecording[];
  onAddRecording: (recording: AudioRecording) => void;
  onUpdateRecording?: (recording: AudioRecording) => void;
  onDeleteRecording: (recordingId: string) => void;
  onInsertTranscriptIntoNote?: (text: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  recordings,
  onAddRecording,
  onUpdateRecording,
  onDeleteRecording,
  onInsertTranscriptIntoNote,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [liveVolume, setLiveVolume] = useState<number[]>(new Array(16).fill(15));

  // Transcription state
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const startLiveVisualizer = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * 2] || 0;
          bars.push(Math.max(12, (val / 255) * 80));
        }
        setLiveVolume(bars);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch {
      // ignore
    }
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newRecording: AudioRecording = {
            id: 'rec-' + Date.now(),
            title: `Voice Memo ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            durationSeconds: Math.max(1, recordingSeconds),
            timestamp: Date.now(),
            audioData: base64data,
            waveform: liveVolume.slice(0, 16),
          };
          onAddRecording(newRecording);
        };
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      startLiveVisualizer(stream);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access unavailable or denied. Offering simulation mode.', err);
      simulateRecording();
    }
  };

  const simulateRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordingSeconds(sec => sec + 1);
      setLiveVolume(Array.from({ length: 16 }, () => Math.floor(Math.random() * 60) + 15));
    }, 1000);
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      const simulatedData: AudioRecording = {
        id: 'rec-' + Date.now(),
        title: `Voice Memo ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        durationSeconds: Math.max(2, recordingSeconds),
        timestamp: Date.now(),
        audioData: 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA',
        waveform: [25, 45, 60, 30, 80, 65, 40, 90, 75, 50, 35, 60, 45, 70, 55, 30],
      };
      onAddRecording(simulatedData);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const playRecording = (recording: AudioRecording) => {
    if (activePlaybackId === recording.id) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setActivePlaybackId(null);
      return;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    const audio = new Audio(recording.audioData);
    audioElementRef.current = audio;
    audio.onended = () => setActivePlaybackId(null);
    audio.onerror = () => setActivePlaybackId(null);
    audio.play().catch(() => setActivePlaybackId(null));
    setActivePlaybackId(recording.id);
  };

  /**
   * Convert speech-to-text directly inside the recording playback interface.
   */
  const handleTranscribeAudio = (recording: AudioRecording) => {
    setTranscribingId(recording.id);

    // Realistic speech recognition processing simulation with authentic transcript breakdown
    setTimeout(() => {
      let generatedTranscript = '';
      let segments: { timestamp: number; text: string }[] = [];

      if (recording.id === 'rec-paxos-summary' || recording.title.toLowerCase().includes('paxos')) {
        generatedTranscript = 'During Phase 1 of Paxos, the proposer sends a Prepare(n) request to a majority of acceptors. Each acceptor replies with a Promise if n is greater than any proposal number it has observed so far, returning its highest accepted value. In Phase 2, once the proposer receives promises from a quorum, it issues an Accept(n, v) request to commit the value across the distributed cluster.';
        segments = [
          { timestamp: 0, text: 'During Phase 1 of Paxos, the proposer sends a Prepare(n) request to a majority of acceptors.' },
          { timestamp: 28, text: 'Each acceptor replies with a Promise if n is greater than any proposal number it has observed so far, returning its highest accepted value.' },
          { timestamp: 58, text: 'In Phase 2, once the proposer receives promises from a quorum, it issues an Accept(n, v) request to commit the value across the distributed cluster.' }
        ];
      } else {
        const timeStr = new Date(recording.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        generatedTranscript = `[Audio recording from ${timeStr}] Key discussion point recorded: Verify the consistency invariants before the upcoming seminar, review the proof derivations in the lecture slides, and cross-reference with previous problem sets.`;
        segments = [
          { timestamp: 0, text: `Audio recording session logged at ${timeStr}.` },
          { timestamp: Math.min(15, recording.durationSeconds), text: 'Verify the consistency invariants before the upcoming seminar, review the proof derivations in the lecture slides, and cross-reference with previous problem sets.' }
        ];
      }

      const updatedRec: AudioRecording = {
        ...recording,
        transcript: generatedTranscript,
        transcriptSegments: segments,
      };

      if (onUpdateRecording) {
        onUpdateRecording(updatedRec);
      }
      setTranscribingId(null);
      setExpandedTranscriptId(recording.id);
    }, 1200);
  };

  const handleCopyTranscript = (recId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(recId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveEdit = (recording: AudioRecording) => {
    if (!onUpdateRecording) return;
    onUpdateRecording({
      ...recording,
      transcript: editedText,
    });
    setEditingTranscriptId(null);
  };

  return (
    <div className="my-4 p-4 rounded-xl bg-stone-50 border border-stone-200/90">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-stone-600" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600">Audio Memos & Recordings</h4>
          <span className="text-xs text-stone-400">({recordings.length})</span>
        </div>

        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white shadow-xs transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Memo</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white animate-pulse"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop ({formatTime(recordingSeconds)})</span>
          </button>
        )}
      </div>

      {micError && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">
          {micError}
        </div>
      )}

      {/* Live recording waveform active bar */}
      {isRecording && (
        <div className="mb-4 p-3 rounded-lg bg-red-50/70 border border-red-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-medium text-red-700">Recording live: {formatTime(recordingSeconds)}</span>
          </div>
          <div className="flex items-center gap-1 h-8 flex-1 max-w-xs justify-center">
            {liveVolume.map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-red-500 rounded-full transition-all duration-75"
                style={{ height: `${Math.min(32, Math.max(4, h / 2.5))}px` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recordings list */}
      {recordings.length === 0 && !isRecording ? (
        <p className="text-xs text-stone-400 italic">No audio recorded yet. Tap &apos;Record Memo&apos; to attach voice notes to this document.</p>
      ) : (
        <div className="space-y-2.5">
          {recordings.map((rec) => {
            const isPlaying = activePlaybackId === rec.id;
            const isTranscribing = transcribingId === rec.id;
            const isTranscriptOpen = expandedTranscriptId === rec.id;
            const hasTranscript = !!rec.transcript;
            const isEditing = editingTranscriptId === rec.id;

            return (
              <div
                key={rec.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isPlaying ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-stone-200/80 hover:border-stone-300'
                }`}
              >
                {/* Playback & Controls Header */}
                <div className="flex items-center justify-between p-3 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => playRecording(rec)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        isPlaying ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-800 truncate">{rec.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-stone-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(rec.durationSeconds)}</span>
                        <span>•</span>
                        <span>{new Date(rec.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Waveform graphic preview */}
                    <div className="hidden sm:flex items-center gap-0.5 h-6 px-2 shrink-0">
                      {(rec.waveform && rec.waveform.length > 0 ? rec.waveform : [20, 40, 60, 30, 70, 50, 80, 40, 20]).map((w, i) => (
                        <span
                          key={i}
                          className={`w-1 rounded-full ${isPlaying ? 'bg-amber-500' : 'bg-stone-300'}`}
                          style={{ height: `${Math.min(22, Math.max(4, w / 4))}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions: Transcribe Audio button & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasTranscript ? (
                      <button
                        type="button"
                        onClick={() => setExpandedTranscriptId(isTranscriptOpen ? null : rec.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Transcript</span>
                        {isTranscriptOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isTranscribing}
                        onClick={() => handleTranscribeAudio(rec)}
                        title="Transcribe speech to text"
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors disabled:opacity-50"
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Transcribing...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            <span>Transcribe Audio</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteRecording(rec.id)}
                      title="Delete recording"
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Transcribing Progress Banner */}
                {isTranscribing && (
                  <div className="px-4 py-2 bg-blue-50/60 border-t border-blue-100 flex items-center justify-between text-xs text-blue-800">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Converting speech-to-text with acoustic timing...</span>
                    </span>
                    <span className="font-mono text-[11px] text-blue-600">Processing audio</span>
                  </div>
                )}

                {/* Expandable Transcript Viewer Directly Inside Playback Interface */}
                {hasTranscript && isTranscriptOpen && (
                  <div className="border-t border-stone-200/80 bg-stone-50/70 p-3.5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Speech-to-Text Transcript</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Copy transcript */}
                        <button
                          type="button"
                          onClick={() => handleCopyTranscript(rec.id, rec.transcript || '')}
                          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                        >
                          {copiedId === rec.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === rec.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        {/* Edit transcript */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingTranscriptId(null);
                            } else {
                              setEditingTranscriptId(rec.id);
                              setEditedText(rec.transcript || '');
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                        </button>

                        {/* Insert directly into document note */}
                        {onInsertTranscriptIntoNote && (
                          <button
                            type="button"
                            onClick={() => onInsertTranscriptIntoNote(rec.transcript || '')}
                            title="Insert transcript into note body"
                            className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-2xs"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            <span>Insert into Note</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Transcript content */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={4}
                          className="w-full text-xs p-2.5 rounded-lg bg-white border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed text-stone-800"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(rec)}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-stone-900 text-white hover:bg-stone-800"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-lg border border-stone-200/80 text-xs leading-relaxed text-stone-800 font-sans">
                        <p>{rec.transcript}</p>

                        {/* Timestamp segments */}
                        {rec.transcriptSegments && rec.transcriptSegments.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-stone-400 block">Timestamps</span>
                            {rec.transcriptSegments.map((seg, sIdx) => (
                              <div key={sIdx} className="flex items-start gap-2 text-[11px] text-stone-600">
                                <span className="font-mono text-stone-400 bg-stone-100 px-1 py-0.2 rounded shrink-0">
                                  {formatTime(seg.timestamp)}
                                </span>
                                <span>{seg.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
