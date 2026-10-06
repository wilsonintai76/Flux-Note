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

export interface PDFPageAnnotation {
  strokes: InkStroke[];
  textBoxes?: PDFTextBox[];
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

export interface PDFDocumentData {
  fileName: string;
  pdfUrl?: string; // Blob url or data url or bundled sample
  totalPages: number;
  annotations: Record<number, PDFPageAnnotation>;
}

export interface ScratchpadData {
  expiresAt: number | null; // unix timestamp in ms
  initialDurationMs?: number;
  isExpired: boolean;
  category?: 'quick-thought' | 'meeting' | 'temporary-code' | 'reading-scrap';
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
}

export interface NotebookFolder {
  id: string;
  name: string;
  iconName: string;
  color: string;
  description?: string;
}

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
