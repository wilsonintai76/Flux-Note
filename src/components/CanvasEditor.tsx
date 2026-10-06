import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, CanvasNode, CanvasEdge, InkStroke, CanvasNodeType, InkToolType } from '../types/note';
import { HandwritingCanvas } from './HandwritingCanvas';
import {
  StickyNote,
  Type,
  Square,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Pen,
  Pencil,
  Highlighter,
  Eraser,
  Move,
  Trash2,
  Plus,
  Compass,
  Palette,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface CanvasEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  onNavigateToNote?: (targetNoteTitle: string) => void;
}

const STICKY_COLORS = [
  '#fef08a', // Yellow
  '#fed7aa', // Orange/peach
  '#bbf7d0', // Mint
  '#e9d5ff', // Lavender
  '#bae6fd', // Sky
  '#f5f5f4', // Stone
];

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  note,
  onUpdateNote,
  onNavigateToNote,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transform
  const [view, setView] = useState({
    x: note.canvasView?.x ?? 100,
    y: note.canvasView?.y ?? 80,
    zoom: note.canvasView?.zoom ?? 1.0,
  });

  const [activeToolMode, setActiveToolMode] = useState<'select' | 'pan' | 'draw'>('select');
  const [drawTool, setDrawTool] = useState<InkToolType>('pen');
  const [drawColor, setDrawColor] = useState<string>('#18181b');
  const [customColors, setCustomColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('folio_custom_ink_colors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [drawWidth, setDrawWidth] = useState<number>(2.5);

  const addCustomColor = (color: string) => {
    if (customColors.includes(color)) return;
    const next = [...customColors, color].slice(-6);
    setCustomColors(next);
    localStorage.setItem('folio_custom_ink_colors', JSON.stringify(next));
    setDrawColor(color);
  };

  const removeCustomColor = (color: string) => {
    const next = customColors.filter(c => c !== color);
    setCustomColors(next);
    localStorage.setItem('folio_custom_ink_colors', JSON.stringify(next));
  };

  // Keyboard shortcut Alt+C to cycle active colors quickly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const baseColors = ['#18181b', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706'];
        const allColors = [...baseColors, ...customColors];
        const currentIdx = allColors.indexOf(drawColor);
        const nextIdx = (currentIdx + 1) % allColors.length;
        const nextColor = allColors[nextIdx];
        setDrawColor(nextColor);

        // Circular ink switcher toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-stone-950 text-stone-200 text-xs font-semibold rounded-full shadow-xl z-50 flex items-center gap-2 border border-stone-850 animate-bounce';
        toast.innerHTML = `<span class="w-3.5 h-3.5 rounded-full border border-stone-700" style="background-color: ${nextColor}"></span> Ink Switched`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawColor, customColors]);
  const [nodes, setNodes] = useState<CanvasNode[]>(note.canvasNodes || []);
  const [edges, setEdges] = useState<CanvasEdge[]>(note.canvasEdges || []);
  const [strokes, setStrokes] = useState<InkStroke[]>(note.canvasStrokes || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Dragging states
  const isPanning = useRef(false);
  const startPanPoint = useRef({ x: 0, y: 0 });
  const draggedNodeId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Sync to parent note debounce
  const updateTimeoutRef = useRef<any>(null);
  const saveState = useCallback((newNodes: CanvasNode[], newEdges: CanvasEdge[], newStrokes: InkStroke[], newView = view) => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      onUpdateNote({
        ...note,
        canvasNodes: newNodes,
        canvasEdges: newEdges,
        canvasStrokes: newStrokes,
        canvasView: newView,
        updatedAt: Date.now(),
      });
    }, 400);
  }, [note, onUpdateNote, view]);

  // Keep internal state in sync if note changes
  useEffect(() => {
    setNodes(note.canvasNodes || []);
    setEdges(note.canvasEdges || []);
    setStrokes(note.canvasStrokes || []);
    if (note.canvasView) {
      setView(note.canvasView);
    }
  }, [note.id]);

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = Math.min(2.5, Math.max(0.3, view.zoom * zoomFactor));
      const nextView = { ...view, zoom: nextZoom };
      setView(nextView);
      saveState(nodes, edges, strokes, nextView);
    } else {
      const nextView = {
        ...view,
        x: view.x - e.deltaX,
        y: view.y - e.deltaY,
      };
      setView(nextView);
      saveState(nodes, edges, strokes, nextView);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or pan mode or spacebar down
    if (e.button === 1 || activeToolMode === 'pan' || (e.target === containerRef.current)) {
      isPanning.current = true;
      startPanPoint.current = { x: e.clientX - view.x, y: e.clientY - view.y };
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const nextView = {
        ...view,
        x: e.clientX - startPanPoint.current.x,
        y: e.clientY - startPanPoint.current.y,
      };
      setView(nextView);
      return;
    }

    if (draggedNodeId.current) {
      const nodeId = draggedNodeId.current;
      const mouseCanvasX = (e.clientX - view.x) / view.zoom;
      const mouseCanvasY = (e.clientY - view.y) / view.zoom;

      const nextNodes = nodes.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            x: Math.round(mouseCanvasX - dragOffset.current.x),
            y: Math.round(mouseCanvasY - dragOffset.current.y),
          };
        }
        return n;
      });

      setNodes(nextNodes);
    }
  };

  const handleMouseUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      saveState(nodes, edges, strokes, view);
    }
    if (draggedNodeId.current) {
      draggedNodeId.current = null;
      saveState(nodes, edges, strokes, view);
    }
  };

  // Node operations
  const startDragNode = (e: React.MouseEvent, node: CanvasNode) => {
    if (activeToolMode === 'draw') return;
    e.stopPropagation();
    setSelectedNodeId(node.id);
    draggedNodeId.current = node.id;
    const mouseCanvasX = (e.clientX - view.x) / view.zoom;
    const mouseCanvasY = (e.clientY - view.y) / view.zoom;
    dragOffset.current = {
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y,
    };
  };

  const addNode = (type: CanvasNodeType) => {
    // Add near center of current view
    const canvasCenterX = Math.round((-view.x + 400) / view.zoom);
    const canvasCenterY = Math.round((-view.y + 300) / view.zoom);

    const newNode: CanvasNode = {
      id: 'node-' + Date.now(),
      type,
      x: canvasCenterX,
      y: canvasCenterY,
      width: type === 'sticky' ? 220 : type === 'shape' ? 180 : 280,
      height: type === 'shape' ? 60 : 160,
      title: type === 'sticky' ? '' : type === 'shape' ? 'Concept Node' : 'New Thought',
      content: type === 'sticky' ? 'Jot down an idea, reminder, or hypothesis...' : 'Double click or edit to write notes.',
      color: type === 'sticky' ? '#fef08a' : '#ffffff',
      shapeType: type === 'shape' ? 'pill' : undefined,
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newNode.id);
    saveState(nextNodes, edges, strokes);
  };

  const updateNodeContent = (nodeId: string, updates: Partial<CanvasNode>) => {
    const nextNodes = nodes.map(n => (n.id === nodeId ? { ...n, ...updates } : n));
    setNodes(nextNodes);
    saveState(nextNodes, edges, strokes);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const nextNodes = nodes.filter(n => n.id !== selectedNodeId);
    const nextEdges = edges.filter(e => e.fromNodeId !== selectedNodeId && e.toNodeId !== selectedNodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeId(null);
    saveState(nextNodes, nextEdges, strokes);
  };

  const connectToNode = (targetId: string) => {
    if (!selectedNodeId || selectedNodeId === targetId) return;
    const existing = edges.find(e => (e.fromNodeId === selectedNodeId && e.toNodeId === targetId));
    if (existing) return;

    const newEdge: CanvasEdge = {
      id: 'edge-' + Date.now(),
      fromNodeId: selectedNodeId,
      toNodeId: targetId,
      style: 'solid',
      color: '#94a3b8',
    };
    const nextEdges = [...edges, newEdge];
    setEdges(nextEdges);
    saveState(nodes, nextEdges, strokes);
  };

  const handleStrokesChange = (newStrokes: InkStroke[]) => {
    setStrokes(newStrokes);
    saveState(nodes, edges, newStrokes);
  };

  // Center view on content
  const resetView = () => {
    const nextView = { x: 80, y: 60, zoom: 1.0 };
    setView(nextView);
    saveState(nodes, edges, strokes, nextView);
  };

  // Helper to compute edge paths between nodes
  const renderEdges = () => {
    return edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.fromNodeId);
      const toNode = nodes.find(n => n.id === edge.toNodeId);
      if (!fromNode || !toNode) return null;

      const fromCenter = {
        x: fromNode.x + fromNode.width / 2,
        y: fromNode.y + fromNode.height / 2,
      };
      const toCenter = {
        x: toNode.x + toNode.width / 2,
        y: toNode.y + toNode.height / 2,
      };

      const dx = toCenter.x - fromCenter.x;
      const dy = toCenter.y - fromCenter.y;
      const midX = (fromCenter.x + toCenter.x) / 2;
      const midY = (fromCenter.y + toCenter.y) / 2 - Math.min(30, Math.abs(dx) * 0.15);

      const pathData = `M ${fromCenter.x} ${fromCenter.y} Q ${midX} ${midY} ${toCenter.x} ${toCenter.y}`;

      return (
        <g key={edge.id} className="cursor-pointer group">
          <path
            d={pathData}
            fill="none"
            stroke={edge.color || '#94a3b8'}
            strokeWidth={2}
            strokeDasharray={edge.style === 'dashed' ? '5,5' : undefined}
            markerEnd="url(#arrowhead)"
            className="transition-colors group-hover:stroke-blue-600"
          />
          {edge.label && (
            <text
              x={midX}
              y={midY - 6}
              textAnchor="middle"
              className="text-[11px] font-sans font-medium fill-stone-500 bg-white"
            >
              {edge.label}
            </text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#fbfaf8] overflow-hidden select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-stone-200/90 text-stone-700">
        {/* Tool modes */}
        <button
          type="button"
          onClick={() => setActiveToolMode('select')}
          title="Select & Move Nodes (V)"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeToolMode === 'select' ? 'bg-stone-900 text-white shadow-xs' : 'hover:bg-stone-100 text-stone-700'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolMode('draw')}
          title="Handwriting & Stylus Pen (P)"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeToolMode === 'draw' ? 'bg-stone-900 text-white shadow-xs' : 'hover:bg-stone-100 text-stone-700'
          }`}
        >
          <Pen className="w-3.5 h-3.5" />
          <span>Draw Ink</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveToolMode('pan')}
          title="Pan View (H / Space)"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeToolMode === 'pan' ? 'bg-stone-900 text-white shadow-xs' : 'hover:bg-stone-100 text-stone-700'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Pan</span>
        </button>

        <div className="h-5 w-px bg-stone-200 mx-1" />

        {/* Add Elements buttons */}
        <button
          type="button"
          onClick={() => addNode('sticky')}
          title="Add Sticky Note"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-xl"
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
          <span>Sticky</span>
        </button>

        <button
          type="button"
          onClick={() => addNode('card')}
          title="Add Text Card"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-xl"
        >
          <Type className="w-3.5 h-3.5 text-blue-500" />
          <span>Card</span>
        </button>

        <button
          type="button"
          onClick={() => addNode('shape')}
          title="Add Concept Shape"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-xl"
        >
          <Square className="w-3.5 h-3.5 text-emerald-500" />
          <span>Shape</span>
        </button>

        {selectedNodeId && (
          <>
            <div className="h-5 w-px bg-stone-200 mx-1" />
            <button
              type="button"
              onClick={deleteSelectedNode}
              title="Delete Selected Item"
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Expressive Ink & Stylus Sub-Toolbar (Active when drawing) */}
      {activeToolMode === 'draw' && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 bg-stone-900/90 text-white backdrop-blur-md rounded-2xl shadow-xl border border-stone-800 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Tool Preset Selector */}
          <div className="flex items-center gap-1 bg-stone-800/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setDrawTool('pen')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                drawTool === 'pen' ? 'bg-amber-500 text-stone-950 font-semibold' : 'hover:bg-stone-700 text-stone-300'
              }`}
              title="Calligraphic Fountain Pen"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawTool('pencil')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                drawTool === 'pencil' ? 'bg-amber-500 text-stone-950 font-semibold' : 'hover:bg-stone-700 text-stone-300'
              }`}
              title="Graphite Pencil"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Pencil</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawTool('highlighter')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                drawTool === 'highlighter' ? 'bg-amber-500 text-stone-950 font-semibold' : 'hover:bg-stone-700 text-stone-300'
              }`}
              title="Solar Highlighter"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlighter</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawTool('eraser')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                drawTool === 'eraser' ? 'bg-red-500 text-white font-semibold' : 'hover:bg-stone-700 text-stone-300'
              }`}
              title="Precision Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          <div className="h-4 w-px bg-stone-700" />

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 px-1">
            {[
              { color: '#18181b', name: 'Ink Black' },
              { color: '#2563eb', name: 'Fountain Blue' },
              { color: '#dc2626', name: 'Crimson' },
              { color: '#059669', name: 'Forest Green' },
              { color: '#7c3aed', name: 'Violet' },
              { color: '#d97706', name: 'Amber' },
            ].map(({ color, name }) => (
              <button
                key={color}
                type="button"
                onClick={() => setDrawColor(color)}
                title={name}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  drawColor === color ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-stone-600 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}

            {/* Custom Presets */}
            {customColors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setDrawColor(color)}
                onDoubleClick={() => removeCustomColor(color)}
                title="Double click to remove custom preset"
                className={`w-5 h-5 rounded-full border transition-transform ${
                  drawColor === color ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-stone-600 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}

            {/* Color Picker Button */}
            <div className="relative w-5 h-5 rounded-full border border-stone-600 bg-linear-to-tr from-rose-400 via-fuchsia-500 to-indigo-500 cursor-pointer overflow-hidden flex items-center justify-center hover:scale-115 transition-transform" title="Select & Save Custom Color">
              <input
                type="color"
                onChange={(e) => addCustomColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span className="text-[10px] font-bold text-white pointer-events-none">+</span>
            </div>
          </div>

          <div className="h-4 w-px bg-stone-700" />

          {/* Width Presets */}
          <div className="flex items-center gap-1 bg-stone-800/80 p-0.5 rounded-xl">
            {[
              { label: 'Fine', w: 1.5 },
              { label: 'Regular', w: 2.5 },
              { label: 'Medium', w: 4.0 },
              { label: 'Bold', w: 6.0 },
            ].map(({ label, w }) => (
              <button
                key={w}
                type="button"
                onClick={() => setDrawWidth(w)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-md transition-colors ${
                  drawWidth === w ? 'bg-amber-400 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-stone-700" />

          {/* Dynamic Velocity & Pressure Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-300 text-[10px] font-mono rounded-lg border border-amber-500/20">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Dynamic Velocity & Pressure Active</span>
          </div>
        </div>
      )}

      {/* Floating Zoom & Minimap Widget */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-stone-200/90 text-stone-600">
        <button
          type="button"
          onClick={() => {
            const nextZoom = Math.max(0.3, view.zoom - 0.15);
            setView({ ...view, zoom: nextZoom });
          }}
          className="p-1.5 rounded-lg hover:bg-stone-100"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="px-2 py-1 text-xs font-mono text-stone-700 hover:bg-stone-100 rounded-md"
          title="Reset View 100%"
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => {
            const nextZoom = Math.min(2.5, view.zoom + 0.15);
            setView({ ...view, zoom: nextZoom });
          }}
          className="p-1.5 rounded-lg hover:bg-stone-100"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Infinite Canvas Surface */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full flex-1 bg-dot-grid relative overflow-hidden ${
          activeToolMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {/* World Transform Container */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          {/* SVG Connector Edges */}
          <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-auto overflow-visible">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
            </defs>
            {renderEdges()}
          </svg>

          {/* Canvas Nodes Layer */}
          <div className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-auto">
            {nodes.map(node => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => startDragNode(e, node)}
                  className={`absolute rounded-xl transition-shadow select-none group ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-xl' : 'shadow-md hover:shadow-lg'
                  }`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${node.width}px`,
                    minHeight: `${node.height}px`,
                    backgroundColor: node.color || '#ffffff',
                  }}
                >
                  {/* Sticky Note View */}
                  {node.type === 'sticky' && (
                    <div className="p-4 flex flex-col h-full font-hand text-lg leading-relaxed text-stone-800">
                      <div className="flex items-center justify-between mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          {STICKY_COLORS.slice(0, 4).map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateNodeContent(node.id, { color: c })}
                              className="w-3.5 h-3.5 rounded-full border border-stone-300"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-sans text-stone-400">Sticky Note</span>
                      </div>
                      <textarea
                        value={node.content}
                        onChange={(e) => updateNodeContent(node.id, { content: e.target.value })}
                        className="w-full flex-1 bg-transparent resize-none border-none focus:outline-none font-hand text-lg leading-snug"
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Standard Card View */}
                  {node.type === 'card' && (
                    <div className="p-4 bg-white rounded-xl border border-stone-200">
                      <input
                        value={node.title || ''}
                        onChange={(e) => updateNodeContent(node.id, { title: e.target.value })}
                        placeholder="Card Title"
                        className="w-full font-semibold text-sm text-stone-900 mb-1.5 bg-transparent border-none focus:outline-none"
                      />
                      <textarea
                        value={node.content}
                        onChange={(e) => updateNodeContent(node.id, { content: e.target.value })}
                        placeholder="Card details, notes, thoughts..."
                        className="w-full text-xs text-stone-600 bg-transparent resize-none border-none focus:outline-none"
                        rows={3}
                      />
                      {node.data?.author && (
                        <div className="mt-2 text-[10px] font-mono text-stone-400">
                          {node.data.author}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Concept Shape View */}
                  {node.type === 'shape' && (
                    <div className="px-5 py-3 rounded-full flex items-center justify-center border-2 border-stone-300 bg-stone-50 font-medium text-xs text-stone-800 text-center">
                      <input
                        value={node.title || node.content}
                        onChange={(e) => updateNodeContent(node.id, { title: e.target.value, content: e.target.value })}
                        className="w-full bg-transparent text-center font-medium border-none focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Research Card View */}
                  {node.type === 'research' && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold mb-1">
                        <span>Research Reference</span>
                        {node.data?.url && (
                          <a
                            href={node.data.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-stone-900 mb-1">{node.title}</h4>
                      <p className="text-xs text-stone-700 italic">{node.content}</p>
                      {node.data?.author && (
                        <div className="mt-2 text-[10px] font-mono text-emerald-700">
                          {node.data.author}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Connect Handle */}
                  {isSelected && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex items-center">
                      <button
                        type="button"
                        title="Click another node to draw an arrow"
                        className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Handwriting Ink Layer on Canvas */}
          <div className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-auto">
            {activeToolMode === 'draw' && (
              <HandwritingCanvas
                strokes={strokes}
                onChange={handleStrokesChange}
                width={8000}
                height={8000}
                background="transparent"
                showToolbar={false}
                activeTool={drawTool}
                selectedColor={drawColor}
                strokeWidth={drawWidth}
                className="border-none bg-transparent"
              />
            )}
            {/* Read-only strokes rendering when in select mode */}
            {activeToolMode !== 'draw' && (
              <HandwritingCanvas
                strokes={strokes}
                onChange={() => {}}
                width={8000}
                height={8000}
                background="transparent"
                showToolbar={false}
                readOnly={true}
                className="border-none bg-transparent pointer-events-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
