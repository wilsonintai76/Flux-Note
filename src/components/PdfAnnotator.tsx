import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, PDFDocumentData, PDFPageAnnotation, PDFTextBox, InkStroke } from '../types/note';
import { PdfAnnotationToolbar, PdfToolMode } from './PdfAnnotationToolbar';
import { renderBezierStroke, renderLiveBezierSegment, filterJitterPoints } from '../utils/inkSmoothing';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Upload, 
  FileText, 
  MessageSquare, 
  Trash2,
  Move,
  Check,
  X
} from 'lucide-react';

interface PdfAnnotatorProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
}

export const PdfAnnotator: React.FC<PdfAnnotatorProps> = ({
  note,
  onUpdateNote,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  
  // Toolbar tools & styling states
  const [activeTool, setActiveTool] = useState<PdfToolMode>('pen');
  const [penColor, setPenColor] = useState('#18181b');
  const [penWidth, setPenWidth] = useState(2.5);
  const [highlighterColor, setHighlighterColor] = useState('#facc15');
  const [highlighterWidth, setHighlighterWidth] = useState(20);
  const [textColor, setTextColor] = useState('#18181b');
  const [textFontSize, setTextFontSize] = useState(14);
  const [textBgColor, setTextBgColor] = useState('transparent');

  // History stacks
  const [undoStack, setUndoStack] = useState<PDFPageAnnotation[]>([]);
  const [redoStack, setRedoStack] = useState<PDFPageAnnotation[]>([]);

  // Dragging text box
  const [draggingTextBoxId, setDraggingTextBoxId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sticky note modal
  const [showStickyModal, setShowStickyModal] = useState(false);
  const [stickyInput, setStickyInput] = useState('');
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
  
  // Canvas drawing refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<{ x: number; y: number; pressure?: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pdfData: PDFDocumentData = note.pdfData || {
    fileName: 'Sample_Quantum_Paper.pdf',
    totalPages: 4,
    annotations: {}
  };

  const currentAnnotation: PDFPageAnnotation = pdfData.annotations[currentPage] || {
    strokes: [],
    textBoxes: [],
    stickyNotes: []
  };

  const currentStrokes = currentAnnotation.strokes || [];
  const currentTextBoxes = currentAnnotation.textBoxes || [];
  const currentStickyNotes = currentAnnotation.stickyNotes || [];

  // Save changes to note persistently
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

  // Record undo state before modification
  const recordHistory = useCallback(() => {
    setUndoStack(prev => [...prev, currentAnnotation]);
    setRedoStack([]);
  }, [currentAnnotation]);

  // Render canvas strokes with Bezier curve smoothing
  const renderStrokes = useCallback((ctx: CanvasRenderingContext2D, strokeList: InkStroke[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const stroke of strokeList) {
      renderBezierStroke(ctx, stroke);
    }
  }, []);

  // Sync canvas size & redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 780;
    const h = 1000;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      renderStrokes(ctx, currentStrokes);
    }
  }, [currentStrokes, renderStrokes, currentPage]);

  // Pointer drawing coordinates with hardware stylus pressure sensitivity
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    let pressure = 0.5;
    if (e.pointerType === 'pen') {
      // True hardware stylus pressure (Apple Pencil, Wacom, S-Pen, Surface)
      pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.45;
    } else if (e.pressure !== undefined && e.pressure > 0 && e.pressure !== 0.5) {
      pressure = e.pressure;
    } else if (currentPoints.current.length > 0) {
      // Velocity-based dynamic pressure for mouse/trackpad
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

    const pt = getCanvasCoords(e);
    currentPoints.current = [pt];

    if (activeTool === 'eraser') {
      eraseAtPoint(pt);
      return;
    }

    // Direct preview render
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
    const pt = getCanvasCoords(e);
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
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (activeTool === 'eraser') return;
    if (currentPoints.current.length === 0) return;

    // Filter digitizer micro-jitter before saving
    const smoothedPoints = filterJitterPoints(currentPoints.current);

    const newStroke: InkStroke = {
      id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
      color: activeTool === 'highlighter' ? highlighterColor : penColor,
      width: activeTool === 'highlighter' ? highlighterWidth : penWidth,
      opacity: activeTool === 'highlighter' ? 0.38 : 1.0,
      points: smoothedPoints,
    };

    recordHistory();
    const updatedAnnotation: PDFPageAnnotation = {
      ...currentAnnotation,
      strokes: [...currentStrokes, newStroke],
    };
    savePageAnnotation(updatedAnnotation);
    currentPoints.current = [];
  };

  const eraseAtPoint = (pt: { x: number; y: number }) => {
    const eraserRadius = 18;
    const remaining = currentStrokes.filter(stroke => {
      return !stroke.points.some(p => {
        const dx = p.x - pt.x;
        const dy = p.y - pt.y;
        return Math.sqrt(dx * dx + dy * dy) < eraserRadius + stroke.width / 2;
      });
    });

    if (remaining.length !== currentStrokes.length) {
      recordHistory();
      savePageAnnotation({
        ...currentAnnotation,
        strokes: remaining,
      });
    }
  };

  // Adding a text box or sticky note on page click
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'textbox' && activeTool !== 'sticky') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);

    if (activeTool === 'textbox') {
      recordHistory();
      const newTextBox: PDFTextBox = {
        id: 'tb-' + Date.now(),
        x,
        y,
        text: 'Type note here...',
        fontSize: textFontSize,
        color: textColor,
        backgroundColor: textBgColor,
      };

      savePageAnnotation({
        ...currentAnnotation,
        textBoxes: [...currentTextBoxes, newTextBox],
      });
      // Switch back to select so user can edit immediately
      setActiveTool('select');
    } else if (activeTool === 'sticky') {
      setClickPos({ x, y });
      setStickyInput('');
      setShowStickyModal(true);
    }
  };

  // Update text box text or style
  const updateTextBox = (id: string, updates: Partial<PDFTextBox>) => {
    const nextBoxes = currentTextBoxes.map(b => (b.id === id ? { ...b, ...updates } : b));
    savePageAnnotation({
      ...currentAnnotation,
      textBoxes: nextBoxes,
    });
  };

  // Delete text box
  const deleteTextBox = (id: string) => {
    recordHistory();
    const nextBoxes = currentTextBoxes.filter(b => b.id !== id);
    savePageAnnotation({
      ...currentAnnotation,
      textBoxes: nextBoxes,
    });
  };

  // Save sticky note
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
    if (currentStrokes.length === 0 && currentTextBoxes.length === 0 && currentStickyNotes.length === 0) return;
    recordHistory();
    savePageAnnotation({
      strokes: [],
      textBoxes: [],
      stickyNotes: [],
    });
  };

  // PDF File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newPdfData: PDFDocumentData = {
      fileName: file.name,
      totalPages: 5,
      annotations: {},
    };

    onUpdateNote({
      ...note,
      title: file.name.replace(/\.pdf$/i, ''),
      updatedAt: Date.now(),
      pdfData: newPdfData,
    });
    setCurrentPage(1);
  };

  // Text box drag
  const startDragTextBox = (e: React.MouseEvent, box: PDFTextBox) => {
    e.stopPropagation();
    setDraggingTextBoxId(box.id);
    dragOffsetRef.current = {
      x: e.clientX / zoom - box.x,
      y: e.clientY / zoom - box.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTextBoxId) return;
    const newX = Math.round(e.clientX / zoom - dragOffsetRef.current.x);
    const newY = Math.round(e.clientY / zoom - dragOffsetRef.current.y);
    updateTextBox(draggingTextBoxId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (draggingTextBoxId) {
      setDraggingTextBoxId(null);
    }
  };

  // Academic slide preview content
  const renderPageContent = (page: number) => {
    switch (page) {
      case 1:
        return (
          <div className="pdf-page-bg p-12 text-stone-800 select-none pointer-events-none">
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

              <div className="p-4 border-l-4 border-amber-400 bg-amber-50/40 text-xs">
                <span className="font-semibold text-amber-900 block mb-0.5">Crucial Invariant:</span>
                No information is transferred faster than light. Classical transmission of the 2 measurement bits from Alice to Bob is strictly required before Bob can reconstruct |ψ⟩.
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="pdf-page-bg p-12 text-stone-800 select-none pointer-events-none">
            <h2 className="text-lg font-serif font-bold text-stone-900 mb-4 pb-2 border-b border-stone-200">
              3. Bell State Measurement & Bob&apos;s Corrections
            </h2>
            <div className="space-y-5 text-xs font-serif leading-relaxed text-stone-700">
              <p>
                Alice applies a CNOT gate on her unknown qubit |ψ⟩ and her half of the EPR pair, followed by a Hadamard transform H on |ψ⟩.
              </p>
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px] text-stone-800 my-4">
                <div className="p-3 border border-stone-200 bg-white rounded">
                  <div className="font-bold text-blue-700">Alice Measures: 00</div>
                  <div>Bob Applies: Identity (I)</div>
                </div>
                <div className="p-3 border border-stone-200 bg-white rounded">
                  <div className="font-bold text-blue-700">Alice Measures: 01</div>
                  <div>Bob Applies: Pauli X</div>
                </div>
                <div className="p-3 border border-stone-200 bg-white rounded">
                  <div className="font-bold text-blue-700">Alice Measures: 10</div>
                  <div>Bob Applies: Pauli Z</div>
                </div>
                <div className="p-3 border border-stone-200 bg-white rounded">
                  <div className="font-bold text-blue-700">Alice Measures: 11</div>
                  <div>Bob Applies: XZ</div>
                </div>
              </div>

              <p className="mt-4">
                After the single-qubit rotation corresponding to the 2 classical bits received, Bob&apos;s state is identically equal to the initial state |ψ⟩.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="pdf-page-bg p-12 text-stone-800 select-none pointer-events-none">
            <h2 className="text-lg font-serif font-bold text-stone-900 mb-4 pb-2 border-b border-stone-200">
              4. Gate Teleportation & Fault Tolerant T-Gates
            </h2>
            <div className="space-y-4 text-xs font-serif leading-relaxed text-stone-700">
              <p>
                Gottesman and Chuang (1999) generalized quantum teleportation to apply quantum operations directly during the transmission protocol.
              </p>
              <div className="p-4 bg-stone-50 border border-stone-200 rounded">
                <div className="font-sans font-medium text-stone-900 mb-1">Magic State Distillation</div>
                <p className="text-stone-600">
                  Because non-Clifford gates (like the T-gate: diag(1, e^(iπ/4))) cannot be implemented transversally without violating the Eastin-Knill theorem, gate teleportation consumes purified magic states to achieve universal fault-tolerant computation.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="pdf-page-bg p-12 text-stone-800 select-none pointer-events-none text-center">
            <h2 className="text-lg font-serif font-bold text-stone-900 mb-2">
              Page {page}: Discussion, Exercises & Proofs
            </h2>
            <p className="text-xs text-stone-500 font-serif">
              Problem sets and literature references for teleportation fidelity bounds under depolarizing noise.
            </p>
          </div>
        );
    }
  };

  const totalPages = pdfData.totalPages || 4;
  const totalAnnotations = currentStrokes.length + currentTextBoxes.length + currentStickyNotes.length;

  return (
    <div 
      className="flex flex-col h-full bg-stone-100 overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Document Status & Page Switcher */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-stone-200 shadow-2xs z-20">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold text-stone-800 max-w-xs truncate">{pdfData.fileName}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30"
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
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & PDF Upload tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-stone-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-stone-200 mx-1" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Floating Interactive PDF Annotation Toolbar */}
      <div className="px-4 py-2 flex justify-center z-30">
        <PdfAnnotationToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          penColor={penColor}
          onChangePenColor={setPenColor}
          penWidth={penWidth}
          onChangePenWidth={setPenWidth}
          highlighterColor={highlighterColor}
          onChangeHighlighterColor={setHighlighterColor}
          highlighterWidth={highlighterWidth}
          onChangeHighlighterWidth={setHighlighterWidth}
          textColor={textColor}
          onChangeTextColor={setTextColor}
          textFontSize={textFontSize}
          onChangeTextFontSize={setTextFontSize}
          textBgColor={textBgColor}
          onChangeTextBgColor={setTextBgColor}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPage={handleClearPage}
          totalPageAnnotationsCount={totalAnnotations}
        />
      </div>

      {/* Document Viewport */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
        <div 
          className="relative transition-all duration-150 origin-top shadow-xl rounded-sm"
          style={{
            transform: `scale(${zoom})`,
            width: '780px',
            minHeight: '1000px',
            backgroundColor: '#ffffff',
            cursor: activeTool === 'textbox' ? 'text' : activeTool === 'sticky' ? 'copy' : 'default',
          }}
          onClick={handlePageClick}
        >
          {/* Base Document Vector/Slide Text */}
          <div className="w-full min-h-[1000px]">
            {renderPageContent(currentPage)}
          </div>

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
              {/* Drag handle & Delete control */}
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
                  <span>Margin Note</span>
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

          {/* Drawing Canvas Overlay */}
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
      </div>

      {/* Margin Sticky Note Input Modal */}
      {showStickyModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-2 text-stone-800 font-semibold text-sm">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>Add PDF Margin Note</span>
            </div>
            <textarea
              autoFocus
              value={stickyInput}
              onChange={(e) => setStickyInput(e.target.value)}
              placeholder="Write your observation, question, or citation remark..."
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
    </div>
  );
};
