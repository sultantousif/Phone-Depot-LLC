import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, ArrowRight, Building2 } from 'lucide-react';
import defaultLogo from '../assets/images/hg_world_class_logo_1787688685104.jpg';

interface LandingPageProps {
  onOpenLogin: (role: 'admin' | 'member') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('distro_store_logo');
      if (saved) return saved;
    }
    return defaultLogo;
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('distro_store_logo');
      if (saved) {
        setLogoSrc(saved);
        setImgError(false);
      } else {
        setLogoSrc(defaultLogo);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('distro_storage_updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('distro_storage_updated', handleStorage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-800">
      {/* Top Brand Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />
        <div className="max-w-7xl mx-auto py-3.5 px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!imgError ? (
              <img
                src={logoSrc}
                alt="HG WORLD CLASS"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (logoSrc !== defaultLogo) {
                    setLogoSrc(defaultLogo);
                  } else {
                    setImgError(true);
                  }
                }}
                className="h-12 md:h-14 w-auto max-w-[260px] object-contain rounded-md select-none bg-white/5 p-1 border border-white/10"
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md border border-white/20 font-display">
                  <span>H</span>
                  <span className="text-amber-400">G</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-black tracking-tight text-white font-display leading-tight">
                    HG WORLD CLASS
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">
                    Wholesale B2B Portal
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Authorized B2B Distribution Portal</span>
          </div>
        </div>
      </header>

      {/* Main Landing Login Choice Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center">
        <div className="text-center max-w-xl mb-12">
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-md mb-3 border border-blue-200">
            Select Portal Access
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Welcome to HG World Class Portal
          </h2>
          <p className="text-sm md:text-base text-slate-600">
            Please select your authorized portal role below to sign in.
          </p>
        </div>

        {/* Two Main Access Cards: Admin and Member */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Admin Access Option */}
          <div
            id="admin-login-card-trigger"
            onClick={() => onOpenLogin('admin')}
            className="group relative bg-white border border-slate-200 hover:border-blue-600 rounded-xl p-8 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-xs">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">Admin Login</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Access full administrative controls, team member provisioning, wholesale orders, invoices, and catalog tools.
              </p>
            </div>

            <div className="relative z-10 flex items-center text-xs font-bold text-blue-600 group-hover:text-blue-800">
              <span>Login as Admin</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>

          {/* Member Access Option */}
          <div
            id="member-login-card-trigger"
            onClick={() => onOpenLogin('member')}
            className="group relative bg-white border border-slate-200 hover:border-emerald-600 rounded-xl p-8 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="relative z-10">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Member Login</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Standard member account portal access for registered store managers, sales reps, and retail associates.
              </p>
            </div>

            <div className="relative z-10 flex items-center text-xs font-bold text-emerald-600 group-hover:text-emerald-800">
              <span>Login as Member</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="w-full border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 bg-white">
        Powered by Hassle Free Services
      </footer>
    </div>
  );
};
