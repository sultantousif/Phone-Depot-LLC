import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  User as UserIcon, 
  Shield, 
  UserCheck, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { TeamMember, User, AdminAccount } from '../types';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase/config';
import { 
  subscribeToAdmins, 
  subscribeToMembers, 
  fetchAdminsFromFirestore, 
  fetchMembersFromFirestore 
} from '../firebase/firestoreService';
import { INITIAL_ADMINS, INITIAL_MEMBERS } from '../data/sampleData';

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
        if (Array.isArray(parsed) && parsed.length > 0) setRegisteredMembers(parsed);
      } else {
        setRegisteredMembers(INITIAL_MEMBERS);
      }
    } catch {
      setRegisteredMembers(INITIAL_MEMBERS);
    }

    try {
      const savedAdmins = localStorage.getItem('distro_admin_accounts');
      if (savedAdmins) {
        const parsed = JSON.parse(savedAdmins);
        if (Array.isArray(parsed) && parsed.length > 0) setRegisteredAdmins(parsed);
      } else {
        setRegisteredAdmins(INITIAL_ADMINS);
      }
    } catch {
      setRegisteredAdmins(INITIAL_ADMINS);
    }

    // 2. Fetch fresh from Firestore
    fetchMembersFromFirestore().then((mems) => {
      if (mems.length > 0) {
        setRegisteredMembers(mems);
        localStorage.setItem('distro_team_members', JSON.stringify(mems));
      }
    });

    fetchAdminsFromFirestore().then((adms) => {
      if (adms.length > 0) {
        setRegisteredAdmins(adms);
        localStorage.setItem('distro_admin_accounts', JSON.stringify(adms));
      }
    });

    // 3. Realtime Firestore subscribers
    const unsubMembers = subscribeToMembers((mems) => {
      if (mems.length > 0) {
        setRegisteredMembers(mems);
        localStorage.setItem('distro_team_members', JSON.stringify(mems));
      }
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

  const handleSelectMember = (mem: TeamMember) => {
    const finalUser = mem.tempUsername || mem.username;
    const finalPass = mem.tempPassword || mem.password || 'metro2026';
    setUsername(finalUser);
    setPassword(finalPass);
    setError('');
  };

  const handleSelectAdmin = (adm: AdminAccount) => {
    setUsername(adm.username);
    setPassword(adm.tempPassword || adm.password || 'admin');
    setError('');
  };

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

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user || !user.email) {
        setError('Failed to retrieve user information from Google.');
        setLoading(false);
        return;
      }

      const email = user.email.toLowerCase();

      if (role === 'admin') {
        // Fetch fresh admins from Firestore
        let liveAdmins = await fetchAdminsFromFirestore();
        if (liveAdmins.length === 0) liveAdmins = registeredAdmins;

        const matchedAdmin = liveAdmins.find((a) => {
          const admEmail = a.email ? a.email.toLowerCase() : '';
          const admUser = a.username ? a.username.toLowerCase() : '';
          return admEmail === email || admUser === email.split('@')[0];
        });

        if (!matchedAdmin) {
          await signOut(auth);
          setError(`Access Denied: The Google account (${user.email}) is not registered as an authorized administrator in the database.`);
          setLoading(false);
          return;
        }

        if (matchedAdmin.status === 'Suspended') {
          await signOut(auth);
          setError('Access Denied: This administrator account is currently suspended. Please contact Super Admin.');
          setLoading(false);
          return;
        }

        onLogin(matchedAdmin.username, 'admin', {
          name: matchedAdmin.name || user.displayName || 'Administrator',
          email: matchedAdmin.email || user.email,
          phone: matchedAdmin.phone,
        });
      } else {
        // Fetch fresh members from Firestore
        let liveMembers = await fetchMembersFromFirestore();
        if (liveMembers.length === 0) liveMembers = registeredMembers;

        const matchedMember = liveMembers.find((m) => {
          const memEmail = m.email ? m.email.toLowerCase() : '';
          const memUser = m.username ? m.username.toLowerCase() : '';
          const memTemp = m.tempUsername ? m.tempUsername.toLowerCase() : '';
          return memEmail === email || memUser === email.split('@')[0] || memTemp === email.split('@')[0];
        });

        if (!matchedMember) {
          await signOut(auth);
          setError(`Access Denied: The Google account (${user.email}) is not registered as an authorized member store in the database.`);
          setLoading(false);
          return;
        }

        if (matchedMember.status === 'Suspended') {
          await signOut(auth);
          setError('Access Denied: This member store account is currently suspended.');
          setLoading(false);
          return;
        }

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
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMessage = err?.message || '';

      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorMessage.includes('auth/popup-closed-by-user') ||
        errorMessage.includes('popup-closed-by-user')
      ) {
        // User voluntarily closed the Google popup window without signing in
        setError('Sign-in cancelled. You can sign in anytime or enter your credentials above.');
      } else if (
        errorCode === 'auth/popup-blocked' ||
        errorMessage.includes('popup-blocked')
      ) {
        setError('Sign-in popup was blocked by your browser. Please allow popups or use your username/password.');
      } else {
        console.warn('Google Sign-In notification:', errorMessage || err);
        setError(errorMessage || 'Failed to sign in with Google. Please try again or use your password.');
      }
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

        {/* Database Quick-Select Pill Guide */}
        {role === 'member' && registeredMembers.length > 0 && (
          <div className="mb-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Authorized Store Database Accounts:</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">Click to fill credentials</span>
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
                      @{mem.tempUsername || mem.username} &bull; ${mem.creditAllocation?.toLocaleString() || '10,000'} limit
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Admin Accounts Quick-Select */}
        {role === 'admin' && registeredAdmins.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Authorized Admin Database Accounts:</span>
              </span>
              <span className="text-[10px] text-blue-700 font-medium">Click to fill credentials</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {registeredAdmins.map((adm) => {
                const isSelected = username === adm.username;
                return (
                  <button
                    key={adm.id}
                    type="button"
                    onClick={() => handleSelectAdmin(adm)}
                    className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition-all border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold'
                        : 'bg-white text-slate-800 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="font-semibold text-[11px] leading-tight flex items-center gap-1">
                      <span>{adm.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-medium">
                        {adm.adminLevel || adm.role || 'Admin'}
                      </span>
                    </div>
                    <div className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      @{adm.username} &bull; {adm.email}
                    </div>
                  </button>
                );
              })}
            </div>
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

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              id="google-signin-btn"
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                id="cancel-login-btn"
                className="px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                id="submit-login-btn"
                className={`px-4 py-2.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  role === 'admin'
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                }`}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sign In as {role === 'admin' ? 'Admin' : 'Member'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
