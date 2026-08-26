import React, { useState, useEffect } from 'react';
import { TeamMember } from '../types';
import { 
  generateMemberInviteUrl, 
  generateMemberInviteEmail, 
  triggerMailtoInvite, 
  sendInvitationViaServer,
  copyTextToClipboard 
} from '../utils/invitationService';
import { generateCompliantTempPassword } from '../utils/passwordGenerator';
import { saveMemberToFirestore } from '../firebase/firestoreService';
import { 
  Mail, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  Send, 
  X, 
  Key, 
  Shield, 
  Sparkles, 
  Store, 
  Clock, 
  Check, 
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Lock
} from 'lucide-react';

interface MemberInvitationModalProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
  senderAdminName?: string;
  onMarkSent?: (memberId: string) => void;
  onUpdateMember?: (updatedMember: TeamMember) => void;
}

export const MemberInvitationModal: React.FC<MemberInvitationModalProps> = ({
  member,
  isOpen,
  onClose,
  senderAdminName = 'Tousif Sultan',
  onMarkSent,
  onUpdateMember,
}) => {
  const [activeMember, setActiveMember] = useState<TeamMember | null>(member);
  const [activePassword, setActivePassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'quick' | 'preview'>('quick');

  // Initialize and synchronize member credentials
  useEffect(() => {
    if (!isOpen || !member) return;

    setActiveMember(member);
    
    // Ensure member has a valid stored temporary password
    const existingPass = member.tempPassword?.trim() || member.password?.trim();
    if (existingPass) {
      setActivePassword(existingPass);
    } else {
      const generated = generateCompliantTempPassword('Member');
      setActivePassword(generated);
      const updated: TeamMember = {
        ...member,
        tempPassword: generated,
        isTempPassword: true,
        tempPasswordExpire: member.tempPasswordExpire || '7 Days',
      };
      setActiveMember(updated);
      saveMemberToFirestore(updated).catch((err) => console.warn('Sync temp password error:', err));
      if (onUpdateMember) onUpdateMember(updated);
    }

    setDispatchStatus(null);
    setCopiedLink(false);
    setCopiedEmail(false);
    setCopiedPassword(false);
  }, [isOpen, member?.id]);

  if (!isOpen || !activeMember) return null;

  const resolvedPassword = activePassword || activeMember.tempPassword || activeMember.password || 'Metro2026!';
  const inviteUrl = generateMemberInviteUrl(activeMember);
  const { subject, body } = generateMemberInviteEmail(activeMember, senderAdminName, resolvedPassword);

  const handleRegeneratePassword = async () => {
    const newPass = generateCompliantTempPassword('Member');
    setActivePassword(newPass);
    const updated: TeamMember = {
      ...activeMember,
      tempPassword: newPass,
      isTempPassword: true,
      tempPasswordExpire: activeMember.tempPasswordExpire || '7 Days',
    };
    setActiveMember(updated);
    
    try {
      await saveMemberToFirestore(updated);
      if (onUpdateMember) onUpdateMember(updated);
      setDispatchStatus({
        text: `✓ New temporary password "${newPass}" generated and saved directly to the database!`,
        type: 'success',
      });
      setTimeout(() => setDispatchStatus(null), 5000);
    } catch (err: any) {
      setDispatchStatus({
        text: 'Failed to persist new password to database: ' + err?.message,
        type: 'error',
      });
    }
  };

  const handleCopyPassword = async () => {
    const success = await copyTextToClipboard(resolvedPassword);
    if (success) {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyTextToClipboard(inviteUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyEmail = async () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    const success = await copyTextToClipboard(fullText);
    if (success) {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const handleOpenEmailClient = () => {
    triggerMailtoInvite(activeMember, senderAdminName, resolvedPassword);
    if (onMarkSent) onMarkSent(activeMember.id);
    setDispatchStatus({
      text: 'Mail client opened! Email draft created with member invitation details.',
      type: 'info',
    });
    setTimeout(() => setDispatchStatus(null), 5000);
  };

  const handleDispatchEmail = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await sendInvitationViaServer(activeMember, senderAdminName, undefined, resolvedPassword);
      setIsDispatching(false);
      if (res.success) {
        if (onMarkSent) onMarkSent(activeMember.id);
        setDispatchStatus({
          text: `✓ Invitation dispatched to ${activeMember.email} with password "${resolvedPassword}"!`,
          type: 'success',
        });
      } else {
        setDispatchStatus({
          text: res.message || 'Failed to dispatch email.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setIsDispatching(false);
      setDispatchStatus({
        text: err?.message || 'Failed to send invitation.',
        type: 'error',
      });
    }
    setTimeout(() => setDispatchStatus(null), 6000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="member-invitation-modal"
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Member Invitation & Credentials</h3>
                <span className="text-[10px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">
                  Verified Database Sync
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Send credentials or copy direct activation link for <strong className="text-white">{activeMember.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quick'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send & Share Links</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Email Letter Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Member Card Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shrink-0 border border-blue-200">
                {activeMember.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeMember.name}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                    {activeMember.role}
                  </span>
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                  <span>{activeMember.email}</span>
                  <span>&bull;</span>
                  <span>Username: <strong>@{activeMember.tempUsername || activeMember.username}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Credit Allocation</span>
              <span className="text-sm font-mono font-extrabold text-blue-700">
                ${(activeMember.creditAllocation || 10000).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Net {activeMember.paymentCycleDays || 14} Days
              </span>
            </div>
          </div>

          {/* Feedback Status Alert */}
          {dispatchStatus && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150 border ${
              dispatchStatus.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : dispatchStatus.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              {dispatchStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : dispatchStatus.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{dispatchStatus.text}</span>
            </div>
          )}

          {activeTab === 'quick' ? (
            <div className="space-y-5">
              {/* Authorized Temporary Password & Credential Box */}
              <div className="bg-emerald-50/70 border border-emerald-300/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>Authorized Temporary Password (Stored in DB)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded">
                    Active for Login
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Username Display */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Portal Username</span>
                    <div className="font-mono text-sm font-extrabold text-slate-900 truncate">
                      {activeMember.tempUsername || activeMember.username}
                    </div>
                  </div>

                  {/* Password with Regenerate & Copy Controls */}
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Temporary Password</span>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="font-mono text-sm font-extrabold text-emerald-700 tracking-wide select-all">
                        {showPassword ? resolvedPassword : '••••••••••••'}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className="p-1 text-slate-600 hover:text-emerald-700 rounded hover:bg-emerald-50 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                          title="Copy Password"
                        >
                          {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPassword ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRegeneratePassword}
                          className="p-1 text-emerald-700 hover:text-emerald-900 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Generate new compliant password and save immediately to database"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regen</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Invitation URL Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Direct One-Click Setup Link</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Pre-loads username & activation credentials
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                    {inviteUrl}
                  </div>
                  <button
                    type="button"
                    id="copy-invite-link-modal-btn"
                    onClick={handleCopyLink}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. Launch Mailto Email Client */}
                <button
                  type="button"
                  id="open-email-client-btn"
                  onClick={handleOpenEmailClient}
                  className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/80 hover:from-blue-100/70 hover:to-indigo-100/70 border border-blue-200 rounded-xl text-left transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100" />
                  </div>
                  <span className="font-bold text-xs text-slate-900 block group-hover:text-blue-700">
                    Open in Email App (Mailto)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Opens your default email client (Gmail, Outlook, Mac Mail) with recipient, subject, and body ready.
                  </p>
                </button>

                {/* 2. Copy Full Email Body */}
                <button
                  type="button"
                  id="copy-full-email-btn"
                  onClick={handleCopyEmail}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-left transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Copy className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                      {copiedEmail ? 'Copied!' : 'Copy'}
                    </span>
                  </div>
                  <span className="font-bold text-xs text-slate-900 block group-hover:text-slate-950">
                    Copy Full Invitation Email
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Copies complete formatted email invitation for pasting directly into Slack, WhatsApp, or custom mailers.
                  </p>
                </button>
              </div>

              {/* Instant Dispatch via GoDaddy / Microsoft 365 */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <Send className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Automated Email Dispatch</span>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-400/30 font-mono">
                    admin@hgwcwportal.com
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sends an official onboarding invitation and temporary login credentials directly to the member from your connected domain email.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Recipient: <strong className="text-white">{activeMember.email}</strong>
                  </span>
                  <button
                    type="button"
                    id="simulate-dispatch-btn"
                    onClick={handleDispatchEmail}
                    disabled={isDispatching}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isDispatching ? (
                      <span className="inline-block animate-spin">⟳</span>
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isDispatching ? 'Sending Email...' : 'Send from admin@hgwcwportal.com'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Email Preview Tab */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 font-sans text-xs">
                <div className="border-b border-slate-200 pb-2 space-y-1 text-slate-600">
                  <div><strong>From:</strong> HG World Class Wholesale &lt;admin@hgwcwportal.com&gt;</div>
                  <div><strong>To:</strong> {activeMember.name} &lt;{activeMember.email}&gt;</div>
                  <div><strong>Subject:</strong> <span className="text-slate-900 font-semibold">{subject}</span></div>
                </div>
                <div className="whitespace-pre-wrap font-mono text-[11px] text-slate-800 bg-white p-3.5 rounded-lg border border-slate-200 leading-relaxed max-h-72 overflow-y-auto">
                  {body}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Letter Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenEmailClient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Mail App</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Wholesale Distribution Store Management &bull; Instant Invitation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
