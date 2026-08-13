import React, { useState, useEffect } from 'react';
import { X, Lock, User as UserIcon, Key, CheckCircle, Shield, UserCheck, Sparkles, Building2, Wallet } from 'lucide-react';
import { UserRole, TeamMember, User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  role: 'admin' | 'member' | null;
  onClose: () => void;
  onLogin: (username: string, role: 'admin' | 'member', memberData?: Partial<User>) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  role,
  onClose,
  onLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registeredMembers, setRegisteredMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      try {
        const saved = localStorage.getItem('distro_team_members');
        if (saved) {
          setRegisteredMembers(JSON.parse(saved));
        } else {
          setRegisteredMembers([]);
        }
      } catch {
        setRegisteredMembers([]);
      }
    }
  }, [isOpen, role]);

  if (!isOpen || !role) return null;

  const handleSelectMember = (mem: TeamMember) => {
    const finalUser = mem.tempUsername || mem.username;
    const finalPass = mem.tempPassword || 'metro2026';
    setUsername(finalUser);
    setPassword(finalPass);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    // Match with existing member if available
    const matchedMember = registeredMembers.find(
      (m) =>
        m.username.toLowerCase() === username.trim().toLowerCase() ||
        (m.tempUsername && m.tempUsername.toLowerCase() === username.trim().toLowerCase())
    );

    const memberData: Partial<User> | undefined = matchedMember
      ? {
          memberId: matchedMember.id,
          name: matchedMember.name,
          email: matchedMember.email,
          phone: matchedMember.phone,
          storeLocation: matchedMember.storeLocation,
          businessAddress: matchedMember.businessAddress,
          creditAllocation: matchedMember.creditAllocation,
          paymentCycleDays: matchedMember.paymentCycleDays,
        }
      : undefined;

    onLogin(username.trim(), role, memberData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 md:p-8 overflow-hidden"
        id="login-modal-card"
      >
        {/* Top geometric bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'}`} />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg border ${role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {role === 'admin' ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {role === 'admin' ? 'Admin Portal Login' : 'Member Portal Login'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {role === 'admin' ? 'Enter administrative credentials' : 'Log in with your allocated credentials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-login-modal-btn"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Member Accounts Quick-Select */}
        {role === 'member' && registeredMembers.length > 0 && (
          <div className="mb-5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Registered Member Accounts:</span>
              </span>
              <span className="text-[10px] text-emerald-700">Click to autofill</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {registeredMembers.map((mem) => {
                const isSelected = username === (mem.tempUsername || mem.username);
                return (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => handleSelectMember(mem)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs font-bold'
                        : 'bg-white text-slate-800 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="font-semibold text-[11px] leading-tight">{mem.name}</div>
                    <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                      @{mem.tempUsername || mem.username} &bull; ${mem.creditAllocation.toLocaleString()} credit
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="mb-4 p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
            <div>
              <span className="font-bold">Default Demo Admin:</span>
              <span className="font-mono text-slate-600 ml-1.5">admin / metro2026</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('metro2026');
              }}
              className="text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              Fill Admin
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username / Temp Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === 'admin' ? 'e.g. admin' : 'e.g. temp_johndoe_1234 or store_mgr'}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password / Temp Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                id="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              id="cancel-login-btn"
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-login-btn"
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Sign In as {role === 'admin' ? 'Admin' : 'Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

