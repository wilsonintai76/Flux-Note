import React, { useState } from 'react';
import { UserProfile } from '../types/auth';
import { Lock, Unlock, KeyRound, ArrowRight, ShieldCheck, User, LogOut } from 'lucide-react';

interface VaultLockModalProps {
  currentUser: UserProfile | null;
  onUnlock: (passwordOrPin?: string) => boolean;
  onSignOut: () => void;
}

export const VaultLockModal: React.FC<VaultLockModalProps> = ({
  currentUser,
  onUnlock,
  onSignOut,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onUnlock(password);
    if (!success) {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 p-8 max-w-sm w-full text-center space-y-5 animate-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-stone-900">
            Vault Locked
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {currentUser?.name ? `Protected notes for ${currentUser.name}` : 'Enter your password or PIN to unlock'}
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Enter Master Password / PIN"
              className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 ${
                error ? 'border-rose-300 ring-rose-200' : 'border-stone-300 focus:ring-stone-900'
              }`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock Vault</span>
          </button>
        </form>

        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck className="w-3 h-3" />
            <span>Encrypted Sandbox</span>
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="text-stone-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
