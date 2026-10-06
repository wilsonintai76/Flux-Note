import React, { useState, useEffect } from 'react';
import { Note, Flashcard } from '../types/note';
import { FlashcardExtractor } from '../utils/flashcardExtractor';
import { 
  Sparkles, 
  RotateCw, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Layers, 
  Shuffle, 
  Edit3, 
  Award, 
  Clock, 
  Brain,
  FileCheck,
  Eye,
  RefreshCw
} from 'lucide-react';

interface FlashcardViewProps {
  note: Note;
  onUpdateNote: (updatedNote: Note) => void;
  onClose: () => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  note,
  onUpdateNote,
  onClose,
}) => {
  const [deck, setDeck] = useState<Flashcard[]>(() => 
    FlashcardExtractor.extractFlashcardsFromNote(note)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [viewMode, setViewMode] = useState<'study' | 'deck_list' | 'summary'>('study');
  
  // Track study session ratings
  const [sessionRatings, setSessionRatings] = useState<Record<string, 'easy' | 'medium' | 'hard'>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  // New card modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState<Flashcard['category']>('concept');

  const currentCard = deck[currentIndex] || deck[0];

  // Save deck to note whenever updated
  const saveDeckToNote = (updatedDeck: Flashcard[]) => {
    setDeck(updatedDeck);
    onUpdateNote({
      ...note,
      flashcards: updatedDeck,
      updatedAt: Date.now(),
    });
  };

  // Keyboard navigation (Space/Enter to flip, Left/Right arrows to navigate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddModal) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        handlePrevCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, deck.length, showAddModal]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setViewMode('summary');
      setIsCompleted(true);
    }
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRateCard = (rating: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;
    const updatedRatings = { ...sessionRatings, [currentCard.id]: rating };
    setSessionRatings(updatedRatings);

    // Update mastery in card object
    const updatedDeck = deck.map(c => {
      if (c.id === currentCard.id) {
        return {
          ...c,
          easeRating: rating,
          lastReviewedAt: Date.now(),
          masteryLevel: rating === 'easy' ? 5 : rating === 'medium' ? 3 : 1,
        };
      }
      return c;
    });

    saveDeckToNote(updatedDeck);
    handleNextCard();
  };

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newCard: Flashcard = {
      id: `fc-manual-${Date.now()}`,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
      category: newCategory,
      source: 'manual',
      createdAt: Date.now(),
    };

    const updated = [...deck, newCard];
    saveDeckToNote(updated);
    setNewQuestion('');
    setNewAnswer('');
    setShowAddModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = deck.filter(c => c.id !== cardId);
    saveDeckToNote(updated);
    if (currentIndex >= updated.length && currentIndex > 0) {
      setCurrentIndex(updated.length - 1);
    }
  };

  const getCategoryColor = (cat?: Flashcard['category']) => {
    switch (cat) {
      case 'theorem': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'definition': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'problem': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'formula': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const ratingsCount = {
    easy: Object.values(sessionRatings).filter(r => r === 'easy').length,
    medium: Object.values(sessionRatings).filter(r => r === 'medium').length,
    hard: Object.values(sessionRatings).filter(r => r === 'hard').length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-[#faf9f6] rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shadow-2xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Flashcard Study Mode
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {deck.length} Card{deck.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate max-w-md">
                Note: {note.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switches */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1 border border-stone-200">
              <button
                type="button"
                onClick={() => setViewMode('study')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'study' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Study Mode
              </button>

              <button
                type="button"
                onClick={() => setViewMode('deck_list')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'deck_list' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Deck List ({deck.length})
              </button>
            </div>

            <button
              type="button"
              onClick={handleShuffle}
              className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Shuffle Deck"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Card</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STUDY MODE VIEW */}
        {viewMode === 'study' && currentCard && (
          <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto justify-between space-y-6">
            {/* Progress Ribbon */}
            <div className="space-y-1.5 max-w-2xl mx-auto w-full">
              <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
                <span>Card {currentIndex + 1} of {deck.length}</span>
                <span className="font-mono text-[11px] text-amber-800 font-bold">
                  {Math.round(((currentIndex + 1) / deck.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 3D Flip Flashcard */}
            <div className="max-w-2xl w-full mx-auto my-auto min-h-[300px] sm:min-h-[340px] perspective-[1000px] cursor-pointer" onClick={handleFlip}>
              <div className={`relative w-full h-full min-h-[300px] sm:min-h-[340px] transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}>
                {/* FRONT SIDE (QUESTION) */}
                <div className="absolute inset-0 backface-hidden bg-white rounded-3xl p-6 sm:p-10 border-2 border-stone-200/90 shadow-lg hover:border-amber-300 transition-all flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getCategoryColor(currentCard.category)}`}>
                      {currentCard.category || 'concept'}
                    </span>

                    {currentCard.sourcePage && (
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                        Page {currentCard.sourcePage}
                      </span>
                    )}
                  </div>

                  <div className="my-auto py-6 text-center space-y-3">
                    <span className="text-xs font-bold uppercase font-mono tracking-widest text-stone-400 block">
                      Question / Term
                    </span>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 leading-snug">
                      {currentCard.question}
                    </h2>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-400 pt-4 border-t border-stone-100">
                    <span className="flex items-center gap-1 text-stone-500 font-medium">
                      <Eye className="w-3.5 h-3.5 text-amber-500" />
                      Click or press <kbd className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">Space</kbd> to reveal answer
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">Front Side</span>
                  </div>
                </div>

                {/* BACK SIDE (ANSWER) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-stone-900 text-white rounded-3xl p-6 sm:p-10 border-2 border-stone-800 shadow-xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-stone-950">
                      Answer / Definition
                    </span>
                    <span className="text-xs font-mono text-stone-400">
                      {currentCard.category || 'definition'}
                    </span>
                  </div>

                  <div className="my-auto py-6 text-center space-y-3">
                    <span className="text-[11px] font-bold uppercase font-mono tracking-widest text-stone-400 block">
                      {currentCard.question}
                    </span>
                    <p className="text-lg sm:text-xl font-sans font-medium text-stone-100 leading-relaxed max-h-[180px] overflow-y-auto px-2">
                      {currentCard.answer}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-400 pt-4 border-t border-stone-800">
                    <span className="text-amber-300 font-medium">Rate difficulty below to progress</span>
                    <span className="font-mono text-[10px]">Back Side</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={currentIndex === 0}
                  className="p-2.5 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  title="Previous Card (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleFlip}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-stone-800 text-xs font-bold hover:bg-stone-100 shadow-2xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span>{isFlipped ? 'Show Question' : 'Flip Card'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextCard}
                  className="p-2.5 rounded-2xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 shadow-2xs"
                  title="Next Card (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Spaced Repetition Self-Assessment (When flipped or active) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500 font-semibold mr-1 hidden sm:inline">Recall:</span>
                <button
                  type="button"
                  onClick={() => handleRateCard('hard')}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all"
                >
                  🔴 Hard
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard('medium')}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-all"
                >
                  🟡 Medium
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard('easy')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition-all"
                >
                  🟢 Easy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DECK LIST VIEW */}
        {viewMode === 'deck_list' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  All Flashcards in Deck ({deck.length})
                </h4>
                <p className="text-xs text-stone-500">
                  Review, edit, or delete card items extracted from document notes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {deck.map((card, idx) => (
                <div
                  key={card.id}
                  className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getCategoryColor(card.category)}`}>
                        {card.category || 'concept'}
                      </span>
                      <div className="flex items-center gap-2">
                        {card.easeRating && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            card.easeRating === 'easy' ? 'bg-emerald-100 text-emerald-800' : card.easeRating === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {card.easeRating}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h5 className="text-xs font-bold text-stone-900 mb-1">
                      {card.question}
                    </h5>
                    <p className="text-xs text-stone-600 line-clamp-3 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      {card.answer}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                    <span>Source: {card.source || 'extracted'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setViewMode('study');
                        setIsFlipped(false);
                      }}
                      className="text-amber-800 font-bold hover:underline"
                    >
                      Study Card →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SESSION SUMMARY VIEW */}
        {viewMode === 'summary' && (
          <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-md">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-serif font-bold text-stone-900">
                Deck Session Completed!
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                You reviewed all {deck.length} flashcards in "{note.title}".
              </p>
            </div>

            {/* Ratings Breakdown */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Easy / Mastered</span>
                <span className="text-xl font-bold text-emerald-900">{ratingsCount.easy}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Medium</span>
                <span className="text-xl font-bold text-amber-900">{ratingsCount.medium}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Needs Review</span>
                <span className="text-xl font-bold text-rose-900">{ratingsCount.hard}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setViewMode('study');
                }}
                className="flex-1 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Restart Deck
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold shadow-2xs"
              >
                Back to Note
              </button>
            </div>
          </div>
        )}

        {/* ADD FLASHCARD MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-stone-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-900">Add Custom Flashcard</h4>
                <button type="button" onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCard} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Question / Term
                  </label>
                  <input
                    type="text"
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. What is the Gram-Schmidt process?"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Answer / Definition
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="e.g. An algorithm for orthogonalizing a set of vectors in an inner product space..."
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white"
                  >
                    <option value="concept">Concept</option>
                    <option value="definition">Definition</option>
                    <option value="theorem">Theorem</option>
                    <option value="formula">Formula</option>
                    <option value="problem">Problem</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs"
                  >
                    Save Flashcard
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
