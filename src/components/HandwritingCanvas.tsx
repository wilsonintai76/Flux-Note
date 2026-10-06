import React, { useRef, useEffect, useState, useCallback } from 'react';
import { InkStroke, InkToolType, InkPoint } from '../types/note';
import { renderBezierStroke, renderLiveBezierSegment, filterJitterPoints, postProcessStrokePoints, eraseStrokesAtPoint } from '../utils/inkSmoothing';
import { 
  Pen, 
  Highlighter, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Check, 
  Circle,
  Pencil
} from 'lucide-react';

interface HandwritingCanvasProps {
  strokes: InkStroke[];
  onChange: (strokes: InkStroke[]) => void;
  width?: number | string;
  height?: number | string;
  className?: string;
  readOnly?: boolean;
  background?: 'transparent' | 'dots' | 'lines' | 'grid' | 'paper';
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  onClose?: () => void;
  activeTool?: InkToolType;
  selectedColor?: string;
  strokeWidth?: number;
}

const INK_COLORS = [
  { name: 'Ink Black', value: '#18181b' },
  { name: 'Fountain Blue', value: '#2563eb' },
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Forest Green', value: '#059669' },
  { name: 'Warm Amber', value: '#d97706' },
  { name: 'Violet', value: '#7c3aed' },
];

