import React, { useState } from 'react';
import { 
  Pen, 
  Highlighter, 
  Type, 
  Eraser, 
  MessageSquare, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Palette, 
  Circle,
  ChevronDown,
  MousePointer,
  Check
} from 'lucide-react';

export type PdfToolMode = 'select' | 'pen' | 'highlighter' | 'textbox' | 'sticky' | 'eraser';

interface PdfAnnotationToolbarProps {
  activeTool: PdfToolMode;
  onSelectTool: (tool: PdfToolMode) => void;
  
  // Pen styling
  penColor: string;
  onChangePenColor: (color: string) => void;
  penWidth: number;
  onChangePenWidth: (width: number) => void;
  
  // Highlighter styling
  highlighterColor: string;
  onChangeHighlighterColor: (color: string) => void;
  highlighterWidth: number;
  onChangeHighlighterWidth: (width: number) => void;
  
  // Text box styling
  textColor: string;
  onChangeTextColor: (color: string) => void;
  textFontSize: number;
  onChangeTextFontSize: (size: number) => void;
  textBgColor: string;
  onChangeTextBgColor: (bg: string) => void;

  // History & Actions
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  totalPageAnnotationsCount: number;
}

const PEN_COLORS = [
  { name: 'Ink Black', value: '#18181b' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Forest Green', value: '#059669' },
  { name: 'Warm Amber', value: '#d97706' },
  { name: 'Deep Purple', value: '#7c3aed' },
];

const HIGHLIGHTER_COLORS = [
  { name: 'Neon Yellow', value: '#facc15' },
  { name: 'Emerald Mint', value: '#4ade80' },
  { name: 'Blush Pink', value: '#f472b6' },
  { name: 'Sky Blue', value: '#38bdf8' },
  { name: 'Pastel Purple', value: '#c084fc' },
];

const TEXT_BG_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'White Fill', value: '#ffffff' },
  { name: 'Yellow Sticky', value: '#fef9c3' },
  { name: 'Blue Note', value: '#e0f2fe' },
];

export const PdfAnnotationToolbar: React.FC<PdfAnnotationToolbarProps> = ({
  activeTool,
  onSelectTool,
  penColor,
  onChangePenColor,
  penWidth,
  onChangePenWidth,
  highlighterColor,
  onChangeHighlighterColor,
  highlighterWidth,
  onChangeHighlighterWidth,
  textColor,
  onChangeTextColor,
  textFontSize,
  onChangeTextFontSize,
  textBgColor,
  onChangeTextBgColor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  totalPageAnnotationsCount,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white/95 backdrop-blur-md border border-stone-200 shadow-md rounded-2xl select-none text-stone-700">
      {/* Primary Tool Switchers with tactile touch targets */}
      <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onSelectTool('select')}
          title="Select / Navigate (Mouse & Touch Scroll)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-9 ${
            activeTool === 'select'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('pen')}
          title="Pen / Stylus Draw (Pressure responsive)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-9 ${
            activeTool === 'pen'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <Pen className="w-3.5 h-3.5" />
          <span>Draw</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('highlighter')}
          title="Highlighter (Translucent ink over text)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-9 ${
            activeTool === 'highlighter'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Highlight</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('textbox')}
          title="Text Box (Click anywhere to drop typed annotation)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-9 ${
            activeTool === 'textbox'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Text Box</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('sticky')}
          title="Margin Sticky Note"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-9 ${
            activeTool === 'sticky'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Margin Note</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTool('eraser')}
          title="Eraser (Stroke & object eraser)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-9 ${
            activeTool === 'eraser'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
          }`}
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Eraser</span>
        </button>
      </div>

      {/* Secondary Context Bar based on active tool */}
      <div className="flex items-center gap-2">
        {/* Pen Customization */}
        {activeTool === 'pen' && (
          <div className="flex items-center gap-2 bg-stone-50 px-2 py-1 rounded-xl border border-stone-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-600">Ink</span>
            <div className="flex items-center gap-1">
              {PEN_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => onChangePenColor(c.value)}
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-115"
                  style={{ backgroundColor: c.value }}
                >
                  {penColor === c.value && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-stone-200 mx-1" />

            <div className="flex items-center gap-1">
              {[
                { w: 1.5, label: 'Fine' },
                { w: 3, label: 'Medium' },
                { w: 5, label: 'Broad' },
              ].map(item => (
                <button
                  key={item.w}
                  type="button"
                  onClick={() => onChangePenWidth(item.w)}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    penWidth === item.w ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Highlighter Customization */}
        {activeTool === 'highlighter' && (
          <div className="flex items-center gap-2 bg-amber-50/70 px-2 py-1 rounded-xl border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold text-amber-900">Color</span>
            <div className="flex items-center gap-1">
              {HIGHLIGHTER_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => onChangeHighlighterColor(c.value)}
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-115 border border-stone-200"
                  style={{ backgroundColor: c.value }}
                >
                  {highlighterColor === c.value && <Check className="w-3 h-3 text-stone-900 stroke-[3]" />}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-amber-200 mx-1" />

            <div className="flex items-center gap-1">
              {[
                { w: 14, label: 'Thin' },
                { w: 20, label: 'Medium' },
                { w: 28, label: 'Thick' },
              ].map(item => (
                <button
                  key={item.w}
                  type="button"
                  onClick={() => onChangeHighlighterWidth(item.w)}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    highlighterWidth === item.w ? 'bg-amber-600 text-white' : 'text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Box Customization */}
        {activeTool === 'textbox' && (
          <div className="flex items-center gap-2 bg-emerald-50/70 px-2 py-1 rounded-xl border border-emerald-200/80">
            <span className="text-[10px] uppercase font-bold text-emerald-900">Font</span>
            <div className="flex items-center gap-1">
              {[
                { size: 12, label: 'Small' },
                { size: 14, label: 'Regular' },
                { size: 18, label: 'Large' },
              ].map(s => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => onChangeTextFontSize(s.size)}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    textFontSize === s.size ? 'bg-emerald-700 text-white' : 'text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-emerald-200 mx-1" />

            <span className="text-[10px] uppercase font-bold text-emerald-900">Fill</span>
            <div className="flex items-center gap-1">
              {TEXT_BG_COLORS.map(bg => (
                <button
                  key={bg.value}
                  type="button"
                  title={bg.name}
                  onClick={() => onChangeTextBgColor(bg.value)}
                  className={`w-4 h-4 rounded border text-[9px] font-semibold transition-all ${
                    textBgColor === bg.value ? 'ring-2 ring-emerald-600 scale-110' : 'border-stone-300'
                  }`}
                  style={{ backgroundColor: bg.value === 'transparent' ? '#ffffff' : bg.value }}
                >
                  {bg.value === 'transparent' && '∅'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Eraser info */}
        {activeTool === 'eraser' && (
          <div className="text-[11px] text-stone-500 italic px-2">
            Touch or click any stroke or text box to erase it
          </div>
        )}

        {/* Undo, Redo, Clear Page */}
        <div className="flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo stroke"
            className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30 rounded-lg hover:bg-stone-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo stroke"
            className="p-1.5 text-stone-500 hover:text-stone-900 disabled:opacity-30 rounded-lg hover:bg-stone-100"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClearPage}
            disabled={totalPageAnnotationsCount === 0}
            title="Clear annotations on this page"
            className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30 rounded-lg hover:bg-red-50 ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
