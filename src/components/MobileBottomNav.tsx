import React from 'react';
import { 
  Home, 
  FileText, 
  LayoutGrid, 
  Menu, 
  Zap, 
  Plus,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { ViewFilter, NoteType } from '../types/note';

interface MobileBottomNavProps {
  activeView: ViewFilter;
  hasActiveNote: boolean;
  onSelectView: (view: ViewFilter) => void;
  onOpenSidebar: () => void;
  onOpenQuickCapture: () => void;
  onCreateNewNote: (type: NoteType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  hasActiveNote,
  onSelectView,
  onOpenSidebar,
  onOpenQuickCapture,
  onCreateNewNote,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-3 py-1.5 flex items-center justify-around select-none shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {/* Home / Recent */}
      <button
        type="button"
        onClick={() => onSelectView('home')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors ${
          activeView === 'home' && !hasActiveNote ? 'text-stone-900 font-semibold' : 'text-stone-400 hover:text-stone-700'
        }`}
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px]">Home</span>
      </button>

      {/* All Documents */}
      <button
        type="button"
        onClick={() => onSelectView('all')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors ${
          activeView === 'all' && !hasActiveNote ? 'text-blue-600 font-semibold' : 'text-stone-400 hover:text-stone-700'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span className="text-[10px]">Notes</span>
      </button>

      {/* Floating Center Quick Capture */}
      <div className="relative -top-2">
        <button
          type="button"
          onClick={onOpenQuickCapture}
          className="w-11 h-11 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
          title="Quick Capture"
        >
          <Zap className="w-5 h-5 text-amber-400 fill-current" />
        </button>
      </div>

      {/* Infinite Canvas */}
      <button
        type="button"
        onClick={() => onSelectView('canvases')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-colors ${
          activeView === 'canvases' && !hasActiveNote ? 'text-purple-600 font-semibold' : 'text-stone-400 hover:text-stone-700'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-[10px]">Canvas</span>
      </button>

      {/* Notebooks & Sidebar Drawer */}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-stone-400 hover:text-stone-700 transition-colors"
      >
        <Menu className="w-4 h-4" />
        <span className="text-[10px]">Menu</span>
      </button>
    </nav>
  );
};
