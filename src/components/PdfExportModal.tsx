import React, { useState } from 'react';
import { 
  PDFDocumentData, 
  Note, 
  PDFPageAnnotation 
} from '../types/note';
import { 
  exportAnnotatedPageToDataUrl 
} from '../utils/pdfRenderer';
import { 
  Download, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  Image as ImageIcon,
  Save,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

interface PdfExportModalProps {
  note: Note;
  currentPage: number;
  onSaveAsNewNote?: (newNote: Note) => void;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  note,
  currentPage,
  onSaveAsNewNote,
  onClose,
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'new-note'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [exportedSuccess, setExportedSuccess] = useState(false);

  const pdfData = note.pdfData || {
    fileName: 'document.pdf',
    totalPages: 1,
    annotations: {},
  };

  const totalPages = pdfData.totalPages || 1;

  const handleExecuteExport = async () => {
    setIsExporting(true);
    setProgressText('Preparing high-resolution canvas...');

    try {
      const pagesToProcess = exportScope === 'current' 
        ? [currentPage] 
        : Array.from({ length: totalPages }, (_, i) => i + 1);

      const renderedPages: Record<number, string> = {};

      for (let i = 0; i < pagesToProcess.length; i++) {
        const pg = pagesToProcess[i];
        setProgressText(`Burning annotations onto Page ${pg} of ${pagesToProcess.length}...`);
        
        const pageBg = pdfData.pageImages?.[pg];
        const pageAnno = pdfData.annotations[pg] || {
          strokes: [],
          textBoxes: [],
          highlights: [],
          stamps: [],
          stickyNotes: [],
        };

        const dataUrl = await exportAnnotatedPageToDataUrl(
          pg,
          pageBg,
          pageAnno,
          780,
          1000
        );

        if (dataUrl) {
          renderedPages[pg] = dataUrl;
        }
      }

      const baseName = pdfData.fileName.replace(/\.pdf$/i, '');

      // Format 1: Save as New Note in Folio
      if (exportFormat === 'new-note') {
        setProgressText('Saving new annotated document in Folio library...');
        const newNote: Note = {
          id: 'note-pdf-annotated-' + Date.now(),
          title: `[Annotated] ${note.title || baseName}`,
          type: 'pdf',
          folderId: note.folderId,
          tags: [...(note.tags || []), 'annotated-pdf', 'graded'],
          isPinned: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          content: `Exported document with burned-in ink strokes, highlights, and grading feedback.\n\nOriginal Source: ${pdfData.fileName}`,
          pdfData: {
            fileName: `Annotated_${pdfData.fileName}`,
            fileSize: `${(Object.keys(renderedPages).length * 280)} KB`,
            totalPages: pagesToProcess.length,
            pageImages: renderedPages,
            tutorialMode: pdfData.tutorialMode,
            showGridOverlay: false,
            showLinedOverlay: false,
            annotations: {}, // Annotations are now baked/burned into the pageImages!
          },
        };

        if (onSaveAsNewNote) {
          onSaveAsNewNote(newNote);
        }
        setExportedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      // Format 2: Download as PNG image(s)
      if (exportFormat === 'png') {
        setProgressText('Generating download package...');
        for (const pg of pagesToProcess) {
          const url = renderedPages[pg];
          if (url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}_Annotated_Page_${pg}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        }
        setExportedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      // Format 3: Export as PDF / Printable Document with all pages burned in
      if (exportFormat === 'pdf') {
        setProgressText('Assembling multi-page PDF document...');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const pagesHtml = pagesToProcess.map(pg => {
            const imgUrl = renderedPages[pg];
            return `
              <div class="page-container">
                <img src="${imgUrl}" alt="Page ${pg}" class="page-image" />
                <div class="page-footer">Page ${pg} • ${baseName} • Annotated in Folio</div>
              </div>
            `;
          }).join('');

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${baseName} (Annotated)</title>
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    background: #f5f5f4;
                    font-family: system-ui, -apple-system, sans-serif;
                  }
                  .page-container {
                    width: 100vw;
                    max-width: 820px;
                    margin: 20px auto;
                    background: #ffffff;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    page-break-after: always;
                    break-after: page;
                    position: relative;
                  }
                  .page-image {
                    width: 100%;
                    height: auto;
                    display: block;
                  }
                  .page-footer {
                    padding: 8px 16px;
                    font-size: 10px;
                    color: #78716c;
                    text-align: right;
                    border-top: 1px solid #e7e5e4;
                    font-family: monospace;
                  }
                  @media print {
                    body {
                      background: #ffffff;
                    }
                    .page-container {
                      margin: 0;
                      box-shadow: none;
                      max-width: 100%;
                    }
                    .no-print {
                      display: none;
                    }
                  }
                  .print-bar {
                    position: fixed;
                    top: 12px;
                    right: 12px;
                    background: rgba(28,25,23,0.95);
                    color: white;
                    padding: 10px 16px;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 1000;
                  }
                  .print-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 12px;
                    cursor: pointer;
                  }
                </style>
              </head>
              <body>
                <div class="print-bar no-print">
                  <span>Burned-in Document (${pagesToProcess.length} pages)</span>
                  <button class="print-btn" onclick="window.print()">Save as PDF / Print</button>
                </div>
                ${pagesHtml}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
        setExportedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate export document.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Export Burned-in PDF</h3>
              <p className="text-xs text-stone-500">
                Saves document with all ink drawings, stamps, and highlights permanently baked in.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Scope Selection */}
        <div className="my-4">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-2">
            1. Pages to Include
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setExportScope('current')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                exportScope === 'current'
                  ? 'border-stone-900 bg-stone-50 shadow-xs ring-1 ring-stone-900'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="font-bold text-xs text-stone-900">Current Page Only</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Export Page {currentPage} with its annotations</div>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('all')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                exportScope === 'all'
                  ? 'border-stone-900 bg-stone-50 shadow-xs ring-1 ring-stone-900'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="font-bold text-xs text-stone-900">All Pages ({totalPages})</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Export entire multi-page document</div>
            </button>
          </div>
        </div>

        {/* Export Format Selection */}
        <div className="my-4">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-2">
            2. Export Destination & Format
          </label>
          <div className="space-y-2">
            {/* Format: PDF */}
            <div
              onClick={() => setExportFormat('pdf')}
              className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                exportFormat === 'pdf'
                  ? 'border-red-500 bg-red-50/40 shadow-xs ring-1 ring-red-400'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 text-red-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Flattened PDF Document</div>
                  <div className="text-[11px] text-stone-500">Ready for submission to lecturer or student feedback</div>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-red-700">.pdf</span>
            </div>

            {/* Format: PNG Image */}
            <div
              onClick={() => setExportFormat('png')}
              className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                exportFormat === 'png'
                  ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-400'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">High-Resolution Image Sheet</div>
                  <div className="text-[11px] text-stone-500">Retina PNG image with crisp ink and stamps</div>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-blue-700">.png</span>
            </div>

            {/* Format: Save as New Note */}
            <div
              onClick={() => setExportFormat('new-note')}
              className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                exportFormat === 'new-note'
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-400'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">Save as New Note in Folio</div>
                  <div className="text-[11px] text-stone-500">Creates a new note preserving this annotated version</div>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-emerald-700">Library</span>
            </div>
          </div>
        </div>

        {/* Progress or Actions Footer */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
          <div className="text-xs text-stone-500 font-mono">
            {isExporting ? (
              <span className="text-indigo-600 font-medium animate-pulse">{progressText}</span>
            ) : exportedSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Export successful!</span>
              </span>
            ) : (
              <span>Document: {pdfData.fileName}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-30"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Burn & Export'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
