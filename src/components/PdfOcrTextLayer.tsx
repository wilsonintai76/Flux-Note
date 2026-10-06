import React from 'react';
import { PDFOcrPageResult } from '../types/note';

interface PdfOcrTextLayerProps {
  ocrResult: PDFOcrPageResult | undefined;
  showOcrVisualBoxes: boolean;
}

export const PdfOcrTextLayer: React.FC<PdfOcrTextLayerProps> = ({
  ocrResult,
  showOcrVisualBoxes,
}) => {
  if (!ocrResult || !ocrResult.lines || ocrResult.lines.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 z-6 pointer-events-auto select-text overflow-hidden font-sans"
      style={{ userSelect: 'text' }}
    >
      {ocrResult.lines.map((line, idx) => (
        <span
          key={idx}
          className={`absolute whitespace-pre leading-none transition-colors select-text cursor-text ${
            showOcrVisualBoxes
              ? 'bg-blue-500/10 border border-blue-400/30 text-blue-900/40 hover:bg-blue-500/20'
              : 'text-transparent selection:bg-amber-300 selection:text-stone-900'
          }`}
          style={{
            left: `${line.x}px`,
            top: `${line.y}px`,
            width: `${line.width}px`,
            height: `${line.height}px`,
            fontSize: `${Math.max(11, Math.min(18, line.height * 0.78))}px`,
            display: 'flex',
            alignItems: 'center',
          }}
          title={showOcrVisualBoxes ? `OCR Recognized: "${line.text}"` : undefined}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
};
