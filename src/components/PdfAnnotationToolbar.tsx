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
  Check,
  Sparkles,
  BookOpen,
  Award,
  Stamp,
  Grid,
  AlignJustify,
  Download,
  Upload,
  GraduationCap,
  Search,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Star,
  FileCheck,
  Zap,
  Brain
} from 'lucide-react';
import { PDFStamp } from '../types/note';

export type PdfToolMode = 'select' | 'text-highlight' | 'pen' | 'highlighter' | 'stamp' | 'textbox' | 'sticky' | 'eraser';

export interface StampPreset {
  type: PDFStamp['type'];
  label: string;
  defaultScore?: string;
  color: string;
  icon: string;
}

export const LECTURER_STAMP_PRESETS: StampPreset[] = [
  { type: 'correct', label: 'Correct', defaultScore: '+2 pts', color: '#16a34a', icon: '✅' },
  { type: 'full-marks', label: 'Full Marks 10/10', defaultScore: '10/10', color: '#059669', icon: '💯' },
  { type: 'incorrect', label: 'Check Calculation', defaultScore: '-1 pt', color: '#dc2626', icon: '❌' },
  { type: 'warning', label: 'Missing Units / Steps', color: '#d97706', icon: '⚠️' },
  { type: 'question', label: 'Explain Reasoning', color: '#7c3aed', icon: '❓' },
  { type: 'star', label: 'Brilliant Solution', color: '#ea580c', icon: '⭐' },
  { type: 'grade-badge', label: 'Grade: A', defaultScore: 'Grade A', color: '#2563eb', icon: '🎓' },
];

interface PdfAnnotationToolbarProps {
  activeTool: PdfToolMode;
  onSelectTool: (tool: PdfToolMode) => void;
  
  // Tutorial Role (Student vs Lecturer)
  tutorialRole: 'student' | 'lecturer';
  onToggleTutorialRole: (role: 'student' | 'lecturer') => void;

  // Search, Thumbnails, & Key Terms
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  isThumbnailsOpen: boolean;
  onToggleThumbnails: () => void;
  isKeyTermsOpen: boolean;
  onToggleKeyTerms: () => void;
  onOpenFlashcards?: () => void;

  // OCR Text Recognition
  isOcrRunning?: boolean;
  hasOcrForPage?: boolean;
  onRunOcr?: () => void;
  showOcrBoxes?: boolean;
  onToggleOcrBoxes?: () => void;

  // Stamp selection
  selectedStampPreset: StampPreset;
  onSelectStampPreset: (stamp: StampPreset) => void;

  // Text Highlight styling
  textHighlightColor: string;
  onChangeTextHighlightColor: (color: string) => void;
  highlightsCount?: number;
  onToggleHighlightsList?: () => void;
  isHighlightsListOpen?: boolean;

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
  isSmartHighlighterEnabled?: boolean;
  onToggleSmartHighlighter?: () => void;
  
  // Text box styling
  textColor: string;
  onChangeTextColor: (color: string) => void;
  textFontSize: number;
  onChangeTextFontSize: (size: number) => void;
  textBgColor: string;
  onChangeTextBgColor: (bg: string) => void;

  // Margin overlays for student/lecturer calculation
  showGridOverlay: boolean;
  onToggleGridOverlay: () => void;
  showLinedOverlay: boolean;
  onToggleLinedOverlay: () => void;

  // Actions
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPage: () => void;
  onExportPdf: () => void;
  onOpenUploadModal: () => void;
  totalPageAnnotationsCount: number;
}

