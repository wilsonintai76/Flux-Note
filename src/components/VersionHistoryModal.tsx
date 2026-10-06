import React, { useState } from 'react';
import { Note, VersionSnapshot } from '../types/note';
import { History, RotateCcw, Plus, Clock, User, X, Check } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  note: Note;
  onClose: () => void;
  onRestoreVersion: (snapshot: VersionSnapshot) => void;
  onCreateSnapshot: (summary: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  note,
  onClose,
  onRestoreVersion,
  onCreateSnapshot,
}) => {
  const versions = note.versions || [];
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    versions[versions.length - 1]?.id || null
  );
  const [newSnapshotSummary, setNewSnapshotSummary] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const selectedSnapshot = versions.find(v => v.id === selectedSnapshotId);

  const handleCreateSnapshot = () => {
    if (!newSnapshotSummary.trim()) return;
    onCreateSnapshot(newSnapshotSummary.trim());
    setNewSnapshotSummary('');
    setShowAddForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[560px] animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Version History & Snapshots
            </h3>
            <span className="text-xs text-stone-400">({versions.length} versions)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Snapshot Current</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Snapshot creator drawer */}
        {showAddForm && (
          <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-200 flex items-center gap-3">
            <input
              type="text"
              autoFocus
              value={newSnapshotSummary}
              onChange={(e) => setNewSnapshotSummary(e.target.value)}
              placeholder="Describe this milestone (e.g. Completed Section 3 proofs)..."
              className="flex-1 text-xs p-2 rounded-lg bg-white border border-stone-200 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
            />
            <button
              type="button"
              onClick={handleCreateSnapshot}
              className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Snapshot
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Versions List */}
          <div className="w-72 border-r border-stone-200 overflow-y-auto p-3 space-y-1.5 bg-stone-50/50">
            {versions.length === 0 ? (
              <p className="text-xs text-stone-400 p-4 text-center">No snapshots saved yet. Click &apos;Snapshot Current&apos; above.</p>
            ) : (
              versions.map((ver) => {
                const isSelected = ver.id === selectedSnapshotId;
                return (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedSnapshotId(ver.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected ? 'bg-white shadow-xs border border-blue-300 ring-1 ring-blue-100' : 'hover:bg-white/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-800 truncate">{ver.title}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-1">{ver.contentSummary}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-2 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(ver.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Snapshot Content Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white p-6">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{selectedSnapshot.title}</h4>
                    <p className="text-xs text-stone-500">{selectedSnapshot.contentSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreVersion(selectedSnapshot);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore this Version</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-stone-50 p-4 rounded-xl font-mono text-xs text-stone-800 whitespace-pre-wrap leading-relaxed border border-stone-200/80">
                  {selectedSnapshot.fullContent}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-stone-400">
                Select a version from the timeline on the left to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