const HIGHLIGHTER_COLORS = [
  { name: 'Solar Yellow', value: '#facc15' },
  { name: 'Mint Green', value: '#4ade80' },
  { name: 'Blush Pink', value: '#f472b6' },
  { name: 'Sky Cyan', value: '#38bdf8' },
  { name: 'Lavender', value: '#c084fc' },
];

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  strokes,
  onChange,
  width = '100%',
  height = 360,
  className = '',
  readOnly = false,
  background = 'dots',
  showToolbar = true,
  toolbarPosition = 'top',
  onClose,
  activeTool: propActiveTool,
  selectedColor: propSelectedColor,
  strokeWidth: propStrokeWidth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<InkPoint[]>([]);
  const activeGestureEraserRef = useRef<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);
  const initialStrokesRef = useRef<InkStroke[] | null>(null);

  const [internalTool, setInternalTool] = useState<InkToolType>('pen');
  const [internalColor, setInternalColor] = useState<string>('#18181b');
  const [customColors, setCustomColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('folio_custom_ink_colors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [highlighterColor, setHighlighterColor] = useState<string>('#facc15');
  const [internalWidth, setInternalWidth] = useState<number>(2.5);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  const activeTool = propActiveTool ?? internalTool;
  const selectedColor = propSelectedColor ?? internalColor;
  const strokeWidth = propStrokeWidth ?? internalWidth;
  const setActiveTool = setInternalTool;
  const setSelectedColor = (color: string) => {
    setInternalColor(color);
    if (propSelectedColor === undefined) {
      setInternalColor(color);
    }
  };
  const setStrokeWidth = setInternalWidth;

  const addCustomColor = (color: string) => {
    if (customColors.includes(color)) return;
    const next = [...customColors, color].slice(-6);
    setCustomColors(next);
    localStorage.setItem('folio_custom_ink_colors', JSON.stringify(next));
    setSelectedColor(color);
  };

  const removeCustomColor = (color: string) => {
    const next = customColors.filter(c => c !== color);
    setCustomColors(next);
    localStorage.setItem('folio_custom_ink_colors', JSON.stringify(next));
  };

  // Keyboard shortcut to cycle colors quickly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const baseColors = ['#18181b', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706'];
        const allColors = [...baseColors, ...customColors];
        const currentIdx = allColors.indexOf(selectedColor);
        const nextIdx = (currentIdx + 1) % allColors.length;
        const nextColor = allColors[nextIdx];
        setSelectedColor(nextColor);

        // Render circular ink switcher toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-stone-950 text-stone-200 text-xs font-semibold rounded-full shadow-xl z-50 flex items-center gap-2 border border-stone-850 animate-bounce';
        toast.innerHTML = `<span class="w-3.5 h-3.5 rounded-full border border-stone-700" style="background-color: ${nextColor}"></span> Ink Cycled`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedColor, customColors]);

  // Redraw canvas with Catmull-Rom midpoint Bezier curve smoothing
  const renderStrokes = useCallback((ctx: CanvasRenderingContext2D, strokeList: InkStroke[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const stroke of strokeList) {
      renderBezierStroke(ctx, stroke);
    }
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderStrokes(ctx, strokes);
  }, [strokes, renderStrokes]);

  // Adjust canvas resolution only when physical container dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || 800;
    const h = rect.height || 360;

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

    renderStrokes(ctx, strokes);
  }, [renderStrokes, strokes]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let pressure = 0.5;
    if (e.pointerType === 'pen') {
      // True hardware stylus pressure (Apple Pencil, Wacom, S-Pen, Surface)
      pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.45;
    } else if (e.pressure !== undefined && e.pressure > 0 && e.pressure !== 0.5) {
      pressure = e.pressure;
    } else if (currentPoints.current.length > 0) {
      // Dynamic velocity-modulated pressure for mouse/trackpad
      const last = currentPoints.current[currentPoints.current.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      const speed = Math.min(1.0, dist / 22);
      pressure = Math.max(0.25, 0.78 - speed * 0.42);
    }

    return { x, y, pressure };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;

    // Stylus barrel / secondary button hold (e.buttons === 2, 5, or 32)
    const isStylusSecondary = e.buttons === 2 || e.buttons === 5 || e.buttons === 32;
    touchStartTimeRef.current = Date.now();
    activeGestureEraserRef.current = isStylusSecondary;

    // Save starting snapshot of strokes before draw/erase starts for single undo history commit
    initialStrokesRef.current = strokes;

    const pt = getCanvasCoords(e);
    currentPoints.current = [pt];

    if (activeTool === 'eraser' || activeGestureEraserRef.current) {
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
    ctx.strokeStyle = activeTool === 'highlighter' ? highlighterColor : selectedColor;
    const effectiveWidth = activeTool === 'highlighter' ? 18 : activeTool === 'pencil' ? 1.8 : strokeWidth * (pt.pressure ? pt.pressure * 1.4 : 1);
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
    if (!isDrawing.current || readOnly) return;

    const pt = getCanvasCoords(e);

    // Two-finger or long touch-down gesture eraser trigger (long-press > 400ms)
    if (e.pointerType === 'touch' && !activeGestureEraserRef.current && touchStartTimeRef.current > 0) {
      if (Date.now() - touchStartTimeRef.current > 400) {
        activeGestureEraserRef.current = true;
      }
    }

    currentPoints.current.push(pt);

    if (activeTool === 'eraser' || activeGestureEraserRef.current) {
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
      activeTool,
      activeTool === 'highlighter' ? highlighterColor : selectedColor,
      activeTool === 'highlighter' ? 18 : activeTool === 'pencil' ? 1.8 : strokeWidth,
      activeTool === 'highlighter' ? 0.38 : activeTool === 'pencil' ? 0.72 : 1.0
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || readOnly) return;
    isDrawing.current = false;
    
    const wasGestureErasing = activeGestureEraserRef.current;
    activeGestureEraserRef.current = false;
    touchStartTimeRef.current = 0;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (activeTool === 'eraser' || wasGestureErasing) {
      // Record exactly one single undo checkpoint when eraser action completes
      if (initialStrokesRef.current && initialStrokesRef.current !== strokes) {
        setUndoStack(prev => [...prev, initialStrokesRef.current!]);
        setRedoStack([]);
      }
      initialStrokesRef.current = null;
      return;
    }

    if (currentPoints.current.length === 0) return;

    // Post-process stroke points to remove duplicate segments and event-loop latency spikes
    const smoothedPoints = postProcessStrokePoints(currentPoints.current);

    const newStroke: InkStroke = {
      id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      tool: activeTool,
      color: activeTool === 'highlighter' ? highlighterColor : selectedColor,
      width: activeTool === 'highlighter' ? 18 : activeTool === 'pencil' ? 1.8 : strokeWidth,
      opacity: activeTool === 'highlighter' ? 0.38 : activeTool === 'pencil' ? 0.75 : 1,
      points: smoothedPoints,
    };

    setUndoStack(prev => [...prev, initialStrokesRef.current || strokes]);
    setRedoStack([]);
    const nextStrokes = [...strokes, newStroke];
    onChange(nextStrokes);
    currentPoints.current = [];
    initialStrokesRef.current = null;
  };

  const eraseAtPoint = (pt: InkPoint) => {
    const eraserRadius = 14;
    const updatedStrokes = eraseStrokesAtPoint(strokes, pt, eraserRadius);

    if (updatedStrokes !== strokes) {
      onChange(updatedStrokes);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, strokes]);
    setUndoStack(prev => prev.slice(0, -1));
    onChange(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack(prev => prev.slice(0, -1));
    onChange(next);
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    onChange([]);
  };

  const bgClass = 
    background === 'dots' ? 'bg-dot-grid bg-[#fcfbf8]' :
    background === 'lines' ? 'bg-line-grid bg-[#fefcf8]' :
    background === 'grid' ? 'bg-graph-grid bg-[#fcfbf9]' :
    background === 'paper' ? 'bg-[#faf8f5]' : 'bg-transparent';

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col rounded-xl overflow-hidden border border-stone-200/80 shadow-xs select-none ${bgClass} ${className}`}
      style={{ width, height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Ink Control Toolbar */}
      {showToolbar && !readOnly && (
        <div className={`z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white/90 backdrop-blur-md border-stone-200/80 ${toolbarPosition === 'top' ? 'border-b' : 'border-t order-last'}`}>
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              title="Fountain Pen (Smooth ink, pressure responsive)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${activeTool === 'pen' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('pencil')}
              title="Graphite Pencil (Textured sketch)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${activeTool === 'pencil' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Pencil</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              title="Highlighter (Translucent overlay)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${activeTool === 'highlighter' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlight</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              title="Stroke Eraser (Touch any stroke to erase)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${activeTool === 'eraser' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Color Palettes */}
          {activeTool !== 'eraser' && (
            <div className="flex items-center gap-1.5">
              {activeTool === 'highlighter' ? (
                HIGHLIGHTER_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setHighlighterColor(c.value)}
                    className="relative w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c.value }}
                  >
                    {highlighterColor === c.value && <Check className="w-3 h-3 text-stone-900 stroke-[3]" />}
                  </button>
                ))
              ) : (
                <>
                  {INK_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.name}
                      onClick={() => setSelectedColor(c.value)}
                      className="relative w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c.value }}
                    >
                      {selectedColor === c.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  ))}

                  {/* Render Custom Colors */}
                  {customColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      title="Double click to remove custom color"
                      onClick={() => setSelectedColor(color)}
                      onDoubleClick={() => removeCustomColor(color)}
                      className="relative w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-115 border border-stone-200 shadow-2xs"
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && <Check className="w-3 h-3 text-white stroke-[3] mix-blend-difference" />}
                    </button>
                  ))}

                  {/* Custom Color Picker Input */}
                  <div className="relative w-5 h-5 rounded-full border border-stone-300 bg-linear-to-tr from-rose-400 via-fuchsia-500 to-indigo-500 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden shadow-2xs" title="Select & Save Custom Color">
                    <input
                      type="color"
                      onChange={(e) => addCustomColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="text-[10px] font-bold text-white pointer-events-none">+</span>
                  </div>
                </>
              )}

              {/* Stroke size selector */}
              {activeTool === 'pen' && (
                <div className="ml-1.5 flex items-center gap-1 bg-stone-100 p-0.5 rounded-md">
                  {[1.5, 2.5, 4.5].map((w, i) => (
                    <button
                      key={w}
                      type="button"
                      title={i === 0 ? 'Fine' : i === 1 ? 'Medium' : 'Broad'}
                      onClick={() => setStrokeWidth(w)}
                      className={`w-6 h-6 flex items-center justify-center rounded ${strokeWidth === w ? 'bg-white shadow-xs' : 'text-stone-400'}`}
                    >
                      <Circle className="fill-current text-stone-800" style={{ width: 4 + i * 3, height: 4 + i * 3 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions: Undo, Redo, Clear, Done */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo stroke (Ctrl+Z)"
              className="p-1.5 text-stone-500 hover:text-stone-800 disabled:opacity-30 rounded-md hover:bg-stone-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo stroke"
              className="p-1.5 text-stone-500 hover:text-stone-800 disabled:opacity-30 rounded-md hover:bg-stone-100 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              title="Clear all strokes"
              className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30 rounded-md hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="ml-2 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* Drawing Surface */}
      <canvas
        ref={canvasRef}
        className="w-full h-full flex-1 touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};
