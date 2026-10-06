import { Note, NotebookFolder } from '../types/note';
import { INITIAL_NOTES, DEFAULT_FOLDERS } from './sampleData';

const STORAGE_KEY_NOTES = 'folio_notes_store_v1';
const STORAGE_KEY_FOLDERS = 'folio_folders_store_v1';
const STORAGE_KEY_RECENTS = 'folio_recents_store_v1';

export class NoteStorageService {
  static getFolders(): NotebookFolder[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLDERS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed reading folders', e);
    }
    this.saveFolders(DEFAULT_FOLDERS);
    return DEFAULT_FOLDERS;
  }

  static saveFolders(folders: NotebookFolder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error('Failed saving folders', e);
    }
  }

  static getNotes(): Note[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTES);
      if (saved) {
        const parsed: Note[] = JSON.parse(saved);
        // Ensure sample note has transcript if from older seed
        const paxosNote = parsed.find(n => n.id === 'note-distributed-consensus');
        if (paxosNote && paxosNote.audioRecordings?.[0] && !paxosNote.audioRecordings[0].transcript) {
          const sample = INITIAL_NOTES.find(n => n.id === 'note-distributed-consensus');
          if (sample?.audioRecordings?.[0]?.transcript) {
            paxosNote.audioRecordings[0].transcript = sample.audioRecordings[0].transcript;
            paxosNote.audioRecordings[0].transcriptSegments = sample.audioRecordings[0].transcriptSegments;
          }
        }
        return this.updateScratchpadExpirations(parsed);
      }
    } catch (e) {
      console.error('Failed reading notes from storage', e);
    }
    // First load
    this.saveNotes(INITIAL_NOTES);
    return INITIAL_NOTES;
  }

  static saveNotes(notes: Note[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed writing notes to storage', e);
    }
  }

  static updateScratchpadExpirations(notes: Note[]): Note[] {
    const now = Date.now();
    let hasChanged = false;
    const updated = notes.map(note => {
      if (note.type === 'scratchpad' && note.scratchpadData && note.scratchpadData.expiresAt) {
        const isNowExpired = now > note.scratchpadData.expiresAt;
        if (note.scratchpadData.isExpired !== isNowExpired) {
          hasChanged = true;
          return {
            ...note,
            scratchpadData: {
              ...note.scratchpadData,
              isExpired: isNowExpired
            }
          };
        }
      }
      return note;
    });

    if (hasChanged) {
      try {
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    return updated;
  }

  static getRecentNoteIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RECENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static recordRecentAccess(noteId: string): void {
    try {
      const recents = this.getRecentNoteIds().filter(id => id !== noteId);
      recents.unshift(noteId);
      // Keep up to 20
      localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(recents.slice(0, 20)));
    } catch (e) {
      console.error(e);
    }
  }

  static exportNoteAsMarkdown(note: Note): string {
    let md = `# ${note.title}\n\n`;
    if (note.tags.length > 0) {
      md += `Tags: ${note.tags.map(t => `#${t}`).join(' ')}\n\n`;
    }
    md += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
    md += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n\n---\n\n`;

    if (note.type === 'page') {
      md += note.content;
      if (note.inlineInks && note.inlineInks.length > 0) {
        md += `\n\n*Note contains ${note.inlineInks.length} inline handwritten sketch block(s).*`;
      }
    } else if (note.type === 'canvas') {
      md += `## Canvas Nodes\n\n`;
      note.canvasNodes?.forEach((node, i) => {
        md += `### ${i + 1}. [${node.type.toUpperCase()}] ${node.title || 'Node'}\n${node.content}\n\n`;
      });
    } else if (note.type === 'research') {
      const r = note.researchData;
      if (r) {
        if (r.url) md += `**Source URL**: [${r.url}](${r.url})\n`;
        if (r.authors) md += `**Authors**: ${r.authors}\n`;
        if (r.sourceName) md += `**Publication**: ${r.sourceName}\n\n`;
        md += `### Key Takeaways\n`;
        r.keyTakeaways.forEach(t => md += `- ${t}\n`);
        md += `\n### Quotes\n`;
        r.quotes.forEach(q => {
          md += `> "${q.quote}"\n> — *${q.sourceNote || 'Citation'}* (${q.pageNumber || ''})\n\n`;
        });
        if (r.personalCritique) {
          md += `### Personal Synthesis & Critique\n${r.personalCritique}\n`;
        }
      }
    } else if (note.type === 'scratchpad') {
      md += note.content;
      if (note.scratchpadData?.expiresAt) {
        md += `\n\n*(Scratchpad expiry: ${new Date(note.scratchpadData.expiresAt).toLocaleString()})*`;
      }
    }
    return md;
  }

  static exportLibraryAsJSON(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      notes: this.getNotes(),
      folders: this.getFolders(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importLibraryFromJSON(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data.notes)) {
        return { success: false, count: 0, error: 'Invalid JSON format: missing notes array.' };
      }
      this.saveNotes(data.notes);
      if (Array.isArray(data.folders)) {
        this.saveFolders(data.folders);
      }
      return { success: true, count: data.notes.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Failed to parse JSON file' };
    }
  }

  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
