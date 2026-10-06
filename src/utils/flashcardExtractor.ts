import { Note, Flashcard } from '../types/note';
import { extractKeyTermsFromDocument } from './keyTermsExtractor';

export class FlashcardExtractor {
  // Extract or generate flashcards from note content, PDF, or research data
  static extractFlashcardsFromNote(note: Note): Flashcard[] {
    const cards: Flashcard[] = [];
    const now = Date.now();

    // 1. Existing stored flashcards
    if (note.flashcards && note.flashcards.length > 0) {
      return note.flashcards;
    }

    // 2. Extract from PDF key terms
    if (note.type === 'pdf' && note.pdfData) {
      const keyTerms = extractKeyTermsFromDocument(
        note.pdfData.activeTemplateId,
        note.pdfData.pageTexts,
        note.pdfData.totalPages
      );
      keyTerms.forEach((kt, idx) => {
        cards.push({
          id: `fc-pdf-${note.id}-${idx}`,
          question: kt.term,
          answer: kt.snippet,
          category: kt.category === 'heading' ? 'concept' : kt.category,
          source: 'extracted_term',
          sourcePage: kt.page,
          createdAt: now - idx * 1000,
        });
      });
    }

    // 3. Extract from Research Data (quotes & takeaways)
    if (note.type === 'research' && note.researchData) {
      const rd = note.researchData;
      rd.keyTakeaways.forEach((kt, idx) => {
        cards.push({
          id: `fc-res-kt-${note.id}-${idx}`,
          question: `Key Takeaway #${idx + 1} (${rd.sourceName || 'Research'})`,
          answer: kt,
          category: 'concept',
          source: 'extracted_term',
          createdAt: now - idx * 1000,
        });
      });

      rd.quotes.forEach((q, idx) => {
        cards.push({
          id: `fc-res-q-${note.id}-${idx}`,
          question: `Quote Citation: ${q.sourceNote || 'Paper Citation'} (${q.pageNumber || 'p. 1'})`,
          answer: `"${q.quote}"`,
          category: 'definition',
          source: 'extracted_term',
          createdAt: now - idx * 1000,
        });
      });
    }

    // 4. Extract from Markdown Content (parsing definitions, Q&A lines, and bold term patterns)
    if (note.content) {
      const lines = note.content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();

        // Pattern A: Q: ... A: ...
        const qaMatch = trimmed.match(/^q:\s*(.+?)\s*a:\s*(.+)$/i);
        if (qaMatch) {
          cards.push({
            id: `fc-qa-${note.id}-${idx}`,
            question: qaMatch[1].trim(),
            answer: qaMatch[2].trim(),
            category: 'concept',
            source: 'extracted_qa',
            createdAt: now - idx * 1000,
          });
          return;
        }

        // Pattern B: **Term**: Definition or - **Term**: Definition
        const termDefMatch = trimmed.match(/^(?:[-*]\s*)?\*\*(.+?)\*\*\s*[:–—-]\s*(.+)$/);
        if (termDefMatch) {
          const term = termDefMatch[1].trim();
          const def = termDefMatch[2].trim();
          if (term.length > 2 && def.length > 5) {
            cards.push({
              id: `fc-td-${note.id}-${idx}`,
              question: term,
              answer: def,
              category: term.toLowerCase().includes('theorem') ? 'theorem' : 'definition',
              source: 'extracted_term',
              createdAt: now - idx * 1000,
            });
          }
          return;
        }

        // Pattern C: # Headers with subsequent text
        const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
        if (headerMatch && lines[idx + 1] && lines[idx + 1].trim().length > 10) {
          const header = headerMatch[1].replace(/^[0-9.]+\s*/, '').trim();
          const nextText = lines[idx + 1].trim();
          if (!cards.some(c => c.question.toLowerCase() === header.toLowerCase())) {
            cards.push({
              id: `fc-hdr-${note.id}-${idx}`,
              question: `Explain: ${header}`,
              answer: nextText,
              category: 'concept',
              source: 'extracted_term',
              createdAt: now - idx * 1000,
            });
          }
        }
      });
    }

    // Fallback seed cards if note is empty
    if (cards.length === 0) {
      cards.push(
        {
          id: `fc-seed-1-${note.id}`,
          question: `What is the core topic of "${note.title}"?`,
          answer: note.content ? note.content.slice(0, 180) + '...' : `Summary and key concepts for ${note.title}.`,
          category: 'concept',
          source: 'manual',
          createdAt: now,
        },
        {
          id: `fc-seed-2-${note.id}`,
          question: 'How do you apply this concept in problem solving?',
          answer: 'Identify primary invariants, break down into initial conditions, and verify step-by-step.',
          category: 'problem',
          source: 'manual',
          createdAt: now - 1000,
        }
      );
    }

    return cards;
  }
}
