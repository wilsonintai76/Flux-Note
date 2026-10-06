import React from 'react';
import { Note } from '../types/note';
import {
  Link2,
  ExternalLink,
  CheckSquare,
  Square,
  FileText,
  LayoutGrid,
  BookOpen,
  FileCheck,
  Flame,
  ArrowRight
} from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
  allNotes: Note[];
  onNavigateToNote: (title: string) => void;
  onToggleTask?: (taskLineIndex: number) => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  allNotes,
  onNavigateToNote,
  onToggleTask,
}) => {
  const getNoteIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3.5 h-3.5 text-purple-600 inline mr-1" />;
      case 'research': return <BookOpen className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />;
      case 'pdf': return <FileCheck className="w-3.5 h-3.5 text-red-500 inline mr-1" />;
      case 'scratchpad': return <Flame className="w-3.5 h-3.5 text-amber-500 inline mr-1" />;
      default: return <FileText className="w-3.5 h-3.5 text-blue-600 inline mr-1" />;
    }
  };

  // Render inline formatting: **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, ==highlight==, and [[Wiki Links]]
  const renderInline = (text: string) => {
    // Regex matches [[WikiLink]] or standard markdown formatting tokens
    const tokens = text.split(/(\[\[.*?\]\]|\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|~~.*?~~|==.*?==|`.*?`)/g);

    return tokens.map((token, idx) => {
      // 1. Wiki Backlinks: [[Title]] or [[Title|Label]]
      if (token.startsWith('[[') && token.endsWith(']]')) {
        const raw = token.slice(2, -2);
        const [targetTitle, customLabel] = raw.split('|');
        const cleanTitle = targetTitle.trim();
        const displayLabel = customLabel ? customLabel.trim() : cleanTitle;
        const targetObj = allNotes.find(n => n.title.toLowerCase() === cleanTitle.toLowerCase());

        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNavigateToNote(cleanTitle);
            }}
            title={`Navigate to "${cleanTitle}"`}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer align-baseline group"
          >
            <Link2 className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
            {targetObj && getNoteIcon(targetObj.type)}
            <span className="underline decoration-amber-300 underline-offset-2">{displayLabel}</span>
            <ArrowRight className="w-2.5 h-2.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        );
      }

      // 2. Bold
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={idx} className="font-bold text-stone-900">{token.slice(2, -2)}</strong>;
      }

      // 3. Italic
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={idx} className="italic text-stone-800">{token.slice(1, -1)}</em>;
      }

      // 4. Underline
      if (token.startsWith('<u>') && token.endsWith('</u>')) {
        return <span key={idx} className="underline underline-offset-2">{token.slice(3, -4)}</span>;
      }

      // 5. Strikethrough
      if (token.startsWith('~~') && token.endsWith('~~')) {
        return <del key={idx} className="line-through text-stone-400">{token.slice(2, -2)}</del>;
      }

      // 6. Highlight
      if (token.startsWith('==') && token.endsWith('==')) {
        return <mark key={idx} className="bg-amber-200/80 px-1 py-0.2 rounded text-stone-900 font-medium">{token.slice(2, -2)}</mark>;
      }

      // 7. Inline code
      if (token.startsWith('`') && token.endsWith('`')) {
        return <code key={idx} className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 font-mono text-[13px] border border-stone-200/60">{token.slice(1, -1)}</code>;
      }

      return token;
    });
  };

  // Split lines and parse blocks
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        renderedElements.push(
          <pre key={`code-${i}`} className="p-3 my-3 rounded-xl bg-stone-900 text-stone-100 font-mono text-xs overflow-x-auto border border-stone-800">
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      renderedElements.push(<hr key={i} className="my-6 border-stone-200" />);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={i} className="text-2xl font-bold tracking-tight text-stone-900 mt-6 mb-2">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={i} className="text-xl font-bold tracking-tight text-stone-800 mt-5 mb-2 pb-1 border-b border-stone-100">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={i} className="text-base font-bold text-stone-800 mt-4 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      renderedElements.push(
        <blockquote key={i} className="pl-4 my-2 border-l-3 border-amber-400 text-stone-600 italic text-sm">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Checkbox / Tasks (- [ ] or - [x])
    const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const taskText = taskMatch[3];
      renderedElements.push(
        <div
          key={i}
          onClick={() => onToggleTask && onToggleTask(i)}
          className="flex items-start gap-2.5 my-1 text-sm cursor-pointer group select-none py-0.5"
        >
          <div className="mt-0.5 shrink-0 text-stone-400 group-hover:text-amber-600">
            {isChecked ? (
              <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-50" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </div>
          <span className={isChecked ? 'line-through text-stone-400' : 'text-stone-800'}>
            {renderInline(taskText)}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List (- item or * item)
    if (line.match(/^(\s*)[-*]\s+(.*)$/)) {
      const match = line.match(/^(\s*)[-*]\s+(.*)$/)!;
      renderedElements.push(
        <div key={i} className="flex items-start gap-2 my-1 text-sm pl-2">
          <span className="text-stone-400 mt-1 text-xs">•</span>
          <span className="text-stone-800">{renderInline(match[2])}</span>
        </div>
      );
      continue;
    }

    // Numbered List (1. item)
    if (line.match(/^(\s*)(\d+)\.\s+(.*)$/)) {
      const match = line.match(/^(\s*)(\d+)\.\s+(.*)$/)!;
      renderedElements.push(
        <div key={i} className="flex items-start gap-2 my-1 text-sm pl-2">
          <span className="text-stone-400 font-mono text-xs mt-0.5 shrink-0">{match[2]}.</span>
          <span className="text-stone-800">{renderInline(match[3])}</span>
        </div>
      );
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Render simple table rows
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isDivider = cells.every(c => c.trim().match(/^-+$/));
      if (!isDivider) {
        renderedElements.push(
          <div key={i} className="flex items-center border-b border-stone-200 text-xs py-1.5 px-2 bg-stone-50/50">
            {cells.map((cell, cIdx) => (
              <div key={cIdx} className="flex-1 font-medium text-stone-700">
                {renderInline(cell.trim())}
              </div>
            ))}
          </div>
        );
      }
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      renderedElements.push(<div key={i} className="h-3" />);
      continue;
    }

    // Standard Paragraph
    renderedElements.push(
      <p key={i} className="my-1.5 text-base leading-relaxed text-stone-800">
        {renderInline(line)}
      </p>
    );
  }

  return (
    <div className="prose prose-stone max-w-none min-h-[360px] pb-4">
      {renderedElements}
    </div>
  );
};
