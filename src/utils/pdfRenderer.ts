import * as pdfjsLib from 'pdfjs-dist';
import { PDFPageAnnotation, InkStroke, PDFTextBox, PDFHighlight, PDFStamp } from '../types/note';
import { renderBezierStroke } from './inkSmoothing';

// Set up PDF.js worker using unpkg or fallback
if (typeof window !== 'undefined') {
  try {
    // Check if workerSrc is already configured
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Use version matched worker from reliable unpkg CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    }
  } catch (err) {
    console.warn('PDF.js worker initialization notice:', err);
  }
}

export interface RenderedPdfResult {
  totalPages: number;
  fileName: string;
  fileSize: string;
  pageImages: Record<number, string>;
  pageTexts: Record<number, string>;
}

/**
 * Converts a File or ArrayBuffer of a real PDF into rendered page images and text.
 */
export async function processUploadedPdfFile(file: File): Promise<RenderedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: typedArray,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pageImages: Record<number, string> = {};
  const pageTexts: Record<number, string> = {};

  const formattedSize = file.size > 1024 * 1024 
    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
    : `${Math.round(file.size / 1024)} KB`;

  // Render first up to 10 pages in high quality (scale 1.5 to 2.0 for retina display)
  const maxPagesToProcess = Math.min(totalPages, 20);

  for (let pageNum = 1; pageNum <= maxPagesToProcess; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      await (page.render as any)({
        canvasContext: context,
        canvas: canvas,
        viewport: viewport,
      }).promise;

      // Extract text content for text highlighter search
      const textContent = await page.getTextContent();
      const extractedText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');

      pageImages[pageNum] = canvas.toDataURL('image/png');
      pageTexts[pageNum] = extractedText;
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }

  return {
    totalPages,
    fileName: file.name,
    fileSize: formattedSize,
    pageImages,
    pageTexts,
  };
}

/**
 * Converts an uploaded image (PNG/JPG of worksheet/problem sheet) into a PDF-like document.
 */
export async function processUploadedImageAsWorksheet(file: File): Promise<RenderedPdfResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      resolve({
        totalPages: 1,
        fileName: file.name,
        fileSize: formattedSize,
        pageImages: { 1: dataUrl },
        pageTexts: { 1: file.name },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Built-in Academic Tutorial Sheets & Lecture Slides
 */
export interface TutorialTemplate {
  id: string;
  title: string;
  subtitle: string;
  course: string;
  department: string;
  instructor: string;
  term: string;
  totalPages: number;
  badge: string;
}

export const BUILTIN_TUTORIAL_TEMPLATES: TutorialTemplate[] = [
  {
    id: 'tutorial-linear-algebra',
    title: 'Tutorial 04: Eigenvalues, Matrix Diagonalization & SVD',
    subtitle: 'Weekly Tutorial Problem Set • 4 Problems with Work Area',
    course: 'MATH 204: Applied Linear Algebra',
    department: 'Department of Mathematics',
    instructor: 'Dr. Sarah Lin',
    term: 'Week 4 • Problem Solving & Proofs',
    totalPages: 4,
    badge: 'Mathematics Problem Set',
  },
  {
    id: 'tutorial-quantum-lecture',
    title: 'Lecture 09: Quantum Gate Teleportation & Dense Coding',
    subtitle: 'Slides & Discussion Handout with Bell State Proofs',
    course: 'PHYS 432: Advanced Quantum Computing',
    department: 'Department of Applied Physics',
    instructor: 'Prof. E. Vance',
    term: 'Autumn Term • Slides & Exercises',
    totalPages: 4,
    badge: 'Physics Lecture Slides',
  },
  {
    id: 'tutorial-systems-algorithms',
    title: 'Tutorial 07: Distributed Consensus & Raft Protocol',
    subtitle: 'Leader Election, Log Replication & Fault Tolerance Analysis',
    course: 'CS 328: Distributed Systems Architecture',
    department: 'Department of Computer Science',
    instructor: 'Prof. Marcus Chen',
    term: 'Midterm Review • Lab Tutorial',
    totalPages: 3,
    badge: 'CS Architecture Tutorial',
  },
  {
    id: 'tutorial-blank-grid',
    title: 'Blank Graph & Calculation Worksheet (Grid / Lined)',
    subtitle: 'Clean 5mm Engineering Grid with Header & Score Box',
    course: 'General Academic Workspace',
    department: 'Student & Lecturer Blank Slate',
    instructor: 'Custom Annotator',
    term: 'Open Practice & Problem Solving',
    totalPages: 3,
    badge: 'Blank Problem Sheet',
  },
];

/**
 * Exports a page (or entire document) with PDF background, handwriting, highlights, text, and stamps flattened
 */
export async function exportAnnotatedPageToDataUrl(
  pageNumber: number,
  pageBackgroundUrl: string | undefined,
  annotation: PDFPageAnnotation,
  width: number = 780,
  height: number = 1000
): Promise<string> {
  const canvas = document.createElement('canvas');
  const dpr = 2; // High resolution export
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(dpr, dpr);

  // 1. Fill base white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw background image if available
  if (pageBackgroundUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // continue if image fails
        img.src = pageBackgroundUrl;
      });
      ctx.drawImage(img, 0, 0, width, height);
    } catch (e) {
      console.warn('Could not render background image for export:', e);
    }
  }

  // 3. Render highlights
  if (annotation.highlights && annotation.highlights.length > 0) {
    ctx.save();
    for (const hl of annotation.highlights) {
      ctx.fillStyle = hl.color || '#fef08a';
      ctx.globalAlpha = 0.45;
      for (const rect of hl.rects) {
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
    ctx.restore();
  }

  // 4. Render handwriting strokes
  if (annotation.strokes && annotation.strokes.length > 0) {
    for (const stroke of annotation.strokes) {
      renderBezierStroke(ctx, stroke);
    }
  }

  // 5. Render stamps (Lecturer grades, correct/incorrect ticks)
  if (annotation.stamps && annotation.stamps.length > 0) {
    for (const stamp of annotation.stamps) {
      ctx.save();
      ctx.translate(stamp.x, stamp.y);
      const scale = stamp.scale || 1.0;
      ctx.scale(scale, scale);

      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = stamp.color || '#dc2626';
      ctx.strokeStyle = stamp.color || '#dc2626';
      ctx.lineWidth = 1.8;

      // Draw stamp border capsule
      const textWidth = ctx.measureText(stamp.label + (stamp.scoreText ? ` [${stamp.scoreText}]` : '')).width;
      const boxW = Math.max(100, textWidth + 30);
      const boxH = 32;

      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = stamp.color || '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayText = stamp.label + (stamp.scoreText ? ` • ${stamp.scoreText}` : '');
      ctx.fillText(displayText, 0, 0);

      ctx.restore();
    }
  }

  // 6. Render text boxes
  if (annotation.textBoxes && annotation.textBoxes.length > 0) {
    for (const box of annotation.textBoxes) {
      ctx.save();
      if (box.backgroundColor && box.backgroundColor !== 'transparent') {
        ctx.fillStyle = box.backgroundColor;
        ctx.fillRect(box.x, box.y, box.width || 180, 40);
        ctx.strokeStyle = '#e5e7eb';
        ctx.strokeRect(box.x, box.y, box.width || 180, 40);
      }

      ctx.font = `${box.fontSize || 14}px system-ui, sans-serif`;
      ctx.fillStyle = box.color || '#1c1917';
      ctx.textBaseline = 'top';
      ctx.fillText(box.text, box.x + 6, box.y + 6);
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}
