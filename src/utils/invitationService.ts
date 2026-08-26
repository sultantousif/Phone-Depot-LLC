import { TeamMember } from '../types';
import { generateCompliantTempPassword } from './passwordGenerator';

/**
 * Generates a direct invitation setup URL for a member.
 */
export function generateMemberInviteUrl(member: TeamMember): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const username = member.tempUsername || member.username || '';
  const email = member.email || '';
  const inviteCode = member.id || '';

  const params = new URLSearchParams({
    portal: 'member',
    user: username,
    email: email,
    invite: inviteCode,
  });

  return `${origin}${pathname}?${params.toString()}`;
}

/**
 * Generates a complete email subject and body for inviting a store member.
 */
export function generateMemberInviteEmail(
  member: TeamMember,
  senderName: string = 'Portal Administrator',
  activePassword?: string
): { subject: string; body: string } {
  const inviteUrl = generateMemberInviteUrl(member);
  const username = member.tempUsername || member.username;
  const initialPassword = activePassword || member.tempPassword || member.password || 'Metro2026!';
  const creditLimit = member.creditAllocation ? `$${member.creditAllocation.toLocaleString()}` : '$10,000';
  const paymentTerms = member.paymentCycleDays ? `${member.paymentCycleDays} Days Net` : '14 Days Net';
  const businessAddress = member.businessAddress || member.storeLocation || 'Authorized Store Location';

  const subject = `Welcome to the Wholesale Portal - Account Invitation for ${member.name}`;

  const body = `Dear ${member.name},

You have been invited by ${senderName} to access the Wholesale Product Distribution Portal.

Below are your authorized store access credentials:
--------------------------------------------------
• Store Account Name: ${member.name}
• Assigned Role: ${member.role || 'Store Manager'}
• Portal Username: ${username}
• Initial / Temp Password: ${initialPassword}
• Purchasing Credit Line: ${creditLimit}
• Payment Terms: ${paymentTerms}
• Business Address: ${businessAddress}
• Contact Phone: ${member.phone || 'N/A'}
--------------------------------------------------

Direct Portal Access & Activation Link:
${inviteUrl}

Next Steps:
1. Click the secure setup link above (or navigate to the portal login page).
2. Enter your username (${username}) and initial password (${initialPassword}).
3. Review your wholesale product catalog, place orders, and manage invoices.

If you have any questions or require assistance with your account, please reply directly to this email.

Best regards,
${senderName}
Wholesale Distribution Team
`;

  return { subject, body };
}

/**
 * Triggers the user's default email client (mailto:) with subject and body populated.
 */
export function triggerMailtoInvite(
  member: TeamMember,
  senderName: string = 'Portal Administrator',
  activePassword?: string
): boolean {
  try {
    const { subject, body } = generateMemberInviteEmail(member, senderName, activePassword);
    const recipient = member.email || '';
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open in new window or assign to location
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to launch mailto client:', err);
    return false;
  }
}

/**
 * Dispatches the invitation email directly via the backend Microsoft 365 / GoDaddy SMTP server.
 */
export async function sendInvitationViaServer(
  member: TeamMember,
  senderName: string = 'HG World Class Administration',
  customMessage?: string,
  activePassword?: string
): Promise<{ success: boolean; message: string; dispatched?: boolean }> {
  try {
    const inviteUrl = generateMemberInviteUrl(member);
    const resolvedPassword = activePassword || member.tempPassword || member.password || 'Metro2026!';
    const response = await fetch('/api/send-invitation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: member.email,
        recipientName: member.name,
        invitationLink: inviteUrl,
        senderName,
        customMessage,
        token: member.id,
        businessName: member.businessAddress || member.storeLocation || member.name,
        username: member.tempUsername || member.username,
        password: resolvedPassword,
        creditAllocation: member.creditAllocation,
        paymentCycleDays: member.paymentCycleDays,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error dispatching invitation via server:', error);
    return {
      success: false,
      message: error?.message || 'Network error attempting to contact email dispatch service.',
    };
  }
}

/**
 * Copies text to clipboard safely with fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    return false;
  }
}

