import React from 'react';
import { Note, NotebookFolder } from '../types/note';
import {
  Search,
  Zap,
  Share2,
  FileText,
  LayoutGrid,
  BookOpen,
  Flame,
  FileCheck,
  X,
  Menu,
  ChevronLeft,
  Download
} from 'lucide-react';

interface HeaderProps {
  activeNote: Note | null;
  folders: NotebookFolder[];
  openTabs: Note[];
  onSelectTab: (note: Note) => void;
  onCloseTab: (noteId: string) => void;
  onOpenQuickSwitcher: () => void;
  onOpenQuickCapture: () => void;
  onOpenExport: () => void;
  onToggleMobileSidebar?: () => void;
  onBackFromNote?: () => void;
  canInstall?: boolean;
  onInstallApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNote,
  folders,
  openTabs,
  onSelectTab,
  onCloseTab,
  onOpenQuickSwitcher,
  onOpenQuickCapture,
  onOpenExport,
  onToggleMobileSidebar,
  onBackFromNote,
  canInstall,
  onInstallApp,
}) => {
  const getTabIcon = (type: Note['type']) => {
    switch (type) {
      case 'canvas': return <LayoutGrid className="w-3 h-3 text-purple-600" />;
      case 'research': return <BookOpen className="w-3 h-3 text-emerald-600" />;
      case 'pdf': return <FileCheck className="w-3 h-3 text-red-500" />;
      case 'scratchpad': return <Flame className="w-3 h-3 text-amber-500" />;
      default: return <FileText className="w-3 h-3 text-blue-600" />;
    }
  };

  return (
    <header className="h-12 bg-white border-b border-stone-200/80 flex items-center justify-between px-3 sm:px-4 z-20 select-none shrink-0 gap-2 sm:gap-4">
      {/* Mobile-Only Navigation Controls */}
      <div className="flex md:hidden items-center gap-1.5 min-w-0">
        {activeNote ? (
          <button
            type="button"
            onClick={onBackFromNote}
            className="flex items-center gap-1 text-xs font-semibold text-stone-700 p-1.5 -ml-1 rounded-lg hover:bg-stone-100"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="truncate max-w-[120px]">{activeNote.title || 'Back'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
            title="Open Notebooks Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tablet & Laptop: Open Tabs for fast switching */}
      <div className="hidden md:flex items-center gap-1.5 overflow-x-auto flex-1 max-w-2xl py-1 no-scrollbar">
        {openTabs.map((tabNote) => {
          const isActive = activeNote?.id === tabNote.id;
          return (
            <div
              key={tabNote.id}
              onClick={() => onSelectTab(tabNote)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 max-w-44 group border ${
                isActive
                  ? 'bg-stone-100 text-stone-900 border-stone-300/80 shadow-2xs font-semibold'
                  : 'bg-white hover:bg-stone-50 text-stone-600 border-transparent hover:border-stone-200'
              }`}
            >
              {getTabIcon(tabNote.type)}
              <span className="truncate">{tabNote.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tabNote.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 p-0.5 rounded hover:bg-stone-200/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right: Quick actions for all viewports */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* PWA Install Button (shows when installable across devices) */}
        {canInstall && (
          <button
            type="button"
            onClick={onInstallApp}
            title="Install Folio App"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Quick Capture Button */}
        <button
          type="button"
          onClick={onOpenQuickCapture}
          title="Quick Capture (Cmd+Shift+C)"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100 text-xs font-semibold shadow-2xs transition-colors"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
          <span className="hidden lg:inline">Quick Capture</span>
        </button>

        {/* Universal Search Button */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          title="Search / Switch Note (Cmd+K)"
          className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Export Button (when note is active) */}
        {activeNote && (
          <button
            type="button"
            onClick={onOpenExport}
            title="Export / Share Note"
            className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
