import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  UserPlus, 
  Users, 
  Mail, 
  Phone, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit, 
  Copy, 
  Search, 
  Filter, 
  RefreshCw, 
  SlidersHorizontal, 
  Check, 
  X, 
  Sparkles,
  Award,
  Building,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';
import { AdminAccount, User } from '../types';

interface AdminManagementViewProps {
  user: User;
  activeView: 'add-admin' | 'manage-admins';
  admins: AdminAccount[];
  onSaveAdmin: (admin: AdminAccount) => void;
  onDeleteAdmin: (adminId: string) => void;
  onToggleStatus: (adminId: string) => void;
  onNavigate: (view: any) => void;
}

const ADMIN_LEVEL_PRESETS: Record<AdminAccount['adminLevel'], { description: string; color: string; defaultPermissions: string[] }> = {
  'Super Admin': {
    description: 'Unrestricted system authority across financials, catalog, orders, member allocations, and admin credentials.',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultPermissions: [
      'Full Administrative Access',
      'Approve & Modify Orders',
      'Decline Orders & Set Dispute Notes',
      'Issue Invoices & Debit/Credit Memos',
      'Record Payments & Ledger Statements',
      'Reset Payments & Invoices ($0.00)',
      'Manage Members & Credit Limits',
      'Manage Product Catalog & Stock',
      'Add & Manage Admin Accounts',
      'Configure Master Shop Settings'
    ]
  },
  'Operations Admin': {
    description: 'Fulfillment and order management authority including approving shipments, order review, and logistics tracking.',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultPermissions: [
      'Approve & Modify Orders',
      'Decline Orders & Set Dispute Notes',
      'Manage Product Catalog & Stock',
      'View Invoices & Payments'
    ]
  },
  'Billing Admin': {
    description: 'Financial ledger authority for issuing invoices, debit/credit memos, payment receipts, and balance reconciliations.',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultPermissions: [
      'Issue Invoices & Debit/Credit Memos',
      'Record Payments & Ledger Statements',
      'Reset Payments & Invoices ($0.00)',
      'Manage Members & Credit Limits',
      'View Invoices & Payments'
    ]
  },
  'Catalog Admin': {
    description: 'Merchandise management authority for updating products, pricing tiers, stock availability, and specs.',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultPermissions: [
      'Manage Product Catalog & Stock',
      'Configure Master Shop Settings',
      'View Invoices & Payments'
    ]
  },
  'Support Admin': {
    description: 'Customer and member operations authority for onboarding stores, updating member profiles, and tracking orders.',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    defaultPermissions: [
      'Manage Members & Credit Limits',
      'Approve & Modify Orders',
      'View Invoices & Payments'
    ]
  }
};

