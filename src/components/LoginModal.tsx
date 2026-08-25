import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  User as UserIcon, 
  Shield, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { TeamMember, User, AdminAccount } from '../types';
import { 
  subscribeToAdmins, 
  subscribeToMembers, 
  fetchAdminsFromFirestore, 
  fetchMembersFromFirestore 
} from '../firebase/firestoreService';
import { INITIAL_ADMINS } from '../data/sampleData';

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
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredMembers, setRegisteredMembers] = useState<TeamMember[]>([]);
  const [registeredAdmins, setRegisteredAdmins] = useState<AdminAccount[]>([]);

  // Load from local storage and real-time Firestore
  useEffect(() => {
    if (!isOpen) return;

    setUsername('');
    setPassword('');
    setError('');
    setInviteNotice(null);
    setLoading(false);

    // Auto-detect invitation query parameters
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const paramUser = searchParams.get('user');
      const paramPreset = searchParams.get('preset');
      const paramPortal = searchParams.get('portal');
      const paramInvite = searchParams.get('invite');

      if (role === 'member' && (paramUser || paramPreset || paramPortal === 'member' || paramInvite)) {
        if (paramUser) setUsername(paramUser);
        if (paramPreset) setPassword(paramPreset);
        setInviteNotice('✨ Welcome! Your store invitation credentials have been loaded. Click "Sign In to Member Portal" below.');
      }
    } catch (e) {
      console.warn('URL param parse error in LoginModal:', e);
    }

    // 1. Initial cached data
    try {
      const savedMembers = localStorage.getItem('distro_team_members');
      if (savedMembers) {
        const parsed = JSON.parse(savedMembers);
        if (Array.isArray(parsed)) {
          const legacyIds = ['mem-101', 'mem-102', 'mem-103', 'mem-104'];
          setRegisteredMembers(parsed.filter((m: TeamMember) => !legacyIds.includes(m.id)));
        } else {
          setRegisteredMembers([]);
        }
      } else {
        setRegisteredMembers([]);
      }
    } catch {
      setRegisteredMembers([]);
    }

    try {
      const savedAdmins = localStorage.getItem('distro_admin_accounts');
      if (savedAdmins) {
        const parsed = JSON.parse(savedAdmins);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyAdmins = ['ADM-1002', 'ADM-1003'];
          setRegisteredAdmins(parsed.filter((a: AdminAccount) => !legacyAdmins.includes(a.id)));
        } else {
          setRegisteredAdmins(INITIAL_ADMINS);
        }
      } else {
        setRegisteredAdmins(INITIAL_ADMINS);
      }
    } catch {
      setRegisteredAdmins(INITIAL_ADMINS);
    }

    // 2. Fetch fresh from Firestore
    fetchMembersFromFirestore().then((mems) => {
      setRegisteredMembers(mems);
      localStorage.setItem('distro_team_members', JSON.stringify(mems));
    });

    fetchAdminsFromFirestore().then((adms) => {
      if (adms.length > 0) {
        setRegisteredAdmins(adms);
        localStorage.setItem('distro_admin_accounts', JSON.stringify(adms));
      }
    });

    // 3. Realtime Firestore subscribers
    const unsubMembers = subscribeToMembers((mems) => {
      setRegisteredMembers(mems);
      localStorage.setItem('distro_team_members', JSON.stringify(mems));
    });

    const unsubAdmins = subscribeToAdmins((adms) => {
      if (adms.length > 0) {
        setRegisteredAdmins(adms);
        localStorage.setItem('distro_admin_accounts', JSON.stringify(adms));
      }
    });

    return () => {
      unsubMembers();
      unsubAdmins();
    };
  }, [isOpen, role]);

  if (!isOpen || !role) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Please enter your username or registered email.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      if (role === 'admin') {
        // Retrieve latest admins from Firestore or state
        let currentAdmins = registeredAdmins;
        if (currentAdmins.length === 0) {
          currentAdmins = await fetchAdminsFromFirestore();
        }

        const matchedAdmin = currentAdmins.find((a) => {
          const u = a.username ? a.username.toLowerCase() : '';
          const em = a.email ? a.email.toLowerCase() : '';
          const id = a.id ? a.id.toLowerCase() : '';
          const target = cleanUsername.toLowerCase();
          return u === target || em === target || id === target;
        });

        if (!matchedAdmin) {
          setError('Access Denied: Administrator account not found in database. Please verify your credentials.');
          setLoading(false);
          return;
        }

        if (matchedAdmin.status === 'Suspended') {
          setError('Access Denied: This administrator account is currently suspended. Please contact the Super Admin.');
          setLoading(false);
          return;
        }

        // Strict Password Check
        const validPassword = matchedAdmin.tempPassword || matchedAdmin.password || 'admin';
        if (cleanPassword !== validPassword) {
          setError('Invalid password. Access denied.');
          setLoading(false);
          return;
        }

        // Authentication Success
        onLogin(matchedAdmin.username, 'admin', {
          name: matchedAdmin.name,
          email: matchedAdmin.email,
          phone: matchedAdmin.phone,
        });
      } else {
        // Member Authentication
        let currentMembers = registeredMembers;
        if (currentMembers.length === 0) {
          currentMembers = await fetchMembersFromFirestore();
        }

        const matchedMember = currentMembers.find((m) => {
          const u = m.username ? m.username.toLowerCase() : '';
          const tu = m.tempUsername ? m.tempUsername.toLowerCase() : '';
          const em = m.email ? m.email.toLowerCase() : '';
          const id = m.id ? m.id.toLowerCase() : '';
          const target = cleanUsername.toLowerCase();
          return u === target || tu === target || em === target || id === target;
        });

        if (!matchedMember) {
          setError('Access Denied: Member store account not found in database. Please verify your store username or email.');
          setLoading(false);
          return;
        }

        if (matchedMember.status === 'Suspended') {
          setError('Access Denied: This member store account is currently suspended. Please contact the portal administration.');
          setLoading(false);
          return;
        }

        // Strict Password Check
        const validPassword = matchedMember.tempPassword || matchedMember.password || 'metro2026';
        if (cleanPassword !== validPassword) {
          setError('Invalid password. Access denied.');
          setLoading(false);
          return;
        }

        // Authentication Success
        onLogin(matchedMember.username || matchedMember.tempUsername || matchedMember.id, 'member', {
          memberId: matchedMember.id,
          name: matchedMember.name,
          email: matchedMember.email,
          phone: matchedMember.phone,
          storeLocation: matchedMember.storeLocation,
          businessAddress: matchedMember.businessAddress,
          creditAllocation: matchedMember.creditAllocation,
          paymentCycleDays: matchedMember.paymentCycleDays,
        });
      }
    } catch (err) {
      console.error('Authentication check failed:', err);
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-6 md:p-8 overflow-hidden"
        id="login-modal-card"
      >
        {/* Top geometric bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'}`} />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg border ${role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {role === 'admin' ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {role === 'admin' ? 'Admin Portal Login' : 'Member Portal Login'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {role === 'admin' ? 'Verified Database Administrator Credentials' : 'Verified Member Store Credentials'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-login-modal-btn"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invitation Welcome Notice Banner */}
        {inviteNotice && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{inviteNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username or Registered Email
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
                placeholder={role === 'admin' ? 'e.g. admin or stousif' : 'e.g. johnmartinez or mem-101'}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
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

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              id="cancel-login-btn"
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              id="submit-login-btn"
              className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Sign In as {role === 'admin' ? 'Admin' : 'Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