const PEN_COLORS = [
  { name: 'Obsidian Ink', value: '#18181b' },
  { name: 'Grading Red', value: '#dc2626' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Emerald Green', value: '#059669' },
  { name: 'Warm Amber', value: '#d97706' },
  { name: 'Lecture Purple', value: '#7c3aed' },
];

const TEXT_HIGHLIGHT_COLORS = [
  { name: 'Solar Yellow', value: '#fef08a' },
  { name: 'Mint Green', value: '#bbf7d0' },
  { name: 'Sky Blue', value: '#bfdbfe' },
  { name: 'Blush Pink', value: '#fbcfe8' },
  { name: 'Warm Orange', value: '#fed7aa' },
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
  { name: 'White Box', value: '#ffffff' },
  { name: 'Formula Amber', value: '#fef9c3' },
  { name: 'Solution Blue', value: '#e0f2fe' },
  { name: 'Feedback Pink', value: '#fce7f3' },
];

export const PdfAnnotationToolbar: React.FC<PdfAnnotationToolbarProps> = ({
  activeTool,
  onSelectTool,
  tutorialRole,
  onToggleTutorialRole,
  isSearchOpen,
  onToggleSearch,
  isThumbnailsOpen,
  onToggleThumbnails,
  isKeyTermsOpen,
  onToggleKeyTerms,
  onOpenFlashcards,
  isOcrRunning,
  hasOcrForPage,
  onRunOcr,
  showOcrBoxes,
  onToggleOcrBoxes,
  selectedStampPreset,
  onSelectStampPreset,
  textHighlightColor,
  onChangeTextHighlightColor,
  highlightsCount = 0,
  onToggleHighlightsList,
  isHighlightsListOpen,
  penColor,
  onChangePenColor,
  penWidth,
  onChangePenWidth,
  highlighterColor,
  onChangeHighlighterColor,
  highlighterWidth,
  onChangeHighlighterWidth,
  isSmartHighlighterEnabled = true,
  onToggleSmartHighlighter,
  textColor,
  onChangeTextColor,
  textFontSize,
  onChangeTextFontSize,
  textBgColor,
  onChangeTextBgColor,
  showGridOverlay,
  onToggleGridOverlay,
  showLinedOverlay,
  onToggleLinedOverlay,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPage,
  onExportPdf,
  onOpenUploadModal,
  totalPageAnnotationsCount,
}) => {
  const [showStampsMenu, setShowStampsMenu] = useState(false);

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-white/95 backdrop-blur-md border border-stone-200 shadow-md rounded-2xl select-none text-stone-700">
      {/* Top Bar: Role Selector, Tools, Overlays & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        
        {/* Left: Role Mode & Search / Pages */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onToggleTutorialRole('student')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                tutorialRole === 'student'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Student Mode: Fine nib for math, solution boxes, formula callouts"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleTutorialRole('lecturer')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                tutorialRole === 'lecturer'
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Lecturer / Grader Mode: Red pen, grading stamps, tick marks, grade badges"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Lecturer</span>
            </button>
          </div>

          {/* Quick Page Thumbnails & Search Shortcuts */}
          <button
            type="button"
            onClick={onToggleThumbnails}
            title={isThumbnailsOpen ? "Close Page Thumbnails" : "Open Page Thumbnails Sidebar"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isThumbnailsOpen
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thumbnails</span>
          </button>

          <button
            type="button"
            onClick={onToggleKeyTerms}
            title={isKeyTermsOpen ? "Close Key Terms Panel" : "View Extracted Key Terms & Headings"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isKeyTermsOpen
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Key Terms</span>
          </button>

          {onOpenFlashcards && (
            <button
              type="button"
              onClick={onOpenFlashcards}
              title="Study Key Terms as Flashcards"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all"
            >
              <Brain className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Flashcards</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSearch}
            title={isSearchOpen ? "Close Search" : "Search in PDF (Find text on surface)"}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isSearchOpen
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {onRunOcr && (
            <button
              type="button"
              onClick={onRunOcr}
              disabled={isOcrRunning}
              title={hasOcrForPage ? "OCR Active: Click to re-scan page text" : "Run OCR Text Recognition on Scanned Page"}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                isOcrRunning
                  ? 'bg-amber-200 text-amber-950 border-amber-400 animate-pulse'
                  : hasOcrForPage
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${hasOcrForPage ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">{isOcrRunning ? 'OCR...' : hasOcrForPage ? 'OCR Ready' : 'OCR'}</span>
            </button>
          )}
        </div>

        {/* Center: Primary Tools */}
        <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-xl flex-wrap">
          {/* Select & Text Highlight */}
          <button
            type="button"
            onClick={() => onSelectTool('select')}
            title="Select Text / Click Items"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'select'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Select</span>
          </button>

          {/* Text Highlight */}
          <button
            type="button"
            onClick={() => onSelectTool('text-highlight')}
            title="Text Highlighter (Select text on PDF to highlight)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'text-highlight'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full border border-amber-400 shrink-0"
              style={{ backgroundColor: textHighlightColor }}
            />
            <span className="hidden sm:inline">Highlight</span>
          </button>

          {/* Pen / Stylus */}
          <button
            type="button"
            onClick={() => onSelectTool('pen')}
            title="Handwriting Pen (Stylus pressure supported)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'pen'
                ? tutorialRole === 'lecturer'
                  ? 'bg-red-50 text-red-700 border border-red-200 shadow-xs'
                  : 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Pen</span>
            <div
              className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0"
              style={{ backgroundColor: penColor }}
            />
          </button>

          {/* Freehand Highlighter */}
          <button
            type="button"
            onClick={() => onSelectTool('highlighter')}
            title="Freehand Highlighter"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'highlighter'
                ? 'bg-yellow-100 text-yellow-900 border border-yellow-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5 text-yellow-600" />
            <span className="hidden sm:inline">Marker</span>
          </button>

          {/* Lecturer Grading Stamp */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                onSelectTool('stamp');
                setShowStampsMenu(!showStampsMenu);
              }}
              title="Lecturer Grading Stamps (Tick, 10/10, Check Calculation, Grade Badge)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
                activeTool === 'stamp'
                  ? 'bg-red-100 text-red-900 border border-red-300 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Stamp className="w-3.5 h-3.5 text-red-600" />
              <span>{selectedStampPreset.icon} {selectedStampPreset.label}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showStampsMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-2 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-2 py-1">
                  Lecturer & Student Stamps
                </div>
                {LECTURER_STAMP_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onSelectStampPreset(preset);
                      onSelectTool('stamp');
                      setShowStampsMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{preset.icon}</span>
                      <span>{preset.label}</span>
                    </div>
                    {preset.defaultScore && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                        {preset.defaultScore}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text & Formula Box */}
          <button
            type="button"
            onClick={() => onSelectTool('textbox')}
            title="Text Box / Math Formula (Click on page to place)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'textbox'
                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Text</span>
          </button>

          {/* Sticky Note */}
          <button
            type="button"
            onClick={() => onSelectTool('sticky')}
            title="Sticky Note Comment"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'sticky'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Sticky</span>
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => onSelectTool('eraser')}
            title="Stroke Eraser"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-8.5 ${
              activeTool === 'eraser'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eraser</span>
          </button>
        </div>

        {/* Right: Overlays, History, Upload & Export */}
        <div className="flex items-center gap-1.5">
          {/* Grid Overlay Toggle */}
          <button
            type="button"
            onClick={onToggleGridOverlay}
            title={showGridOverlay ? "Hide Graph Grid" : "Show 5mm Graph Grid for calculations"}
            className={`p-1.5 rounded-lg border transition-all ${
              showGridOverlay
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Lined Overlay Toggle */}
          <button
            type="button"
            onClick={onToggleLinedOverlay}
            title={showLinedOverlay ? "Hide Lined Margin" : "Show Ruled Lines for handwriting"}
            className={`p-1.5 rounded-lg border transition-all ${
              showLinedOverlay
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-stone-200 mx-0.5" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Clear Page */}
          <button
            type="button"
            onClick={onClearPage}
            disabled={totalPageAnnotationsCount === 0}
            title="Clear Page Annotations"
            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-stone-200 mx-0.5" />

          {/* Upload / Switch PDF */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-all"
            title="Upload PDF or Worksheet Image"
          >
            <Upload className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Upload</span>
          </button>

          {/* Export / Print Annotated PDF */}
          <button
            type="button"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold shadow-xs transition-all"
            title="Export / Download Flattened Annotated PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Secondary Context Toolbar based on Active Tool */}
      {activeTool === 'pen' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Ink Color:</span>
            <div className="flex items-center gap-1.5">
              {PEN_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChangePenColor(c.value)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    penColor === c.value ? 'scale-125 border-stone-900 shadow-xs' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Nib Size:</span>
            {[
              { label: 'Fine (1.5px)', val: 1.5 },
              { label: 'Medium (2.5px)', val: 2.5 },
              { label: 'Bold (4.0px)', val: 4.0 },
              { label: 'Marker (6.0px)', val: 6.0 },
            ].map(size => (
              <button
                key={size.val}
                type="button"
                onClick={() => onChangePenWidth(size.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  penWidth === size.val
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === 'highlighter' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Highlighter Color:</span>
            <div className="flex items-center gap-1.5">
              {HIGHLIGHTER_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChangeHighlighterColor(c.value)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    highlighterColor === c.value ? 'scale-125 border-stone-900 shadow-xs' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSmartHighlighter && (
              <button
                type="button"
                onClick={onToggleSmartHighlighter}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  isSmartHighlighterEnabled
                    ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-xs font-bold'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
                title="Automatically snap highlighter to horizontal text lines for straight readability"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-900" />
                <span>Smart Line Snap: {isSmartHighlighterEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <span className="text-stone-500 font-medium">Width:</span>
            {[
              { label: 'Narrow (14px)', val: 14 },
              { label: 'Standard (22px)', val: 22 },
              { label: 'Broad (32px)', val: 32 },
            ].map(size => (
              <button
                key={size.val}
                type="button"
                onClick={() => onChangeHighlighterWidth(size.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  highlighterWidth === size.val
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === 'textbox' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Box Style:</span>
            <div className="flex items-center gap-1.5">
              {TEXT_BG_COLORS.map(bg => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => onChangeTextBgColor(bg.value)}
                  className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                    textBgColor === bg.value
                      ? 'border-stone-900 shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                  style={{ backgroundColor: bg.value === 'transparent' ? '#ffffff' : bg.value }}
                >
                  {bg.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Font Size:</span>
            {[12, 14, 16, 20].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => onChangeTextFontSize(size)}
                className={`w-6 h-6 rounded text-xs font-medium border transition-colors ${
                  textFontSize === size
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTool === 'stamp' && (
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 px-1 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-red-700">Click anywhere on the PDF</span>
            <span>to place <strong className="text-stone-900">{selectedStampPreset.icon} {selectedStampPreset.label}</strong></span>
          </div>
          <span className="text-stone-400 text-[11px]">Tip: You can drag and reposition placed stamps</span>
        </div>
      )}
    </div>
  );
};
