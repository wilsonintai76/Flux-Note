import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link2,
  Table,
  Minus,
  Eye,
  Edit3,
  Columns,
  PenTool,
  Plus,
  Highlighter,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export type EditorViewMode = 'edit' | 'preview' | 'split';

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onContentChange: (newContent: string) => void;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  onOpenBacklinkCreator: () => void;
  onAddInlineInk: () => void;
  isOverlayInkActive: boolean;
  onToggleOverlayInk: () => void;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  textareaRef,
  content,
  onContentChange,
  viewMode,
  onViewModeChange,
  onOpenBacklinkCreator,
  onAddInlineInk,
  isOverlayInkActive,
  onToggleOverlayInk,
}) => {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);

  // Helper to wrap or insert text around current selection
  const formatSelection = (
    prefix: string,
    suffix: string = prefix,
    defaultText: string = 'text'
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);

    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${defaultText}${suffix}`;
    const newContent = before + replacement + after;
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = start + prefix.length + (selected ? selected.length : defaultText.length);
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 10);
  };

  // Helper to prefix lines (e.g. lists, headings, quotes)
  const formatLines = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);

    // Find the start of the line containing the selection
    const lastNewlineBefore = before.lastIndexOf('\n');
    const lineStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
    const fullPrefix = content.slice(0, lineStart);
    const affectedLines = content.slice(lineStart, end).split('\n');

    let isNumbered = prefix === '1. ';
    const modifiedLines = affectedLines.map((line, idx) => {
      // If line already has prefix, remove it (toggle behavior)
      if (line.startsWith(prefix)) {
        return line.slice(prefix.length);
      }
      if (isNumbered) {
        return `${idx + 1}. ${line}`;
      }
      return `${prefix}${line}`;
    });

    const newContent = fullPrefix + modifiedLines.join('\n') + after;
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
    }, 10);
  };

  const insertTable = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Item 1 | Details | Value |\n| Item 2 | Details | Value |\n`;

    const newContent = before + tableTemplate + after;
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
    }, 10);
  };

  const insertDivider = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const newContent = before + `\n\n---\n\n` + after;
    onContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
    }, 10);
  };

  return (
    <div className="sticky top-0 z-20 mb-4 bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-2xl p-1.5 shadow-sm flex items-center justify-between gap-1 flex-wrap select-none">
      {/* Primary Rich Formatting Controls */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {/* Headings dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            title="Headings"
            className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <span>H</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {showHeadingMenu && (
            <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-stone-200 py-1 w-36 animate-in fade-in">
              <button
                type="button"
                onClick={() => { formatLines('# '); setShowHeadingMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
              >
                <Heading1 className="w-4 h-4 text-stone-500" />
                <span>Heading 1</span>
              </button>
              <button
                type="button"
                onClick={() => { formatLines('## '); setShowHeadingMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
              >
                <Heading2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Heading 2</span>
              </button>
              <button
                type="button"
                onClick={() => { formatLines('### '); setShowHeadingMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-2"
              >
                <Heading3 className="w-3 h-3 text-stone-500" />
                <span>Heading 3</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-stone-200 mx-1" />

        {/* Inline text styling */}
        <button
          type="button"
          onClick={() => formatSelection('**', '**', 'bold text')}
          title="Bold (Cmd+B)"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatSelection('*', '*', 'italic text')}
          title="Italic (Cmd+I)"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatSelection('<u>', '</u>', 'underlined text')}
          title="Underline (Cmd+U)"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatSelection('~~', '~~', 'strikethrough')}
          title="Strikethrough"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatSelection('==', '==', 'highlighted text')}
          title="Highlight Text"
          className="p-1.5 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-50 transition-colors"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1" />

        {/* Lists & Tasks */}
        <button
          type="button"
          onClick={() => formatLines('- ')}
          title="Bullet List"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatLines('1. ')}
          title="Numbered List"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatLines('- [ ] ')}
          title="Task Checklist"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1" />

        {/* Code & Quote */}
        <button
          type="button"
          onClick={() => formatSelection('`', '`', 'code')}
          title="Inline Code"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => formatLines('> ')}
          title="Quote Block"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={insertTable}
          title="Insert Table"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors hidden sm:inline-flex"
        >
          <Table className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={insertDivider}
          title="Horizontal Divider"
          className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors hidden sm:inline-flex"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-stone-200 mx-1" />

        {/* PROMINENT BACKLINK CREATOR BUTTON */}
        <button
          type="button"
          onClick={onOpenBacklinkCreator}
          title="Link Note / Create Backlink (Cmd+K)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 transition-all shadow-2xs hover:shadow-xs group"
        >
          <Link2 className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
          <span>Link Note</span>
        </button>
      </div>

      {/* View Mode & Handwriting toggles */}
      <div className="flex items-center gap-1">
        {/* Quick handwriting block trigger */}
        <button
          type="button"
          onClick={onAddInlineInk}
          title="Add Handwritten Block in text flow"
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors hidden md:flex items-center gap-1 text-xs font-medium"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Draw Block</span>
        </button>

        {/* View Mode Switcher: Edit / Preview / Split */}
        <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200/70">
          <button
            type="button"
            onClick={() => onViewModeChange('edit')}
            title="Edit Markdown"
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'edit'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('preview')}
            title="Preview Formatted & Backlinks"
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'preview'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('split')}
            title="Split Edit & Preview"
            className={`px-2 py-1 rounded-lg text-xs font-medium hidden lg:flex items-center gap-1 transition-all ${
              viewMode === 'split'
                ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Split</span>
          </button>
        </div>
      </div>
    </div>
  );
};
