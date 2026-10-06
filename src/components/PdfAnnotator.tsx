import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Note, 
  PDFDocumentData, 
  PDFPageAnnotation, 
  PDFTextBox, 
  PDFHighlight, 
  PDFHighlightRect, 
  PDFStamp, 
  InkStroke,
  ResearchQuote,
  ResearchData
} from '../types/note';
import { 
  PdfAnnotationToolbar, 
  PdfToolMode, 
  StampPreset, 
  LECTURER_STAMP_PRESETS 
} from './PdfAnnotationToolbar';
import { PdfSearchBar } from './PdfSearchBar';
import { PdfPageNavigationController } from './PdfPageNavigationController';
import { PdfKeyTermsPanel } from './PdfKeyTermsPanel';
import { PdfExportModal } from './PdfExportModal';
import { extractKeyTermsFromDocument, PDFKeyTerm } from '../utils/keyTermsExtractor';
import { renderBezierStroke, renderLiveBezierSegment, filterJitterPoints, postProcessStrokePoints, eraseStrokesAtPoint } from '../utils/inkSmoothing';
import { 
  processUploadedPdfFile, 
  processUploadedImageAsWorksheet, 
  BUILTIN_TUTORIAL_TEMPLATES, 
  exportAnnotatedPageToDataUrl,
  TutorialTemplate
} from '../utils/pdfRenderer';
import { 
  FileText, 
  MessageSquare, 
  Trash2,
  Move,
  Check,
  X,
  Highlighter,
  Copy,
  BookOpen,
  MessageCircle,
  Sparkles,
  Download,
  GraduationCap,
  Award,
  Layers,
  Grid,
  AlignJustify,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Quote,
  FileEdit,
  CheckCircle2
} from 'lucide-react';

interface PdfAnnotatorProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
  onCreateNote?: (newNote: Note) => void;
  onOpenFlashcards?: () => void;
}

interface SurfaceSearchMatch {
  id: string;
  page: number;
  rect: PDFHighlightRect;
  text: string;
}

const HIGHLIGHT_COLOR_PALETTE = [
  { name: 'Solar Yellow', value: '#fef08a', bgClass: 'bg-yellow-200' },
  { name: 'Mint Green', value: '#bbf7d0', bgClass: 'bg-green-200' },
  { name: 'Sky Blue', value: '#bfdbfe', bgClass: 'bg-blue-200' },
  { name: 'Blush Pink', value: '#fbcfe8', bgClass: 'bg-pink-200' },
  { name: 'Warm Orange', value: '#fed7aa', bgClass: 'bg-orange-200' },
];

