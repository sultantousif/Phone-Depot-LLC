import React from 'react';
import { HardHat, LogOut, Construction, Box } from 'lucide-react';
import { User } from '../types';

interface MemberInProgressProps {
  user: User;
  onLogout: () => void;
}

export const MemberInProgress: React.FC<MemberInProgressProps> = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="h-0.5 w-full bg-emerald-500" />
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block leading-tight">Member Portal</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Distro Network</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            id="member-logout-btn"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout ({user.username})</span>
          </button>
        </div>
      </header>

      {/* Main In Progress Box */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 max-w-md w-full shadow-xs flex flex-col items-center">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl flex items-center justify-center mb-5 shadow-2xs">
            <Construction className="w-7 h-7" />
          </div>

          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <HardHat className="w-3.5 h-3.5 text-amber-600" /> In Progress
          </span>

          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Member Portal Under Construction
          </h2>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Welcome, <span className="font-bold text-slate-900">{user.username}</span>! Member ordering, personal invoices, and store catalog functions are currently being finalized.
          </p>

          <button
            onClick={onLogout}
            id="member-in-progress-logout-btn"
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout ({user.username})
          </button>
        </div>
      </main>

      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        Member Portal &bull; In Progress Mode &bull; Product Distribution System
      </footer>
    </div>
  );
};
