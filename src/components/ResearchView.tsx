import React, { useState } from 'react';
import { Note, ResearchData, ResearchQuote, ResearchScreenshot } from '../types/note';
import { 
  BookOpen, 
  ExternalLink, 
  Quote, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Link,
  Edit3
} from 'lucide-react';

interface ResearchViewProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
  onNavigateToPdf?: (pdfTitle: string) => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({
  note,
  onUpdateNote,
  onNavigateToPdf,
}) => {
  const research: ResearchData = note.researchData || {
    url: '',
    sourceName: '',
    authors: '',
    keyTakeaways: [],
    quotes: [],
    screenshots: [],
    personalCritique: '',
  };

  const [newTakeaway, setNewTakeaway] = useState('');
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteSource, setNewQuoteSource] = useState('');
  const [newQuotePage, setNewQuotePage] = useState('');
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageTitle, setNewImageTitle] = useState('');
  const [showAddImage, setShowAddImage] = useState(false);

  const updateResearch = (updates: Partial<ResearchData>) => {
    const updatedData: ResearchData = {
      ...research,
      ...updates,
    };

    onUpdateNote({
      ...note,
      updatedAt: Date.now(),
      researchData: updatedData,
    });
  };

  const addTakeaway = () => {
    if (!newTakeaway.trim()) return;
    updateResearch({
      keyTakeaways: [...research.keyTakeaways, newTakeaway.trim()],
    });
    setNewTakeaway('');
  };

  const removeTakeaway = (index: number) => {
    updateResearch({
      keyTakeaways: research.keyTakeaways.filter((_, i) => i !== index),
    });
  };

  const addQuote = () => {
    if (!newQuoteText.trim()) return;
    const quoteItem: ResearchQuote = {
      id: 'quote-' + Date.now(),
      quote: newQuoteText.trim(),
      sourceNote: newQuoteSource.trim() || undefined,
      pageNumber: newQuotePage.trim() || undefined,
      color: '#fef08a',
    };
    updateResearch({
      quotes: [...research.quotes, quoteItem],
    });
    setNewQuoteText('');
    setNewQuoteSource('');
    setNewQuotePage('');
    setShowAddQuote(false);
  };

  const removeQuote = (id: string) => {
    updateResearch({
      quotes: research.quotes.filter(q => q.id !== id),
    });
  };

  const addScreenshot = () => {
    if (!newImageUrl.trim()) return;
    const screenshot: ResearchScreenshot = {
      id: 'ss-' + Date.now(),
      title: newImageTitle.trim() || 'Figure / Clipping',
      imageUrl: newImageUrl.trim(),
    };
    updateResearch({
      screenshots: [...research.screenshots, screenshot],
    });
    setNewImageUrl('');
    setNewImageTitle('');
    setShowAddImage(false);
  };

  const removeScreenshot = (id: string) => {
    updateResearch({
      screenshots: research.screenshots.filter(s => s.id !== id),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 md:px-20 lg:px-28 bg-[#faf9f6]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Title */}
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Research & Literature Note</span>
          </div>
          <input
            type="text"
            value={note.title}
            onChange={(e) => onUpdateNote({ ...note, title: e.target.value, updatedAt: Date.now() })}
            placeholder="Paper or Article Title"
            className="w-full text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 bg-transparent border-none focus:outline-none font-serif"
          />
        </div>

        {/* Source Citation & Metadata Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Source URL / DOI
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={research.url || ''}
                  onChange={(e) => updateResearch({ url: e.target.value })}
                  placeholder="https://arxiv.org/abs/..."
                  className="flex-1 text-xs p-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none"
                />
                {research.url && (
                  <a
                    href={research.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Publication / Journal / Conference
              </label>
              <input
                type="text"
                value={research.sourceName || ''}
                onChange={(e) => updateResearch({ sourceName: e.target.value })}
                placeholder="e.g. NeurIPS 2023, Nature, IEEE"
                className="w-full text-xs p-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Authors / Research Group
              </label>
              <input
                type="text"
                value={research.authors || ''}
                onChange={(e) => updateResearch({ authors: e.target.value })}
                placeholder="e.g. Vaswani et al., DeepMind"
                className="w-full text-xs p-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                Publication Date / Revision
              </label>
              <input
                type="text"
                value={research.publicationDate || ''}
                onChange={(e) => updateResearch({ publicationDate: e.target.value })}
                placeholder="e.g. Oct 2023"
                className="w-full text-xs p-2 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Key Takeaways Section */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Key Takeaways ({research.keyTakeaways.length})
              </h3>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {research.keyTakeaways.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-stone-50 group">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs font-medium text-stone-800 leading-relaxed">{item}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTakeaway(idx)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTakeaway}
              onChange={(e) => setNewTakeaway(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTakeaway()}
              placeholder="Add key finding or synthesis point..."
              className="flex-1 text-xs p-2.5 rounded-lg border border-stone-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={addTakeaway}
              className="px-3.5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Collected Quotes Section */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Curated Quotes & Excerpts ({research.quotes.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddQuote(true)}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Quote</span>
            </button>
          </div>

          {showAddQuote && (
            <div className="p-4 mb-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
              <textarea
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="Paste the exact quoted text from the paper or book..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-stone-200 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newQuoteSource}
                  onChange={(e) => setNewQuoteSource(e.target.value)}
                  placeholder="Section or chapter (e.g. Sec 3.2)"
                  className="text-xs p-2 rounded-lg bg-white border border-stone-200 focus:outline-none"
                />
                <input
                  type="text"
                  value={newQuotePage}
                  onChange={(e) => setNewQuotePage(e.target.value)}
                  placeholder="Page number (e.g. Page 14)"
                  className="text-xs p-2 rounded-lg bg-white border border-stone-200 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuote(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addQuote}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-xs"
                >
                  Save Quote
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {research.quotes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/40 relative group"
              >
                <p className="text-xs font-serif italic text-stone-800 leading-relaxed mb-2">
                  &ldquo;{q.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span>
                    {q.sourceNote ? `${q.sourceNote} ` : ''}
                    {q.pageNumber ? `(${q.pageNumber})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuote(q.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Figures, Screenshots & Diagrams */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Figures & Screenshots ({research.screenshots.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddImage(true)}
              className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Figure</span>
            </button>
          </div>

          {showAddImage && (
            <div className="p-4 mb-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
              <input
                type="text"
                value={newImageTitle}
                onChange={(e) => setNewImageTitle(e.target.value)}
                placeholder="Figure title or caption"
                className="w-full text-xs p-2 rounded-lg bg-white border border-stone-200 focus:outline-none"
              />
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Image URL or screenshot link (https://...)"
                className="w-full text-xs p-2 rounded-lg bg-white border border-stone-200 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddImage(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addScreenshot}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Add Image
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {research.screenshots.map((sc) => (
              <div
                key={sc.id}
                className="group relative rounded-xl border border-stone-200 overflow-hidden bg-stone-50"
              >
                <img
                  src={sc.imageUrl}
                  alt={sc.title || 'Screenshot'}
                  className="w-full h-44 object-cover"
                />
                <div className="p-3 bg-white">
                  <h4 className="text-xs font-semibold text-stone-900 truncate">{sc.title}</h4>
                  {sc.caption && <p className="text-[11px] text-stone-500 line-clamp-1">{sc.caption}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeScreenshot(sc.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Synthesis & Critique Notes */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Edit3 className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
              Personal Synthesis & Critique
            </h3>
          </div>
          <p className="text-xs text-stone-400 mb-2">
            Connect findings with your existing mental model, note limitations, and link with other notes via [[Note Title]].
          </p>
          <textarea
            value={research.personalCritique || ''}
            onChange={(e) => updateResearch({ personalCritique: e.target.value })}
            placeholder="What are the main implications? Where does the authors' methodology fall short? How does this connect to our project?"
            rows={5}
            className="w-full text-xs leading-relaxed p-3.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans"
          />
        </div>
      </div>
    </div>
  );
};
