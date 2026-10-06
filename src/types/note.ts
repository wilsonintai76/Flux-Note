export type NoteType = 'page' | 'canvas' | 'research' | 'scratchpad' | 'pdf';

export interface InkPoint {
  x: number;
  y: number;
  pressure?: number;
}

export type InkToolType = 'pen' | 'pencil' | 'highlighter' | 'eraser';

export interface InkStroke {
  id: string;
  tool: InkToolType;
  color: string;
  width: number;
  opacity: number;
  points: InkPoint[];
}

export interface InlineInkBlock {
  id: string;
  title?: string;
  caption?: string;
  strokes: InkStroke[];
  height: number;
  createdAt: number;
}

export interface NoteImageAttachment {
  id: string;
  url: string;
  originalUrl?: string;
  caption?: string;
  width?: number;
  height?: number;
  strokes?: InkStroke[];
  createdAt: number;
}

export type CanvasNodeType = 'sticky' | 'text' | 'card' | 'shape' | 'research' | 'audio' | 'pdf';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  title?: string;
  color?: string;
  shapeType?: 'rect' | 'circle' | 'pill' | 'diamond';
  targetNoteId?: string; // link to another note
  data?: {
    author?: string;
    url?: string;
    audioDuration?: number;
    audioData?: string;
    pdfPage?: number;
    quoteSource?: string;
  };
}

export interface CanvasEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  style?: 'solid' | 'dashed';
  color?: string;
}

export interface AudioRecording {
  id: string;
  title: string;
  durationSeconds: number;
  timestamp: number;
  audioData: string; // base64 / data URL
  waveform: number[];
  transcript?: string;
  transcriptSegments?: { timestamp: number; text: string }[];
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  title: string;
  contentSummary: string;
  fullContent: string;
  authorLabel: string;
}

export interface ResearchQuote {
  id: string;
  quote: string;
  sourceNote?: string;
  pageNumber?: string;
  color?: string;
}

export interface ResearchScreenshot {
  id: string;
  title?: string;
  caption?: string;
  imageUrl: string;
}

export interface ResearchData {
  url?: string;
  sourceName?: string;
  authors?: string;
  publicationDate?: string;
  keyTakeaways: string[];
  quotes: ResearchQuote[];
  screenshots: ResearchScreenshot[];
  personalCritique: string;
  pdfAttachedName?: string;
}

export interface PDFTextBox {
  id: string;
  x: number;
  y: number;
  width?: number;
  text: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
}

export interface PDFHighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFHighlight {
  id: string;
  pageNumber: number;
  text: string;
  color: string;
  rects: PDFHighlightRect[];
  comment?: string;
  createdAt: number;
}

export interface PDFStamp {
  id: string;
  x: number;
  y: number;
  type: 'correct' | 'incorrect' | 'full-marks' | 'warning' | 'question' | 'star' | 'grade-badge' | 'custom';
  label: string;
  scoreText?: string;
  color: string;
  scale?: number;
}

export interface PDFPageAnnotation {
  strokes: InkStroke[];
  textBoxes?: PDFTextBox[];
  highlights?: PDFHighlight[];
  stamps?: PDFStamp[];
  stickyNotes: {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    timestamp: number;
  }[];
}

export interface HomeWidgetConfig {
  filterNotebookId: string | 'all';
  filterTag: string | 'all';
  viewMode: 'grid' | 'compact';
  limit: number;
  showPinnedOnly: boolean;
  sortBy: 'recent' | 'updated' | 'title';
}

export interface PDFOcrLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface PDFOcrPageResult {
  fullText: string;
  lines: PDFOcrLine[];
  processedAt: number;
}

export interface PDFDocumentData {
  fileName: string;
  fileSize?: string;
  pdfUrl?: string; // Blob url, object url, or data url
  pageImages?: Record<number, string>; // Cached rendered image data urls per page
  pageTexts?: Record<number, string>; // Extracted text per page
  ocrResults?: Record<number, PDFOcrPageResult>; // Scanned image OCR text & line bounding boxes
  totalPages: number;
  tutorialMode?: 'student' | 'lecturer';
  showGridOverlay?: boolean;
  showLinedOverlay?: boolean;
  activeTemplateId?: string;
  annotations: Record<number, PDFPageAnnotation>;
}

