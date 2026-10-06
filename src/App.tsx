import React, { useState, useEffect, useCallback } from 'react';
import { Note, NotebookFolder, NoteType, ViewFilter, VersionSnapshot } from './types/note';
import { AuthState, UserProfile } from './types/auth';
import { NoteStorageService } from './services/storage';
import { authService } from './services/authService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { PageNoteEditor } from './components/PageNoteEditor';
import { CanvasEditor } from './components/CanvasEditor';
import { ResearchView } from './components/ResearchView';
import { PdfAnnotator } from './components/PdfAnnotator';
import { ScratchpadView } from './components/ScratchpadView';
import { QuickSwitcher } from './components/QuickSwitcher';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { ExportModal } from './components/ExportModal';
import { SyncManagerModal } from './components/SyncManagerModal';
import { VaultLockModal } from './components/VaultLockModal';
import { LandingPage } from './components/LandingPage';
import { FlashcardView } from './components/FlashcardView';
import { GlobalQuickCaptureBar } from './components/GlobalQuickCaptureBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { syncService } from './services/syncService';
import { handwritingIndexService } from './services/handwritingIndexService';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => NoteStorageService.getNotes());
  const [folders, setFolders] = useState<NotebookFolder[]>(() => NoteStorageService.getFolders());
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
  
  // Navigation & View state
  const [activeView, setActiveView] = useState<ViewFilter>('home');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  
  // Tabs for lightning fast switching
  const [openTabs, setOpenTabs] = useState<Note[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Modals
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSyncManagerOpen, setIsSyncManagerOpen] = useState(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);

  // Subscribe to auth service state
  useEffect(() => {
    return authService.subscribe((state) => {
      setAuthState(state);
    });
  }, []);

  // Initialize sync service and auto-index handwriting ink notes
  useEffect(() => {
    syncService.init();
    handwritingIndexService.indexAllNotes(notes).then(({ updatedNotes, indexedCount }) => {
      if (indexedCount > 0) {
        setNotes(updatedNotes);
        NoteStorageService.saveNotes(updatedNotes);
      }
    });
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Sync notes to storage whenever updated
  const syncNotes = useCallback((newNotes: Note[]) => {
    setNotes(newNotes);
    NoteStorageService.saveNotes(newNotes);
  }, []);

  // Update a single note
  const handleUpdateNote = useCallback((updatedNote: Note) => {
    // Asynchronously index handwriting strokes if present
    handwritingIndexService.indexNoteHandwriting(updatedNote).then((indexedNote) => {
      setNotes(prevNotes => {
        const prevNote = prevNotes.find(n => n.id === indexedNote.id);
        const nextNotes = prevNotes.map(n => (n.id === indexedNote.id ? indexedNote : n));
        NoteStorageService.saveNotes(nextNotes);
        syncService.recordLocalNoteChange(indexedNote, 'update', prevNote);
        return nextNotes;
      });

      if (activeNote?.id === indexedNote.id) {
        setActiveNote(indexedNote);
      }

      setOpenTabs(prevTabs =>
        prevTabs.map(t => (t.id === indexedNote.id ? indexedNote : t))
      );
    });
  }, [activeNote]);

  // Open note
  const handleSelectNote = useCallback((note: Note) => {
    setActiveNote(note);
    NoteStorageService.recordRecentAccess(note.id);

    // Add to open tabs if not already open
    setOpenTabs(prev => {
      if (prev.some(t => t.id === note.id)) return prev;
      return [...prev, note];
    });
  }, []);

  // Close tab
  const handleCloseTab = (noteId: string) => {
    const nextTabs = openTabs.filter(t => t.id !== noteId);
    setOpenTabs(nextTabs);
    if (activeNote?.id === noteId) {
      if (nextTabs.length > 0) {
        setActiveNote(nextTabs[nextTabs.length - 1]);
      } else {
        setActiveNote(null);
        setActiveView('home');
      }
    }
  };

  // Create new note
  const handleCreateNewNote = (type: NoteType = 'page', folderId?: string, customTitle?: string) => {
    const targetFolder = folderId || selectedFolderId || folders[0]?.id || 'university';
    const now = Date.now();
    const isScratch = type === 'scratchpad';

    let defaultTitle = customTitle || '';
    if (!defaultTitle) {
      if (type === 'canvas') defaultTitle = 'Untitled Spatial Canvas';
      else if (type === 'research') defaultTitle = 'Untitled Research Synthesis';
      else if (type === 'scratchpad') defaultTitle = 'Scratchpad ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      else defaultTitle = 'Untitled Page Note';
    }

    const newNote: Note = {
      id: 'note-' + now + '-' + Math.random().toString(36).substring(2, 6),
      title: defaultTitle,
      type,
      folderId: targetFolder,
      tags: isScratch ? ['scratchpad'] : [],
      isPinned: isScratch,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      content: '',
      scratchpadData: isScratch
        ? {
            initialDurationMs: 1000 * 60 * 60 * 24, // 24 hours default
            expiresAt: now + 1000 * 60 * 60 * 24,
            isExpired: false,
            category: 'quick-thought',
          }
        : undefined,
      researchData: type === 'research'
        ? {
            keyTakeaways: [],
            quotes: [],
            screenshots: [],
            personalCritique: '',
          }
        : undefined,
      canvasNodes: type === 'canvas' ? [] : undefined,
      canvasStrokes: type === 'canvas' ? [] : undefined,
      canvasEdges: type === 'canvas' ? [] : undefined,
    };

    const nextNotes = [newNote, ...notes];
    syncNotes(nextNotes);
    syncService.recordLocalNoteChange(newNote, 'create');
    handleSelectNote(newNote);
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    const deleted = notes.find(n => n.id === noteId);
    if (deleted) {
      syncService.recordLocalNoteChange(deleted, 'delete');
    }
    const nextNotes = notes.filter(n => n.id !== noteId);
    syncNotes(nextNotes);
    handleCloseTab(noteId);
  };

  // Promote scratchpad note to permanent page or canvas
  const handlePromoteScratchpad = (note: Note) => {
    const promoted: Note = {
      ...note,
      type: 'page',
      scratchpadData: undefined,
      updatedAt: Date.now(),
      tags: note.tags.filter(t => t !== 'scratchpad'),
    };
    handleUpdateNote(promoted);
  };

  // Toggle pin
  const handleTogglePin = (noteId: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    handleUpdateNote({
      ...target,
      isPinned: !target.isPinned,
      updatedAt: Date.now(),
    });
  };

  // File scratchpad note to a permanent folder
  const handleFileNoteToFolder = (noteId: string, folderId: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const filedNote: Note = {
      ...target,
      folderId,
      type: 'page',
      scratchpadData: undefined,
      tags: target.tags.filter(t => t !== 'scratchpad'),
      updatedAt: Date.now(),
    };
    handleUpdateNote(filedNote);
  };

  // Global Quick Capture scratch note creation
  const handleSaveScratchNote = (noteData: Partial<Note>, openImmediately = false): Note => {
    const now = Date.now();
    const newNote: Note = {
      id: 'note-' + now + '-' + Math.random().toString(36).substring(2, 6),
      title: noteData.title || 'Quick Note',
      type: noteData.type || 'scratchpad',
      folderId: noteData.folderId || 'ideas',
      tags: noteData.tags || ['scratchpad'],
      isPinned: !!noteData.isPinned,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      content: noteData.content || '',
      scratchpadData: noteData.scratchpadData,
      inlineInks: noteData.inlineInks,
      audioRecordings: noteData.audioRecordings,
      canvasNodes: noteData.type === 'canvas' ? [] : undefined,
    };

    const nextNotes = [newNote, ...notes];
    syncNotes(nextNotes);

    if (openImmediately) {
      handleSelectNote(newNote);
    }

    return newNote;
  };

  // Navigate to note by title (e.g. from wiki backlinks [[Title]])
  const handleNavigateToNote = (title: string) => {
    const match = notes.find(n => n.title.toLowerCase() === title.toLowerCase().trim());
    if (match) {
      handleSelectNote(match);
    } else {
      // If note does not exist yet, create it on the fly!
      handleCreateNewNote('page', undefined, title);
    }
  };

  // Create folder
  const handleCreateFolder = (name: string, color: string) => {
    const newFolder: NotebookFolder = {
      id: 'folder-' + Date.now(),
      name,
      color,
      iconName: 'Folder',
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    NoteStorageService.saveFolders(nextFolders);
  };

  // Version snapshot creation
  const handleCreateSnapshot = (summary: string) => {
    if (!activeNote) return;
    const newSnapshot: VersionSnapshot = {
      id: 'ver-' + Date.now(),
      timestamp: Date.now(),
      title: activeNote.title,
      contentSummary: summary,
      fullContent: activeNote.content,
      authorLabel: 'Manual Snapshot',
    };
    const nextVersions = [...(activeNote.versions || []), newSnapshot];
    handleUpdateNote({
      ...activeNote,
      versions: nextVersions,
      updatedAt: Date.now(),
    });
  };

  // Restore snapshot version
  const handleRestoreVersion = (snapshot: VersionSnapshot) => {
    if (!activeNote) return;
    // Save safety rollback snapshot before restoring
    const safetySnapshot: VersionSnapshot = {
      id: 'ver-' + Date.now(),
      timestamp: Date.now(),
      title: 'Pre-Restore Backup',
      contentSummary: 'Automatic snapshot before restoring version ' + snapshot.title,
      fullContent: activeNote.content,
      authorLabel: 'Auto Backup',
    };

    handleUpdateNote({
      ...activeNote,
      content: snapshot.fullContent,
      versions: [...(activeNote.versions || []), safetySnapshot],
      updatedAt: Date.now(),
    });
  };

  // Quick Capture modal submit
  const handleQuickCaptureSave = (noteData: Partial<Note>, openImmediately: boolean) => {
    const now = Date.now();
    const newNote: Note = {
      id: 'note-' + now + '-' + Math.random().toString(36).substring(2, 6),
      title: noteData.title || 'Quick Note',
      type: noteData.type || 'scratchpad',
      folderId: noteData.folderId || folders[0]?.id || 'ideas',
      tags: noteData.tags || [],
      isPinned: !!noteData.isPinned,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      content: noteData.content || '',
      scratchpadData: noteData.scratchpadData,
      canvasNodes: noteData.type === 'canvas' ? [] : undefined,
    };

    const nextNotes = [newNote, ...notes];
    syncNotes(nextNotes);

    if (openImmediately) {
      handleSelectNote(newNote);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K -> Quick Switcher
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSwitcherOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + C -> Quick Capture
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        setIsQuickCaptureOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + N -> New Canvas Note
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        handleCreateNewNote('canvas');
      }
      // Cmd/Ctrl + L -> Lock Vault
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        authService.lockVault();
      }
      // Cmd/Ctrl + Alt + N or Cmd+N without shift -> New Page Note
      else if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleCreateNewNote('page');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [folders, notes, selectedFolderId]);

  // If user is not authenticated, show Landing Page with Hero & Sign In
  if (!authState.currentUser) {
    return (
      <LandingPage
        onEnterWorkspace={() => authService.loginAsDemo('scholar')}
        onLoginSuccess={() => {}}
      />
    );
  }

  // Render the appropriate main workspace view
  const renderMainWorkspace = () => {
    if (activeNote) {
      switch (activeNote.type) {
        case 'canvas':
          return (
            <CanvasEditor
              note={activeNote}
              onUpdateNote={handleUpdateNote}
              onNavigateToNote={handleNavigateToNote}
            />
          );
        case 'research':
          return (
            <ResearchView
              note={activeNote}
              onUpdateNote={handleUpdateNote}
              onNavigateToPdf={handleNavigateToNote}
            />
          );
        case 'pdf':
          return (
            <PdfAnnotator
              note={activeNote}
              onUpdateNote={handleUpdateNote}
              onOpenFlashcards={() => setIsFlashcardsOpen(true)}
              onCreateNote={(newNote) => {
                setNotes(prev => [newNote, ...prev]);
                NoteStorageService.saveNotes([newNote, ...notes]);
                setActiveNote(newNote);
              }}
            />
          );
        case 'scratchpad':
          return (
            <ScratchpadView
              note={activeNote}
              onUpdateNote={handleUpdateNote}
              onPromoteToPermanent={handlePromoteScratchpad}
              onDeleteNote={handleDeleteNote}
            />
          );
        default:
          return (
            <PageNoteEditor
              note={activeNote}
              allNotes={notes}
              folders={folders}
              onUpdateNote={handleUpdateNote}
              onNavigateToNote={handleNavigateToNote}
              onCreateNewNote={handleCreateNewNote}
              onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
              onOpenExport={() => setIsExportOpen(true)}
              onOpenFlashcards={() => setIsFlashcardsOpen(true)}
            />
          );
      }
    }

    // Home / Filtered views when no note is open
    let displayNotes = notes.filter(n => !n.isArchived);
    if (activeView === 'pinned') {
      displayNotes = displayNotes.filter(n => n.isPinned);
    } else if (activeView === 'canvases') {
      displayNotes = displayNotes.filter(n => n.type === 'canvas');
    } else if (activeView === 'research') {
      displayNotes = displayNotes.filter(n => n.type === 'research');
    } else if (activeView === 'scratchpads') {
      displayNotes = displayNotes.filter(n => n.type === 'scratchpad');
    } else if (activeView === 'folder' && selectedFolderId) {
      displayNotes = displayNotes.filter(n => n.folderId === selectedFolderId);
    } else if (activeView === 'tag' && selectedTag) {
      displayNotes = displayNotes.filter(n => n.tags.includes(selectedTag));
    }

    return (
      <HomeDashboard
        notes={displayNotes}
        folders={folders}
        onSelectNote={handleSelectNote}
        onCreateNewNote={handleCreateNewNote}
        onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onSelectFolder={(folderId) => {
          setSelectedFolderId(folderId);
          setActiveView('folder');
        }}
        onTogglePin={handleTogglePin}
        onOpenSyncManager={() => setIsSyncManagerOpen(true)}
      />
    );
  };

  if (!authState.isAuthenticated) {
    return (
      <LandingPage
        onEnterWorkspace={() => {
          authService.loginAsDemo('student');
        }}
        onLoginSuccess={(user) => {
          // authState is handled via authService subscription
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#faf9f6] text-[#1c1917] overflow-hidden antialiased font-sans">
      {/* Desktop & Tablet Sidebar (Hidden on mobile phones) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          notes={notes}
          folders={folders}
          activeView={activeView}
          selectedFolderId={selectedFolderId}
          selectedTag={selectedTag}
          activeNoteId={activeNote?.id}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSelectView={(view, folderId, tag) => {
            setActiveView(view);
            setSelectedFolderId(folderId);
            setSelectedTag(tag);
            setActiveNote(null);
          }}
          onSelectNote={handleSelectNote}
          onCreateNewNote={handleCreateNewNote}
          onCreateFolder={handleCreateFolder}
          onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          onOpenSyncManager={() => setIsSyncManagerOpen(true)}
        />
      </div>

      {/* Mobile Slide-in Drawer Sidebar with Backdrop */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-150">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl bg-[#f8f7f4]">
            <Sidebar
              notes={notes}
              folders={folders}
              activeView={activeView}
              selectedFolderId={selectedFolderId}
              selectedTag={selectedTag}
              activeNoteId={activeNote?.id}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              onSelectView={(view, folderId, tag) => {
                setActiveView(view);
                setSelectedFolderId(folderId);
                setSelectedTag(tag);
                setActiveNote(null);
                setIsMobileSidebarOpen(false);
              }}
              onSelectNote={(note) => {
                handleSelectNote(note);
                setIsMobileSidebarOpen(false);
              }}
              onCreateNewNote={(type, folderId) => {
                handleCreateNewNote(type, folderId);
                setIsMobileSidebarOpen(false);
              }}
              onCreateFolder={handleCreateFolder}
              onOpenQuickSwitcher={() => {
                setIsQuickSwitcherOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenSyncManager={() => {
                setIsSyncManagerOpen(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header with Fast Switcher Tabs & Mobile Nav */}
        <Header
          activeNote={activeNote}
          folders={folders}
          openTabs={openTabs}
          currentUser={authState.currentUser}
          onSelectTab={handleSelectNote}
          onCloseTab={handleCloseTab}
          onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenSyncManager={() => setIsSyncManagerOpen(true)}
          onOpenFlashcards={() => setIsFlashcardsOpen(true)}
          onSignOut={() => authService.signOut()}
          onLockVault={() => authService.lockVault()}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onBackFromNote={() => setActiveNote(null)}
          canInstall={!!deferredPrompt}
          onInstallApp={handleInstallApp}
        />

        {/* Active Note or Home Screen */}
        <main className="flex-1 flex overflow-hidden relative pb-12 md:pb-0">
          {renderMainWorkspace()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phones & Small Tablets) */}
      <MobileBottomNav
        activeView={activeView}
        hasActiveNote={!!activeNote}
        onSelectView={(view) => {
          setActiveView(view);
          setActiveNote(null);
        }}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onCreateNewNote={(type) => handleCreateNewNote(type)}
      />

      {/* Global Quick Capture Bar (Accessible from ANY view) */}
      <GlobalQuickCaptureBar
        folders={folders}
        onSaveScratchNote={handleSaveScratchNote}
        onOpenNote={handleSelectNote}
        onFileNoteToFolder={handleFileNoteToFolder}
      />

      {/* Spotlight Universal Search & Switcher Modal (Cmd+K) */}
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        notes={notes}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectNote={handleSelectNote}
        onCreateNote={(title, type) => handleCreateNewNote(type, undefined, title)}
      />

      {/* Quick Capture Modal (Cmd+Shift+C) */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        folders={folders}
        onClose={() => setIsQuickCaptureOpen(false)}
        onSave={handleQuickCaptureSave}
      />

      {/* Version History Modal */}
      {activeNote && (
        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          note={activeNote}
          onClose={() => setIsVersionHistoryOpen(false)}
          onRestoreVersion={handleRestoreVersion}
          onCreateSnapshot={handleCreateSnapshot}
        />
      )}

      {/* Export & Backup Modal */}
      {activeNote && (
        <ExportModal
          isOpen={isExportOpen}
          note={activeNote}
          onClose={() => setIsExportOpen(false)}
          onImportLibrary={() => {
            setNotes(NoteStorageService.getNotes());
            setFolders(NoteStorageService.getFolders());
          }}
        />
      )}

      {/* Cloud Sync & Offline Manager Modal */}
      <SyncManagerModal
        isOpen={isSyncManagerOpen}
        onClose={() => setIsSyncManagerOpen(false)}
        notes={notes}
        onNotesUpdated={(newNotes) => syncNotes(newNotes)}
        activeNote={activeNote}
        onSelectNote={handleSelectNote}
      />

      {/* Flashcard Study Mode Modal */}
      {isFlashcardsOpen && activeNote && (
        <FlashcardView
          note={activeNote}
          onUpdateNote={handleUpdateNote}
          onClose={() => setIsFlashcardsOpen(false)}
        />
      )}

      {/* Vault Lock Modal */}
      {authState.isVaultLocked && (
        <VaultLockModal
          currentUser={authState.currentUser}
          onUnlock={(p) => authService.unlockVault(p)}
          onSignOut={() => authService.signOut()}
        />
      )}
    </div>
  );
}
