import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, InlineInkBlock, InkStroke, NoteImageAttachment, NotebookFolder, NoteType } from '../types/note';
import { HandwritingCanvas } from './HandwritingCanvas';
import { AudioRecorder } from './AudioRecorder';
import { LinkedMentionsPanel } from './LinkedMentionsPanel';
import { AnnotatedImageBlock } from './AnnotatedImageBlock';
import { ImageAnnotatorModal } from './ImageAnnotatorModal';
import { RichTextToolbar, EditorViewMode } from './RichTextToolbar';
import { BacklinkCreatorModal } from './BacklinkCreatorModal';
import { BacklinksConnectionsBar } from './BacklinksConnectionsBar';
import { MarkdownPreview } from './MarkdownPreview';
import {
  PenTool,
  Plus,
  Trash2,
  Clock,
  Pin,
  Tag,
  Folder,
  History,
  Share2,
  ExternalLink,
  Link2,
  FileText,
  CheckSquare,
  Sparkles,
  Maximize2,
  Mic,
  Square,
  Radio,
  CornerDownLeft,
  Volume2,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

interface PageNoteEditorProps {
  note: Note;
  allNotes: Note[];
  folders?: NotebookFolder[];
  onUpdateNote: (updatedNote: Note) => void;
  onNavigateToNote: (noteTitle: string) => void;
  onCreateNewNote?: (type: NoteType, folderId?: string, customTitle?: string) => void;
  onOpenVersionHistory: () => void;
  onOpenExport: () => void;
}

export const PageNoteEditor: React.FC<PageNoteEditorProps> = ({
  note,
  allNotes,
  folders = [],
  onUpdateNote,
  onNavigateToNote,
  onCreateNewNote,
  onOpenVersionHistory,
  onOpenExport,
}) => {
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const [inlineInks, setInlineInks] = useState<InlineInkBlock[]>(note.inlineInks || []);
  const [images, setImages] = useState<NoteImageAttachment[]>(note.images || []);
  const [pageStrokes, setPageStrokes] = useState<InkStroke[]>(note.pageStrokes || []);
  const [isOverlayInkActive, setIsOverlayInkActive] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // View Mode: Edit (markdown), Preview (interactive rich text & links), or Split
  const [viewMode, setViewMode] = useState<EditorViewMode>('edit');

  // Backlink Creator Modal State
  const [isBacklinkModalOpen, setIsBacklinkModalOpen] = useState(false);
  const [selectedTextForLink, setSelectedTextForLink] = useState('');

  // Active image modal state for cropping and drawing annotations
  const [activeImageForEditing, setActiveImageForEditing] = useState<{
    image: NoteImageAttachment;
    mode: 'annotate' | 'crop';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wiki-link autocomplete state (in-place inline [[ trigger)
  const [wikiSearchQuery, setWikiSearchQuery] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time Voice-to-Text Dictation (Web Speech API)
  const [isDictating, setIsDictating] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [dictationNotice, setDictationNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isDictatingRef = useRef(false);
  const simTimerRef = useRef<any>(null);

  // Debounced save
  const timeoutRef = useRef<any>(null);
  const syncUpdates = (
    newContent: string,
    newTitle: string,
    newInks: InlineInkBlock[],
    newStrokes: InkStroke[],
    newImages: NoteImageAttachment[] = images
  ) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onUpdateNote({
        ...note,
        title: newTitle,
        content: newContent,
        inlineInks: newInks,
        pageStrokes: newStrokes,
        images: newImages,
        updatedAt: Date.now(),
      });
    }, 350);
  };

  useEffect(() => {
    setContent(note.content);
    setTitle(note.title);
    setInlineInks(note.inlineInks || []);
    setImages(note.images || []);
    setPageStrokes(note.pageStrokes || []);
  }, [note.id]);

  useEffect(() => {
    isDictatingRef.current = isDictating;
  }, [isDictating]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    syncUpdates(content, val, inlineInks, pageStrokes, images);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    syncUpdates(val, title, inlineInks, pageStrokes, images);

    // Check for [[ trigger
    if (textareaRef.current) {
      const pos = textareaRef.current.selectionStart;
      setCursorPosition(pos);
      const textBefore = val.slice(0, pos);
      const lastDoubleBracket = textBefore.lastIndexOf('[[');
      if (lastDoubleBracket !== -1 && !textBefore.slice(lastDoubleBracket).includes(']]')) {
        const query = textBefore.slice(lastDoubleBracket + 2);
        setWikiSearchQuery(query);
        return;
      }
    }
    setWikiSearchQuery(null);
  };

  // Insert wiki link at position
  const insertWikiLink = (targetTitle: string, customLabel?: string) => {
    if (!textareaRef.current) {
      const insertion = customLabel ? `[[${targetTitle}|${customLabel}]]` : `[[${targetTitle}]]`;
      const next = content + ' ' + insertion;
      setContent(next);
      syncUpdates(next, title, inlineInks, pageStrokes, images);
      return;
    }

    const pos = textareaRef.current.selectionStart;
    const endPos = textareaRef.current.selectionEnd;
    const textBefore = content.slice(0, pos);
    const textAfter = content.slice(endPos);

    // Check if user was typing in [[ mode
    const lastDoubleBracket = textBefore.lastIndexOf('[[');
    let newTextBefore = textBefore;
    if (lastDoubleBracket !== -1 && !textBefore.slice(lastDoubleBracket).includes(']]')) {
      newTextBefore = textBefore.slice(0, lastDoubleBracket);
    }

    const insertion = customLabel ? `[[${targetTitle}|${customLabel}]]` : `[[${targetTitle}]]`;
    const newContent = newTextBefore + insertion + textAfter;

    setContent(newContent);
    syncUpdates(newContent, title, inlineInks, pageStrokes, images);
    setWikiSearchQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursor = newTextBefore.length + insertion.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 50);
  };

  // Open Backlink Creator modal, optionally capturing selected text
  const handleOpenBacklinkCreator = () => {
    let selected = '';
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        selected = content.slice(start, end).trim();
      }
    }
    setSelectedTextForLink(selected);
    setIsBacklinkModalOpen(true);
  };

  // Create new note & backlink from modal
  const handleCreateAndLinkNewNote = (newNoteTitle: string, folderId: string) => {
    if (onCreateNewNote) {
      onCreateNewNote('page', folderId, newNoteTitle);
    }
    insertWikiLink(newNoteTitle, selectedTextForLink || undefined);
  };

  // Keyboard shortcut listener for textarea (Cmd+B, Cmd+I, Cmd+U, Cmd+K)
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        wrapSelection('**', '**', 'bold text');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        wrapSelection('*', '*', 'italic text');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        wrapSelection('<u>', '</u>', 'underlined text');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleOpenBacklinkCreator();
      }
    }
  };

  const wrapSelection = (prefix: string, suffix: string, defaultText: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);

    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultText}${suffix}`;
    const newContent = before + replacement + after;
    setContent(newContent);
    syncUpdates(newContent, title, inlineInks, pageStrokes, images);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : defaultText.length));
      }
    }, 10);
  };

  // Toggle tasks in preview mode
  const handleToggleTaskInPreview = (lineIndex: number) => {
    const lines = content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    let newLine = line;
    if (line.match(/^(\s*)-\s*\[ \]\s*(.*)$/)) {
      newLine = line.replace(/^(\s*)-\s*\[ \]/, '$1- [x]');
    } else if (line.match(/^(\s*)-\s*\[[xX]\]\s*(.*)$/)) {
      newLine = line.replace(/^(\s*)-\s*\[[xX]\]/, '$1- [ ]');
    }

    lines[lineIndex] = newLine;
    const newContent = lines.join('\n');
    setContent(newContent);
    syncUpdates(newContent, title, inlineInks, pageStrokes, images);
  };

  const scrollToLinkedMentions = () => {
    const el = document.getElementById('linked-mentions-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const addInlineInkBlock = () => {
    const newBlock: InlineInkBlock = {
      id: 'ink-' + Date.now(),
      title: 'Handwritten Derivation Block',
      caption: 'Handwritten Derivation / Diagram',
      strokes: [],
      height: 220,
      createdAt: Date.now(),
    };
    const nextInks = [...inlineInks, newBlock];
    setInlineInks(nextInks);
    syncUpdates(content, title, nextInks, pageStrokes, images);
  };

  const updateInlineInkStrokes = (blockId: string, strokes: InkStroke[]) => {
    const nextInks = inlineInks.map(b => b.id === blockId ? { ...b, strokes } : b);
    setInlineInks(nextInks);
    syncUpdates(content, title, nextInks, pageStrokes, images);
  };

  const deleteInlineInkBlock = (blockId: string) => {
    const nextInks = inlineInks.filter(b => b.id !== blockId);
    setInlineInks(nextInks);
    syncUpdates(content, title, nextInks, pageStrokes, images);
  };

  // --- Image Import, Cropping, and Annotations ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const newImage: NoteImageAttachment = {
        id: 'img-' + Date.now(),
        url: dataUrl,
        originalUrl: dataUrl,
        caption: file.name.replace(/\.[^/.]+$/, ''),
        strokes: [],
        createdAt: Date.now(),
      };

      const nextImages = [...images, newImage];
      setImages(nextImages);
      syncUpdates(content, title, inlineInks, pageStrokes, nextImages);

      setActiveImageForEditing({ image: newImage, mode: 'annotate' });
    };
    reader.readAsDataURL(file);

    if (e.target) e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              const newImage: NoteImageAttachment = {
                id: 'img-' + Date.now(),
                url: dataUrl,
                originalUrl: dataUrl,
                caption: 'Pasted Screenshot',
                strokes: [],
                createdAt: Date.now(),
              };
              const nextImages = [...images, newImage];
              setImages(nextImages);
              syncUpdates(content, title, inlineInks, pageStrokes, nextImages);
              setActiveImageForEditing({ image: newImage, mode: 'annotate' });
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSaveEditedImage = (updatedImage: NoteImageAttachment) => {
    const nextImages = images.map(img => img.id === updatedImage.id ? updatedImage : img);
    setImages(nextImages);
    syncUpdates(content, title, inlineInks, pageStrokes, nextImages);
  };

  const handleDeleteImage = (imageId: string) => {
    const nextImages = images.filter(img => img.id !== imageId);
    setImages(nextImages);
    syncUpdates(content, title, inlineInks, pageStrokes, nextImages);
  };

  const togglePin = () => {
    onUpdateNote({
      ...note,
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  };

  const addTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!note.tags.includes(cleanTag)) {
      onUpdateNote({
        ...note,
        tags: [...note.tags, cleanTag],
        updatedAt: Date.now(),
      });
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const removeTag = (tagToRemove: string) => {
    onUpdateNote({
      ...note,
      tags: note.tags.filter(t => t !== tagToRemove),
      updatedAt: Date.now(),
    });
  };

  // --- Real-time Voice-to-Text Dictation (Web Speech API) ---
  const startDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsDictating(true);
      setDictationNotice('Web Speech API simulation active. Dictating voice stream...');
      const sampleSentences = [
        'Voice dictation test initiated.',
        'Synthesizing speech directly into note text in real-time.',
        'Invariants verified and documented.'
      ];
      let sIdx = 0;
      simTimerRef.current = setInterval(() => {
        if (sIdx < sampleSentences.length) {
          const sent = sampleSentences[sIdx];
          setInterimTranscript(sent);
          setTimeout(() => {
            setContent(prev => {
              const spacer = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
              const next = prev + spacer + sent;
              syncUpdates(next, title, inlineInks, pageStrokes, images);
              return next;
            });
            setInterimTranscript('');
          }, 800);
          sIdx++;
        } else {
          stopDictation();
        }
      }, 2400);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsDictating(true);
        setDictationNotice(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        setInterimTranscript(interim);

        if (finalChunk.trim()) {
          setContent(prev => {
            const spacer = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            const next = prev + spacer + finalChunk.trim();
            syncUpdates(next, title, inlineInks, pageStrokes, images);
            return next;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setDictationNotice('Microphone permission was denied. Please allow microphone access in your browser.');
          stopDictation();
        }
      };

      recognition.onend = () => {
        if (isDictatingRef.current) {
          try {
            recognition.start();
          } catch {
            setIsDictating(false);
          }
        } else {
          setIsDictating(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsDictating(true);
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsDictating(false);
    }
  };

  const stopDictation = () => {
    isDictatingRef.current = false;
    setIsDictating(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }
    if (interimTranscript.trim()) {
      setContent(prev => {
        const spacer = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
        const next = prev + spacer + interimTranscript.trim();
        syncUpdates(next, title, inlineInks, pageStrokes, images);
        return next;
      });
      setInterimTranscript('');
    }
  };

  const toggleDictation = () => {
    if (isDictating) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  const insertPunctuation = (punct: string) => {
    setContent(prev => {
      const next = prev.trimEnd() + punct + ' ';
      syncUpdates(next, title, inlineInks, pageStrokes, images);
      return next;
    });
  };

  // Reading time and word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div
      className="relative flex-1 flex flex-col h-full bg-[#fcfbf9] overflow-hidden select-text"
      onPaste={handlePaste}
    >
      {/* Hidden file input for uploading images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Top Document Toolbar */}
      <div className="h-11 border-b border-stone-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Pin toggle */}
          <button
            type="button"
            onClick={togglePin}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
            className={`p-1.5 rounded-lg transition-colors ${
              note.isPinned ? 'text-amber-500 bg-amber-50' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
          </button>

          {/* Tags list */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-600 hover:bg-stone-200/70 transition-colors"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="tag-name"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTag();
                    if (e.key === 'Escape') setShowTagInput(false);
                  }}
                  className="text-xs px-2 py-0.5 rounded border border-stone-300 w-24 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTagInput(true)}
                className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-0.5 p-1 rounded hover:bg-stone-100"
              >
                <Plus className="w-3 h-3" />
                <span>Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Insert Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import Image (supports cropping & handwriting annotations)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Image</span>
          </button>

          {/* Real-time Voice-to-Text Dictation Toggle Button */}
          <button
            type="button"
            onClick={toggleDictation}
            title={isDictating ? 'Stop Voice Dictation' : 'Start Real-Time Voice Dictation (Web Speech API)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isDictating
                ? 'bg-red-600 text-white shadow-xs animate-pulse ring-2 ring-red-400'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {isDictating ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Dictating</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Dictate Voice</span>
              </>
            )}
          </button>

          {/* Toggle Full Page Stylus Overlay */}
          <button
            type="button"
            onClick={() => setIsOverlayInkActive(!isOverlayInkActive)}
            title="Toggle Full Document Stylus Overlay (draw over text)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isOverlayInkActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stylus Overlay</span>
          </button>

          {/* Add Inline Ink Block */}
          <button
            type="button"
            onClick={addInlineInkBlock}
            title="Insert Handwritten Derivation Block between text"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Handwriting Block</span>
          </button>

          {/* Version History */}
          <button
            type="button"
            onClick={onOpenVersionHistory}
            title="Version History & Snapshots"
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={onOpenExport}
            title="Export Note (Markdown, HTML, Plain text)"
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="relative flex-1 overflow-y-auto px-6 py-8 sm:px-12 md:px-20 lg:px-28 max-w-4xl mx-auto w-full">
        {/* Document Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled Note"
          className="w-full text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 bg-transparent border-none focus:outline-none mb-3 font-sans"
        />

        {/* Note Metadata Details */}
        <div className="flex items-center gap-4 text-xs text-stone-400 mb-4 pb-3 border-b border-stone-100 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <span>•</span>
          <span>{wordCount} words ({readingTime} min read)</span>
          {images.length > 0 && (
            <>
              <span>•</span>
              <span className="text-emerald-600 font-medium">{images.length} image(s)</span>
            </>
          )}
          {inlineInks.length > 0 && (
            <>
              <span>•</span>
              <span className="text-blue-600 font-medium">{inlineInks.length} handwritten block(s)</span>
            </>
          )}
        </div>

        {/* VISUAL CUES: Existing Backlinks & Outgoing References Bar */}
        <BacklinksConnectionsBar
          currentNote={note}
          allNotes={allNotes}
          folders={folders}
          onNavigateToNote={onNavigateToNote}
          onOpenBacklinkCreator={handleOpenBacklinkCreator}
          onScrollToLinkedMentions={scrollToLinkedMentions}
        />

        {/* RICH TEXT EDITOR TOOLBAR */}
        <RichTextToolbar
          textareaRef={textareaRef}
          content={content}
          onContentChange={(newContent) => {
            setContent(newContent);
            syncUpdates(newContent, title, inlineInks, pageStrokes, images);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenBacklinkCreator={handleOpenBacklinkCreator}
          onAddInlineInk={addInlineInkBlock}
          isOverlayInkActive={isOverlayInkActive}
          onToggleOverlayInk={() => setIsOverlayInkActive(!isOverlayInkActive)}
        />

        {/* Real-time Voice Dictation Active Banner */}
        {isDictating && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-900">
                  Real-time Dictation Active (Web Speech API)
                </p>
                <p className="text-[11px] text-red-700 italic truncate">
                  {interimTranscript ? `"${interimTranscript}"` : 'Speak naturally into your microphone... Words stream directly into the note.'}
                </p>
              </div>
            </div>

            {/* Quick punctuation helpers during dictation */}
            <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => insertPunctuation('.')}
                className="px-2 py-0.5 text-xs bg-white hover:bg-stone-50 border border-stone-200 rounded text-stone-700 font-mono shadow-2xs"
                title="Insert Period"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => insertPunctuation(',')}
                className="px-2 py-0.5 text-xs bg-white hover:bg-stone-50 border border-stone-200 rounded text-stone-700 font-mono shadow-2xs"
                title="Insert Comma"
              >
                ,
              </button>
              <button
                type="button"
                onClick={() => insertPunctuation('\n\n')}
                className="px-2 py-0.5 text-xs bg-white hover:bg-stone-50 border border-stone-200 rounded text-stone-700 flex items-center gap-0.5 shadow-2xs"
                title="New Paragraph"
              >
                <CornerDownLeft className="w-3 h-3" />
                <span className="text-[10px]">¶</span>
              </button>
              <button
                type="button"
                onClick={stopDictation}
                className="px-2.5 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-2xs ml-1"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {dictationNotice && (
          <div className="mb-3 p-2.5 text-xs text-amber-800 bg-amber-50 rounded-lg border border-amber-200">
            {dictationNotice}
          </div>
        )}

        {/* Audio Memo Recorder Section */}
        <AudioRecorder
          recordings={note.audioRecordings || []}
          onAddRecording={(rec) => {
            const nextRecs = [...(note.audioRecordings || []), rec];
            onUpdateNote({ ...note, audioRecordings: nextRecs, updatedAt: Date.now() });
          }}
          onUpdateRecording={(updatedRec) => {
            const nextRecs = (note.audioRecordings || []).map(r => r.id === updatedRec.id ? updatedRec : r);
            onUpdateNote({ ...note, audioRecordings: nextRecs, updatedAt: Date.now() });
          }}
          onDeleteRecording={(recId) => {
            const nextRecs = (note.audioRecordings || []).filter(r => r.id !== recId);
            onUpdateNote({ ...note, audioRecordings: nextRecs, updatedAt: Date.now() });
          }}
          onInsertTranscriptIntoNote={(transcriptText) => {
            const insertion = `\n\n> 🎙️ **Audio Memo Transcript:**\n> ${transcriptText.replace(/\n/g, '\n> ')}\n\n`;
            const nextContent = content + insertion;
            setContent(nextContent);
            syncUpdates(nextContent, title, inlineInks, pageStrokes, images);
          }}
        />

        {/* Content Workspace according to ViewMode */}
        <div className="relative mb-6">
          {viewMode === 'edit' && (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Type your notes in Markdown here... Type [[ to link another note, use the Rich Text Toolbar above, or press Cmd+K to connect notes."
              className="w-full min-h-[380px] text-base leading-relaxed text-stone-800 bg-transparent resize-none border-none focus:outline-none font-sans"
              style={{ minHeight: '380px' }}
            />
          )}

          {viewMode === 'preview' && (
            <div className="min-h-[380px] bg-white/40 p-4 rounded-2xl border border-stone-200/60">
              <MarkdownPreview
                content={content}
                allNotes={allNotes}
                onNavigateToNote={onNavigateToNote}
                onToggleTask={handleToggleTaskInPreview}
              />
            </div>
          )}

          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[380px]">
              <div className="border-r border-stone-200/80 pr-3">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Markdown editor..."
                  className="w-full h-full min-h-[380px] text-sm leading-relaxed text-stone-800 bg-transparent resize-none border-none focus:outline-none font-mono"
                />
              </div>
              <div className="pl-3 overflow-y-auto max-h-[600px]">
                <MarkdownPreview
                  content={content}
                  allNotes={allNotes}
                  onNavigateToNote={onNavigateToNote}
                  onToggleTask={handleToggleTaskInPreview}
                />
              </div>
            </div>
          )}

          {/* In-place Wiki-link autocomplete popup for [[ trigger */}
          {wikiSearchQuery !== null && viewMode === 'edit' && (
            <div className="absolute left-8 top-16 z-30 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-2 animate-in fade-in">
              <div className="text-[11px] font-semibold text-stone-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                <span>Link to Note</span>
                <span className="font-mono text-[10px]">[[</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {allNotes
                  .filter(n => n.id !== note.id && n.title.toLowerCase().includes(wikiSearchQuery.toLowerCase()))
                  .map(targetNote => (
                    <button
                      key={targetNote.id}
                      type="button"
                      onClick={() => insertWikiLink(targetNote.title)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-50 flex items-center justify-between group"
                    >
                      <span className="font-medium text-stone-800 group-hover:text-amber-900 truncate">
                        {targetNote.title}
                      </span>
                      <span className="text-[10px] text-stone-400 uppercase font-mono">
                        {targetNote.type}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Imported Image Attachments with Overlaid Ink & Crop Capabilities */}
        {images.length > 0 && (
          <div className="space-y-6 my-6">
            <div className="flex items-center justify-between pb-1 border-b border-stone-200/80">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Annotated Figures & Images ({images.length})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Image</span>
              </button>
            </div>

            {images.map((img) => (
              <AnnotatedImageBlock
                key={img.id}
                image={img}
                onEdit={(targetImg, mode) => {
                  setActiveImageForEditing({ image: targetImg, mode });
                }}
                onDelete={handleDeleteImage}
              />
            ))}
          </div>
        )}

        {/* Handwritten Derivation Blocks (Inserted Inline with Text) */}
        {inlineInks.map((block, idx) => (
          <div
            key={block.id}
            className="my-6 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs relative group"
          >
            {/* Block Header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-stone-700">
                  {block.caption || `Handwritten Sketch #${idx + 1}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => deleteInlineInkBlock(block.id)}
                title="Delete handwritten block"
                className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 rounded hover:bg-stone-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Embedded Stylus Canvas */}
            <HandwritingCanvas
              strokes={block.strokes}
              onChange={(newStrokes) => updateInlineInkStrokes(block.id, newStrokes)}
              height={block.height}
              background="dots"
              showToolbar={true}
              toolbarPosition="bottom"
              className="bg-white"
            />
          </div>
        ))}

        {/* Linked Mentions Panel (Bidirectional Backlinks to Current Document) */}
        <LinkedMentionsPanel
          currentNote={note}
          allNotes={allNotes}
          onNavigateToNote={onNavigateToNote}
          onOpenBacklinkCreator={handleOpenBacklinkCreator}
          onUpdateNote={onUpdateNote}
        />
      </div>

      {/* Full Page Stylus Overlay (when active) */}
      {isOverlayInkActive && (
        <div className="absolute inset-0 z-30 pointer-events-auto bg-stone-900/5">
          <div className="absolute top-4 right-4 z-40">
            <button
              type="button"
              onClick={() => setIsOverlayInkActive(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white shadow-md hover:bg-stone-800"
            >
              Exit Stylus Overlay
            </button>
          </div>
          <HandwritingCanvas
            strokes={pageStrokes}
            onChange={(strokes) => {
              setPageStrokes(strokes);
              syncUpdates(content, title, inlineInks, strokes, images);
            }}
            width="100%"
            height="100%"
            background="transparent"
            showToolbar={true}
            toolbarPosition="top"
            className="border-none bg-transparent"
          />
        </div>
      )}

      {/* Image Annotation & Cropping Modal */}
      {activeImageForEditing && (
        <ImageAnnotatorModal
          image={activeImageForEditing.image}
          isOpen={true}
          initialMode={activeImageForEditing.mode}
          onClose={() => setActiveImageForEditing(null)}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Backlink Creator Modal */}
      <BacklinkCreatorModal
        isOpen={isBacklinkModalOpen}
        onClose={() => setIsBacklinkModalOpen(false)}
        currentNote={note}
        allNotes={allNotes}
        folders={folders}
        onInsertBacklink={insertWikiLink}
        onCreateAndLinkNewNote={handleCreateAndLinkNewNote}
        selectedText={selectedTextForLink}
      />
    </div>
  );
};
