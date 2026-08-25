import React, { useState, useEffect } from 'react';
import { User, AdminView } from './types';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { HeaderNav } from './components/HeaderNav';
import { AdminWorkspace } from './components/AdminWorkspace';
import { MemberWorkspace } from './components/MemberWorkspace';
import { auth, signOut } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { initializeFirestoreData } from './firebase/firestoreService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalRole, setLoginModalRole] = useState<'admin' | 'member' | null>(null);
  const [activeAdminView, setActiveAdminView] = useState<AdminView>('home');

  // Initialize Firestore collections on app launch
  useEffect(() => {
    initializeFirestoreData();

    // Auto-detect invitation link from URL parameters
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const portal = searchParams.get('portal');
      const invite = searchParams.get('invite');
      const user = searchParams.get('user');

      if (portal === 'member' || invite || user) {
        setLoginModalRole('member');
        setLoginModalOpen(true);
      }
    } catch (e) {
      console.warn('URL param detection error:', e);
    }
  }, []);

  const handleOpenLoginModal = (role: 'admin' | 'member') => {
    setLoginModalRole(role);
    setLoginModalOpen(true);
  };

  const handleCloseLoginModal = () => {
    setLoginModalOpen(false);
    setLoginModalRole(null);
  };

  const handleLogin = (username: string, role: 'admin' | 'member', memberData?: Partial<User>) => {
    const masterLimit = (() => {
      try {
        const saved = localStorage.getItem('distro_master_credit_limit');
        return saved !== null ? Number(saved) : 10000;
      } catch {
        return 10000;
      }
    })();

    setCurrentUser({
      username,
      role,
      memberId: memberData?.memberId,
      name: memberData?.name || (role === 'admin' ? 'Administrator' : username),
      email: memberData?.email,
      phone: memberData?.phone,
      storeLocation: memberData?.storeLocation,
      businessAddress: memberData?.businessAddress,
      creditAllocation: memberData?.creditAllocation ?? (role === 'member' ? masterLimit : undefined),
      paymentCycleDays: memberData?.paymentCycleDays ?? (role === 'member' ? 14 : undefined),
    });
    setLoginModalOpen(false);
    setLoginModalRole(null);
    setActiveAdminView('home');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setActiveAdminView('home');
  };

  // 1. Unauthenticated State -> Landing Page + Login Modal
  if (!currentUser) {
    return (
      <>
        <LandingPage onOpenLogin={handleOpenLoginModal} />
        <LoginModal
          isOpen={loginModalOpen}
          role={loginModalRole}
          onClose={handleCloseLoginModal}
          onLogin={handleLogin}
        />
      </>
    );
  }

  // 2. Member Logged In -> Render Member Workspace with Member Nav (Home, My Account, My Orders, Shopping)
  if (currentUser.role === 'member') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <HeaderNav
          user={currentUser}
          activeView={activeAdminView}
          onSelectView={setActiveAdminView}
          onLogout={handleLogout}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MemberWorkspace
            user={currentUser}
            activeView={activeAdminView}
            onNavigate={setActiveAdminView}
          />
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          Product Distribution Portal &bull; Authorized Member Workspace &copy; {new Date().getFullYear()}
        </footer>
      </div>
    );
  }

  // 3. Admin Logged In -> Header Nav + Admin Workspace View
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Horizontal Header with requested buttons & dropdowns */}
      <HeaderNav
        user={currentUser}
        activeView={activeAdminView}
        onSelectView={setActiveAdminView}
        onLogout={handleLogout}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminWorkspace
          user={currentUser}
          activeView={activeAdminView}
          onNavigate={setActiveAdminView}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Product Distribution Portal &bull; Admin Console &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

