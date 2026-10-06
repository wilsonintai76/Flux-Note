import React, { useState, useRef } from 'react';
import { Note } from '../types/note';
import { NoteStorageService } from '../services/storage';
import { 
  Share2, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  Code, 
  Database, 
  Upload, 
  X 
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  note: Note;
  onClose: () => void;
  onImportLibrary: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  note,
  onClose,
  onImportLibrary,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const markdownContent = NoteStorageService.exportNoteAsMarkdown(note);
  const plainTextContent = `${note.title}\n\n${note.content}`;
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${note.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1c1917; }
    h1 { font-size: 2rem; border-bottom: 2px solid #e7e5e4; padding-bottom: 8px; }
    blockquote { border-left: 4px solid #f59e0b; margin: 16px 0; padding-left: 16px; color: #78716c; font-style: italic; }
    code { background: #f5f5f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <p><em>Exported from Folio Notes & Canvas on ${new Date().toLocaleDateString()}</em></p>
  <hr/>
  <pre style="white-space: pre-wrap; font-family: inherit;">${note.content}</pre>
</body>
</html>`;

  const copyToClipboard = (text: string, formatName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatName);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = (content: string, ext: string, mime: string) => {
    const filename = `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
    NoteStorageService.downloadFile(content, filename, mime);
  };

  const handleDownloadBackup = () => {
    const json = NoteStorageService.exportLibraryAsJSON();
    const filename = `folio-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    NoteStorageService.downloadFile(json, filename, 'application/json');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = NoteStorageService.importLibraryFromJSON(content);
      if (res.success) {
        onImportLibrary();
        onClose();
      } else {
        alert(res.error || 'Failed to import backup');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-stone-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Export Document & Workspace
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-stone-500">
            Export <span className="font-semibold text-stone-800">&quot;{note.title}&quot;</span> to common formats, or create a full portable workspace backup.
          </p>

          {/* Formats list */}
          <div className="space-y-2">
            {/* Markdown */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Markdown (.md)</h4>
                  <p className="text-[11px] text-stone-400">Headings, tags, wiki links & notes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(markdownContent, 'md')}
                  className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-md border border-stone-200 flex items-center gap-1"
                >
                  {copiedFormat === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFormat === 'md' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(markdownContent, 'md', 'text/markdown')}
                  className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-md border border-stone-200"
                  title="Download .md file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Plain text */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">Plain Text (.txt)</h4>
                  <p className="text-[11px] text-stone-400">Standard raw unformatted text</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(plainTextContent, 'txt')}
                  className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-md border border-stone-200 flex items-center gap-1"
                >
                  {copiedFormat === 'txt' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFormat === 'txt' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(plainTextContent, 'txt', 'text/plain')}
                  className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-md border border-stone-200"
                  title="Download .txt file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* HTML */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">HTML (.html)</h4>
                  <p className="text-[11px] text-stone-400">Standalone styled web page</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(htmlContent, 'html', 'text/html')}
                className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-md border border-stone-200 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Full Workspace Backup / Restore Section */}
          <div className="pt-4 border-t border-stone-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Full Workspace Backup
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="p-2.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 flex items-center justify-center gap-2 text-xs font-medium text-stone-800"
              >
                <Database className="w-4 h-4 text-stone-500" />
                <span>Export JSON Backup</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 flex items-center justify-center gap-2 text-xs font-medium text-stone-800"
              >
                <Upload className="w-4 h-4 text-stone-500" />
                <span>Import JSON Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
