import React, { useRef, useEffect } from 'react';
import { NoteImageAttachment } from '../types/note';
import { renderBezierStroke } from '../utils/inkSmoothing';
import { PenTool, Crop, Trash2, Maximize2 } from 'lucide-react';

interface AnnotatedImageBlockProps {
  image: NoteImageAttachment;
  onEdit: (image: NoteImageAttachment, mode: 'annotate' | 'crop') => void;
  onDelete: (imageId: string) => void;
}

export const AnnotatedImageBlock: React.FC<AnnotatedImageBlockProps> = ({
  image,
  onEdit,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Redraw ink strokes onto canvas over the image
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const render = () => {
      const rect = img.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = img.clientWidth || rect.width || 400;
      const h = img.clientHeight || rect.height || 300;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Scale factor if natural dimensions differ from displayed dimensions
      const scaleX = w / (img.naturalWidth || w);
      const scaleY = h / (img.naturalHeight || h);

      if (image.strokes && image.strokes.length > 0) {
        image.strokes.forEach(stroke => {
          const scaledStroke = {
            ...stroke,
            width: stroke.width * scaleX,
            points: stroke.points.map(pt => ({
              ...pt,
              x: pt.x * scaleX,
              y: pt.y * scaleY,
            })),
          };
          renderBezierStroke(ctx, scaledStroke);
        });
      }
    };

    if (img.complete) {
      render();
    } else {
      img.onload = render;
    }

    window.addEventListener('resize', render);
    return () => window.removeEventListener('resize', render);
  }, [image.strokes, image.url]);

  return (
    <figure className="my-6 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs relative group select-none">
      {/* Top Action Hover Bar */}
      <div className="absolute top-5 right-5 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-xs p-1 rounded-xl shadow-lg">
        <button
          type="button"
          onClick={() => onEdit(image, 'annotate')}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white hover:bg-stone-700 rounded-lg transition-colors"
          title="Draw annotations directly on this image"
        >
          <PenTool className="w-3.5 h-3.5 text-blue-400" />
          <span>Draw</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(image, 'crop')}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white hover:bg-stone-700 rounded-lg transition-colors"
          title="Crop image boundaries"
        >
          <Crop className="w-3.5 h-3.5 text-amber-400" />
          <span>Crop</span>
        </button>

        <div className="w-px h-4 bg-stone-700" />

        <button
          type="button"
          onClick={() => onDelete(image.id)}
          className="p-1 text-stone-400 hover:text-red-400 rounded-lg hover:bg-stone-700 transition-colors"
          title="Delete image"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image & Overlaid Canvas Container */}
      <div
        className="relative inline-block max-w-full overflow-hidden rounded-xl bg-stone-100/60 cursor-pointer"
        onClick={() => onEdit(image, 'annotate')}
      >
        <img
          ref={imgRef}
          src={image.url}
          alt={image.caption || 'Note Figure'}
          className="max-h-[460px] w-auto max-w-full object-contain block mx-auto rounded-lg"
        />

        {/* Ink Annotation Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* Optional Caption */}
      {image.caption && (
        <figcaption className="mt-2.5 text-center text-xs text-stone-500 font-medium italic">
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
};
