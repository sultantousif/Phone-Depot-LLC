import React from 'react';
import { Shield, UserCheck, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: (role: 'admin' | 'member') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-800">
      {/* Top Brand Header */}
      <header className="w-full bg-slate-900 border-b border-slate-800 shadow-md">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />
        <div className="max-w-7xl mx-auto py-4 px-6 md:px-12 flex items-center justify-end">
          <div className="text-xs font-semibold text-slate-400">
            Secure Authorized Access
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
            Welcome to Distribution Portal
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
        Product Distribution Portal &copy; {new Date().getFullYear()} &bull; Secure Authorized Access Only
      </footer>
    </div>
  );
};