const ALL_PERMISSIONS = [
  'Full Administrative Access',
  'Approve & Modify Orders',
  'Decline Orders & Set Dispute Notes',
  'Issue Invoices & Debit/Credit Memos',
  'Record Payments & Ledger Statements',
  'Reset Payments & Invoices ($0.00)',
  'Manage Members & Credit Limits',
  'Manage Product Catalog & Stock',
  'Add & Manage Admin Accounts',
  'Configure Master Shop Settings'
];

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  user,
  activeView,
  admins,
  onSaveAdmin,
  onDeleteAdmin,
  onToggleStatus,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'list'>(activeView === 'add-admin' ? 'add' : 'list');

  useEffect(() => {
    if (activeView === 'add-admin') {
      setActiveTab('add');
    } else if (activeView === 'manage-admins') {
      setActiveTab('list');
    }
  }, [activeView]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [adminLevel, setAdminLevel] = useState<AdminAccount['adminLevel']>('Operations Admin');
  const [password, setPassword] = useState('Admin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(ADMIN_LEVEL_PRESETS['Operations Admin'].defaultPermissions);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; createdAdmin?: AdminAccount } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit / Delete Modals
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);

  // Auto-fill username when name changes
  const handleAutoGenerateUsername = (nameValue?: string) => {
    const raw = (nameValue || fullName || 'admin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const newUsername = `${raw.slice(0, 8)}_adm${rand}`;
    setUsername(newUsername);
  };

  const handleGenerateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(`${res}26!`);
  };

  const handleLevelChange = (newLevel: AdminAccount['adminLevel']) => {
    setAdminLevel(newLevel);
    if (ADMIN_LEVEL_PRESETS[newLevel]) {
      setPermissions(ADMIN_LEVEL_PRESETS[newLevel].defaultPermissions);
    }
  };

  const handleTogglePermission = (perm: string) => {
    setPermissions((prev) => 
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleCopyCredentials = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => {
      setCopiedKey(null);
    }, 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the Administrator Full Name.' });
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFeedback({ type: 'error', message: 'Please provide a valid official Email Address.' });
      return;
    }

    const cleanUsername = (username.trim() || `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}_adm`).toLowerCase();
    
    // Check if username already exists in admins
    const existing = admins.find((a) => a.username.toLowerCase() === cleanUsername);
    if (existing) {
      setFeedback({ type: 'error', message: `The username "${cleanUsername}" is already assigned to ${existing.name}. Please select a unique username.` });
      return;
    }

    const newAdmin: AdminAccount = {
      id: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      name: fullName.trim(),
      email: email.trim(),
      username: cleanUsername,
      phone: phone.trim() || '(555) 019-2831',
      adminLevel,
      permissions: permissions.length > 0 ? permissions : ['View Invoices & Payments'],
      status: 'Active',
      dateAdded: new Date().toISOString().split('T')[0],
      tempPassword: password.trim() || 'Admin2026!',
      notes: notes.trim()
    };

    onSaveAdmin(newAdmin);

    setFeedback({
      type: 'success',
      message: `Administrator account "${newAdmin.name}" (${newAdmin.adminLevel}) was successfully created and assigned ID ${newAdmin.id}.`,
      createdAdmin: newAdmin
    });

    // Reset Form fields
    setFullName('');
    setEmail('');
    setUsername('');
    setPhone('');
    setNotes('');
    handleGenerateSecurePassword();
  };

  // Filtered admins list
  const filteredAdmins = admins.filter((adm) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      q === '' ||
      adm.name.toLowerCase().includes(q) ||
      adm.email.toLowerCase().includes(q) ||
      adm.username.toLowerCase().includes(q) ||
      adm.adminLevel.toLowerCase().includes(q) ||
      (adm.phone && adm.phone.toLowerCase().includes(q));

    const matchesLevel = levelFilter === 'All' || adm.adminLevel === levelFilter;
    const matchesStatus = statusFilter === 'All' || adm.status === statusFilter;

    return matchesSearch && matchesLevel && matchesStatus;
  });

  const superAdminCount = admins.filter((a) => a.adminLevel === 'Super Admin').length;
  const activeCount = admins.filter((a) => a.status === 'Active').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl border border-purple-200">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Admin Management Portal
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-300">
                System Access Control
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Provision administrator accounts, assign operational tiers, configure permissions, and manage management credentials.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('add')}
            id="tab-add-admin-form"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add an Admin</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            id="tab-admins-roster"
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Admin Roster ({admins.length})</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Administrators</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{admins.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Registered system logins</div>
        </div>
        <div className="p-3.5 bg-white border border-purple-200 bg-purple-50/20 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Super Admins</div>
          <div className="text-xl font-extrabold text-purple-800 mt-1">{superAdminCount}</div>
          <div className="text-[10px] text-purple-600 mt-0.5">Full financial & system authority</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{activeCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">{admins.length - activeCount} suspended</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Session</div>
          <div className="text-xs font-bold text-slate-800 mt-1.5 truncate">@{user.username}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">{user.role} role</div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{feedback.message}</div>
              {feedback.createdAdmin && (
                <div className="mt-2 p-2.5 bg-white/90 border border-emerald-200 rounded-lg text-[11px] font-mono text-slate-800 space-y-1">
                  <div><strong>Username:</strong> {feedback.createdAdmin.username}</div>
                  <div><strong>Temporary Password:</strong> {feedback.createdAdmin.tempPassword}</div>
                  <div><strong>Admin Level:</strong> {feedback.createdAdmin.adminLevel}</div>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyCredentials(
                          `Admin Portal Credentials\nName: ${feedback.createdAdmin?.name}\nUsername: ${feedback.createdAdmin?.username}\nPassword: ${feedback.createdAdmin?.tempPassword}\nLevel: ${feedback.createdAdmin?.adminLevel}\nPortal URL: ${window.location.origin}`,
                          'banner-copy'
                        )
                      }
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'banner-copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'banner-copy' ? 'Credentials Copied!' : 'Copy Login Details'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      View in Roster &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 font-bold self-end sm:self-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: ADD AN ADMIN FORM */}
      {activeTab === 'add' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Add a New Administrator</h2>
              <p className="text-xs text-slate-500">
                Complete the administrator credentials, assign an administrative tier, and set system access rights.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrator Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="admin-fullname-input"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (!username) {
                        handleAutoGenerateUsername(e.target.value);
                      }
                    }}
                    placeholder="e.g. Sarah Jenkins"
                    required
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      id="admin-email-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. sjenkins@distroportal.com"
                      required
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Login Username <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      id="admin-auto-username-btn"
                      onClick={() => handleAutoGenerateUsername()}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      Generate Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    id="admin-username-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. sjenkins_adm"
                    required
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-mono font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Direct Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      id="admin-phone-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (555) 392-1049"
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Tier & Role Selection */}
              <div className="p-4 bg-purple-50/40 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-950">
                    Administrator Level / Role <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-purple-700">Selects default system permission scope</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(ADMIN_LEVEL_PRESETS) as AdminAccount['adminLevel'][]).map((tier) => {
                    const isSelected = adminLevel === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => handleLevelChange(tier)}
                        className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{tier}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className={`text-[10px] mt-1 leading-snug ${isSelected ? 'text-purple-100' : 'text-slate-500'}`}>
                          {tier === 'Super Admin' && 'Full system & ledger reset rights'}
                          {tier === 'Operations Admin' && 'Order approvals & logistics'}
                          {tier === 'Billing Admin' && 'Invoices, payments & balance'}
                          {tier === 'Catalog Admin' && 'Products, pricing & inventory'}
                          {tier === 'Support Admin' && 'Member accounts & inquiries'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-purple-900 font-medium bg-white/80 p-2.5 rounded-lg border border-purple-100">
                  <strong>{adminLevel} Scope:</strong> {ADMIN_LEVEL_PRESETS[adminLevel].description}
                </p>
              </div>

              {/* Security Credentials */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-slate-600" />
                    <label className="text-xs font-bold text-slate-800">
                      Initial Password / Security Key <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    id="admin-generate-password-btn"
                    onClick={handleGenerateSecurePassword}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="admin-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter or generate initial password"
                    required
                    className="w-full pl-9 pr-20 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-mono text-slate-900 font-bold"
                  />
                  <div className="absolute right-2 top-1.5 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(password, 'pwd-copy')}
                      className="p-1 text-slate-400 hover:text-purple-600 rounded"
                      title="Copy password"
                    >
                      {copiedKey === 'pwd-copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  Administrator will use this password alongside their username to log into the Admin Control Hub.
                </div>
              </div>

              {/* Granular Permissions Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Granular Administrative Permissions ({permissions.length}/{ALL_PERMISSIONS.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPermissions(ALL_PERMISSIONS)}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setPermissions(ADMIN_LEVEL_PRESETS[adminLevel].defaultPermissions)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Reset to Preset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 p-3 border border-slate-200 rounded-xl">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = permissions.includes(perm);
                    return (
                      <label
                        key={perm}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-center space-x-2 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-purple-50/70 border-purple-200 text-purple-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm)}
                          className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                        />
                        <span className="leading-tight text-[11px]">{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department & Role Notes (Optional)
                </label>
                <textarea
                  id="admin-notes-input"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Manages West Coast distribution center operations and warehouse inventory."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  id="reset-add-admin-form-btn"
                  onClick={() => {
                    setFullName('');
                    setEmail('');
                    setUsername('');
                    setPhone('');
                    setNotes('');
                    handleGenerateSecurePassword();
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  Reset Form
                </button>

                <button
                  type="submit"
                  id="submit-add-admin-btn"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Create Administrator Account</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side Live Preview Card (1 col) */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-purple-800/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono tracking-widest text-purple-300 uppercase font-bold">
                  Credential Preview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center font-black text-lg text-white shadow-inner shrink-0">
                    {fullName.trim() ? fullName.trim().charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-extrabold text-sm text-white truncate">
                      {fullName.trim() || 'New Administrator'}
                    </h3>
                    <p className="text-[11px] text-purple-200 font-mono truncate">
                      @{username.trim() || 'username_adm'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 text-[10px]">Tier Level:</span>
                    <span className="font-bold text-white text-[11px] px-2 py-0.5 rounded bg-purple-500/30 border border-purple-400/30">
                      {adminLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 text-[10px]">Official Email:</span>
                    <span className="font-mono text-[11px] text-white truncate max-w-[160px]">
                      {email.trim() || 'email@distroportal.com'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200 text-[10px]">Security Password:</span>
                    <span className="font-mono text-[11px] text-purple-300 font-bold">
                      {showPassword ? password : '••••••••••••'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-purple-300 uppercase font-bold block mb-1.5">
                    Granted Permissions ({permissions.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {permissions.map((p) => (
                      <span
                        key={p}
                        className="text-[9px] px-2 py-0.5 rounded-md bg-purple-800/60 text-purple-200 border border-purple-700/50"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Helper Tips */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Privileges Guide</span>
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Administrators created here can log in via the <strong>Admin Portal Login</strong> option with their allocated username and password. You can edit permissions or suspend access anytime in the Roster tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMIN ROSTER */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="admin-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search administrators by name, email, username, or role..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                id="admin-level-filter"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="All">All Admin Levels</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Operations Admin">Operations Admin</option>
                <option value="Billing Admin">Billing Admin</option>
                <option value="Catalog Admin">Catalog Admin</option>
                <option value="Support Admin">Support Admin</option>
              </select>

              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>

              <button
                onClick={() => setActiveTab('add')}
                id="roster-add-admin-btn"
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Admin</span>
              </button>
            </div>
          </div>

          {/* Administrators Grid */}
          {filteredAdmins.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Administrators Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No administrator accounts matched your search criteria. Try modifying your filters or add a new administrator.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLevelFilter('All');
                  setStatusFilter('All');
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
              >
                Clear Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAdmins.map((adm) => {
                const isSuper = adm.adminLevel === 'Super Admin';
                const isCurrentLoggedUser = adm.username.toLowerCase() === user.username.toLowerCase();
                const tierMeta = ADMIN_LEVEL_PRESETS[adm.adminLevel] || ADMIN_LEVEL_PRESETS['Operations Admin'];

                return (
                  <div
                    key={adm.id}
                    id={`admin-card-${adm.id}`}
                    className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Avatar, Name, Level, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-2xs ${
                              isSuper ? 'bg-purple-700' : 'bg-slate-800'
                            }`}
                          >
                            {adm.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-slate-900 text-sm">{adm.name}</h3>
                              {isCurrentLoggedUser && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">@{adm.username} &bull; {adm.id}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${tierMeta.color}`}
                          >
                            {adm.adminLevel}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              adm.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {adm.status}
                          </span>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{adm.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{adm.phone || '(555) 019-2831'}</span>
                        </div>
                      </div>

                      {/* Permissions Pills */}
                      <div className="mt-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Granted Rights ({adm.permissions?.length || 0})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {adm.permissions?.slice(0, 4).map((p) => (
                            <span
                              key={p}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                            >
                              {p}
                            </span>
                          ))}
                          {(adm.permissions?.length || 0) > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">
                              +{adm.permissions.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {adm.notes && (
                        <p className="mt-2 text-[11px] text-slate-500 italic bg-amber-50/40 p-2 rounded-lg border border-amber-100/60">
                          &ldquo;{adm.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          id={`admin-copy-creds-${adm.id}`}
                          onClick={() =>
                            handleCopyCredentials(
                              `Admin Portal Credentials\nName: ${adm.name}\nUsername: ${adm.username}\nPassword: ${adm.tempPassword || 'admin2026'}\nRole: ${adm.adminLevel}\nPortal URL: ${window.location.origin}`,
                              adm.id
                            )
                          }
                          className="px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy administrator login credentials"
                        >
                          {copiedKey === adm.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === adm.id ? 'Copied' : 'Credentials'}</span>
                        </button>

                        <button
                          type="button"
                          id={`admin-toggle-status-${adm.id}`}
                          onClick={() => onToggleStatus(adm.id)}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            adm.status === 'Active'
                              ? 'text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {adm.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          id={`admin-edit-btn-${adm.id}`}
                          onClick={() => setEditingAdmin(adm)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit administrator details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrentLoggedUser && (
                          <button
                            type="button"
                            id={`admin-delete-btn-${adm.id}`}
                            onClick={() => setAdminToDelete(adm)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete administrator account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Administrator Account</h3>
                  <p className="text-xs text-slate-500">{editingAdmin.name} ({editingAdmin.id})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveAdmin(editingAdmin);
                setEditingAdmin(null);
                setFeedback({
                  type: 'success',
                  message: `Administrator "${editingAdmin.name}" details updated successfully.`
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingAdmin.name}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingAdmin.email}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingAdmin.phone || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Level</label>
                  <select
                    value={editingAdmin.adminLevel}
                    onChange={(e) =>
                      setEditingAdmin({
                        ...editingAdmin,
                        adminLevel: e.target.value as AdminAccount['adminLevel']
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Operations Admin">Operations Admin</option>
                    <option value="Billing Admin">Billing Admin</option>
                    <option value="Catalog Admin">Catalog Admin</option>
                    <option value="Support Admin">Support Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editingAdmin.status}
                    onChange={(e) =>
                      setEditingAdmin({
                        ...editingAdmin,
                        status: e.target.value as 'Active' | 'Suspended'
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password / Security Key</label>
                <input
                  type="text"
                  value={editingAdmin.tempPassword || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, tempPassword: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editingAdmin.notes || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete Administrator Account</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete administrator{' '}
              <strong className="text-slate-900">{adminToDelete.name}</strong> (@{adminToDelete.username}, ID: {adminToDelete.id})?
              This action cannot be undone and will revoke all administrative access immediately.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAdmin(adminToDelete.id);
                  setAdminToDelete(null);
                  setFeedback({
                    type: 'success',
                    message: `Administrator account "${adminToDelete.name}" was permanently removed.`
                  });
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