export const PdfAnnotator: React.FC<PdfAnnotatorProps> = ({
  note,
  onUpdateNote,
  onCreateNote,
  onOpenFlashcards,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  
  // Tutorial Role: Student or Lecturer
  const [tutorialRole, setTutorialRole] = useState<'student' | 'lecturer'>(
    note.pdfData?.tutorialMode || 'student'
  );

  // Search in PDF
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGlobalMatchIndex, setActiveGlobalMatchIndex] = useState(0);
  const [surfaceMatches, setSurfaceMatches] = useState<SurfaceSearchMatch[]>([]);

  // Overlays, Key Terms & Sidebar
  const [showGridOverlay, setShowGridOverlay] = useState(note.pdfData?.showGridOverlay || false);
  const [showLinedOverlay, setShowLinedOverlay] = useState(note.pdfData?.showLinedOverlay || false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isKeyTermsOpen, setIsKeyTermsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; sub?: string } | null>(null);

  // Active Tool & Stamp
  const [activeTool, setActiveTool] = useState<PdfToolMode>('pen');
  const [selectedStampPreset, setSelectedStampPreset] = useState<StampPreset>(LECTURER_STAMP_PRESETS[0]);
  const [textHighlightColor, setTextHighlightColor] = useState<string>('#fef08a');
  const [penColor, setPenColor] = useState(tutorialRole === 'lecturer' ? '#dc2626' : '#18181b');
  const [penWidth, setPenWidth] = useState(2.5);
  const [highlighterColor, setHighlighterColor] = useState('#facc15');
  const [highlighterWidth, setHighlighterWidth] = useState(22);
  const [isSmartHighlighterEnabled, setIsSmartHighlighterEnabled] = useState(true);
  const snappedLineYRef = useRef<number | null>(null);
  const [textColor, setTextColor] = useState('#18181b');
  const [textFontSize, setTextFontSize] = useState(14);
  const [textBgColor, setTextBgColor] = useState('transparent');

  // History stacks
  const [undoStack, setUndoStack] = useState<PDFPageAnnotation[]>([]);
  const [redoStack, setRedoStack] = useState<PDFPageAnnotation[]>([]);

  // Dragging text box or stamp
  const [draggingTextBoxId, setDraggingTextBoxId] = useState<string | null>(null);
  const [draggingStampId, setDraggingStampId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sticky note modal
  const [showStickyModal, setShowStickyModal] = useState(false);
  const [stickyInput, setStickyInput] = useState('');
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);

  // Text selection highlight state
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTextInfo, setSelectedTextInfo] = useState<{
    text: string;
    rects: PDFHighlightRect[];
    menuX: number;
    menuY: number;
  } | null>(null);
  const [highlightCommentInput, setHighlightCommentInput] = useState('');
  const [showAddCommentField, setShowAddCommentField] = useState(false);

  // Existing highlight active popover
  const [activeHighlightDetails, setActiveHighlightDetails] = useState<PDFHighlight | null>(null);
  const [isHighlightsDrawerOpen, setIsHighlightsDrawerOpen] = useState(false);
  const [highlightsSearchFilter, setHighlightsSearchFilter] = useState('');
  
  // Canvas drawing refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<{ x: number; y: number; pressure?: number }[]>([]);
  const initialAnnotationRef = useRef<PDFPageAnnotation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pdfData: PDFDocumentData = note.pdfData || {
    fileName: 'Tutorial_Sheet_04_Linear_Algebra.pdf',
    totalPages: 4,
    annotations: {}
  };

  const totalPages = pdfData.totalPages || 4;

  const currentAnnotation: PDFPageAnnotation = pdfData.annotations[currentPage] || {
    strokes: [],
    textBoxes: [],
    highlights: [],
    stamps: [],
    stickyNotes: []
  };

  const currentStrokes = currentAnnotation.strokes || [];
  const currentTextBoxes = currentAnnotation.textBoxes || [];
  const currentHighlights = currentAnnotation.highlights || [];
  const currentStamps = currentAnnotation.stamps || [];
  const currentStickyNotes = currentAnnotation.stickyNotes || [];

  // Keyboard shortcut for Search (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute surface search matches dynamically on the current page
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSurfaceMatches([]);
      return;
    }

    const timer = setTimeout(() => {
      const container = pageContainerRef.current;
      if (!container) return;

      const query = searchQuery.toLowerCase();
      const matches: SurfaceSearchMatch[] = [];
      const containerRect = container.getBoundingClientRect();

      // Traverse all text nodes inside page container
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          // Ignore inputs, textboxes, stickies, and UI buttons
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (
            parent.closest('input') ||
            parent.closest('textarea') ||
            parent.closest('button') ||
            parent.closest('.search-ignore')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let textNode: Node | null = walker.nextNode();
      let matchCount = 0;

      while (textNode) {
        const text = textNode.textContent || '';
        const lower = text.toLowerCase();
        let startIndex = 0;

        while ((startIndex = lower.indexOf(query, startIndex)) !== -1) {
          try {
            const range = document.createRange();
            range.setStart(textNode, startIndex);
            range.setEnd(textNode, startIndex + query.length);

            const clientRects = Array.from(range.getClientRects());
            for (const r of clientRects) {
              if (r.width > 1 && r.height > 1) {
                matches.push({
                  id: `match-${currentPage}-${matchCount++}`,
                  page: currentPage,
                  rect: {
                    x: Math.round((r.left - containerRect.left) / zoom),
                    y: Math.round((r.top - containerRect.top) / zoom),
                    width: Math.round(r.width / zoom),
                    height: Math.round(r.height / zoom),
                  },
                  text: text.substring(startIndex, startIndex + query.length),
                });
              }
            }
          } catch (e) {
            // Ignore range calculation errors on dynamic dom
          }

          startIndex += query.length;
        }

        textNode = walker.nextNode();
      }

      setSurfaceMatches(matches);
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPage, zoom]);

  // Document-wide search match counters for thumbnails sidebar
  const pageMatchCounts = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return {};
    const q = searchQuery.toLowerCase();
    const counts: Record<number, number> = {};

    for (let p = 1; p <= totalPages; p++) {
      if (pdfData.pageTexts && pdfData.pageTexts[p]) {
        const text = pdfData.pageTexts[p].toLowerCase();
        const matches = (text.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (matches > 0) counts[p] = matches;
      } else {
        // Fallback estimate for built-in templates
        counts[p] = p === currentPage ? surfaceMatches.length : 0;
      }
    }

    if (surfaceMatches.length > 0) {
      counts[currentPage] = surfaceMatches.length;
    }

    return counts;
  }, [searchQuery, totalPages, pdfData.pageTexts, surfaceMatches.length, currentPage]);

  const totalDocumentMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const values = Object.values(pageMatchCounts);
    if (values.length === 0) return surfaceMatches.length;
    return values.reduce((a, b) => a + b, 0);
  }, [pageMatchCounts, searchQuery, surfaceMatches.length]);

  // Automated Key Terms Extraction
  const keyTerms = useMemo(() => {
    return extractKeyTermsFromDocument(
      pdfData.activeTemplateId,
      pdfData.pageTexts,
      totalPages
    );
  }, [pdfData.activeTemplateId, pdfData.pageTexts, totalPages]);

  // Select key term handler: jumps to page and highlights on surface
  const handleSelectKeyTerm = (term: PDFKeyTerm) => {
    setCurrentPage(term.page);
    setSearchQuery(term.term);
    setIsSearchOpen(true);
  };

  // Extract selected text / quote into main note body with automatic citation
  const handleExtractToNote = (text: string, pageNumber: number, comment?: string) => {
    const docTitle = pdfData.fileName.replace(/\.pdf$/i, '');
    const citation = `\n\n> "${text.trim()}"\n> — *${docTitle}*, Page ${pageNumber}${comment ? ` (${comment})` : ''}\n`;
    const updatedContent = (note.content || '').trimEnd() + citation;

    onUpdateNote({
      ...note,
      content: updatedContent,
      updatedAt: Date.now(),
    });

    setToastMessage({
      text: 'Extracted to Note Body',
      sub: `Page ${pageNumber} citation appended`,
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Extract selected text / quote into Research panel
  const handleExtractToResearch = (text: string, pageNumber: number, color?: string) => {
    const newQuote: ResearchQuote = {
      id: 'quote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      quote: text.trim(),
      sourceNote: pdfData.fileName,
      pageNumber: `Page ${pageNumber}`,
      color: color || '#fef08a',
    };

    const existingResearch: ResearchData = note.researchData || {
      keyTakeaways: [],
      quotes: [],
      screenshots: [],
      personalCritique: '',
      pdfAttachedName: pdfData.fileName,
    };

    onUpdateNote({
      ...note,
      researchData: {
        ...existingResearch,
        quotes: [...(existingResearch.quotes || []), newQuote],
        pdfAttachedName: existingResearch.pdfAttachedName || pdfData.fileName,
      },
      updatedAt: Date.now(),
    });

    setToastMessage({
      text: 'Saved to Research Quotes',
      sub: `Page ${pageNumber} citation recorded`,
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNextSearchMatch = () => {
    if (surfaceMatches.length === 0) return;
    setActiveGlobalMatchIndex((prev) => (prev + 1) % surfaceMatches.length);
  };

  const handlePrevSearchMatch = () => {
    if (surfaceMatches.length === 0) return;
    setActiveGlobalMatchIndex((prev) => (prev - 1 + surfaceMatches.length) % surfaceMatches.length);
  };

  // Switch role helper
  const handleToggleTutorialRole = (role: 'student' | 'lecturer') => {
    setTutorialRole(role);
    if (role === 'lecturer') {
      setPenColor('#dc2626'); // Red grading pen by default
    } else {
      setPenColor('#18181b'); // Student ink black
    }
    onUpdateNote({
      ...note,
      updatedAt: Date.now(),
      pdfData: {
        ...pdfData,
        tutorialMode: role,
      }
    });
  };

  // Save page annotations persistently
  const savePageAnnotation = useCallback((updatedAnnotation: PDFPageAnnotation) => {
    const updatedAnnotations = {
      ...pdfData.annotations,
      [currentPage]: updatedAnnotation,
    };

    onUpdateNote({
      ...note,
      updatedAt: Date.now(),
      pdfData: {
        ...pdfData,
        annotations: updatedAnnotations,
      },
    });
  }, [note, onUpdateNote, pdfData, currentPage]);

  // Record undo state
  const recordHistory = useCallback(() => {
    setUndoStack(prev => [...prev, currentAnnotation]);
    setRedoStack([]);
  }, [currentAnnotation]);

  // Text selection highlight logic
  const handlePageMouseUp = () => {
    if (activeTool !== 'select' && activeTool !== 'text-highlight') return;
    
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (!text || text.length === 0) return;

      const pageEl = pageContainerRef.current;
      if (!pageEl) return;

      const containerRect = pageEl.getBoundingClientRect();
      const range = selection.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());

      if (clientRects.length === 0) return;

      const highlightRects: PDFHighlightRect[] = clientRects.map(r => ({
        x: Math.round((r.left - containerRect.left) / zoom),
        y: Math.round((r.top - containerRect.top) / zoom),
        width: Math.round(r.width / zoom),
        height: Math.round(r.height / zoom),
      })).filter(r => r.width > 2 && r.height > 2);

      if (highlightRects.length === 0) return;

      if (activeTool === 'text-highlight') {
        applyHighlight(text, highlightRects, textHighlightColor);
        selection.removeAllRanges();
      } else {
        const lastRect = clientRects[clientRects.length - 1];
        setSelectedTextInfo({
          text,
          rects: highlightRects,
          menuX: Math.max(16, Math.min(window.innerWidth - 280, lastRect.left)),
          menuY: Math.max(16, lastRect.bottom + 10),
        });
        setShowAddCommentField(false);
        setHighlightCommentInput('');
      }
    }, 20);
  };

  const applyHighlight = (
    text: string,
    rects: PDFHighlightRect[],
    color: string,
    comment?: string
  ) => {
    recordHistory();
    const newHighlight: PDFHighlight = {
      id: 'hl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      pageNumber: currentPage,
      text,
      color,
      rects,
      comment: comment?.trim() || undefined,
      createdAt: Date.now(),
    };

    const updatedAnnotation: PDFPageAnnotation = {
      ...currentAnnotation,
      highlights: [...currentHighlights, newHighlight],
    };

    savePageAnnotation(updatedAnnotation);
    setSelectedTextInfo(null);
    setShowAddCommentField(false);
    setHighlightCommentInput('');
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = (id: string) => {
    recordHistory();
    const updatedAnnotation: PDFPageAnnotation = {
      ...currentAnnotation,
      highlights: currentHighlights.filter(h => h.id !== id),
    };
    savePageAnnotation(updatedAnnotation);
    setActiveHighlightDetails(null);
  };

  const updateHighlight = (id: string, updates: Partial<PDFHighlight>) => {
    const updatedHighlights = currentHighlights.map(h => (h.id === id ? { ...h, ...updates } : h));
    savePageAnnotation({
      ...currentAnnotation,
      highlights: updatedHighlights,
    });
    if (activeHighlightDetails && activeHighlightDetails.id === id) {
      setActiveHighlightDetails(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Render canvas strokes with Bezier smoothing
  const renderStrokes = useCallback((ctx: CanvasRenderingContext2D, strokeList: InkStroke[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const stroke of strokeList) {
      renderBezierStroke(ctx, stroke);
    }
  }, []);

  // Redraw canvas only when target dimensions actually change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 780;
    const h = 1000;

    const targetWidth = Math.round(w * dpr);
    const targetHeight = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    renderStrokes(ctx, currentStrokes);
  }, [currentStrokes, renderStrokes, currentPage]);

  // Pointer coordinates with pressure sensitivity
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    let pressure = 0.5;
    if (e.pointerType === 'pen') {
      pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
    } else if (e.pressure !== undefined && e.pressure > 0 && e.pressure !== 0.5) {
      pressure = e.pressure;
    } else if (currentPoints.current.length > 0) {
      const last = currentPoints.current[currentPoints.current.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      const speed = Math.min(1.0, dist / 22);
      pressure = Math.max(0.25, 0.78 - speed * 0.42);
    }

    return { x, y, pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'pen' && activeTool !== 'highlighter' && activeTool !== 'eraser') return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;

    // Save starting snapshot of annotation for single-commit undo stack history
    initialAnnotationRef.current = JSON.parse(JSON.stringify(currentAnnotation));

    let pt = getCanvasCoords(e);

    // Smart Highlighter Text Line Snap
    if (activeTool === 'highlighter' && isSmartHighlighterEnabled) {
      let snapY = pt.y;
      const textNodes = pageContainerRef.current?.querySelectorAll('p, div, span, h1, h2, h3, h4, .pdf-ocr-word');
      if (textNodes && textNodes.length > 0 && pageContainerRef.current) {
        const containerRect = pageContainerRef.current.getBoundingClientRect();
        let minDistance = 28; // Max 28px snap threshold
        textNodes.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 8 && rect.height > 6) {
            const centerY = (rect.top + rect.height / 2 - containerRect.top) / zoom;
            const diff = Math.abs(centerY - pt.y);
            if (diff < minDistance) {
              minDistance = diff;
              snapY = centerY;
            }
          }
        });
      }
      snappedLineYRef.current = snapY;
      pt = { ...pt, y: snapY };
    } else {
      snappedLineYRef.current = null;
    }

    currentPoints.current = [pt];

    if (activeTool === 'eraser') {
      eraseAtPoint(pt);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = activeTool === 'highlighter' ? highlighterColor : penColor;
    const effectiveWidth = activeTool === 'highlighter' ? highlighterWidth : penWidth * (pt.pressure ? pt.pressure * 1.4 : 1);
    ctx.lineWidth = effectiveWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (activeTool === 'highlighter') {
      ctx.globalAlpha = 0.38;
      ctx.globalCompositeOperation = 'multiply';
    }
    ctx.arc(pt.x, pt.y, effectiveWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    let pt = getCanvasCoords(e);

    // Apply Smart Line Snap Y-Lock across drag
    if (activeTool === 'highlighter' && isSmartHighlighterEnabled && snappedLineYRef.current !== null) {
      pt = { ...pt, y: snappedLineYRef.current };
    }

    currentPoints.current.push(pt);

    if (activeTool === 'eraser') {
      eraseAtPoint(pt);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderLiveBezierSegment(
      ctx,
      currentPoints.current,
      activeTool === 'highlighter' ? 'highlighter' : 'pen',
      activeTool === 'highlighter' ? highlighterColor : penColor,
      activeTool === 'highlighter' ? highlighterWidth : penWidth,
      activeTool === 'highlighter' ? 0.38 : 1.0
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    snappedLineYRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (activeTool === 'eraser') {
      // If we actually modified strokes, save the initial snapshot as a single checkpoint in undo history
      if (initialAnnotationRef.current && JSON.stringify(initialAnnotationRef.current.strokes) !== JSON.stringify(currentStrokes)) {
        setUndoStack(prev => [...prev, initialAnnotationRef.current!]);
        setRedoStack([]);
      }
      initialAnnotationRef.current = null;
      return;
    }
    if (currentPoints.current.length === 0) return;

    const smoothedPoints = postProcessStrokePoints(currentPoints.current);

    const newStroke: InkStroke = {
      id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
      color: activeTool === 'highlighter' ? highlighterColor : penColor,
      width: activeTool === 'highlighter' ? highlighterWidth : penWidth,
      opacity: activeTool === 'highlighter' ? 0.38 : 1.0,
      points: smoothedPoints,
    };

    // Use initialAnnotationRef or current snap
    if (initialAnnotationRef.current) {
      setUndoStack(prev => [...prev, initialAnnotationRef.current!]);
      setRedoStack([]);
    } else {
      recordHistory();
    }

    const updatedAnnotation: PDFPageAnnotation = {
      ...currentAnnotation,
      strokes: [...currentStrokes, newStroke],
    };
    savePageAnnotation(updatedAnnotation);
    currentPoints.current = [];
    initialAnnotationRef.current = null;
  };

  const eraseAtPoint = (pt: { x: number; y: number }) => {
    const eraserRadius = 18;
    const updatedStrokes = eraseStrokesAtPoint(currentStrokes, pt, eraserRadius);

    if (updatedStrokes !== currentStrokes) {
      savePageAnnotation({
        ...currentAnnotation,
        strokes: updatedStrokes,
      });
    }
  };

  // Click on PDF page for Textbox, Sticky, or Stamp
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'textbox' && activeTool !== 'sticky' && activeTool !== 'stamp') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (activeTool === 'stamp') {
      recordHistory();
      const newStamp: PDFStamp = {
        id: 'stamp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        x,
        y,
        type: selectedStampPreset.type,
        label: selectedStampPreset.label,
        scoreText: selectedStampPreset.defaultScore,
        color: selectedStampPreset.color,
      };

      savePageAnnotation({
        ...currentAnnotation,
        stamps: [...currentStamps, newStamp],
      });
    } else if (activeTool === 'textbox') {
      recordHistory();
      const newTextBox: PDFTextBox = {
        id: 'tb-' + Date.now(),
        x,
        y,
        text: 'Type solution / remark...',
        fontSize: textFontSize,
        color: textColor,
        backgroundColor: textBgColor,
      };

      savePageAnnotation({
        ...currentAnnotation,
        textBoxes: [...currentTextBoxes, newTextBox],
      });
      setActiveTool('select');
    } else if (activeTool === 'sticky') {
      setClickPos({ x, y });
      setStickyInput('');
      setShowStickyModal(true);
    }
  };

  // Update text box
  const updateTextBox = (id: string, updates: Partial<PDFTextBox>) => {
    const nextBoxes = currentTextBoxes.map(b => (b.id === id ? { ...b, ...updates } : b));
    savePageAnnotation({
      ...currentAnnotation,
      textBoxes: nextBoxes,
    });
  };

  const deleteTextBox = (id: string) => {
    recordHistory();
    const nextBoxes = currentTextBoxes.filter(b => b.id !== id);
    savePageAnnotation({
      ...currentAnnotation,
      textBoxes: nextBoxes,
    });
  };

  // Update & delete stamps
  const updateStamp = (id: string, updates: Partial<PDFStamp>) => {
    const nextStamps = currentStamps.map(s => (s.id === id ? { ...s, ...updates } : s));
    savePageAnnotation({
      ...currentAnnotation,
      stamps: nextStamps,
    });
  };

  const deleteStamp = (id: string) => {
    recordHistory();
    const nextStamps = currentStamps.filter(s => s.id !== id);
    savePageAnnotation({
      ...currentAnnotation,
      stamps: nextStamps,
    });
  };

  // Sticky notes
  const saveStickyNote = () => {
    if (!stickyInput.trim() || !clickPos) return;
    recordHistory();
    const newNote = {
      id: 'sticky-' + Date.now(),
      x: clickPos.x,
      y: clickPos.y,
      text: stickyInput.trim(),
      color: '#fef08a',
      timestamp: Date.now(),
    };

    savePageAnnotation({
      ...currentAnnotation,
      stickyNotes: [...currentStickyNotes, newNote],
    });
    setShowStickyModal(false);
    setStickyInput('');
    setClickPos(null);
  };

  const deleteStickyNote = (id: string) => {
    recordHistory();
    const nextSticky = currentStickyNotes.filter(s => s.id !== id);
    savePageAnnotation({
      ...currentAnnotation,
      stickyNotes: nextSticky,
    });
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, currentAnnotation]);
    setUndoStack(prev => prev.slice(0, -1));
    savePageAnnotation(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, currentAnnotation]);
    setRedoStack(prev => prev.slice(0, -1));
    savePageAnnotation(next);
  };

  const handleClearPage = () => {
    if (confirm('Clear all drawings, highlights, text boxes, and stamps on this page?')) {
      recordHistory();
      savePageAnnotation({
        strokes: [],
        textBoxes: [],
        highlights: [],
        stamps: [],
        stickyNotes: [],
      });
    }
  };

  // Real PDF & Worksheet File Upload Handler
  const handleRealFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const result = await processUploadedPdfFile(file);
        const newPdfData: PDFDocumentData = {
          fileName: result.fileName,
          fileSize: result.fileSize,
          totalPages: result.totalPages,
          pageImages: result.pageImages,
          pageTexts: result.pageTexts,
          tutorialMode: tutorialRole,
          showGridOverlay,
          showLinedOverlay,
          annotations: {},
        };

        onUpdateNote({
          ...note,
          title: `PDF: ${result.fileName.replace(/\.pdf$/i, '')}`,
          pdfData: newPdfData,
          updatedAt: Date.now(),
        });
      } else if (file.type.startsWith('image/')) {
        const result = await processUploadedImageAsWorksheet(file);
        const newPdfData: PDFDocumentData = {
          fileName: result.fileName,
          fileSize: result.fileSize,
          totalPages: 1,
          pageImages: result.pageImages,
          pageTexts: result.pageTexts,
          tutorialMode: tutorialRole,
          showGridOverlay,
          showLinedOverlay,
          annotations: {},
        };

        onUpdateNote({
          ...note,
          title: `Worksheet: ${result.fileName.replace(/\.[^/.]+$/, '')}`,
          pdfData: newPdfData,
          updatedAt: Date.now(),
        });
      }
      setCurrentPage(1);
      setUndoStack([]);
      setRedoStack([]);
      setShowUploadModal(false);
    } catch (err) {
      console.error('Failed to process uploaded file:', err);
      alert('Could not render this PDF file. Loading as standard tutorial workspace.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Select Built-in Academic Tutorial Template
  const handleSelectTemplate = (template: TutorialTemplate) => {
    const newPdfData: PDFDocumentData = {
      fileName: `${template.title}.pdf`,
      totalPages: template.totalPages,
      activeTemplateId: template.id,
      tutorialMode: tutorialRole,
      showGridOverlay: template.id === 'tutorial-blank-grid',
      showLinedOverlay: false,
      annotations: {},
    };

    onUpdateNote({
      ...note,
      title: `${template.title}`,
      pdfData: newPdfData,
      updatedAt: Date.now(),
    });
    setCurrentPage(1);
    setUndoStack([]);
    setRedoStack([]);
    setShowUploadModal(false);
  };

  // Dragging handling for text boxes and stamps
  const startDragTextBox = (e: React.MouseEvent, box: PDFTextBox) => {
    e.stopPropagation();
    setDraggingTextBoxId(box.id);
    dragOffsetRef.current = {
      x: e.clientX / zoom - box.x,
      y: e.clientY / zoom - box.y,
    };
  };

  const startDragStamp = (e: React.MouseEvent, stamp: PDFStamp) => {
    e.stopPropagation();
    setDraggingStampId(stamp.id);
    dragOffsetRef.current = {
      x: e.clientX / zoom - stamp.x,
      y: e.clientY / zoom - stamp.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingTextBoxId) {
      const newX = Math.round(e.clientX / zoom - dragOffsetRef.current.x);
      const newY = Math.round(e.clientY / zoom - dragOffsetRef.current.y);
      updateTextBox(draggingTextBoxId, { x: newX, y: newY });
    } else if (draggingStampId) {
      const newX = Math.round(e.clientX / zoom - dragOffsetRef.current.x);
      const newY = Math.round(e.clientY / zoom - dragOffsetRef.current.y);
      updateStamp(draggingStampId, { x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setDraggingTextBoxId(null);
    setDraggingStampId(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Render Page Content (Real uploaded PDF image or Built-in Academic Tutorial Sheet)
  const renderPageContent = (page: number) => {
    if (pdfData.pageImages && pdfData.pageImages[page]) {
      return (
        <div className="relative w-full min-h-[1000px] bg-white">
          <img
            src={pdfData.pageImages[page]}
            alt={`PDF Page ${page}`}
            className="w-full h-auto block select-none pointer-events-none"
          />
        </div>
      );
    }

    const templateId = pdfData.activeTemplateId || 'tutorial-linear-algebra';

    if (templateId === 'tutorial-linear-algebra') {
      switch (page) {
        case 1:
          return (
            <div className="pdf-page-bg p-10 text-stone-800 select-text pointer-events-auto">
              <div className="border-b-2 border-stone-800 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-700 font-bold block mb-1">
                      DEPARTMENT OF MATHEMATICS • APPLIED LINEAR ALGEBRA
                    </span>
                    <h1 className="text-xl font-serif font-bold text-stone-900 tracking-tight">
                      Tutorial Sheet 04: Matrix Diagonalization & Spectral Theorem
                    </h1>
                  </div>
                  <div className="border border-stone-300 rounded-lg p-2 text-right bg-stone-50">
                    <span className="text-[10px] text-stone-500 uppercase block font-mono">Score / Grade</span>
                    <span className="text-sm font-bold text-stone-800 font-mono">__ / 20 pts</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-stone-500 mt-3 font-mono">
                  <span>Student Name: ______________</span>
                  <span>Student ID: ______________</span>
                  <span>Tutorial Group: T08</span>
                </div>
              </div>

              <div className="space-y-6 text-xs leading-relaxed font-serif text-stone-800">
                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/70">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-sans font-bold text-xs text-stone-900 uppercase">
                      Problem 1. Characteristic Polynomial & Eigenvalues [5 pts]
                    </h3>
                    <span className="text-[11px] font-mono text-indigo-700 font-bold">Mandatory</span>
                  </div>
                  <p className="text-stone-700 mb-3">
                    Let A be the 3 × 3 symmetric matrix defined by:
                  </p>
                  <div className="p-3 bg-white border border-stone-200 rounded text-center font-mono text-xs my-2 font-bold text-stone-900">
                    A = [ [ 4, 1, 1 ], [ 1, 4, 1 ], [ 1, 1, 4 ] ]
                  </div>
                  <p className="text-stone-600">
                    (a) Compute the characteristic polynomial p(λ) = det(A - λI).<br />
                    (b) Determine all eigenvalues and their algebraic multiplicities.<br />
                    (c) Show that λ = 3 is an eigenvalue with geometric multiplicity 2.
                  </p>
                  <div className="mt-4 pt-3 border-t border-dashed border-stone-300 text-stone-400 italic text-[11px]">
                    ✍️ Work space below: Write solution steps with Pen or Text box...
                  </div>
                </div>

                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/70">
                  <h3 className="font-sans font-bold text-xs text-stone-900 uppercase mb-1">
                    Problem 2. Orthogonal Diagonalization & Gram-Schmidt [5 pts]
                  </h3>
                  <p className="text-stone-700">
                    Construct an orthogonal matrix Q such that Qᵀ A Q = D, where D is diagonal. Verify that Q⁻¹ = Qᵀ.
                  </p>
                </div>
              </div>
            </div>
          );
        case 2:
          return (
            <div className="pdf-page-bg p-10 text-stone-800 select-text pointer-events-auto">
              <h2 className="text-base font-serif font-bold text-stone-900 mb-4 pb-2 border-b border-stone-200">
                Tutorial Sheet 04 • Continued (Page 2)
              </h2>
              <div className="space-y-6 text-xs font-serif leading-relaxed text-stone-800">
                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/70">
                  <h3 className="font-sans font-bold text-xs text-stone-900 uppercase mb-1">
                    Problem 3. Singular Value Decomposition (SVD) Applications [5 pts]
                  </h3>
                  <p className="text-stone-700 mb-2">
                    For the non-square matrix M = [ [ 1, 2 ], [ 2, 1 ], [ 1, 1 ] ]:
                  </p>
                  <p className="text-stone-600">
                    (a) Calculate MᵀM and find its singular values σ₁ ≥ σ₂.<br />
                    (b) Find the best rank-1 approximation of M using the Eckart-Young-Mirsky Theorem.
                  </p>
                </div>
                <div className="border border-stone-200 rounded-lg p-4 bg-stone-50/70">
                  <h3 className="font-sans font-bold text-xs text-stone-900 uppercase mb-1">
                    Problem 4. Positive Definite Quadratic Forms [5 pts]
                  </h3>
                  <p className="text-stone-700">
                    Prove that Q(x) = xᵀAx &gt; 0 for all x ≠ 0 if and only if all leading principal minors of A are strictly positive (Sylvester&apos;s Criterion).
                  </p>
                </div>
              </div>
            </div>
          );
        default:
          return (
            <div className="pdf-page-bg p-10 text-stone-800 select-text pointer-events-auto">
              <h2 className="text-base font-serif font-bold text-stone-900 mb-2 pb-2 border-b border-stone-200">
                Tutorial Sheet 04 • Supplementary Calculation Sheet (Page {page})
              </h2>
              <p className="text-xs text-stone-500 font-mono mb-6">
                Use this page for scratch work, proofs, or lecturer review feedback.
              </p>
            </div>
          );
      }
    }

    if (templateId === 'tutorial-blank-grid') {
      return (
        <div className="pdf-page-bg p-8 text-stone-800 min-h-[1000px]">
          <div className="flex justify-between items-center border-b pb-2 mb-4 text-xs font-mono text-stone-500">
            <span>Tutorial Problem Solving Sheet • Page {page}</span>
            <span>Date: ____________</span>
          </div>
        </div>
      );
    }

    // Default Lecture Slides
    return (
      <div className="pdf-page-bg p-12 text-stone-800 select-text pointer-events-auto">
        <div className="text-center border-b border-stone-200 pb-6 mb-8">
          <span className="text-xs uppercase font-mono tracking-widest text-stone-600 block mb-1">
            DEPARTMENT OF APPLIED PHYSICS • ADVANCED QUANTUM COMPUTING
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
            Lecture 09: Quantum Gate Teleportation & Dense Coding
          </h1>
          <p className="text-xs text-stone-600 mt-2 font-mono">
            Prof. E. Vance • Autumn Term • Slides & Discussion Notes
          </p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed font-serif text-stone-700">
          <div className="bg-stone-50/80 p-4 rounded border border-stone-200">
            <h3 className="font-sans font-semibold text-xs text-stone-900 uppercase tracking-wide mb-1">
              1. Abstract & Protocol Primitives
            </h3>
            <p className="text-xs text-stone-600">
              Quantum teleportation enables the faithful transmission of an unknown quantum state |ψ⟩ = α|0⟩ + β|1⟩ from a sender (Alice) to a receiver (Bob) through an EPR pair channel and classical communications.
            </p>
          </div>

          <div className="border border-stone-200 rounded p-4 bg-white shadow-xs">
            <h4 className="font-sans font-semibold text-xs text-stone-800 uppercase mb-2">
              2. Entanglement Preparation (Bell State)
            </h4>
            <div className="p-3 bg-stone-100 rounded text-center font-mono text-xs text-stone-900">
              |Φ⁺⟩ = (1 / √2) (|00⟩ + |11⟩)
            </div>
            <p className="text-xs text-stone-600 mt-2">
              Alice holds the state to be transmitted and qubit A of the Bell pair. Bob holds qubit B.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const totalAnnotations = currentStrokes.length + currentTextBoxes.length + currentHighlights.length + currentStamps.length + currentStickyNotes.length;

  const filteredHighlights = currentHighlights.filter(h => {
    if (!highlightsSearchFilter.trim()) return true;
    const q = highlightsSearchFilter.toLowerCase();
    return h.text.toLowerCase().includes(q) || (h.comment && h.comment.toLowerCase().includes(q));
  });

  return (
    <div 
      className="flex flex-col h-full bg-stone-100 overflow-hidden select-none relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Document Status & Page Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-stone-200 shadow-2xs z-20 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isThumbnailsOpen ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
            title="Toggle Page Thumbnails"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pages</span>
          </button>

          <FileText className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-800 max-w-[200px] md:max-w-xs truncate">
              {pdfData.fileName}
            </span>
            {pdfData.fileSize && (
              <span className="text-[10px] text-stone-400 font-mono">{pdfData.fileSize}</span>
            )}
          </div>

          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium font-mono">
            Page {currentPage} of {totalPages}
          </span>

          {tutorialRole === 'lecturer' ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-bold flex items-center gap-1">
              <Award className="w-3 h-3" />
              <span>Lecturer Grading</span>
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              <span>Student Tutorial</span>
            </span>
          )}
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-stone-700 min-w-16 text-center">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Upload Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
              isSearchOpen
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
            title="Search in PDF text (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          <div className="h-4 w-px bg-stone-200 mx-1" />

          {/* Upload PDF or Choose Template */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-all"
            title="Upload PDF or Change Tutorial Worksheet"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span>Upload / Templates</span>
          </button>
        </div>
      </div>

      {/* Floating Interactive PDF Annotation Toolbar */}
      <div className="px-4 py-2 flex justify-center z-30">
        <PdfAnnotationToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          tutorialRole={tutorialRole}
          onToggleTutorialRole={handleToggleTutorialRole}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
          isThumbnailsOpen={isThumbnailsOpen}
          onToggleThumbnails={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
          isKeyTermsOpen={isKeyTermsOpen}
          onToggleKeyTerms={() => setIsKeyTermsOpen(!isKeyTermsOpen)}
          onOpenFlashcards={onOpenFlashcards}
          selectedStampPreset={selectedStampPreset}
          onSelectStampPreset={setSelectedStampPreset}
          textHighlightColor={textHighlightColor}
          onChangeTextHighlightColor={setTextHighlightColor}
          highlightsCount={currentHighlights.length}
          onToggleHighlightsList={() => setIsHighlightsDrawerOpen(!isHighlightsDrawerOpen)}
          isHighlightsListOpen={isHighlightsDrawerOpen}
          penColor={penColor}
          onChangePenColor={setPenColor}
          penWidth={penWidth}
          onChangePenWidth={setPenWidth}
          highlighterColor={highlighterColor}
          onChangeHighlighterColor={setHighlighterColor}
          highlighterWidth={highlighterWidth}
          onChangeHighlighterWidth={setHighlighterWidth}
          isSmartHighlighterEnabled={isSmartHighlighterEnabled}
          onToggleSmartHighlighter={() => setIsSmartHighlighterEnabled(!isSmartHighlighterEnabled)}
          textColor={textColor}
          onChangeTextColor={setTextColor}
          textFontSize={textFontSize}
          onChangeTextFontSize={setTextFontSize}
          textBgColor={textBgColor}
          onChangeTextBgColor={setTextBgColor}
          showGridOverlay={showGridOverlay}
          onToggleGridOverlay={() => setShowGridOverlay(!showGridOverlay)}
          showLinedOverlay={showLinedOverlay}
          onToggleLinedOverlay={() => setShowLinedOverlay(!showLinedOverlay)}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPage={handleClearPage}
          onExportPdf={() => setIsExportModalOpen(true)}
          onOpenUploadModal={() => setShowUploadModal(true)}
          totalPageAnnotationsCount={totalAnnotations}
        />
      </div>

      {/* Search Bar Float */}
      {isSearchOpen && (
        <PdfSearchBar
          searchQuery={searchQuery}
          onChangeQuery={setSearchQuery}
          currentPageMatchesCount={surfaceMatches.length}
          totalDocumentMatchesCount={totalDocumentMatchesCount}
          currentMatchIndex={activeGlobalMatchIndex}
          onNextMatch={handleNextSearchMatch}
          onPrevMatch={handlePrevSearchMatch}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchQuery('');
          }}
        />
      )}

      {/* Main Viewport with Multi-Page Thumbnails Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Page Thumbnails Sidebar View */}
        {isThumbnailsOpen && (
          <div className="w-60 bg-white border-r border-stone-200 overflow-y-auto p-3 flex flex-col gap-3 shrink-0 z-20 animate-in slide-in-from-left duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-stone-600" />
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  Pages ({totalPages})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsThumbnailsOpen(false)}
                className="p-1 rounded text-stone-400 hover:text-stone-600"
                title="Close Thumbnails"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                const pageAnno = pdfData.annotations[pg];
                const annoCount = (pageAnno?.strokes?.length || 0) + (pageAnno?.stamps?.length || 0) + (pageAnno?.highlights?.length || 0);
                const searchMatchesOnPage = pageMatchCounts[pg] || 0;

                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`w-full text-left p-2.5 rounded-2xl border transition-all relative ${
                      currentPage === pg
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-stone-800">Page {pg}</span>
                      
                      <div className="flex items-center gap-1">
                        {searchMatchesOnPage > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-0.5">
                            <Search className="w-2.5 h-2.5" />
                            <span>{searchMatchesOnPage}</span>
                          </span>
                        )}
                        {annoCount > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-semibold">
                            {annoCount} edits
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-28 bg-stone-100 rounded-xl border border-stone-200/90 flex items-center justify-center overflow-hidden relative shadow-2xs">
                      {pdfData.pageImages?.[pg] ? (
                        <img
                          src={pdfData.pageImages[pg]}
                          alt={`Thumbnail Page ${pg}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-2 text-center text-stone-400">
                          <span className="text-xs font-serif font-medium">Page {pg} Preview</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Center Page Canvas Viewport */}
        <div className="flex-1 overflow-auto p-6 pb-20 flex justify-center items-start relative">
          <div 
            ref={pageContainerRef}
            className="relative transition-all duration-150 origin-top shadow-xl rounded-sm"
            style={{
              transform: `scale(${zoom})`,
              width: '780px',
              minHeight: '1000px',
              backgroundColor: '#ffffff',
              cursor: activeTool === 'text-highlight' ? 'text' : 
                      activeTool === 'textbox' ? 'text' : 
                      activeTool === 'stamp' ? 'crosshair' :
                      activeTool === 'sticky' ? 'copy' : 'default',
            }}
            onClick={handlePageClick}
            onMouseUp={handlePageMouseUp}
          >
            {/* Optional Calculation Grid Overlay */}
            {showGridOverlay && (
              <div 
                className="absolute inset-0 pointer-events-none z-5"
                style={{
                  backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
            )}

            {/* Optional Ruled Lines Overlay */}
            {showLinedOverlay && (
              <div 
                className="absolute inset-0 pointer-events-none z-5"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, transparent 27px, rgba(217, 119, 6, 0.12) 28px)',
                  backgroundSize: '100% 28px',
                }}
              />
            )}

            {/* Base Document Vector/Slide Text */}
            <div className="w-full min-h-[1000px]">
              {renderPageContent(currentPage)}
            </div>

            {/* ON-SURFACE SEARCH MATCHES HIGHLIGHT OVERLAY LAYER */}
            {surfaceMatches.map((m, idx) => {
              const isActive = idx === activeGlobalMatchIndex;
              return (
                <div
                  key={m.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveGlobalMatchIndex(idx);
                  }}
                  className={`absolute pointer-events-auto cursor-pointer rounded-2xs transition-all z-8 ${
                    isActive
                      ? 'bg-amber-400/90 border-2 border-orange-600 shadow-md ring-4 ring-amber-400/40 animate-pulse scale-105'
                      : 'bg-amber-300/65 border border-amber-500/70 hover:bg-amber-300/90'
                  }`}
                  style={{
                    left: `${m.rect.x}px`,
                    top: `${m.rect.y}px`,
                    width: `${m.rect.width}px`,
                    height: `${m.rect.height}px`,
                  }}
                  title={`Search match: "${m.text}" (${idx + 1} of ${surfaceMatches.length})`}
                >
                  {isActive && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-orange-600 text-white font-mono text-[9px] font-bold shadow-xs whitespace-nowrap">
                      #{idx + 1}
                    </span>
                  )}
                </div>
              );
            })}

            {/* PERSISTED TEXT HIGHLIGHTS OVERLAY */}
            {currentHighlights.map((hl) => (
              <div key={hl.id} className="group/hl">
                {hl.rects.map((rect, rIdx) => (
                  <div
                    key={rIdx}
                    className="absolute pointer-events-auto cursor-pointer rounded-2xs transition-all hover:ring-1 hover:ring-stone-600/40"
                    style={{
                      left: `${rect.x}px`,
                      top: `${rect.y}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                      backgroundColor: hl.color,
                      mixBlendMode: 'multiply',
                      opacity: 0.65,
                      zIndex: 7,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTool === 'eraser') {
                        deleteHighlight(hl.id);
                      } else {
                        setActiveHighlightDetails(hl);
                      }
                    }}
                    title={hl.comment ? `Highlight: "${hl.text}" (${hl.comment})` : `Highlight: "${hl.text}"`}
                  />
                ))}
              </div>
            ))}

            {/* LECTURER & STUDENT GRADING STAMPS LAYER */}
            {currentStamps.map((stamp) => (
              <div
                key={stamp.id}
                onMouseDown={(e) => startDragStamp(e, stamp)}
                className={`absolute z-25 group select-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 shadow-md backdrop-blur-xs transition-transform cursor-move ${
                  activeTool === 'eraser' ? 'hover:ring-2 hover:ring-red-500 cursor-pointer' : 'hover:scale-105'
                }`}
                style={{
                  left: `${stamp.x}px`,
                  top: `${stamp.y}px`,
                  transform: 'translate(-50%, -50%)',
                  borderColor: stamp.color || '#dc2626',
                  backgroundColor: 'rgba(255, 255, 255, 0.94)',
                  color: stamp.color || '#dc2626',
                }}
                onClick={(e) => {
                  if (activeTool === 'eraser') {
                    e.stopPropagation();
                    deleteStamp(stamp.id);
                  }
                }}
              >
                <span className="text-base">
                  {stamp.type === 'correct' ? '✅' :
                   stamp.type === 'incorrect' ? '❌' :
                   stamp.type === 'full-marks' ? '💯' :
                   stamp.type === 'warning' ? '⚠️' :
                   stamp.type === 'question' ? '❓' :
                   stamp.type === 'star' ? '⭐' : '🎓'}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide">
                  {stamp.label}
                </span>

                {stamp.scoreText && (
                  <span 
                    className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 ml-1"
                    title="Score text"
                  >
                    {stamp.scoreText}
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteStamp(stamp.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-red-500 rounded ml-1 transition-opacity"
                  title="Remove Stamp"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Interactive Text Boxes Layer */}
            {currentTextBoxes.map((box) => (
              <div
                key={box.id}
                className={`absolute z-20 group rounded-md p-1.5 transition-shadow ${
                  activeTool === 'eraser' ? 'hover:ring-2 hover:ring-red-500 cursor-pointer' : 'hover:ring-1 hover:ring-blue-400'
                }`}
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  backgroundColor: box.backgroundColor && box.backgroundColor !== 'transparent' ? box.backgroundColor : undefined,
                  color: box.color,
                  fontSize: `${box.fontSize}px`,
                }}
                onClick={(e) => {
                  if (activeTool === 'eraser') {
                    e.stopPropagation();
                    deleteTextBox(box.id);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-1 py-0.5 rounded shadow-2xs">
                  <span
                    onMouseDown={(e) => startDragTextBox(e, box)}
                    className="cursor-move p-0.5 hover:text-blue-600"
                    title="Drag to move"
                  >
                    <Move className="w-3 h-3 text-stone-500" />
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTextBox(box.id);
                    }}
                    className="p-0.5 text-stone-400 hover:text-red-500 rounded"
                    title="Delete text box"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <input
                  type="text"
                  value={box.text}
                  onChange={(e) => updateTextBox(box.id, { text: e.target.value })}
                  className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 min-w-28 font-sans font-medium"
                  style={{ fontSize: `${box.fontSize}px`, color: box.color }}
                />
              </div>
            ))}

            {/* Margin Sticky Notes */}
            {currentStickyNotes.map((sticky) => (
              <div
                key={sticky.id}
                className={`absolute z-20 p-2.5 rounded-lg shadow-md border border-amber-200/80 text-xs w-48 group cursor-pointer transition-transform hover:scale-102 ${
                  activeTool === 'eraser' ? 'hover:ring-2 hover:ring-red-500' : ''
                }`}
                style={{
                  left: `${sticky.x}px`,
                  top: `${sticky.y}px`,
                  backgroundColor: sticky.color || '#fef08a',
                }}
                onClick={(e) => {
                  if (activeTool === 'eraser') {
                    e.stopPropagation();
                    deleteStickyNote(sticky.id);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 text-[10px] text-amber-800 font-medium">
                    <MessageSquare className="w-3 h-3" />
                    <span>Tutorial Remark</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStickyNote(sticky.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-500 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-stone-800 leading-snug">{sticky.text}</p>
              </div>
            ))}

            {/* Freehand Drawing & Handwriting Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 z-10 w-full h-full touch-none ${
                activeTool === 'pen' || activeTool === 'highlighter' ? 'cursor-crosshair pointer-events-auto' :
                activeTool === 'eraser' ? 'cursor-cell pointer-events-auto' : 'pointer-events-none'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          {/* FLOATING TEXT HIGHLIGHT & CITATION EXTRACTION POPOVER */}
          {selectedTextInfo && (
            <div
              className="fixed z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 p-2.5 animate-in fade-in zoom-in-95 flex flex-col gap-2 max-w-md select-none"
              style={{
                left: `${selectedTextInfo.menuX}px`,
                top: `${selectedTextInfo.menuY}px`,
              }}
            >
              {/* Extraction & Citation Action Bar */}
              <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-stone-100">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleExtractToNote(selectedTextInfo.text, currentPage, highlightCommentInput);
                      setSelectedTextInfo(null);
                    }}
                    title="Extract into note body with automatic Page citation"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                  >
                    <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Extract to Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleExtractToResearch(selectedTextInfo.text, currentPage, textHighlightColor);
                      setSelectedTextInfo(null);
                    }}
                    title="Save as Research Quote with Page citation"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors shadow-2xs"
                  >
                    <Quote className="w-3.5 h-3.5 text-purple-600" />
                    <span>Research Quote</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTextInfo(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Color Swatches & Comment Trigger */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-stone-500 pl-1">Highlight:</span>
                {HIGHLIGHT_COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => applyHighlight(selectedTextInfo.text, selectedTextInfo.rects, c.value, highlightCommentInput)}
                    title={c.name}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-125 border border-stone-300 shadow-2xs"
                    style={{ backgroundColor: c.value }}
                  />
                ))}

                <div className="w-px h-4 bg-stone-200 mx-1" />

                <button
                  type="button"
                  onClick={() => handleCopyText(selectedTextInfo.text)}
                  title="Copy text"
                  className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCommentField(!showAddCommentField)}
                  title="Add comment"
                  className="p-1 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {showAddCommentField && (
                <div className="flex items-center gap-1 pt-1 border-t border-stone-100">
                  <input
                    type="text"
                    autoFocus
                    value={highlightCommentInput}
                    onChange={(e) => setHighlightCommentInput(e.target.value)}
                    placeholder="Attach remark note..."
                    className="text-xs px-2 py-1 rounded-lg border border-stone-200 flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyHighlight(selectedTextInfo.text, selectedTextInfo.rects, textHighlightColor, highlightCommentInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => applyHighlight(selectedTextInfo.text, selectedTextInfo.rects, textHighlightColor, highlightCommentInput)}
                    className="px-2 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-2xs"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CLICKED HIGHLIGHT DETAIL CARD */}
          {activeHighlightDetails && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 border border-stone-200 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-stone-300"
                      style={{ backgroundColor: activeHighlightDetails.color }}
                    />
                    <span className="text-xs font-bold text-stone-800">
                      Highlight (Page {activeHighlightDetails.pageNumber})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveHighlightDetails(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="p-3 rounded-xl mb-3 text-xs leading-relaxed font-serif text-stone-800 border"
                  style={{ backgroundColor: `${activeHighlightDetails.color}33`, borderColor: activeHighlightDetails.color }}
                >
                  &ldquo;{activeHighlightDetails.text}&rdquo;
                </div>

                {/* Quick Extraction Buttons */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleExtractToNote(activeHighlightDetails.text, activeHighlightDetails.pageNumber, activeHighlightDetails.comment)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Extract to Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExtractToResearch(activeHighlightDetails.text, activeHighlightDetails.pageNumber, activeHighlightDetails.color)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors"
                  >
                    <Quote className="w-3.5 h-3.5 text-purple-600" />
                    <span>Research Quote</span>
                  </button>
                </div>

                <div className="mb-4">
                  <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                    Remark / Question:
                  </span>
                  <input
                    type="text"
                    value={activeHighlightDetails.comment || ''}
                    onChange={(e) => updateHighlight(activeHighlightDetails.id, { comment: e.target.value })}
                    placeholder="Add comment..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => deleteHighlight(activeHighlightDetails.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHighlightDetails(null)}
                    className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SIDE DRAWER: ALL PAGE HIGHLIGHTS */}
          {isHighlightsDrawerOpen && (
            <div className="absolute right-4 top-4 bottom-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 z-40 flex flex-col p-4 animate-in slide-in-from-right duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Highlighter className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800">
                    Page Highlights ({currentHighlights.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHighlightsDrawerOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-2.5">
                <input
                  type="text"
                  value={highlightsSearchFilter}
                  onChange={(e) => setHighlightsSearchFilter(e.target.value)}
                  placeholder="Filter highlighted quotes..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredHighlights.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-400 italic">
                    {currentHighlights.length === 0
                      ? 'No text highlighted yet on this page.'
                      : 'No matches found.'}
                  </div>
                ) : (
                  filteredHighlights.map((hl) => (
                    <div
                      key={hl.id}
                      onClick={() => setActiveHighlightDetails(hl)}
                      className="p-2.5 rounded-xl border border-stone-200/90 hover:border-amber-300 bg-white hover:bg-amber-50/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: hl.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-serif leading-relaxed text-stone-800 line-clamp-3">
                            &ldquo;{hl.text}&rdquo;
                          </p>
                          {hl.comment && (
                            <p className="text-[11px] text-amber-800 font-sans mt-1 bg-amber-50 p-1.5 rounded border border-amber-200/60">
                              {hl.comment}
                            </p>
                          )}

                          {/* Quick 1-click citation actions */}
                          <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExtractToNote(hl.text, hl.pageNumber, hl.comment);
                              }}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1"
                              title="Extract to note body with citation"
                            >
                              <FileEdit className="w-2.5 h-2.5" />
                              <span>To Note</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExtractToResearch(hl.text, hl.pageNumber, hl.color);
                              }}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 flex items-center gap-1"
                              title="Save to Research Quotes"
                            >
                              <Quote className="w-2.5 h-2.5" />
                              <span>To Research</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {/* SIDE DRAWER: KEY TERMS & TECHNICAL HEADINGS */}
          {isKeyTermsOpen && (
            <PdfKeyTermsPanel
              terms={keyTerms}
              currentPage={currentPage}
              onSelectTerm={handleSelectKeyTerm}
              onClose={() => setIsKeyTermsOpen(false)}
            />
          )}
        </div>
      </div>

      {/* FLOATING MULTI-PAGE NAVIGATION CONTROLLER DOCK */}
      <PdfPageNavigationController
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        zoom={zoom}
        onChangeZoom={setZoom}
        isThumbnailsOpen={isThumbnailsOpen}
        onToggleThumbnails={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
        isKeyTermsOpen={isKeyTermsOpen}
        onToggleKeyTerms={() => setIsKeyTermsOpen(!isKeyTermsOpen)}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
      />

      {/* MODAL: UPLOAD REAL PDF / CHOOSE ACADEMIC TUTORIAL TEMPLATE */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-red-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Upload PDF / Choose Tutorial</h3>
                  <p className="text-xs text-stone-500">
                    Annotate your own lecture PDFs, tutorial worksheets, or choose a ready template.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag and Drop / File Input Zone */}
            <div className="my-5">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRealFileUpload(f);
                }}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-stone-100 group-hover:bg-indigo-100 text-stone-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-semibold text-sm text-stone-800">
                  {isProcessingFile ? 'Rendering PDF pages in high resolution...' : 'Click to Upload PDF or Worksheet Image'}
                </div>
                <p className="text-xs text-stone-500 max-w-xs">
                  Supports PDF files, lecture slides, scanned tutorial sheets (.pdf, .png, .jpg)
                </p>
              </div>
            </div>

            {/* Built-in Academic Tutorial Sheets */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                Or Load Academic Tutorial Problem Sets
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUILTIN_TUTORIAL_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col justify-between group text-left"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold group-hover:bg-indigo-100 group-hover:text-indigo-700">
                          {tmpl.badge}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">{tmpl.totalPages} pages</span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 group-hover:text-indigo-900 mt-1 line-clamp-1">
                        {tmpl.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                        {tmpl.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-100 text-[10px] font-mono text-stone-400 flex justify-between">
                      <span>{tmpl.course}</span>
                      <span className="font-semibold text-stone-600 group-hover:text-indigo-600">Open &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Margin Sticky Note Input Modal */}
      {showStickyModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2 text-stone-800 font-semibold text-sm">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>Add Tutorial Remark Note</span>
            </div>
            <textarea
              autoFocus
              value={stickyInput}
              onChange={(e) => setStickyInput(e.target.value)}
              placeholder="Write your explanation, question, or lecturer feedback..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  saveStickyNote();
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowStickyModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStickyNote}
                className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
              >
                Pin Note
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Burned-in PDF / Image Export Modal */}
      {isExportModalOpen && (
        <PdfExportModal
          note={note}
          currentPage={currentPage}
          onSaveAsNewNote={onCreateNote}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* Citation Extraction Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-stone-900 text-white rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 border border-stone-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-bold">{toastMessage.text}</span>
            {toastMessage.sub && (
              <span className="text-[10px] text-stone-300 font-mono">{toastMessage.sub}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