export interface ScratchpadData {
  expiresAt: number | null; // unix timestamp in ms
  initialDurationMs?: number;
  isExpired: boolean;
  category?: 'quick-thought' | 'meeting' | 'temporary-code' | 'reading-scrap';
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category?: 'definition' | 'theorem' | 'concept' | 'problem' | 'formula' | 'general';
  source?: 'manual' | 'extracted_term' | 'extracted_qa' | 'highlight';
  sourcePage?: number;
  hint?: string;
  lastReviewedAt?: number;
  easeRating?: 'easy' | 'medium' | 'hard';
  masteryLevel?: number; // 0 to 5
  createdAt: number;
}

export interface HandwritingIndexData {
  fullText: string;
  indexedAt: number;
  strokeCount: number;
  wordCount: number;
  recognizedLines?: { text: string; yMin: number; yMax: number }[];
}

export interface Note {
  id: string;
  title: string;
  type: NoteType;
  folderId: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;

  // Page note content (Markdown + inline ink + images)
  content: string;
  inlineInks?: InlineInkBlock[];
  images?: NoteImageAttachment[];
  pageStrokes?: InkStroke[]; // Full overlay handwriting
  handwritingIndex?: HandwritingIndexData; // Indexed text from handwriting ink layers

  // Infinite canvas data
  canvasNodes?: CanvasNode[];
  canvasStrokes?: InkStroke[];
  canvasEdges?: CanvasEdge[];
  canvasView?: { x: number; y: number; zoom: number };

  // Specialized features
  researchData?: ResearchData;
  pdfData?: PDFDocumentData;
  scratchpadData?: ScratchpadData;
  audioRecordings?: AudioRecording[];
  versions?: VersionSnapshot[];
  flashcards?: Flashcard[];
}

export type SmartFolderRuleField = 'tag' | 'title' | 'type';
export type SmartFolderRuleOperator = 'contains' | 'equals' | 'startsWith';

export interface SmartFolderRule {
  id: string;
  field: SmartFolderRuleField;
  operator: SmartFolderRuleOperator;
  value: string;
}

export interface SmartFolderConfig {
  matchMode: 'all' | 'any'; // AND vs OR
  rules: SmartFolderRule[];
}

export interface NotebookFolder {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description?: string;
  isSmart?: boolean;
  smartConfig?: SmartFolderConfig;
}

export const isNoteMatchingSmartFolder = (note: Note, folder: NotebookFolder): boolean => {
  if (!folder.isSmart || !folder.smartConfig || folder.smartConfig.rules.length === 0) {
    return note.folderId === folder.id;
  }

  const { matchMode, rules } = folder.smartConfig;

  const checkRule = (rule: SmartFolderRule): boolean => {
    const val = rule.value.toLowerCase().trim();
    if (!val) return true;

    if (rule.field === 'tag') {
      const cleanTag = val.replace(/^#/, '');
      return note.tags.some(t => {
        const tLower = t.toLowerCase();
        if (rule.operator === 'equals') return tLower === cleanTag;
        if (rule.operator === 'startsWith') return tLower.startsWith(cleanTag);
        return tLower.includes(cleanTag);
      });
    }

    if (rule.field === 'title') {
      const titleLower = (note.title || '').toLowerCase();
      if (rule.operator === 'equals') return titleLower === val;
      if (rule.operator === 'startsWith') return titleLower.startsWith(val);
      return titleLower.includes(val);
    }

    if (rule.field === 'type') {
      return note.type.toLowerCase() === val;
    }

    return false;
  };

  if (matchMode === 'all') {
    return rules.every(checkRule);
  } else {
    return rules.some(checkRule);
  }
};

export type ViewFilter = 
  | 'home'
  | 'all'
  | 'folder'
  | 'tag'
  | 'type'
  | 'pinned'
  | 'scratchpads'
  | 'research'
  | 'canvases'
  | 'archive';
