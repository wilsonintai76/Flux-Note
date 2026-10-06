import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NoteImageAttachment, InkStroke, InkToolType } from '../types/note';
import { HandwritingCanvas } from './HandwritingCanvas';
import {
  X,
  Check,
  Crop,
  PenTool,
  RotateCcw,
  Sparkles,
  Move,
  Maximize2,
  Trash2,
  Undo2,
  Highlighter,
  Eraser,
  Palette
} from 'lucide-react';

interface ImageAnnotatorModalProps {
  image: NoteImageAttachment;
  isOpen: boolean;
  initialMode?: 'annotate' | 'crop';
  onClose: () => void;
  onSave: (updatedImage: NoteImageAttachment) => void;
}

export const ImageAnnotatorModal: React.FC<ImageAnnotatorModalProps> = ({
  image,
  isOpen,
  initialMode = 'annotate',
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'annotate' | 'crop'>(initialMode);
  const [currentUrl, setCurrentUrl] = useState(image.url);
  const [strokes, setStrokes] = useState<InkStroke[]>(image.strokes || []);
  const [caption, setCaption] = useState(image.caption || '');

  // Annotation tool states
  const [activeTool, setActiveTool] = useState<InkToolType>('pen');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3.5);

  // Cropping states
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  }); // In percentages (0-100)
  const isDraggingCrop = useRef<string | null>(null);
  const dragStart = useRef<{ clientX: number; clientY: number; box: typeof cropBox }>({
    clientX: 0,
    clientY: 0,
    box: { x: 10, y: 10, width: 80, height: 80 },
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(image.url);
      setStrokes(image.strokes || []);
      setCaption(image.caption || '');
      setActiveTab(initialMode);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  }, [isOpen, image, initialMode]);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalDimensions({
      width: img.naturalWidth || 800,
      height: img.naturalHeight || 600,
    });
  };

  // Crop interaction handlers
  const handleMouseDownCrop = (action: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingCrop.current = action;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      box: { ...cropBox },
    };
  };

  const handleMouseMoveCrop = useCallback((e: MouseEvent) => {
    if (!isDraggingCrop.current || !imageContainerRef.current) return;
    const container = imageContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStart.current.clientX) / container.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.current.clientY) / container.height) * 100;
    const startBox = dragStart.current.box;

    let { x, y, width, height } = startBox;

    switch (isDraggingCrop.current) {
      case 'move':
        x = Math.max(0, Math.min(100 - width, startBox.x + deltaXPercent));
        y = Math.max(0, Math.min(100 - height, startBox.y + deltaYPercent));
        break;
      case 'se': // bottom-right
        width = Math.max(10, Math.min(100 - startBox.x, startBox.width + deltaXPercent));
        height = Math.max(10, Math.min(100 - startBox.y, startBox.height + deltaYPercent));
        break;
      case 'sw': // bottom-left
        const newWidthSW = Math.max(10, startBox.width - deltaXPercent);
        const newXSW = startBox.x + (startBox.width - newWidthSW);
        if (newXSW >= 0) {
          x = newXSW;
          width = newWidthSW;
        }
        height = Math.max(10, Math.min(100 - startBox.y, startBox.height + deltaYPercent));
        break;
      case 'ne': // top-right
        width = Math.max(10, Math.min(100 - startBox.x, startBox.width + deltaXPercent));
        const newHeightNE = Math.max(10, startBox.height - deltaYPercent);
        const newYNE = startBox.y + (startBox.height - newHeightNE);
        if (newYNE >= 0) {
          y = newYNE;
          height = newHeightNE;
        }
        break;
      case 'nw': // top-left
        const newWidthNW = Math.max(10, startBox.width - deltaXPercent);
        const newXNW = startBox.x + (startBox.width - newWidthNW);
        const newHeightNW = Math.max(10, startBox.height - deltaYPercent);
        const newYNW = startBox.y + (startBox.height - newHeightNW);
        if (newXNW >= 0 && newYNW >= 0) {
          x = newXNW;
          y = newYNW;
          width = newWidthNW;
          height = newHeightNW;
        }
        break;
    }

    setCropBox({ x, y, width, height });
  }, []);

  const handleMouseUpCrop = useCallback(() => {
    isDraggingCrop.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMoveCrop);
    window.addEventListener('mouseup', handleMouseUpCrop);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveCrop);
      window.removeEventListener('mouseup', handleMouseUpCrop);
    };
  }, [handleMouseMoveCrop, handleMouseUpCrop]);

  // Apply Crop Action
  const applyCrop = () => {
    const img = imgElementRef.current;
    if (!img) return;

    const sourceX = (cropBox.x / 100) * naturalDimensions.width;
    const sourceY = (cropBox.y / 100) * naturalDimensions.height;
    const sourceW = (cropBox.width / 100) * naturalDimensions.width;
    const sourceH = (cropBox.height / 100) * naturalDimensions.height;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceW));
    canvas.height = Math.max(1, Math.round(sourceH));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
    const croppedDataUrl = canvas.toDataURL('image/png');

    // Also adjust stroke coordinates to match the cropped region
    const nextStrokes: InkStroke[] = strokes.map(stroke => ({
      ...stroke,
      points: stroke.points
        .map(pt => {
          const ptPercentX = (pt.x / naturalDimensions.width) * 100;
          const ptPercentY = (pt.y / naturalDimensions.height) * 100;
          const newPtX = ((ptPercentX - cropBox.x) / cropBox.width) * canvas.width;
          const newPtY = ((ptPercentY - cropBox.y) / cropBox.height) * canvas.height;
          return { ...pt, x: newPtX, y: newPtY };
        })
        .filter(pt => pt.x >= 0 && pt.x <= canvas.width && pt.y >= 0 && pt.y <= canvas.height),
    })).filter(s => s.points.length > 0);

    setCurrentUrl(croppedDataUrl);
    setStrokes(nextStrokes);
    setActiveTab('annotate');
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
  };

  // Reset to original image
  const handleResetToOriginal = () => {
    if (image.originalUrl) {
      setCurrentUrl(image.originalUrl);
      setStrokes([]);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  };

  const handleSaveModal = () => {
    onSave({
      ...image,
      url: currentUrl,
      originalUrl: image.originalUrl || image.url,
      caption,
      strokes,
      width: naturalDimensions.width,
      height: naturalDimensions.height,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-stone-200">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-stone-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('annotate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'annotate' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                <span>Draw & Annotate</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'crop' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Crop className="w-3.5 h-3.5 text-amber-600" />
                <span>Crop Image</span>
              </button>
            </div>

            {image.originalUrl && image.originalUrl !== currentUrl && (
              <button
                type="button"
                onClick={handleResetToOriginal}
                title="Reset to original uncropped image"
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Original</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar based on active mode */}
        {activeTab === 'annotate' ? (
          <div className="px-5 py-2 border-b border-stone-200 bg-white flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Tool Selection */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTool('pen')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTool === 'pen' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Calligraphic Pen"
                >
                  <PenTool className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('highlighter')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTool === 'highlighter' ? 'bg-white shadow-2xs text-amber-600' : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Highlighter"
                >
                  <Highlighter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('eraser')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTool === 'eraser' ? 'bg-white shadow-2xs text-red-600' : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Stroke Eraser"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              {/* Color swatches */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
                {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ffffff', '#1c1917'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      selectedColor === c ? 'scale-125 ring-2 ring-stone-900 ring-offset-1' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #d6d3d1' : 'none' }}
                  />
                ))}
              </div>

              {/* Stroke Width Selector */}
              <div className="flex items-center gap-1 pl-2 border-l border-stone-200">
                {[
                  { label: 'S', val: 2 },
                  { label: 'M', val: 3.5 },
                  { label: 'L', val: 6 },
                ].map(w => (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => setStrokeWidth(w.val)}
                    className={`px-2 py-0.5 text-xs rounded font-mono ${
                      strokeWidth === w.val ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear strokes */}
            {strokes.length > 0 && (
              <button
                type="button"
                onClick={() => setStrokes([])}
                className="text-xs text-stone-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Ink</span>
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 py-2 border-b border-stone-200 bg-white flex items-center justify-between gap-3 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-amber-600" />
              <span>Drag the rectangle corners to adjust crop boundaries.</span>
            </span>
            <button
              type="button"
              onClick={applyCrop}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-2xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Crop</span>
            </button>
          </div>
        )}

        {/* Main Image Work Area */}
        <div className="flex-1 bg-[#1a1918] p-4 flex items-center justify-center overflow-auto relative min-h-[360px] max-h-[580px]">
          <div
            ref={imageContainerRef}
            className="relative inline-block max-w-full max-h-full select-none shadow-2xl"
          >
            {/* The Target Image */}
            <img
              ref={imgElementRef}
              src={currentUrl}
              alt={caption || 'Annotated Image'}
              onLoad={handleImageLoaded}
              className="max-h-[520px] max-w-full object-contain block rounded-sm pointer-events-none"
            />

            {/* Annotation Mode: Full Drawing Canvas Directly on Top of the Image */}
            {activeTab === 'annotate' && (
              <div className="absolute inset-0 z-20">
                <HandwritingCanvas
                  strokes={strokes}
                  onChange={(newStrokes) => setStrokes(newStrokes)}
                  activeTool={activeTool}
                  selectedColor={selectedColor}
                  strokeWidth={strokeWidth}
                  background="transparent"
                  showToolbar={false}
                  className="border-none bg-transparent"
                />
              </div>
            )}

            {/* Crop Mode: Shroud and Adjustable Crop Box */}
            {activeTab === 'crop' && (
              <div className="absolute inset-0 z-30 pointer-events-auto">
                {/* Darkened overlay outside crop box */}
                <div
                  className="absolute inset-0 bg-black/60 pointer-events-none"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%,
                      0% ${cropBox.y}%, 
                      ${cropBox.x}% ${cropBox.y}%, 
                      ${cropBox.x}% ${cropBox.y + cropBox.height}%, 
                      ${cropBox.x + cropBox.width}% ${cropBox.y + cropBox.height}%, 
                      ${cropBox.x + cropBox.width}% ${cropBox.y}%, 
                      0% ${cropBox.y}%
                    )`,
                  }}
                />

                {/* Interactive Crop Box */}
                <div
                  className="absolute border-2 border-white cursor-move shadow-2xl"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                  onMouseDown={(e) => handleMouseDownCrop('move', e)}
                >
                  {/* Grid guidelines */}
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Corner Handles */}
                  <div
                    onMouseDown={(e) => handleMouseDownCrop('nw', e)}
                    className="absolute -left-1.5 -top-1.5 w-3.5 h-3.5 bg-white border border-stone-800 rounded-xs cursor-nwse-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDownCrop('ne', e)}
                    className="absolute -right-1.5 -top-1.5 w-3.5 h-3.5 bg-white border border-stone-800 rounded-xs cursor-nesw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDownCrop('sw', e)}
                    className="absolute -left-1.5 -bottom-1.5 w-3.5 h-3.5 bg-white border border-stone-800 rounded-xs cursor-nesw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDownCrop('se', e)}
                    className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-white border border-stone-800 rounded-xs cursor-nwse-resize shadow-md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Caption & Save Actions */}
        <div className="px-5 py-3 border-t border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add optional image caption or figure note..."
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModal}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Insert to Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
