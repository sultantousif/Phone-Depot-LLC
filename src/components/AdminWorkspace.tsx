import React, { useState, useEffect } from 'react';
import { 
  AdminView, 
  User,
  TeamMember,
  OrderItem,
  InvoiceItem,
  PaymentItem,
  InvoiceTitle,
  OrderStatus,
  ProductItem,
  AdminAccount
} from '../types';
import { 
  SAMPLE_PRODUCTS,
  SAMPLE_INVOICES,
  INITIAL_MEMBERS,
  INITIAL_ADMINS,
  SAMPLE_PAYMENTS
} from '../data/sampleData';
import { ShopSettingsManager } from './ShopSettingsManager';
import { AdminManagementView } from './AdminManagementView';
import { loadStoredProducts, saveStoredProducts, PRODUCTS_UPDATED_EVENT } from '../utils/productUtils';
import { 
  Search, 
  FileText, 
  CreditCard, 
  PlusCircle, 
  PackageCheck, 
  Clock, 
  Smartphone, 
  Tablet, 
  Cpu as SimCardIcon, 
  Headphones, 
  Box, 
  Filter, 
  Check, 
  ArrowRight,
  Printer,
  Download,
  User as UserIcon,
  UserPlus,
  Users,
  Mail,
  Phone,
  Building,
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  RotateCcw,
  Copy,
  Key,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Shield,
  DollarSign,
  Wallet,
  SlidersHorizontal,
  ChevronRight,
  ShoppingBag,
  UserX,
  AlertTriangle,
  X,
  Truck,
  Receipt,
  Percent,
  Send,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingDown,
  Award
} from 'lucide-react';
import { 
  downloadInvoicePdf, 
  printOrDownloadInvoicePdf,
  downloadPaymentInvoicePdf,
  printOrDownloadPaymentInvoicePdf 
} from '../utils/generateInvoicePdf';
import { 
  getInvoiceCreditInfo, 
  calculateRemainingCreditAfterApproval, 
  getInvoicePaymentSummary,
  getMemberCreditSummary,
  getMemberPaymentCycleInfo
} from '../utils/creditUtils';
import {
  subscribeToOrders,
  subscribeToInvoices,
  subscribeToPayments,
  subscribeToMembers,
  subscribeToAdmins,
  saveOrderToFirestore,
  saveInvoiceToFirestore,
  savePaymentToFirestore,
  saveMemberToFirestore,
  deleteMemberFromFirestore,
  saveAdminToFirestore,
  deleteAdminFromFirestore
} from '../firebase/firestoreService';
import { PaymentMethodOption } from '../types';
import { MemberInvitationModal } from './MemberInvitationModal';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

interface AdminWorkspaceProps {
  user: User;
  activeView: AdminView;
  onNavigate: (view: AdminView) => void;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  user,
  activeView,
  onNavigate,
}) => {
  // Search state helpers
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Dynamic Orders State (persisted locally, initial empty)
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('distro_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('distro_orders', JSON.stringify(orders));
  }, [orders]);

  // Dynamic Invoices State (persisted locally, initial sample invoices if uninitialized)
  const [invoices, setInvoices] = useState<InvoiceItem[]>(() => {
    try {
      const saved = localStorage.getItem('distro_invoices');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return SAMPLE_INVOICES;
    } catch {
      return SAMPLE_INVOICES;
    }
  });

  useEffect(() => {
    localStorage.setItem('distro_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Dynamic Payments State (persisted locally, initial sample payments if uninitialized)
  const [payments, setPayments] = useState<PaymentItem[]>(() => {
    try {
      const saved = localStorage.getItem('distro_payments');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return SAMPLE_PAYMENTS;
    } catch {
      return SAMPLE_PAYMENTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('distro_payments', JSON.stringify(payments));
  }, [payments]);

  // Dynamic Team Members State (persisted locally, initial sample members if empty)
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('distro_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('distro_team_members', JSON.stringify(members));
  }, [members]);

  // Dynamic Admin Accounts State (persisted locally & synced with Firestore)
  const [admins, setAdmins] = useState<AdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem('distro_admin_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_ADMINS;
    } catch {
      return INITIAL_ADMINS;
    }
  });

  useEffect(() => {
    localStorage.setItem('distro_admin_accounts', JSON.stringify(admins));
  }, [admins]);

  const handleSaveAdmin = (adminToSave: AdminAccount) => {
    setAdmins((prev) => {
      const idx = prev.findIndex((a) => a.id === adminToSave.id);
      let updated: AdminAccount[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = adminToSave;
      } else {
        updated = [adminToSave, ...prev];
      }
      localStorage.setItem('distro_admin_accounts', JSON.stringify(updated));
      return updated;
    });

    saveAdminToFirestore(adminToSave);
    window.dispatchEvent(new Event('distro_storage_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteAdmin = (adminId: string) => {
    setAdmins((prev) => {
      const updated = prev.filter((a) => a.id !== adminId);
      localStorage.setItem('distro_admin_accounts', JSON.stringify(updated));
      return updated;
    });

    deleteAdminFromFirestore(adminId);
    window.dispatchEvent(new Event('distro_storage_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleToggleAdminStatus = (adminId: string) => {
    setAdmins((prev) => {
      const updated = prev.map((a) => {
        if (a.id === adminId) {
          const newStatus: 'Active' | 'Suspended' = a.status === 'Active' ? 'Suspended' : 'Active';
          const modified = { ...a, status: newStatus };
          saveAdminToFirestore(modified);
          return modified;
        }
        return a;
      });
      localStorage.setItem('distro_admin_accounts', JSON.stringify(updated));
      return updated;
    });

    window.dispatchEvent(new Event('distro_storage_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  // Create Invoice Modal & Form State
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [invoiceBilledToMemberId, setInvoiceBilledToMemberId] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState<'Late Payment' | 'Chargeback' | 'Check Bounce' | 'Low Performance Penalty' | 'Good Performance Bonus' | 'Miscellenous'>('Late Payment');
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');
  const [invoiceOrderRefInput, setInvoiceOrderRefInput] = useState('');
  const [invoiceAmountInput, setInvoiceAmountInput] = useState('150.00');
  const [invoiceDateInput, setInvoiceDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [invoiceDueDateInput, setInvoiceDueDateInput] = useState<string>(() => {
    const d = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [invoicePaymentMethodInput, setInvoicePaymentMethodInput] = useState('ACH Transfer');
  const [invoiceNotesInput, setInvoiceNotesInput] = useState('');
  const [invoiceStatusInput, setInvoiceStatusInput] = useState<'Unpaid' | 'Paid' | 'Processing'>('Unpaid');
  const [invoiceFormError, setInvoiceFormError] = useState('');
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceItem | null>(null);
  const [invoiceCategoryFilter, setInvoiceCategoryFilter] = useState<string>('All');
  const [invoiceMemberFilter, setInvoiceMemberFilter] = useState<string>('All');
  const [paymentMemberFilter, setPaymentMemberFilter] = useState<string>('All');

  // Collapsible Invoice Row & Payment Form State
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethodOption>>({});
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({});
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [paymentFeedback, setPaymentFeedback] = useState<{ invoiceNumber: string; message: string; type: 'success' | 'error' } | null>(null);

  // Place order state
  const [orderCart, setOrderCart] = useState<{ productId: string; qty: number }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState('Main Distribution HQ - 1044 Market St, San Francisco, CA');
  const [orderSubmittedMsg, setOrderSubmittedMsg] = useState('');
  const [orderCatalogCategory, setOrderCatalogCategory] = useState<string>('all');
  const [orderCatalogSearch, setOrderCatalogSearch] = useState<string>('');

  // Team Members UI State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [activeMemberTab, setActiveMemberTab] = useState<'add' | 'list'>('add');
  const [editingTermsMember, setEditingTermsMember] = useState<{ id: string; name: string; credit: number; paymentCycleDays: number } | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  // Master Credit Allocation Limit State (default $10,000, range $0 - $100,000)
  const [masterCreditLimit, setMasterCreditLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('distro_master_credit_limit');
      return saved !== null ? Number(saved) : 10000;
    } catch {
      return 10000;
    }
  });
  const [isMasterCreditModalOpen, setIsMasterCreditModalOpen] = useState(false);
  const [masterLimitInput, setMasterLimitInput] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('distro_master_credit_limit');
      return saved !== null ? Number(saved) : 10000;
    } catch {
      return 10000;
    }
  });
  const [masterLimitFeedback, setMasterLimitFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Testing Reset Feature: Reset Payments & Invoices to zero ($0)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const handleResetPaymentsAndInvoices = () => {
    localStorage.setItem('distro_invoices', JSON.stringify([]));
    localStorage.setItem('distro_payments', JSON.stringify([]));
    setInvoices([]);
    setPayments([]);
    setIsResetConfirmOpen(false);
    setResetSuccessMessage('All payments and invoices have been successfully reset to zero ($0.00). Credit allocations are now fully restored.');

    // Broadcast update across components & member workspaces
    window.dispatchEvent(new Event('distro_storage_updated'));
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setResetSuccessMessage('');
    }, 6000);
  };

  // Listen for storage updates
  useEffect(() => {
    const handleStorageUpdated = () => {
      try {
        const savedOrders = localStorage.getItem('distro_orders');
        if (savedOrders !== null) setOrders(JSON.parse(savedOrders));
        const savedInvoices = localStorage.getItem('distro_invoices');
        if (savedInvoices !== null) setInvoices(JSON.parse(savedInvoices));
        const savedPayments = localStorage.getItem('distro_payments');
        if (savedPayments !== null) setPayments(JSON.parse(savedPayments));
        const savedMembers = localStorage.getItem('distro_team_members');
        if (savedMembers !== null) setMembers(JSON.parse(savedMembers));
        const savedAdmins = localStorage.getItem('distro_admin_accounts');
        if (savedAdmins !== null) setAdmins(JSON.parse(savedAdmins));
        const savedLimit = localStorage.getItem('distro_master_credit_limit');
        if (savedLimit !== null) setMasterCreditLimit(Number(savedLimit));
      } catch (err) {
        console.error('Storage sync error in AdminWorkspace:', err);
      }
    };
    window.addEventListener('distro_storage_updated', handleStorageUpdated);
    window.addEventListener('storage', handleStorageUpdated);
    return () => {
      window.removeEventListener('distro_storage_updated', handleStorageUpdated);
      window.removeEventListener('storage', handleStorageUpdated);
    };
  }, []);

  // Sync tab when navigating directly from Header menu
  useEffect(() => {
    if (activeView === 'manage-members') {
      setActiveMemberTab('list');
    } else if (activeView === 'add-member') {
      setActiveMemberTab('add');
    }
  }, [activeView]);

  // Dynamic Products State (persisted locally with pictures, stock & member-specific visibility)
  const [products, setProducts] = useState<ProductItem[]>(() => loadStoredProducts());

  useEffect(() => {
    const handleProductsUpdated = () => {
      setProducts(loadStoredProducts());
    };
    window.addEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
    window.addEventListener('storage', handleProductsUpdated);
    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
      window.removeEventListener('storage', handleProductsUpdated);
    };
  }, []);

  // Add Member Form State
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [businessStreet, setBusinessStreet] = useState('');
  const [businessSuite, setBusinessSuite] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('CA');
  const [businessZip, setBusinessZip] = useState('');
  const [businessCountry, setBusinessCountry] = useState('United States');
  const [memberRole, setMemberRole] = useState<'Store Manager' | 'Inventory Specialist' | 'Sales Representative' | 'Billing Administrator' | 'Associate'>('Store Manager');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberCreditAllocation, setMemberCreditAllocation] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('distro_master_credit_limit');
      return saved !== null ? Number(saved) : 10000;
    } catch {
      return 10000;
    }
  });
  const [memberPaymentCycleDays, setMemberPaymentCycleDays] = useState<number>(14);
  const [memberPermissions, setMemberPermissions] = useState<string[]>([
    'Place Orders',
    'View Invoices'
  ]);
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [selectedInviteMember, setSelectedInviteMember] = useState<TeamMember | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberFeedback, setMemberFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Temporary Credentials Allocation State
  const [allocateTempUsername, setAllocateTempUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [allocateTempPassword, setAllocateTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPasswordExpire, setTempPasswordExpire] = useState('7 Days');
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);
  const [summaryFeedback, setSummaryFeedback] = useState<string | null>(null);

  const generateRandomTempUsername = (nameBase?: string) => {
    const raw = (nameBase || memberName || 'member')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8) || 'user';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `temp_${raw}_${randNum}`;
  };

  const generateRandomTempPassword = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    result += symbols.charAt(Math.floor(Math.random() * symbols.length));
    return `Tmp#${result}`;
  };

  const handleConfirmSummaryCredentials = () => {
    let finalUser = tempUsername.trim();
    let finalPass = tempPassword.trim();

    if (!finalUser) {
      finalUser = generateRandomTempUsername();
      setTempUsername(finalUser);
    }
    setAllocateTempUsername(true);

    if (!finalPass) {
      finalPass = generateRandomTempPassword();
      setTempPassword(finalPass);
    }
    setAllocateTempPassword(true);

    setSummaryFeedback(`✓ Temporary credentials confirmed! Username: "${finalUser}" | Password: "${finalPass}"`);
    setTimeout(() => {
      setSummaryFeedback(null);
    }, 4500);
  };

  // Real-time synchronization with localStorage (guarded against redundant re-renders)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedOrders = localStorage.getItem('distro_orders');
        if (savedOrders !== null) {
          setOrders((prev) => (JSON.stringify(prev) !== savedOrders ? JSON.parse(savedOrders) : prev));
        }
        const savedInvoices = localStorage.getItem('distro_invoices');
        if (savedInvoices !== null) {
          setInvoices((prev) => (JSON.stringify(prev) !== savedInvoices ? JSON.parse(savedInvoices) : prev));
        }
        const savedPayments = localStorage.getItem('distro_payments');
        if (savedPayments !== null) {
          setPayments((prev) => (JSON.stringify(prev) !== savedPayments ? JSON.parse(savedPayments) : prev));
        }
        const savedMembers = localStorage.getItem('distro_team_members');
        if (savedMembers !== null) {
          setMembers((prev) => (JSON.stringify(prev) !== savedMembers ? JSON.parse(savedMembers) : prev));
        }
        const savedMasterLimit = localStorage.getItem('distro_master_credit_limit');
        if (savedMasterLimit !== null) {
          const parsed = Number(savedMasterLimit);
          if (!isNaN(parsed)) {
            setMasterCreditLimit((prev) => (prev !== parsed ? parsed : prev));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('distro_storage_updated', handleStorageChange);
    window.addEventListener('distro_payments_invoices_reset', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2000);
    // Subscribe to Firestore for real-time live database updates across all sessions
    const unsubOrders = subscribeToOrders((newOrders) => {
      setOrders(newOrders);
      localStorage.setItem('distro_orders', JSON.stringify(newOrders));
    });
    const unsubInvoices = subscribeToInvoices((newInvs) => {
      setInvoices(newInvs);
      localStorage.setItem('distro_invoices', JSON.stringify(newInvs));
    });
    const unsubPayments = subscribeToPayments((newPmts) => {
      setPayments(newPmts);
      localStorage.setItem('distro_payments', JSON.stringify(newPmts));
    });
    const unsubMembers = subscribeToMembers((newMems) => {
      setMembers(newMems);
      localStorage.setItem('distro_team_members', JSON.stringify(newMems));
    });
    const unsubAdmins = subscribeToAdmins((newAdms) => {
      setAdmins(newAdms);
      localStorage.setItem('distro_admin_accounts', JSON.stringify(newAdms));
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('distro_storage_updated', handleStorageChange);
      window.removeEventListener('distro_payments_invoices_reset', handleStorageChange);
      clearInterval(interval);
      unsubOrders();
      unsubInvoices();
      unsubPayments();
      unsubMembers();
      unsubAdmins();
    };
  }, []);

  // Handler to apply Master Credit Allocation Limit ($0 - $100,000)
  const handleApplyMasterCreditLimit = (newLimit: number, applyToAllExisting: boolean = true) => {
    const boundedLimit = Math.max(0, Math.min(100000, Number(newLimit) || 0));
    setMasterCreditLimit(boundedLimit);
    setMasterLimitInput(boundedLimit);
    localStorage.setItem('distro_master_credit_limit', boundedLimit.toString());
    setMemberCreditAllocation(boundedLimit);

    if (applyToAllExisting) {
      setMembers((prev) => {
        const updated = prev.map((m) => ({
          ...m,
          creditAllocation: boundedLimit,
        }));
        localStorage.setItem('distro_team_members', JSON.stringify(updated));
        return updated;
      });

      setMasterLimitFeedback({
        type: 'success',
        message: `Master Credit Allocation Limit set to $${boundedLimit.toLocaleString()}. Applied across all ${members.length} member account${members.length === 1 ? '' : 's'} and configured as default for all new members ($0 - $100,000 range).`,
      });
    } else {
      setMasterLimitFeedback({
        type: 'info',
        message: `Master Credit Allocation Limit set to $${boundedLimit.toLocaleString()} as default for new member registrations.`,
      });
    }

    setIsMasterCreditModalOpen(false);
    setTimeout(() => {
      setMasterLimitFeedback(null);
    }, 7000);
  };

  // Admin Order Review & Fee Assessment State
  const [adminReviewingOrder, setAdminReviewingOrder] = useState<OrderItem | null>(null);
  const [adminShippingFee, setAdminShippingFee] = useState<string>('15.00');
  const [adminSalesTax, setAdminSalesTax] = useState<string>('');
  const [adminServiceTax, setAdminServiceTax] = useState<string>('10.00');
  const [adminOverpackFee, setAdminOverpackFee] = useState<string>('0.00');
  const [adminInsuranceFee, setAdminInsuranceFee] = useState<string>('0.00');
  const [adminDeclineReason, setAdminDeclineReason] = useState<string>('Previous overdue balance on account');
  const [customDeclineReason, setCustomDeclineReason] = useState<string>('');
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [orderActionFeedback, setOrderActionFeedback] = useState<string | null>(null);

  const handleOpenOrderReview = (order: OrderItem) => {
    const clonedItems = order.items ? order.items.map((it) => ({ ...it })) : [];
    const origItems = order.originalItems && order.originalItems.length > 0 
      ? order.originalItems.map((it) => ({ ...it })) 
      : clonedItems.map((it) => ({ ...it }));
    
    setAdminReviewingOrder({
      ...order,
      items: clonedItems,
      originalItems: origItems,
      originalSubtotal: order.originalSubtotal !== undefined ? order.originalSubtotal : (order.subtotal || order.total || 0),
    });

    setAdminShippingFee(order.shippingFee !== undefined ? order.shippingFee.toFixed(2) : '15.00');
    const baseSubtotal = order.subtotal || order.total || 0;
    const calcTax = order.salesTax !== undefined ? order.salesTax.toFixed(2) : (baseSubtotal * 0.0825).toFixed(2);
    setAdminSalesTax(calcTax);
    setAdminServiceTax(order.serviceTax !== undefined ? order.serviceTax.toFixed(2) : '10.00');
    setAdminOverpackFee(order.overpackFee !== undefined ? order.overpackFee.toFixed(2) : '0.00');
    setAdminInsuranceFee(order.insuranceFee !== undefined ? order.insuranceFee.toFixed(2) : '0.00');
    setShowDeclineConfirm(false);
    setAdminDeclineReason('Previous overdue balance on account');
    setCustomDeclineReason('');
  };

  const handleCloseOrderReview = () => {
    setAdminReviewingOrder(null);
    setShowDeclineConfirm(false);
  };

  // Helper to remove an item from reviewing order
  const handleRemoveItemFromReview = (indexToRemove: number) => {
    if (!adminReviewingOrder || !adminReviewingOrder.items) return;
    const currentItems = [...adminReviewingOrder.items];
    const updatedItems = currentItems.filter((_, idx) => idx !== indexToRemove);
    const newSubtotal = updatedItems.reduce((sum, it) => sum + it.price * it.qty, 0);
    const newItemsCount = updatedItems.reduce((sum, it) => sum + it.qty, 0);

    const origItems = adminReviewingOrder.originalItems || (adminReviewingOrder.items ? adminReviewingOrder.items.map(it => ({ ...it })) : []);

    setAdminReviewingOrder({
      ...adminReviewingOrder,
      items: updatedItems,
      itemsCount: newItemsCount,
      subtotal: newSubtotal,
      itemsModifiedByAdmin: true,
      originalItems: origItems,
      originalSubtotal: adminReviewingOrder.originalSubtotal || (adminReviewingOrder.subtotal || adminReviewingOrder.total || 0),
    });

    // Auto-adjust sales tax to new subtotal
    setAdminSalesTax((newSubtotal * 0.0825).toFixed(2));
  };

  // Helper to adjust quantity of an item in reviewing order
  const handleUpdateItemQtyInReview = (indexToUpdate: number, newQty: number) => {
    if (!adminReviewingOrder || !adminReviewingOrder.items) return;
    if (newQty <= 0) {
      handleRemoveItemFromReview(indexToUpdate);
      return;
    }
    const updatedItems = adminReviewingOrder.items.map((it, idx) =>
      idx === indexToUpdate ? { ...it, qty: newQty } : it
    );
    const newSubtotal = updatedItems.reduce((sum, it) => sum + it.price * it.qty, 0);
    const newItemsCount = updatedItems.reduce((sum, it) => sum + it.qty, 0);

    setAdminReviewingOrder({
      ...adminReviewingOrder,
      items: updatedItems,
      itemsCount: newItemsCount,
      subtotal: newSubtotal,
      itemsModifiedByAdmin: true,
      originalItems: adminReviewingOrder.originalItems || (adminReviewingOrder.items ? adminReviewingOrder.items.map(it => ({ ...it })) : []),
      originalSubtotal: adminReviewingOrder.originalSubtotal || (adminReviewingOrder.subtotal || adminReviewingOrder.total || 0),
    });

    setAdminSalesTax((newSubtotal * 0.0825).toFixed(2));
  };

  // Helper to reset items back to original submitted state
  const handleResetItemsInReview = () => {
    if (!adminReviewingOrder || !adminReviewingOrder.originalItems) return;
    const restoredItems = adminReviewingOrder.originalItems.map(it => ({ ...it }));
    const newSubtotal = restoredItems.reduce((sum, it) => sum + it.price * it.qty, 0);
    const newItemsCount = restoredItems.reduce((sum, it) => sum + it.qty, 0);

    setAdminReviewingOrder({
      ...adminReviewingOrder,
      items: restoredItems,
      itemsCount: newItemsCount,
      subtotal: newSubtotal,
      itemsModifiedByAdmin: false,
    });

    setAdminSalesTax((newSubtotal * 0.0825).toFixed(2));
  };

  const parsedShipping = parseFloat(adminShippingFee);
  const parsedSalesTax = parseFloat(adminSalesTax);
  const parsedServiceTax = parseFloat(adminServiceTax);
  const parsedOverpack = parseFloat(adminOverpackFee);
  const parsedInsurance = parseFloat(adminInsuranceFee);

  const isShippingValid = !isNaN(parsedShipping) && parsedShipping >= 0 && adminShippingFee.trim() !== '';
  const isSalesTaxValid = !isNaN(parsedSalesTax) && parsedSalesTax >= 0 && adminSalesTax.trim() !== '';
  const isServiceTaxValid = !isNaN(parsedServiceTax) && parsedServiceTax >= 0 && adminServiceTax.trim() !== '';
  const isOverpackValid = !isNaN(parsedOverpack) && parsedOverpack >= 0 && adminOverpackFee.trim() !== '';
  const isInsuranceValid = !isNaN(parsedInsurance) && parsedInsurance >= 0 && adminInsuranceFee.trim() !== '';

  const areAllFeesFilled = isShippingValid && isSalesTaxValid && isServiceTaxValid && isOverpackValid && isInsuranceValid;

  const currentOrderSubtotal = adminReviewingOrder ? (adminReviewingOrder.subtotal !== undefined ? adminReviewingOrder.subtotal : (adminReviewingOrder.total || 0)) : 0;
  const adminCalculatedGrandTotal = currentOrderSubtotal + 
    (isShippingValid ? parsedShipping : 0) + 
    (isSalesTaxValid ? parsedSalesTax : 0) + 
    (isServiceTaxValid ? parsedServiceTax : 0) +
    (isOverpackValid ? parsedOverpack : 0) +
    (isInsuranceValid ? parsedInsurance : 0);

  // Check if items have been modified from original
  const isItemsModifiedByAdmin = Boolean(
    adminReviewingOrder?.itemsModifiedByAdmin ||
    (adminReviewingOrder?.originalItems &&
     adminReviewingOrder.items &&
     (adminReviewingOrder.items.length !== adminReviewingOrder.originalItems.length ||
      adminReviewingOrder.itemsCount !== adminReviewingOrder.originalItems.reduce((s, it) => s + it.qty, 0) ||
      adminReviewingOrder.items.some((it, idx) => {
        const orig = adminReviewingOrder.originalItems?.[idx];
        return !orig || orig.productId !== it.productId || orig.qty !== it.qty || orig.price !== it.price;
      })))
  );

  const handleDeclineOrderFulfillment = () => {
    if (!adminReviewingOrder || !areAllFeesFilled) return;
    const finalReason = adminDeclineReason === 'Other' && customDeclineReason.trim()
      ? customDeclineReason.trim()
      : adminDeclineReason;

    const updated = orders.map((ord) => {
      if (ord.id === adminReviewingOrder.id) {
        return {
          ...ord,
          shippingFee: parsedShipping,
          salesTax: parsedSalesTax,
          serviceTax: parsedServiceTax,
          overpackFee: parsedOverpack,
          insuranceFee: parsedInsurance,
          total: adminCalculatedGrandTotal,
          status: 'Declined by Admin' as const,
          adminDecision: 'declined' as const,
          adminDeclineReason: finalReason,
          adminReviewedAt: new Date().toISOString(),
        };
      }
      return ord;
    });

    setOrders(updated);
    localStorage.setItem('distro_orders', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('distro_storage_updated'));
    setOrderActionFeedback(`Order #${adminReviewingOrder.orderNumber} has been DECLINED (Reason: ${finalReason}). Status updated to "Declined by Admin".`);
    setAdminReviewingOrder(null);
    setShowDeclineConfirm(false);
    setTimeout(() => setOrderActionFeedback(null), 8000);
  };

  const handleApproveOrderFulfillment = () => {
    if (!adminReviewingOrder || !areAllFeesFilled) return;
    if (!adminReviewingOrder.items || adminReviewingOrder.items.length === 0 || adminReviewingOrder.itemsCount === 0) {
      alert("Cannot approve an order with 0 items. Please add items or decline the order.");
      return;
    }

    const finalStatus: OrderStatus = 'Credited';

    const orderTotal = adminCalculatedGrandTotal;

    const updated = orders.map((ord) => {
      if (ord.id === adminReviewingOrder.id) {
        return {
          ...ord,
          items: adminReviewingOrder.items,
          itemsCount: adminReviewingOrder.itemsCount,
          subtotal: currentOrderSubtotal,
          shippingFee: parsedShipping,
          salesTax: parsedSalesTax,
          serviceTax: parsedServiceTax,
          overpackFee: parsedOverpack,
          insuranceFee: parsedInsurance,
          total: orderTotal,
          status: finalStatus,
          itemsModifiedByAdmin: isItemsModifiedByAdmin,
          originalItems: adminReviewingOrder.originalItems || ord.items,
          originalSubtotal: adminReviewingOrder.originalSubtotal || ord.subtotal || ord.total,
          adminDecision: isItemsModifiedByAdmin ? ('approved_with_changes' as const) : ('approved' as const),
          adminReviewedAt: new Date().toISOString(),
          paymentStatus: 'Credit Allocated' as const,
        };
      }
      return ord;
    });

    setOrders(updated);
    localStorage.setItem('distro_orders', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('distro_storage_updated'));

    // Calculate credit allocation & remaining credit balance for the member after approval
    const creditDetails = calculateRemainingCreditAfterApproval(
      {
        ...adminReviewingOrder,
        total: orderTotal,
        subtotal: currentOrderSubtotal,
      },
      members,
      orders,
      masterCreditLimit
    );

    // Match member to retrieve their allocated payment cycle days
    const matchedMember = members.find(
      (m) =>
        m.username.toLowerCase() === (adminReviewingOrder.memberUsername || '').toLowerCase() ||
        m.name.toLowerCase() === (adminReviewingOrder.customerName || '').toLowerCase()
    );
    const memberCycleDays = matchedMember?.paymentCycleDays ?? 14;
    const computedDueDate = new Date(Date.now() + memberCycleDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Auto-generate or update invoice in distro_invoices for the member
    const newInvoice: InvoiceItem = {
      invoiceNumber: `INV-${adminReviewingOrder.orderNumber.replace('ORD-', '')}`,
      orderNumber: adminReviewingOrder.orderNumber,
      title: 'Product Purchase Order',
      memberId: matchedMember?.id || adminReviewingOrder.memberId,
      memberUsername: matchedMember?.username || adminReviewingOrder.memberUsername,
      customerName: adminReviewingOrder.customerName,
      billedTo: adminReviewingOrder.customerName,
      date: new Date().toISOString().split('T')[0],
      dueDate: computedDueDate,
      amount: orderTotal,
      paidAmount: 0,
      balanceDue: orderTotal,
      status: 'Unpaid',
      method: 'Paid from Credit Allocation (Settlement Due)',
      creditAllocation: creditDetails.creditAllocation,
      remainingCreditBalance: creditDetails.remainingBalance,
      notes: isItemsModifiedByAdmin
        ? `Order updated, approved, and placed in Credited status. Amount (${orderTotal.toFixed(2)}) drawn from credit allocation; settlement payment to admin is due within ${memberCycleDays} days.`
        : `Order approved and placed in Credited status. Amount (${orderTotal.toFixed(2)}) drawn from credit allocation; settlement payment to admin is due within ${memberCycleDays} days.`,
    };

    try {
      const currentInvoices: InvoiceItem[] = JSON.parse(localStorage.getItem('distro_invoices') || '[]');
      const existingIndex = currentInvoices.findIndex((inv) => inv.orderNumber === adminReviewingOrder.orderNumber);
      let updatedInvoices: InvoiceItem[];
      if (existingIndex >= 0) {
        updatedInvoices = currentInvoices.map((inv, idx) => idx === existingIndex ? newInvoice : inv);
      } else {
        updatedInvoices = [newInvoice, ...currentInvoices];
      }
      setInvoices(updatedInvoices);
      localStorage.setItem('distro_invoices', JSON.stringify(updatedInvoices));
    } catch (err) {
      console.error('Invoice sync error:', err);
    }

    setOrderActionFeedback(
      `Order #${adminReviewingOrder.orderNumber} has been CREDITED! Total: $${orderTotal.toFixed(2)}. Member Credit Remaining: $${creditDetails.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of $${creditDetails.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} allocation. Live status updated to "Credited".`
    );
    setAdminReviewingOrder(null);
    setTimeout(() => setOrderActionFeedback(null), 8000);
  };

  // Available permissions list
  const availablePermissions = [
    'Place Orders',
    'View Invoices',
    'Manage Inventory',
    'Approve Payments',
    'Process Payments',
    'Browse Catalog',
    'Financial Reports'
  ];

  // Handlers for cart & order submission
  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 9999;
    if (maxStock <= 0) return;

    setOrderCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        if (existing.qty >= maxStock) return prev;
        return prev.map((item) =>
          item.productId === productId ? { ...item, qty: Math.min(maxStock, item.qty + 1) } : item
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 9999;
    const clampedQty = maxStock > 0 ? Math.min(qty, maxStock) : 1;

    setOrderCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, qty: clampedQty } : item
        );
      }
      return [...prev, { productId, qty: clampedQty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setOrderCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderCart.length === 0) return;

    const cartItemsWithDetails = orderCart.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId) || SAMPLE_PRODUCTS.find((p) => p.id === item.productId)!,
    })).filter((item) => item.product);

    const cartTotal = cartItemsWithDetails.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const totalItems = cartItemsWithDetails.reduce((sum, item) => sum + item.qty, 0);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${new Date().getFullYear()}-${randomSuffix}`;
    const today = new Date().toISOString().split('T')[0];

    const selectedMember = (selectedMemberId ? members.find((m) => m.id === selectedMemberId) : null) ||
      members.find((m) => (m.businessAddress || m.storeLocation) === selectedStore) ||
      (members.length > 0 ? members[0] : null);

    const customerName = selectedMember ? selectedMember.name : (selectedStore || 'Store Account');
    const businessAddress = selectedMember 
      ? (selectedMember.businessAddress || selectedMember.storeLocation || selectedStore) 
      : selectedStore;

    const newOrder: OrderItem = {
      id: `ord_${Date.now()}`,
      orderNumber,
      date: today,
      // EXACT STATUS: "Pending review and approval by Admin" so it appears in "View Open Orders" ready for "$ Review & Set Fees"
      status: 'Pending review and approval by Admin',
      customerName,
      memberId: selectedMember?.id,
      memberUsername: selectedMember?.username,
      businessAddress,
      destinationAddress: businessAddress,
      items: cartItemsWithDetails.map((ci) => ({
        productId: ci.productId,
        name: ci.product.name,
        sku: ci.product.sku,
        price: ci.product.price,
        qty: ci.qty,
      })),
      itemsCount: totalItems,
      subtotal: cartTotal,
      shippingFee: 0,
      salesTax: 0,
      serviceTax: 0,
      overpackFee: 0,
      insuranceFee: 0,
      total: cartTotal,
      paymentStatus: 'Credit Allocated',
      notes: selectedMember 
        ? `Placed by Admin on behalf of ${selectedMember.name} (@${selectedMember.username})` 
        : 'Placed by Admin on behalf of store account',
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    try {
      localStorage.setItem('distro_orders', JSON.stringify(updatedOrders));
    } catch {}

    // Deduct stock from realtime inventory maintained by Admin
    const updatedProducts = products.map((p) => {
      const inOrder = cartItemsWithDetails.find((ci) => ci.productId === p.id);
      if (inOrder) {
        return {
          ...p,
          stock: Math.max(0, p.stock - inOrder.qty),
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    setOrderSubmittedMsg(`Order #${orderNumber} placed for ${customerName}! Real-time inventory has been updated.`);
    setOrderCart([]);
    setTimeout(() => setOrderSubmittedMsg(''), 8000);
  };

  // Toggle collapsible row for an invoice
  const toggleExpandInvoice = (invoiceNumber: string, defaultAmount?: number) => {
    setExpandedInvoices((prev) => {
      const nextState = { ...prev, [invoiceNumber]: !prev[invoiceNumber] };
      return nextState;
    });

    if (defaultAmount !== undefined && (paymentAmounts[invoiceNumber] === undefined || paymentAmounts[invoiceNumber] === '')) {
      setPaymentAmounts((prev) => ({ ...prev, [invoiceNumber]: defaultAmount.toFixed(2) }));
    }
    if (!paymentMethods[invoiceNumber]) {
      setPaymentMethods((prev) => ({ ...prev, [invoiceNumber]: 'Paid with ACH/Wire transfer' }));
    }
    if (!paymentDates[invoiceNumber]) {
      setPaymentDates((prev) => ({ ...prev, [invoiceNumber]: new Date().toISOString().split('T')[0] }));
    }
  };

  // Record payment against an invoice (supports Partial & Full settlement, and all 4 dropdown options)
  const handleRecordInvoicePayment = (invoice: InvoiceItem) => {
    const summary = getInvoicePaymentSummary(invoice, payments);
    const entered = paymentAmounts[invoice.invoiceNumber];
    const amountToPay = entered !== undefined && entered.trim() !== '' 
      ? parseFloat(entered) 
      : summary.currentBalanceDue;

    if (isNaN(amountToPay) || amountToPay <= 0) {
      setPaymentFeedback({
        invoiceNumber: invoice.invoiceNumber,
        message: 'Please enter a valid payment amount greater than $0.00.',
        type: 'error',
      });
      return;
    }

    const method: PaymentMethodOption = paymentMethods[invoice.invoiceNumber] || 'Paid with ACH/Wire transfer';
    const ref = paymentRefs[invoice.invoiceNumber] || '';
    const payDate = paymentDates[invoice.invoiceNumber] || new Date().toISOString().split('T')[0];
    const notes = paymentNotes[invoice.invoiceNumber] || '';

    const newPayment: PaymentItem = {
      paymentId: `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      memberUsername: invoice.memberUsername,
      customerName: invoice.customerName || invoice.billedTo,
      date: payDate,
      amount: amountToPay,
      method: method,
      status: 'Completed',
      referenceNumber: ref.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    localStorage.setItem('distro_payments', JSON.stringify(updatedPayments));

    // Recalculate invoice settlement & status
    const allInvoicePayments = updatedPayments.filter(
      (p) => p.invoiceNumber === invoice.invoiceNumber && p.status === 'Completed'
    );
    const totalPaidNow = allInvoicePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newBalanceDue = Math.max(0, invoice.amount - totalPaidNow);
    const isFullySettled = newBalanceDue <= 0.001;
    const isPartiallySettled = totalPaidNow > 0.001 && newBalanceDue > 0.001;

    const nextInvoiceStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' = isFullySettled
      ? 'Paid'
      : isPartiallySettled
      ? 'Partial'
      : invoice.status === 'Overdue'
      ? 'Overdue'
      : 'Unpaid';

    const updatedInvoices = invoices.map((inv) => {
      if (inv.invoiceNumber === invoice.invoiceNumber) {
        return {
          ...inv,
          paidAmount: totalPaidNow,
          balanceDue: newBalanceDue,
          status: nextInvoiceStatus,
        };
      }
      return inv;
    });
    setInvoices(updatedInvoices);
    localStorage.setItem('distro_invoices', JSON.stringify(updatedInvoices));

    if (invoice.orderNumber) {
      const updatedOrders = orders.map((o) => {
        if (o.orderNumber === invoice.orderNumber) {
          return {
            ...o,
            paymentStatus: isFullySettled ? ('Paid' as const) : ('Pending' as const),
          };
        }
        return o;
      });
      setOrders(updatedOrders);
      localStorage.setItem('distro_orders', JSON.stringify(updatedOrders));
    }

    window.dispatchEvent(new CustomEvent('distro_storage_updated'));

    setPaymentFeedback({
      invoiceNumber: invoice.invoiceNumber,
      message: `Payment of $${amountToPay.toFixed(2)} (${method}) successfully recorded! ${
        isFullySettled 
          ? 'Invoice is now fully settled ($0.00 balance).' 
          : `Invoice marked as Partial. Remaining balance due: $${newBalanceDue.toFixed(2)}.`
      }`,
      type: 'success',
    });

    // Reset fields for remaining balance
    setPaymentAmounts((prev) => ({
      ...prev,
      [invoice.invoiceNumber]: newBalanceDue > 0 ? newBalanceDue.toFixed(2) : '0.00',
    }));
    setPaymentRefs((prev) => ({ ...prev, [invoice.invoiceNumber]: '' }));
    setPaymentNotes((prev) => ({ ...prev, [invoice.invoiceNumber]: '' }));

    setTimeout(() => {
      setPaymentFeedback((curr) => (curr?.invoiceNumber === invoice.invoiceNumber ? null : curr));
    }, 6000);
  };

  // Delete / void a payment record
  const handleDeleteInvoicePayment = (paymentId: string, invoiceNumber: string) => {
    const updatedPayments = payments.filter((p) => p.paymentId !== paymentId);
    setPayments(updatedPayments);
    localStorage.setItem('distro_payments', JSON.stringify(updatedPayments));

    const inv = invoices.find((i) => i.invoiceNumber === invoiceNumber);
    if (inv) {
      const remainingPayments = updatedPayments.filter(
        (p) => p.invoiceNumber === invoiceNumber && p.status === 'Completed'
      );
      const totalPaidNow = remainingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const newBalanceDue = Math.max(0, inv.amount - totalPaidNow);
      const isFullySettled = newBalanceDue <= 0.001;
      const isPartiallySettled = totalPaidNow > 0.001 && newBalanceDue > 0.001;

      const nextInvoiceStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' = isFullySettled
        ? 'Paid'
        : isPartiallySettled
        ? 'Partial'
        : inv.status === 'Overdue'
        ? 'Overdue'
        : 'Unpaid';

      const updatedInvoices = invoices.map((i) => {
        if (i.invoiceNumber === invoiceNumber) {
          return {
            ...i,
            paidAmount: totalPaidNow,
            balanceDue: newBalanceDue,
            status: nextInvoiceStatus,
          };
        }
        return i;
      });
      setInvoices(updatedInvoices);
      localStorage.setItem('distro_invoices', JSON.stringify(updatedInvoices));

      if (inv.orderNumber) {
        const updatedOrders = orders.map((o) => {
          if (o.orderNumber === inv.orderNumber) {
            return {
              ...o,
              paymentStatus: isFullySettled ? ('Paid' as const) : ('Pending' as const),
            };
          }
          return o;
        });
        setOrders(updatedOrders);
        localStorage.setItem('distro_orders', JSON.stringify(updatedOrders));
      }

      window.dispatchEvent(new CustomEvent('distro_storage_updated'));
      setPaymentAmounts((prev) => ({
        ...prev,
        [invoiceNumber]: newBalanceDue.toFixed(2),
      }));

      setPaymentFeedback({
        invoiceNumber,
        message: `Payment record voided. Current balance due recalculated to $${newBalanceDue.toFixed(2)}.`,
        type: 'success',
      });
      setTimeout(() => {
        setPaymentFeedback((curr) => (curr?.invoiceNumber === invoiceNumber ? null : curr));
      }, 5000);
    }
  };

  // Payment settlement toggle / handler
  const handlePayInvoice = (invoiceNumber: string) => {
    const inv = invoices.find((i) => i.invoiceNumber === invoiceNumber);
    if (!inv) return;
    const summary = getInvoicePaymentSummary(inv, payments);
    toggleExpandInvoice(invoiceNumber, summary.currentBalanceDue);
  };

  // Helper generators for invoice IDs and reference numbers
  const generateRandomInvoiceNumber = () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const generateRandomRefNumber = (title: string) => {
    const prefix = 
      title === 'Late Payment' ? 'REF-LP' :
      title === 'Chargeback' ? 'REF-CB' :
      title === 'Check Bounce' ? 'REF-CHK' :
      title === 'Low Performance Penalty' ? 'REF-LPP' :
      title === 'Good Performance Bonus' ? 'REF-GPB' : 'REF-MISC';
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleOpenCreateInvoice = (preselectedMemberId?: string, preselectedTitle?: 'Late Payment' | 'Chargeback' | 'Check Bounce' | 'Low Performance Penalty' | 'Good Performance Bonus' | 'Miscellenous') => {
    const defaultMember = preselectedMemberId || (members.length > 0 ? members[0].id : '');
    const title = preselectedTitle || 'Late Payment';
    setInvoiceBilledToMemberId(defaultMember);
    setInvoiceTitle(title);
    setInvoiceNumberInput(generateRandomInvoiceNumber());
    setInvoiceOrderRefInput(generateRandomRefNumber(title));
    setInvoiceAmountInput(title === 'Good Performance Bonus' ? '-50.00' : '150.00');
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setInvoiceDateInput(today);
    setInvoiceDueDateInput(due);
    setInvoicePaymentMethodInput('ACH Transfer');
    setInvoiceNotesInput('');
    setInvoiceStatusInput('Unpaid');
    setInvoiceFormError('');
    setIsCreateInvoiceOpen(true);
  };

  const handleInvoiceTitleChange = (newTitle: 'Late Payment' | 'Chargeback' | 'Check Bounce' | 'Low Performance Penalty' | 'Good Performance Bonus' | 'Miscellenous') => {
    setInvoiceTitle(newTitle);
    if (!invoiceOrderRefInput || invoiceOrderRefInput.startsWith('REF-')) {
      setInvoiceOrderRefInput(generateRandomRefNumber(newTitle));
    }
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceFormError('');

    if (!invoiceBilledToMemberId) {
      setInvoiceFormError('Please select a member to bill this invoice to.');
      return;
    }

    const selectedMember = members.find((m) => m.id === invoiceBilledToMemberId);
    if (!selectedMember) {
      setInvoiceFormError('Selected member record could not be found.');
      return;
    }

    const numAmount = parseFloat(invoiceAmountInput);
    if (isNaN(numAmount) || Math.abs(numAmount) < 0.001) {
      setInvoiceFormError('Please enter a valid non-zero invoice amount (positive for charges/fees, negative for credit memos/refunds).');
      return;
    }

    if (!invoiceNumberInput.trim()) {
      setInvoiceFormError('Please provide an invoice number.');
      return;
    }

    const finalOrderNumber = invoiceOrderRefInput.trim() || generateRandomRefNumber(invoiceTitle);
    const memberDisplayName = `${selectedMember.name}${selectedMember.storeLocation ? ` (${selectedMember.storeLocation})` : ''}`;
    const isNegative = numAmount < 0;

    const newInvoiceItem: InvoiceItem = {
      invoiceNumber: invoiceNumberInput.trim(),
      orderNumber: finalOrderNumber,
      title: invoiceTitle,
      memberId: selectedMember.id,
      memberUsername: selectedMember.username,
      customerName: memberDisplayName,
      billedTo: memberDisplayName,
      date: invoiceDateInput || new Date().toISOString().split('T')[0],
      dueDate: invoiceDueDateInput || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: numAmount,
      paidAmount: invoiceStatusInput === 'Paid' ? numAmount : 0,
      balanceDue: invoiceStatusInput === 'Paid' ? 0 : numAmount,
      status: invoiceStatusInput,
      method: invoicePaymentMethodInput,
      notes: invoiceNotesInput.trim() || undefined,
    };

    if (invoiceStatusInput === 'Paid') {
      const newPayment: PaymentItem = {
        paymentId: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNumber: newInvoiceItem.invoiceNumber,
        memberUsername: selectedMember.username,
        customerName: selectedMember.name,
        date: invoiceDateInput || new Date().toISOString().split('T')[0],
        amount: numAmount,
        method: (invoicePaymentMethodInput as any) || (isNegative ? 'Company Credit Line' : 'ACH / Wire'),
        status: 'Completed',
        notes: isNegative ? 'Credit Memo Settled / Applied' : undefined,
      };
      setPayments((prev) => [newPayment, ...prev]);
    }

    setInvoices((prev) => [newInvoiceItem, ...prev]);
    setIsCreateInvoiceOpen(false);
    const formattedAmt = isNegative ? `-$${Math.abs(numAmount).toFixed(2)} (Credit Memo)` : `$${numAmount.toFixed(2)}`;
    setInvoiceSuccessMsg(`Invoice #${newInvoiceItem.invoiceNumber} (${invoiceTitle} • ${formattedAmt}) has been successfully issued to ${selectedMember.name}!`);
    setTimeout(() => setInvoiceSuccessMsg(''), 8000);
  };

  const renderInvoiceTitleBadge = (title?: string) => {
    switch (title) {
      case 'Late Payment':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Late Payment</span>
          </span>
        );
      case 'Chargeback':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>Chargeback</span>
          </span>
        );
      case 'Check Bounce':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-purple-600 shrink-0" />
            <span>Check Bounce</span>
          </span>
        );
      case 'Low Performance Penalty':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-300 inline-flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-orange-600 shrink-0" />
            <span>Low Performance Penalty</span>
          </span>
        );
      case 'Good Performance Bonus':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Good Performance Bonus</span>
          </span>
        );
      case 'Miscellenous':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
            <Receipt className="w-3 h-3 text-blue-600 shrink-0" />
            <span>Miscellenous</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{title || 'Order Billing'}</span>
          </span>
        );
    }
  };

  // Order status advancement handler
  const handleUpdateOrderStatus = (orderId: string, status: 'Open' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled') => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    setOrders(updated);
    localStorage.setItem('distro_orders', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('distro_storage_updated'));
  };

  // Handlers for adding member
  const handleTogglePermission = (perm: string) => {
    setMemberPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleNameChange = (val: string) => {
    setMemberName(val);
    if (!memberUsername || memberUsername === memberName.toLowerCase().replace(/\s+/g, '')) {
      setMemberUsername(val.toLowerCase().replace(/\s+/g, ''));
    }
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      setMemberFeedback({ type: 'error', message: 'Please enter the member\'s full name.' });
      return;
    }
    if (!memberEmail.trim() || !memberEmail.includes('@')) {
      setMemberFeedback({ type: 'error', message: 'Please provide a valid work email address.' });
      return;
    }
    if (!businessStreet.trim()) {
      setMemberFeedback({ type: 'error', message: 'Please enter the street address for the business address.' });
      return;
    }
    if (!businessCity.trim()) {
      setMemberFeedback({ type: 'error', message: 'Please enter the city for the business address.' });
      return;
    }
    if (!businessZip.trim()) {
      setMemberFeedback({ type: 'error', message: 'Please enter the ZIP / postal code for the business address.' });
      return;
    }

    const usernameFinal = (allocateTempUsername && tempUsername.trim())
      ? tempUsername.trim()
      : memberUsername.trim() || memberName.toLowerCase().replace(/\s+/g, '');
    
    // Check for duplicate username/email
    const existing = members.find(
      (m) => m.username.toLowerCase() === usernameFinal.toLowerCase() || m.email.toLowerCase() === memberEmail.toLowerCase()
    );
    if (existing) {
      setMemberFeedback({ type: 'error', message: `A member with username "${usernameFinal}" or email "${memberEmail}" already exists.` });
      return;
    }

    const addressParts = [
      businessStreet.trim(),
      businessSuite.trim(),
      `${businessCity.trim()}, ${businessState} ${businessZip.trim()}`.trim(),
      businessCountry !== 'United States' ? businessCountry : ''
    ].filter(Boolean);

    const fullBusinessAddress = addressParts.join(', ');

    const newMember: TeamMember = {
      id: `mem-${Date.now().toString().slice(-4)}`,
      name: memberName.trim(),
      email: memberEmail.trim(),
      username: usernameFinal,
      role: memberRole,
      storeLocation: fullBusinessAddress,
      businessAddress: fullBusinessAddress,
      businessAddressDetails: {
        street: businessStreet.trim(),
        suite: businessSuite.trim(),
        city: businessCity.trim(),
        state: businessState,
        zip: businessZip.trim(),
        country: businessCountry
      },
      phone: memberPhone.trim() || '(555) 000-0000',
      status: sendInviteEmail ? 'Pending Activation' : 'Active',
      dateAdded: new Date().toISOString().split('T')[0],
      permissions: memberPermissions.length > 0 ? memberPermissions : ['Place Orders'],
      creditAllocation: memberCreditAllocation,
      paymentCycleDays: memberPaymentCycleDays || 14,
      tempPassword: allocateTempPassword && tempPassword.trim() ? tempPassword.trim() : undefined,
      isTempUsername: allocateTempUsername,
      isTempPassword: allocateTempPassword,
      tempPasswordExpire: allocateTempPassword ? tempPasswordExpire : undefined,
      mustResetPassword: allocateTempPassword ? requirePasswordReset : false,
      invitationSentDate: sendInviteEmail ? new Date().toISOString() : undefined,
    };

    const updatedMembers = [newMember, ...members];
    setMembers(updatedMembers);

    try {
      localStorage.setItem('distro_team_members', JSON.stringify(updatedMembers));
      window.dispatchEvent(new Event('distro_storage_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Storage sync error:', e);
    }

    // Persist to Cloud Firestore
    saveMemberToFirestore(newMember).catch((err) => {
      console.warn('Firestore member save error:', err);
    });

    setMemberFeedback({
      type: 'success',
      message: `Member "${newMember.name}" successfully created! Login: "${newMember.username}"${newMember.tempPassword ? ` | Temp Password: "${newMember.tempPassword}"` : ''} | Business Address: "${fullBusinessAddress}" with a $${memberCreditAllocation.toLocaleString()} credit allocation & ${memberPaymentCycleDays || 14}-day payment cycle.`
    });

    // If "Send email invitation with secure setup link" was checked, immediately open invitation modal
    if (sendInviteEmail) {
      setSelectedInviteMember(newMember);
      setInviteModalOpen(true);
    }

    // Reset form
    setMemberName('');
    setMemberEmail('');
    setMemberUsername('');
    setBusinessStreet('');
    setBusinessSuite('');
    setBusinessCity('');
    setBusinessState('CA');
    setBusinessZip('');
    setBusinessCountry('United States');
    setMemberPhone('');
    setMemberCreditAllocation(masterCreditLimit);
    setMemberPaymentCycleDays(14);
    setMemberPermissions(['Place Orders', 'View Invoices']);
    setAllocateTempUsername(false);
    setTempUsername('');
    setAllocateTempPassword(false);
    setTempPassword('');
    setShowTempPassword(false);

    // Auto clear feedback after 6 seconds
    setTimeout(() => {
      setMemberFeedback(null);
    }, 6000);
  };

  const handleMarkInviteSent = (memberId: string) => {
    const now = new Date().toISOString();
    setMembers((prev) => {
      const next = prev.map((m) => {
        if (m.id === memberId) {
          const upd = { ...m, invitationSentDate: now };
          saveMemberToFirestore(upd).catch(() => {});
          return upd;
        }
        return m;
      });
      try {
        localStorage.setItem('distro_team_members', JSON.stringify(next));
        window.dispatchEvent(new Event('distro_storage_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleToggleMemberStatus = (id: string) => {
    setMembers((prev) => {
      const next = prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === 'Active' ? 'Suspended' : 'Active';
          const upd = { ...m, status: nextStatus as 'Active' | 'Suspended' };
          saveMemberToFirestore(upd).catch(() => {});
          return upd;
        }
        return m;
      });
      try {
        localStorage.setItem('distro_team_members', JSON.stringify(next));
        window.dispatchEvent(new Event('distro_storage_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const handleDeleteMember = (member: TeamMember) => {
    setDeletingMember(member);
  };

  const confirmDeleteMember = (id: string) => {
    const target = members.find((m) => m.id === id);
    const next = members.filter((m) => m.id !== id);
    setMembers(next);
    try {
      localStorage.setItem('distro_team_members', JSON.stringify(next));
      window.dispatchEvent(new Event('distro_storage_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
    deleteMemberFromFirestore(id).catch((err) => console.warn('Firestore delete error:', err));
    setDeletingMember(null);
    setMemberFeedback({
      type: 'success',
      message: `Member "${target?.name || 'User'}" (${target?.username || ''}) has been permanently removed from the team.`
    });
    setTimeout(() => setMemberFeedback(null), 5000);
  };

  const handleCopyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleUpdateMemberTerms = (id: string, newCredit: number, newPaymentCycleDays: number) => {
    const updated = members.map((m) =>
      m.id === id ? { ...m, creditAllocation: newCredit, paymentCycleDays: newPaymentCycleDays } : m
    );
    setMembers(updated);
    try {
      localStorage.setItem('distro_team_members', JSON.stringify(updated));
      window.dispatchEvent(new Event('distro_storage_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to sync updated member terms:', err);
    }
    setMemberFeedback({
      type: 'success',
      message: `Account terms updated successfully: Credit line set to ${newCredit.toLocaleString()} | Payment cycle set to ${newPaymentCycleDays} days.`
    });
    setEditingTermsMember(null);
    setTimeout(() => setMemberFeedback(null), 4000);
  };

  const handleUpdateMemberCredit = (id: string, newCredit: number) => {
    const target = members.find((m) => m.id === id);
    handleUpdateMemberTerms(id, newCredit, target?.paymentCycleDays ?? 14);
  };

  // Render Product Section Helper
  const renderProductGrid = (categoryKey: string, categoryTitle: string, categoryIcon: React.ReactNode) => {
    const categoryProducts = products.filter((p) => p.category === categoryKey);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              {categoryIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{categoryTitle}</h2>
              <p className="text-xs text-slate-500">Showing {categoryProducts.length} active distribution catalog items</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('shop-settings')}
              id={`admin-shop-settings-btn-${categoryKey}`}
              className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-600" /> Shop Settings
            </button>
            <button
              onClick={() => onNavigate('place-new-order')}
              className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Go to Order Form
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryProducts.map((item) => {
            const inCart = orderCart.find((ci) => ci.productId === item.id);
            const isOutOfStock = item.stock <= 0;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  inCart ? 'border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Product Image / Device Photo */}
                  {item.image && (
                    <div className="mb-4 h-44 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center p-2">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-200" 
                      />
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold uppercase border border-slate-200">
                      SKU: {item.sku}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.visibilityMode && item.visibilityMode !== 'all' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.visibilityMode === 'hidden' 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : item.visibilityMode === 'selected_members' 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {item.visibilityMode === 'hidden' ? 'Hidden' : item.visibilityMode === 'selected_members' ? 'Selected Members' : 'Custom Rules'}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                        isOutOfStock 
                          ? 'text-rose-700 bg-rose-50 border-rose-200'
                          : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      }`}>
                        {isOutOfStock ? 'Out of Stock (0)' : `In Stock (${item.stock})`}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug">{item.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{item.description}</p>

                  {item.specs && (
                    <div className="mb-4 space-y-1">
                      {item.specs.map((spec, idx) => (
                        <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {spec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Wholesale Price</span>
                    <span className="text-lg font-extrabold text-slate-900">${item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onNavigate('shop-settings')}
                      className="p-2 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                      title="Configure Device Image, Inventory & Member Visibility"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {inCart ? (
                      <div className="flex items-center border border-blue-300 rounded-lg bg-blue-50 p-1 shadow-2xs">
                        <button
                          onClick={() => updateCartQty(item.id, inCart.qty - 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-blue-800 hover:bg-blue-200 rounded text-xs cursor-pointer transition-colors"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-xs text-blue-900 min-w-[20px] text-center">
                          {inCart.qty}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.id, inCart.qty + 1)}
                          disabled={item.stock > 0 && inCart.qty >= item.stock}
                          className={`w-6 h-6 flex items-center justify-center font-bold text-blue-800 hover:bg-blue-200 rounded text-xs cursor-pointer transition-colors ${
                            item.stock > 0 && inCart.qty >= item.stock ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title={item.stock > 0 && inCart.qty >= item.stock ? 'Max inventory stock reached' : 'Increase quantity'}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          addToCart(item.id);
                        }}
                        disabled={isOutOfStock}
                        className={`px-3.5 py-2 font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        title={isOutOfStock ? 'Product is currently out of stock' : 'Add to Order'}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{isOutOfStock ? 'Out of Stock' : 'Add to Order'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {categoryProducts.length === 0 && (
            <div className="col-span-full p-12 bg-white border border-slate-200 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-700">No items found in this category.</p>
              <button
                onClick={() => onNavigate('shop-settings')}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Add Item in Shop Settings
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Switch between views
  const renderContent = () => {
    switch (activeView) {
    case 'home':
      return (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Geometric Welcome Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-md mb-3 inline-block border border-blue-200">
                  Admin Control Hub
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                  Welcome back, {user.username}!
                </h1>
                <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  Manage product distribution orders, store invoices, catalog inventory, and member account credentials using the top navigation bar.
                </p>
              </div>
              <div className="hidden sm:flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('add-admin')}
                  id="home-quick-add-admin-btn"
                  className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Add an Admin</span>
                </button>
                <button
                  onClick={() => onNavigate('manage-members')}
                  id="home-quick-manage-members-btn"
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all flex items-center gap-2 border border-slate-200"
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Manage Members</span>
                </button>
                <button
                  onClick={() => onNavigate('add-member')}
                  id="home-quick-add-member-btn"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add a Member</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direct Navigation Links Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Menu Actions</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Master Credit Limit:</span>
                <button
                  onClick={() => {
                    setMasterLimitInput(masterCreditLimit);
                    setIsMasterCreditModalOpen(true);
                  }}
                  id="home-active-master-limit-badge"
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold text-xs rounded-md border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Click to adjust global master credit allocation limit"
                >
                  <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                  <span>${masterCreditLimit.toLocaleString()}</span>
                  <span className="text-[10px] text-blue-500 font-normal">($0 - $100k)</span>
                </button>
              </div>
            </div>

            {/* Master Credit Allocation Limit Feedback Toast */}
            {masterLimitFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
                  masterLimitFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{masterLimitFeedback.message}</span>
                </div>
                <button
                  onClick={() => setMasterLimitFeedback(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold ml-4 cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 1. MASTER CREDIT ALLOCATION LIMIT QUICK CARD (FIRST OPTION) */}
              <div 
                onClick={() => {
                  setMasterLimitInput(masterCreditLimit);
                  setIsMasterCreditModalOpen(true);
                }}
                id="home-card-master-credit-limit"
                className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 border-2 border-blue-300 hover:border-blue-600 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider shadow-2xs">
                  Global Policy
                </div>

                <div>
                  <div className="flex items-start space-x-3.5 mb-2.5">
                    <div className="p-3 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform shadow-xs shrink-0">
                      <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          Master Credit Allocation Limit
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Set across all new & old members ($0 - $100,000)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Master Limit</span>
                    <span className="text-base font-extrabold text-blue-700 font-mono">
                      ${masterCreditLimit.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium ml-1">/ $100k max</span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs group-hover:bg-blue-700">
                    <span>Adjust Limit</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Add an Admin Quick Card */}
              <div 
                onClick={() => onNavigate('add-admin')}
                id="home-card-add-admin"
                className="bg-white border border-slate-200 hover:border-purple-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors border border-purple-100">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">Add an Admin</h3>
                  <p className="text-xs text-slate-500">Provision administrator accounts</p>
                </div>
              </div>

              {/* Manage Admins Quick Card */}
              <div 
                onClick={() => onNavigate('manage-admins')}
                id="home-card-manage-admins"
                className="bg-white border border-slate-200 hover:border-purple-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors border border-purple-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">Manage Admins</h3>
                  <p className="text-xs text-slate-500">Admin roster, roles & rights</p>
                </div>
              </div>

              {/* Add a Member Quick Card */}
              <div 
                onClick={() => onNavigate('add-member')}
                id="home-card-add-member"
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">Add a Member</h3>
                  <p className="text-xs text-slate-500">Register new store or team account</p>
                </div>
              </div>

              {/* Manage Members Quick Card */}
              <div 
                onClick={() => onNavigate('manage-members')}
                id="home-card-manage-members"
                className="bg-white border border-slate-200 hover:border-indigo-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-indigo-100">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Manage Members</h3>
                  <p className="text-xs text-slate-500">Member roster, credits & roles</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('place-new-order')}
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">Place New Order</h3>
                  <p className="text-xs text-slate-500">Create new wholesale order</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('view-open-order')}
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors border border-emerald-100">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">View Open Orders</h3>
                  <p className="text-xs text-slate-500">Check active pending orders</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('invoices')}
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-indigo-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">Invoices</h3>
                  <p className="text-xs text-slate-500">View statement billing</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('metro-phones')}
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors border border-purple-100">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">Metro Phones</h3>
                  <p className="text-xs text-slate-500">Browse Metro T-Mobile phones</p>
                </div>
              </div>

              <div 
                onClick={() => onNavigate('sim-cards')}
                className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
              >
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors border border-amber-100">
                  <SimCardIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">SIM Cards</h3>
                  <p className="text-xs text-slate-500">Order SIM card inventory</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      );

    // Administrator Management Views
    case 'add-admin':
    case 'manage-admins':
      return (
        <AdminManagementView
          user={user}
          activeView={activeView}
          admins={admins}
          onSaveAdmin={handleSaveAdmin}
          onDeleteAdmin={handleDeleteAdmin}
          onToggleStatus={handleToggleAdminStatus}
          onNavigate={onNavigate}
        />
      );

    // My Account -> Add a member / Manage Members View
    case 'add-member':
    case 'manage-members':
      const filteredMembers = members.filter((m) => {
        const matchesQuery = 
          memberSearchQuery === '' ||
          m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          m.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
          (m.businessAddress && m.businessAddress.toLowerCase().includes(memberSearchQuery.toLowerCase())) ||
          (m.storeLocation && m.storeLocation.toLowerCase().includes(memberSearchQuery.toLowerCase()));
        
        const matchesRole = selectedRoleFilter === 'All' || m.role === selectedRoleFilter;
        const matchesStatus = selectedStatusFilter === 'All' || m.status === selectedStatusFilter;

        return matchesQuery && matchesRole && matchesStatus;
      });

      const activeCount = members.filter((m) => m.status === 'Active').length;
      const pendingCount = members.filter((m) => m.status === 'Pending Activation').length;
      const totalCreditAllocated = members.reduce((sum, m) => sum + (m.creditAllocation || 0), 0);

      return (
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                {activeMemberTab === 'list' ? <Users className="w-6 h-6 text-indigo-600" /> : <UserPlus className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {activeMemberTab === 'list' ? 'Manage Team Members & Accounts' : 'Add a Member & Team Accounts'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeMemberTab === 'list'
                    ? 'Review member roster, adjust credit limits ($0 - $10,000), update roles, and manage access statuses'
                    : 'Provision store staff credentials, set distribution roles, credit allocations, and permissions'}
                </p>
              </div>
            </div>

            {/* Quick Tab Switcher */}
            <div className="flex items-center p-1 bg-slate-200/80 rounded-lg border border-slate-300">
              <button
                onClick={() => setActiveMemberTab('add')}
                id="tab-add-member-form"
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  activeMemberTab === 'add'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member Form</span>
              </button>
              <button
                onClick={() => setActiveMemberTab('list')}
                id="tab-members-roster"
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  activeMemberTab === 'list'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Member Roster ({members.length})</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Members</span>
              <span className="text-2xl font-extrabold text-slate-900">{members.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">Active Accounts</span>
              <span className="text-2xl font-extrabold text-emerald-600">{activeCount}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">Total Credit Allocated</span>
              <span className="text-2xl font-extrabold text-indigo-600 font-mono">${totalCreditAllocated.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">Business Locations</span>
              <span className="text-2xl font-extrabold text-blue-600">
                {new Set(members.map((m) => m.businessAddress || m.storeLocation).filter(Boolean)).size}
              </span>
            </div>
          </div>

          {/* Global Action Feedback Message */}
          {memberFeedback && (
            <div 
              className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
                memberFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {memberFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{memberFeedback.message}</span>
              </div>
              <button 
                onClick={() => setMemberFeedback(null)} 
                className="text-slate-400 hover:text-slate-700 font-bold ml-4"
              >
                &times;
              </button>
            </div>
          )}

          {activeMemberTab === 'add' ? (
            /* Add Member Form Section */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>Create New Member Account</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fill out the member's profile, enter their verified business address, configure purchasing credit limit ($0 - $10,000), and assign permissions.
                  </p>
                </div>

                <form onSubmit={handleAddMemberSubmit} className="space-y-5" id="add-member-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={memberName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Jordan Miller"
                        id="input-member-name"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Work Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Work Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          placeholder="j.miller@metrodealers.com"
                          id="input-member-email"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        System Username <span className="text-slate-400 font-normal">(Login ID)</span>
                      </label>
                      <input
                        type="text"
                        value={memberUsername}
                        onChange={(e) => setMemberUsername(e.target.value)}
                        placeholder="jmiller"
                        id="input-member-username"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Contact Phone
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={memberPhone}
                          onChange={(e) => setMemberPhone(e.target.value)}
                          placeholder="(555) 890-1234"
                          id="input-member-phone"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Role & Responsibility */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Account Role & Responsibility</span>
                    </label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as any)}
                      id="select-member-role"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      <option value="Store Manager">Store Manager (Full Store Operations)</option>
                      <option value="Inventory Specialist">Inventory Specialist (Stock & Ordering)</option>
                      <option value="Sales Representative">Sales Representative (Sales & Catalog)</option>
                      <option value="Billing Administrator">Billing Administrator (Invoices & Payments)</option>
                      <option value="Associate">Associate (Basic Portal Access)</option>
                    </select>
                  </div>

                  {/* Business Address Form Section */}
                  <div className="pt-2 border-t border-slate-100 space-y-3" id="business-address-form-section">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>Business Address</span>
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Enter the official business location or branch office address for this team member.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                      {/* Street Address */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Street Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={businessStreet}
                            onChange={(e) => setBusinessStreet(e.target.value)}
                            placeholder="e.g. 1044 Market Street"
                            id="input-business-street"
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Suite / Unit / Building */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Suite, Unit, Building, or Floor <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            value={businessSuite}
                            onChange={(e) => setBusinessSuite(e.target.value)}
                            placeholder="e.g. Suite 300, Floor 2, or Unit B"
                            id="input-business-suite"
                            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* City, State, ZIP */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={businessCity}
                            onChange={(e) => setBusinessCity(e.target.value)}
                            placeholder="e.g. San Francisco"
                            id="input-business-city"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            State / Province <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={businessState}
                            onChange={(e) => setBusinessState(e.target.value)}
                            id="select-business-state"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {US_STATES.map((st) => (
                              <option key={st.code} value={st.code}>{st.code} - {st.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            ZIP / Postal Code <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={businessZip}
                            onChange={(e) => setBusinessZip(e.target.value)}
                            placeholder="e.g. 94103"
                            id="input-business-zip"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Country & Preview */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">Country:</span>
                          <select
                            value={businessCountry}
                            onChange={(e) => setBusinessCountry(e.target.value)}
                            id="select-business-country"
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="Puerto Rico">Puerto Rico</option>
                            <option value="Mexico">Mexico</option>
                          </select>
                        </div>

                        {(businessStreet || businessCity) && (
                          <div className="text-[11px] text-slate-500 truncate max-w-sm font-medium">
                            <span className="text-slate-400">Formatted: </span>
                            <span className="font-semibold text-slate-800">
                              {[businessStreet, businessSuite, businessCity ? `${businessCity}, ${businessState} ${businessZip}` : '', businessCountry !== 'United States' ? businessCountry : ''].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Credit Allocation Toggle Bar Section (0 - $100,000) */}
                  <div className="pt-2 border-t border-slate-100 space-y-3" id="credit-allocation-section">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-blue-600" />
                          <span>Credit Allocation</span>
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Adjustable purchasing credit line toggle bar for wholesale orders ($0 to $100,000 max).
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 flex items-center gap-1.5 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Allocated Credit:</span>
                          <span className="text-sm font-extrabold text-blue-900 font-mono">
                            ${memberCreditAllocation.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-blue-400 font-medium">/ $100,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Toggle Slider Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Min: $0 (No Credit)
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                            memberCreditAllocation === 0 ? 'bg-slate-200 text-slate-700' :
                            memberCreditAllocation <= 10000 ? 'bg-blue-100 text-blue-800' :
                            memberCreditAllocation <= 25000 ? 'bg-indigo-100 text-indigo-800' :
                            memberCreditAllocation <= 50000 ? 'bg-emerald-100 text-emerald-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {memberCreditAllocation === 0 ? 'Cash On Delivery Only' :
                             memberCreditAllocation <= 10000 ? 'Tier 1 • Basic Store Line' :
                             memberCreditAllocation <= 25000 ? 'Tier 2 • Standard Wholesale Line' :
                             memberCreditAllocation <= 50000 ? 'Tier 3 • Preferred Dealer Line' :
                             'Tier 4 • Enterprise High-Volume Credit'}
                          </span>
                          <span className="flex items-center gap-1">
                            Max: $100,000
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          </span>
                        </div>

                        {/* Visual Range Toggle Bar */}
                        <div className="relative flex items-center py-2">
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden absolute pointer-events-none">
                            <div 
                              className={`h-full transition-all duration-150 ${
                                memberCreditAllocation === 0 ? 'bg-slate-300' :
                                memberCreditAllocation <= 10000 ? 'bg-blue-500' :
                                memberCreditAllocation <= 25000 ? 'bg-indigo-500' :
                                memberCreditAllocation <= 50000 ? 'bg-emerald-500' :
                                'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
                              }`}
                              style={{ width: `${(memberCreditAllocation / 100000) * 100}%` }}
                            />
                          </div>

                          <input
                            type="range"
                            min={0}
                            max={100000}
                            step={500}
                            value={memberCreditAllocation}
                            onChange={(e) => setMemberCreditAllocation(Number(e.target.value))}
                            id="input-member-credit-slider"
                            className="w-full h-3 bg-transparent appearance-none cursor-pointer relative z-10 accent-blue-600 focus:outline-none"
                          />
                        </div>

                        {/* Milestone Tick Marks */}
                        <div className="grid grid-cols-5 text-[10px] font-medium text-slate-400 pt-0.5">
                          <button 
                            type="button" 
                            onClick={() => setMemberCreditAllocation(0)} 
                            className="text-left hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            $0
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setMemberCreditAllocation(25000)} 
                            className="text-center hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            $25,000
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setMemberCreditAllocation(50000)} 
                            className="text-center hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            $50,000
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setMemberCreditAllocation(75000)} 
                            className="text-center hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            $75,000
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setMemberCreditAllocation(100000)} 
                            className="text-right hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            $100,000
                          </button>
                        </div>
                      </div>

                      {/* Quick Select Presets & Numerical Stepper */}
                      <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
                          {[
                            { label: '$0', val: 0 },
                            { label: '$5,000', val: 5000 },
                            { label: '$10,000', val: 10000 },
                            { label: '$25,000', val: 25000 },
                            { label: '$50,000', val: 50000 },
                            { label: '$75,000', val: 75000 },
                            { label: '$100k (Max)', val: 100000 }
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setMemberCreditAllocation(preset.val)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all border cursor-pointer ${
                                memberCreditAllocation === preset.val
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Manual Fine Tune Input */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[11px] font-medium text-slate-500">Fine Tune:</span>
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              min={0}
                              max={100000}
                              step={500}
                              value={memberCreditAllocation}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100000, Number(e.target.value) || 0));
                                setMemberCreditAllocation(val);
                              }}
                              id="input-member-credit-manual"
                              className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Cycle & Settlement Terms Allocation */}
                  <div className="pt-2 border-t border-slate-100" id="member-payment-cycle-section">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Allocated Payment Cycle Days (Settlement Terms)</span>
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Configure the settlement window in days (e.g. 14, 13) after an order is approved. Invoices must be cleared within this cycle to place future orders.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-amber-900">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Cycle:</span>
                        <span className="text-sm font-mono font-extrabold text-amber-800">{memberPaymentCycleDays} Days</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-3">
                      {/* Presets */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Quick Presets:</span>
                          {[
                            { label: '7 Days', val: 7 },
                            { label: '10 Days', val: 10 },
                            { label: '13 Days', val: 13 },
                            { label: '14 Days (Standard)', val: 14 },
                            { label: '21 Days', val: 21 },
                            { label: '30 Days', val: 30 },
                            { label: '45 Days', val: 45 },
                            { label: '60 Days', val: 60 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setMemberPaymentCycleDays(item.val)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                memberPaymentCycleDays === item.val
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-500'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {/* Custom Stepper */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[11px] font-medium text-slate-500">Custom Days:</span>
                          <div className="relative w-24">
                            <input
                              type="number"
                              min={1}
                              max={180}
                              value={memberPaymentCycleDays}
                              onChange={(e) => {
                                const val = Math.max(1, Math.min(180, Number(e.target.value) || 14));
                                setMemberPaymentCycleDays(val);
                              }}
                              id="input-member-payment-cycle-manual"
                              className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          When this member places an order and it is approved, an invoice is generated due in <strong className="font-semibold">{memberPaymentCycleDays} days</strong>. In the meantime, the member can utilize their allocated credit by placing orders, but simultaneous invoice clearing must be followed to keep order placement unlocked.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Selection */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Access Permissions
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      {availablePermissions.map((perm) => (
                        <label 
                          key={perm}
                          className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer hover:text-slate-900"
                        >
                          <input
                            type="checkbox"
                            checked={memberPermissions.includes(perm)}
                            onChange={() => handleTogglePermission(perm)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-medium">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Temporary Credentials Allocation Options */}
                  <div className="pt-2 border-t border-slate-100 space-y-3" id="temporary-credentials-section">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                        <span>Temporary Credentials Provisioning</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Allocate temporary system identifiers or one-time passcodes for initial onboarding access.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Option 1: Allocate temp. username */}
                      <div 
                        className={`p-3.5 rounded-xl border transition-all ${
                          allocateTempUsername 
                            ? 'bg-blue-50/60 border-blue-200 ring-1 ring-blue-300' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                        id="option-allocate-temp-username"
                      >
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            id="checkbox-allocate-temp-username"
                            checked={allocateTempUsername}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllocateTempUsername(checked);
                              if (checked && !tempUsername) {
                                setTempUsername(generateRandomTempUsername());
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-xs font-bold text-slate-800 block">
                              Allocate temp. username
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                              Generate an isolated temporary username identifier for this onboarding session.
                            </span>
                          </div>
                        </label>

                        {allocateTempUsername && (
                          <div className="mt-3 pt-2.5 border-t border-blue-100 space-y-2 animate-in fade-in duration-150">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-800">
                              Allocated Temporary Username
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={tempUsername}
                                onChange={(e) => setTempUsername(e.target.value)}
                                placeholder="Temporary Username (Placeholder)"
                                id="input-temp-username"
                                className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setTempUsername(generateRandomTempUsername())}
                                title="Regenerate Temp Username"
                                className="p-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Regen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(tempUsername)}
                                title="Copy Temp Username"
                                className="p-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-slate-700 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium hidden sm:inline">{copiedKey === tempUsername ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-medium">
                              <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>Login ID will be provisioned on creation</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Option 2: Allocate temp. password */}
                      <div 
                        className={`p-3.5 rounded-xl border transition-all ${
                          allocateTempPassword 
                            ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-300' 
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                        id="option-allocate-temp-password"
                      >
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            id="checkbox-allocate-temp-password"
                            checked={allocateTempPassword}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllocateTempPassword(checked);
                              if (checked && !tempPassword) {
                                setTempPassword(generateRandomTempPassword());
                              }
                            }}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-xs font-bold text-slate-800 block">
                              Allocate temp. password
                            </span>
                            <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                              Generate a high-entropy temporary passcode for initial login authorization.
                            </span>
                          </div>
                        </label>

                        {allocateTempPassword && (
                          <div className="mt-3 pt-2.5 border-t border-amber-100 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                Allocated Temporary Password
                              </label>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">Expires:</span>
                                <select
                                  value={tempPasswordExpire}
                                  onChange={(e) => setTempPasswordExpire(e.target.value)}
                                  className="text-[10px] bg-white border border-amber-200 rounded px-1.5 py-0.5 text-slate-700 font-medium focus:outline-none"
                                >
                                  <option value="24 Hours">24 Hours</option>
                                  <option value="48 Hours">48 Hours</option>
                                  <option value="7 Days">7 Days</option>
                                  <option value="30 Days">30 Days</option>
                                  <option value="First Login Reset">First Login Only</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <input
                                  type={showTempPassword ? 'text' : 'password'}
                                  value={tempPassword}
                                  onChange={(e) => setTempPassword(e.target.value)}
                                  placeholder="Temporary Password (Placeholder)"
                                  id="input-temp-password"
                                  className="w-full pl-2.5 pr-7 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-mono font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowTempPassword(!showTempPassword)}
                                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                  title={showTempPassword ? 'Hide password' : 'Show password'}
                                >
                                  {showTempPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTempPassword(generateRandomTempPassword())}
                                title="Regenerate Temp Password"
                                className="p-1.5 bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Regen</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(tempPassword)}
                                title="Copy Temp Password"
                                className="p-1.5 bg-white border border-amber-200 hover:bg-amber-50 text-slate-700 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium hidden sm:inline">{copiedKey === tempPassword ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>

                            <label className="flex items-center space-x-2 cursor-pointer pt-0.5">
                              <input
                                type="checkbox"
                                checked={requirePasswordReset}
                                onChange={(e) => setRequirePasswordReset(e.target.checked)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span className="text-[11px] font-medium text-slate-700">
                                Require password reset on first login
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification & Activation Toggle */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendInviteEmail}
                        onChange={(e) => setSendInviteEmail(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Send email invitation with secure setup link
                      </span>
                    </label>
                  </div>

                  {/* Form Submission Button */}
                  <div className="pt-3 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMemberName('');
                        setMemberEmail('');
                        setMemberUsername('');
                        setBusinessStreet('');
                        setBusinessSuite('');
                        setBusinessCity('');
                        setBusinessState('CA');
                        setBusinessZip('');
                        setBusinessCountry('United States');
                        setMemberPhone('');
                        setMemberCreditAllocation(5000);
                        setAllocateTempUsername(false);
                        setTempUsername('');
                        setAllocateTempPassword(false);
                        setTempPassword('');
                        setShowTempPassword(false);
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      id="submit-add-member-btn"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Member Account</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Sidebar: Admin Editable Credential Summary & Role Guidelines */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs border border-slate-800 relative overflow-hidden" id="admin-credential-summary-card">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Key className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Credential Summary</span>
                    </div>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-400/30">
                      Admin Editable
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                    Directly edit, configure, or auto-generate temporary onboarding credentials for this member:
                  </p>

                  {/* Admin Editable Inputs */}
                  <div className="space-y-3 mb-3.5">
                    {/* Temporary Username Field */}
                    <div className="bg-slate-800/90 border border-slate-700/90 rounded-xl p-3 space-y-1.5 focus-within:border-blue-500/70 transition-all">
                      <div className="flex items-center justify-between">
                        <label 
                          htmlFor="credential-summary-temp-username"
                          className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>Temporary Username</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const u = generateRandomTempUsername();
                              setTempUsername(u);
                              setAllocateTempUsername(true);
                            }}
                            title="Generate Random Temp Username"
                            className="p-1 text-[10px] bg-slate-700/90 hover:bg-slate-700 text-blue-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Generate</span>
                          </button>
                          {tempUsername && (
                            <button
                              type="button"
                              onClick={() => handleCopyKey(tempUsername)}
                              title="Copy Temp Username"
                              className="p-1 text-[10px] bg-slate-700/90 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedKey === tempUsername ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <input
                        type="text"
                        id="credential-summary-temp-username"
                        value={tempUsername}
                        onChange={(e) => {
                          setTempUsername(e.target.value);
                          if (e.target.value.trim()) {
                            setAllocateTempUsername(true);
                          }
                        }}
                        placeholder="Temporary Username (Placeholder)"
                        className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-400 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    {/* Temporary Password Field */}
                    <div className="bg-slate-800/90 border border-slate-700/90 rounded-xl p-3 space-y-1.5 focus-within:border-emerald-500/70 transition-all">
                      <div className="flex items-center justify-between">
                        <label 
                          htmlFor="credential-summary-temp-password"
                          className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Temporary Password</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const p = generateRandomTempPassword();
                              setTempPassword(p);
                              setAllocateTempPassword(true);
                            }}
                            title="Generate Random Temp Password"
                            className="p-1 text-[10px] bg-slate-700/90 hover:bg-slate-700 text-emerald-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Generate</span>
                          </button>
                          {tempPassword && (
                            <button
                              type="button"
                              onClick={() => handleCopyKey(tempPassword)}
                              title="Copy Temp Password"
                              className="p-1 text-[10px] bg-slate-700/90 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedKey === tempPassword ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type={showTempPassword ? 'text' : 'password'}
                          id="credential-summary-temp-password"
                          value={tempPassword}
                          onChange={(e) => {
                            setTempPassword(e.target.value);
                            if (e.target.value.trim()) {
                              setAllocateTempPassword(true);
                            }
                          }}
                          placeholder="Temporary Password (Placeholder)"
                          className="w-full pl-3 pr-8 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title={showTempPassword ? 'Hide password' : 'Show password'}
                        >
                          {showTempPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Realtime Credit Limit summary badge */}
                  <div className="pt-2.5 pb-3 border-t border-slate-800 flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-blue-400" />
                      Credit Allocation:
                    </span>
                    <span className="font-mono font-bold text-white bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/60">
                      ${memberCreditAllocation.toLocaleString()}
                    </span>
                  </div>

                  {/* Confirmation Feedback if triggered */}
                  {summaryFeedback && (
                    <div className="mb-3 p-2.5 bg-emerald-950/90 border border-emerald-500/60 rounded-lg text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-medium text-[11px] leading-tight">{summaryFeedback}</span>
                    </div>
                  )}

                  {/* Submit button at the bottom to confirm temporary credentials */}
                  <button
                    type="button"
                    id="submit-temp-credentials-btn"
                    onClick={handleConfirmSummaryCredentials}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 border border-blue-400/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Submit to Confirm Temporary Credentials</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Credit & Roles Policy</span>
                  </h4>
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
                      <span className="font-bold text-blue-900 block flex items-center justify-between">
                        <span>Purchasing Credit Line</span>
                        <span className="font-mono text-[11px] text-blue-700">$0 - $100,000</span>
                      </span>
                      <span className="text-[11px] text-slate-600 leading-relaxed block mt-1">
                        Credit allocation dictates wholesale purchasing authorization. Master limit is currently set to <strong>${masterCreditLimit.toLocaleString()}</strong>. Invoices apply automatically against the assigned balance with Net 30 terms.
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-800 block">Store Managers</span>
                      <span className="text-[11px] text-slate-500">Authorized to place orders, review invoices, and verify stock shipments.</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-800 block">Inventory Specialists</span>
                      <span className="text-[11px] text-slate-500">Access to phone inventory, accessories restocking, and live stock tracking.</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-800 block">Billing Admins</span>
                      <span className="text-[11px] text-slate-500">Full control over ACH transfers, invoice statements, and payment records.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Member Directory / Roster Section */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search by member name, username, email, or business address..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Roles</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Inventory Specialist">Inventory Specialist</option>
                    <option value="Sales Representative">Sales Representative</option>
                    <option value="Billing Administrator">Billing Administrator</option>
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending Activation">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Member</th>
                      <th className="p-3.5">Business Address</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Credit Allocation</th>
                      <th className="p-3.5">Payment Cycle</th>
                      <th className="p-3.5">Permissions</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 block leading-tight">{m.name}</span>
                                {m.isTempUsername && (
                                   <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                    Temp User
                                  </span>
                                )}
                                {m.tempPassword && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200" title={`Temp Password: ${m.tempPassword}`}>
                                    Temp Pass
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono font-normal">
                                <span>@{m.username}</span>
                                <span>&bull;</span>
                                <span className="truncate max-w-[140px]">{m.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          <div className="flex items-start gap-1.5 max-w-[240px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed text-xs">
                              {m.businessAddress || m.storeLocation || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-semibold rounded text-[11px] border border-slate-200">
                            {m.role}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {(() => {
                            const mCredit = getMemberCreditSummary(m, members, orders, invoices, payments, masterCreditLimit);
                            return (
                              <button
                                type="button"
                                onClick={() => setEditingTermsMember({ 
                                  id: m.id, 
                                  name: m.name, 
                                  credit: m.creditAllocation ?? masterCreditLimit,
                                  paymentCycleDays: m.paymentCycleDays ?? 14 
                                })}
                                className="text-left group/credit hover:bg-blue-50/80 p-1.5 -m-1.5 rounded-lg transition-all cursor-pointer"
                                title="Click to adjust member credit line & payment cycle"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-slate-900 text-xs group-hover/credit:text-blue-700">
                                    ${mCredit.effectiveCreditAllocation.toLocaleString()}
                                  </span>
                                  {mCredit.isSurplus ? (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 rounded border border-emerald-300">
                                      +${mCredit.surplusPayment.toFixed(0)} Surplus
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-normal">/ $100k</span>
                                  )}
                                  <SlidersHorizontal className="w-3 h-3 text-slate-400 group-hover/credit:text-blue-600 opacity-60 group-hover/credit:opacity-100" />
                                </div>
                                <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className={`h-full rounded-full transition-all ${mCredit.isNegative ? 'bg-rose-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${Math.min(100, ((mCredit.effectiveCreditAllocation) / 100000) * 100)}%` }}
                                  />
                                </div>
                                <div className="mt-0.5">
                                  {mCredit.isNegative ? (
                                    <span className="text-[10px] text-rose-700 font-bold block">
                                      Avail: -${Math.abs(mCredit.availableCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 block">
                                      Avail: ${mCredit.availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="p-3.5">
                          {(() => {
                            const cycleInfo = getMemberPaymentCycleInfo(m, members, invoices, payments);
                            return (
                              <button
                                type="button"
                                onClick={() => setEditingTermsMember({ 
                                  id: m.id, 
                                  name: m.name, 
                                  credit: m.creditAllocation ?? masterCreditLimit,
                                  paymentCycleDays: m.paymentCycleDays ?? 14 
                                })}
                                className="text-left group/cycle hover:bg-amber-50/80 p-1.5 -m-1.5 rounded-lg transition-all cursor-pointer"
                                title="Click to adjust payment cycle days"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span className="font-bold text-slate-900 text-xs group-hover/cycle:text-amber-800">
                                    {cycleInfo.paymentCycleDays} Days Net
                                  </span>
                                  <SlidersHorizontal className="w-3 h-3 text-slate-400 group-hover/cycle:text-amber-600 opacity-60 group-hover/cycle:opacity-100" />
                                </div>
                                <div className="mt-1">
                                  {cycleInfo.hasOverdueInvoices ? (
                                    <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200 block whitespace-nowrap">
                                      {cycleInfo.overdueInvoices.length} Overdue (${cycleInfo.overdueBalance.toFixed(0)}) &bull; Locked
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 font-semibold px-1.5 py-0.5 rounded border border-emerald-200 block whitespace-nowrap">
                                      Good Standing
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {m.permissions.slice(0, 2).map((p, idx) => (
                              <span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                                {p}
                              </span>
                            ))}
                            {m.permissions.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{m.permissions.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            m.status === 'Suspended' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedInviteMember(m);
                              setInviteModalOpen(true);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Send email invitation or copy secure setup link"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Invite</span>
                          </button>
                          <button
                            onClick={() => setEditingTermsMember({ 
                              id: m.id, 
                              name: m.name, 
                              credit: m.creditAllocation ?? 5000,
                              paymentCycleDays: m.paymentCycleDays ?? 14 
                            })}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Adjust credit line & payment cycle"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Edit Terms</span>
                          </button>
                          <button
                            onClick={() => handleToggleMemberStatus(m.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            title="Toggle Active / Suspended status"
                          >
                            {m.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            id={`delete-member-btn-${m.id}`}
                            onClick={() => handleDeleteMember(m)}
                            className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded transition-colors inline-flex items-center gap-1"
                            title="Delete and remove member"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center">
                          {members.length === 0 ? (
                            <div className="flex flex-col items-center justify-center space-y-3 py-6">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <Users className="w-6 h-6" />
                              </div>
                              <h3 className="text-sm font-bold text-slate-900">No Team Members Found</h3>
                              <p className="text-xs text-slate-500 max-w-sm">
                                You haven't added any team members yet. Add your first member to assign roles, stores, and purchasing credit lines.
                              </p>
                              <button
                                type="button"
                                onClick={() => setActiveMemberTab('add')}
                                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
                              >
                                <UserPlus className="w-3.5 h-3.5" /> Add New Member
                              </button>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-xs py-4">
                              No members found matching your search and filter criteria.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reset Payments & Invoices Section (Below Manage Members in Admin My Account) */}
          <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-300/90 shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Reset Payments & Invoices (Logic Verification)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/90 text-amber-900 border border-amber-300">
                    Testing Utility
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed max-w-2xl">
                  Click below to reset all recorded invoices and payment records to zero ($0.00). This returns all credit drawdowns to $0 so you can verify that credit allocation remaining balances recalculate accurately.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-reset-payments-invoices"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-2 cursor-pointer border border-rose-500/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Payments and Invoices</span>
            </button>
          </div>

          {/* Reset Success Feedback Banner */}
          {resetSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setResetSuccessMessage('')}
                className="text-emerald-700 hover:text-emerald-950 text-sm font-bold ml-4"
              >
                &times;
              </button>
            </div>
          )}

          {/* Reset Confirmation Modal */}
          {isResetConfirmOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div 
                id="reset-payments-invoices-modal"
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Reset Payments & Invoices</h3>
                      <p className="text-xs text-slate-500">System ledger verification tool</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-lg leading-none font-bold"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-xs">Reset all invoices and payments to zero ($0.00)?</p>
                      <p className="text-[11px] leading-relaxed text-rose-800">
                        This will clear all {invoices.length} invoices and {payments.length} payment records from storage. All members' remaining credit balances will immediately return to 100% available capacity.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Current Invoices:</span>
                      <span className="font-bold font-mono text-slate-900">{invoices.length} records (${invoices.reduce((s, i) => s + i.amount, 0).toFixed(2)})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Current Payments:</span>
                      <span className="font-bold font-mono text-slate-900">{payments.length} records (${payments.reduce((s, p) => s + p.amount, 0).toFixed(2)})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-reset-payments-invoices-btn"
                    onClick={handleResetPaymentsAndInvoices}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Reset to Zero</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Member Confirmation Modal */}
          {deletingMember && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div 
                id="delete-member-modal"
                className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
                      <UserX className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Delete Team Member</h3>
                      <p className="text-xs text-slate-500">Confirm permanent account removal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeletingMember(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-lg leading-none font-bold"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-red-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11px]">
                      Are you sure you want to delete <strong className="font-bold text-red-950">{deletingMember.name}</strong> (<span className="font-mono">{deletingMember.username}</span>)? This will permanently revoke their portal access, permissions, and assigned credit line.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Assigned Role:</span>
                      <span className="font-bold text-slate-900">{deletingMember.role}</span>
                    </div>
                    <div className="flex justify-between items-start text-xs">
                      <span className="text-slate-500 font-medium shrink-0">Business Address:</span>
                      <span className="font-semibold text-slate-800 text-right line-clamp-2 max-w-[240px]">
                        {deletingMember.businessAddress || deletingMember.storeLocation || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Work Email:</span>
                      <span className="font-mono text-slate-800">{deletingMember.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Credit Limit:</span>
                      <span className="font-bold font-mono text-blue-700">
                        ${(deletingMember.creditAllocation ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeletingMember(null)}
                    id="cancel-delete-member-btn"
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDeleteMember(deletingMember.id)}
                    id="confirm-delete-member-btn"
                    className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Member</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Terms & Credit Allocation Adjustment Modal */}
          {editingTermsMember && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Manage Account Terms & Credit Line</h3>
                      <p className="text-xs text-slate-500 font-medium">{editingTermsMember.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingTermsMember(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-lg leading-none font-bold"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Credit Allocation Block */}
                  <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">Allocated Credit Line</span>
                      </div>
                      <span className="text-lg font-mono font-extrabold text-blue-700">
                        ${editingTermsMember.credit.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                        <span>$0 (No Credit)</span>
                        <span>$50,000</span>
                        <span>$100,000 (Max)</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100000}
                        step={500}
                        value={editingTermsMember.credit}
                        onChange={(e) =>
                          setEditingTermsMember((prev) =>
                            prev ? { ...prev, credit: Number(e.target.value) } : null
                          )
                        }
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Preset quick buttons */}
                    <div className="grid grid-cols-6 gap-1">
                      {[0, 10000, 25000, 50000, 75000, 100000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setEditingTermsMember((prev) =>
                              prev ? { ...prev, credit: preset } : null
                            )
                          }
                          className={`py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                            editingTermsMember.credit === preset
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {preset === 0 ? '$0' : `${preset / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Cycle Days Block */}
                  <div className="space-y-3 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-800">Payment Cycle Terms</span>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-100 border border-amber-300 rounded-md px-2 py-0.5 text-amber-900">
                        <span className="text-xs font-mono font-extrabold">{editingTermsMember.paymentCycleDays} Days Net</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Approved orders generate an invoice due in <strong className="font-semibold text-amber-900">{editingTermsMember.paymentCycleDays} days</strong>. The member can use available credit freely during this period, but exceeding the window requires clearing overdue invoices to place new orders.
                    </p>

                    {/* Preset cycle buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[7, 10, 13, 14, 21, 30, 45, 60].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() =>
                            setEditingTermsMember((prev) =>
                              prev ? { ...prev, paymentCycleDays: days } : null
                            )
                          }
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            editingTermsMember.paymentCycleDays === days
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-1 ring-amber-500'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {days} Days {days === 14 ? '(Default)' : ''}
                        </button>
                      ))}
                    </div>

                    {/* Fine-tune custom days */}
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                      <span className="text-[11px] font-medium text-slate-600">Custom Cycle Duration:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={editingTermsMember.paymentCycleDays}
                          onChange={(e) =>
                            setEditingTermsMember((prev) =>
                              prev ? { ...prev, paymentCycleDays: Math.max(1, Math.min(180, Number(e.target.value) || 14)) } : null
                            )
                          }
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-xs text-slate-500">Days</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTermsMember(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateMemberTerms(
                        editingTermsMember.id, 
                        editingTermsMember.credit, 
                        editingTermsMember.paymentCycleDays
                      )
                    }
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                  >
                    Save Account Terms
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );

    // My Account -> Invoices Views
    case 'invoices':
      const filteredCategoryInvoices = invoices.filter((inv) => {
        let categoryMatch = true;
        if (invoiceCategoryFilter === 'Order Billing') {
          categoryMatch = !inv.title;
        } else if (invoiceCategoryFilter !== 'All') {
          categoryMatch = inv.title === invoiceCategoryFilter;
        }

        let memberMatch = true;
        if (invoiceMemberFilter !== 'All') {
          const filterLower = invoiceMemberFilter.toLowerCase();
          memberMatch = Boolean(
            (inv.memberUsername && inv.memberUsername.toLowerCase() === filterLower) ||
            (inv.memberId && inv.memberId === invoiceMemberFilter) ||
            (inv.billedTo && inv.billedTo.toLowerCase().includes(filterLower)) ||
            (inv.customerName && inv.customerName.toLowerCase().includes(filterLower))
          );
        }

        return categoryMatch && memberMatch;
      });

      return (
        <div className="space-y-6">
          {/* Header with Title and Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">Account Invoices</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {invoices.length} Total Statements
                  </span>
                </div>
                <p className="text-xs text-slate-500">Manage account statements, payments, fee assessments and dealer billing records</p>
              </div>
            </div>

            {/* Invoices Action Buttons: Invoice Search + Create an Invoice */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button 
                type="button"
                onClick={() => onNavigate('invoices-search')}
                id="btn-nav-invoice-search"
                className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-2xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Invoice Search</span>
              </button>

              <button 
                type="button"
                onClick={() => handleOpenCreateInvoice()}
                id="btn-create-invoice"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs hover:shadow cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Create an Invoice</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {invoiceSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-semibold shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{invoiceSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceSuccessMsg('')}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Category & Member Filter Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 overflow-x-auto scrollbar-none">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Filter Title:</span>
                {[
                  { label: 'All', count: invoices.length },
                  { label: 'Late Payment', count: invoices.filter(i => i.title === 'Late Payment').length },
                  { label: 'Chargeback', count: invoices.filter(i => i.title === 'Chargeback').length },
                  { label: 'Check Bounce', count: invoices.filter(i => i.title === 'Check Bounce').length },
                  { label: 'Low Performance Penalty', count: invoices.filter(i => i.title === 'Low Performance Penalty').length },
                  { label: 'Good Performance Bonus', count: invoices.filter(i => i.title === 'Good Performance Bonus').length },
                  { label: 'Miscellenous', count: invoices.filter(i => i.title === 'Miscellenous').length },
                  { label: 'Order Billing', count: invoices.filter(i => !i.title).length },
                ].map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setInvoiceCategoryFilter(tab.label)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 border ${
                      invoiceCategoryFilter === tab.label
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      invoiceCategoryFilter === tab.label ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Member Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Filter Member:
                </span>
                <div className="relative flex items-center gap-1">
                  <select
                    value={invoiceMemberFilter}
                    onChange={(e) => setInvoiceMemberFilter(e.target.value)}
                    className="pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs appearance-none max-w-[200px] truncate"
                  >
                    <option value="All">All Members ({invoices.length})</option>
                    {members.map((m) => {
                      const displayName = m.name || m.tempUsername || m.email || m.id;
                      const filterVal = m.tempUsername || m.name || m.id;
                      const mInvoicesCount = invoices.filter(
                        (inv) =>
                          (inv.memberUsername && m.tempUsername && inv.memberUsername.toLowerCase() === m.tempUsername.toLowerCase()) ||
                          (inv.memberId && inv.memberId === m.id) ||
                          (inv.billedTo && inv.billedTo.toLowerCase().includes(displayName.toLowerCase())) ||
                          (inv.customerName && inv.customerName.toLowerCase().includes(displayName.toLowerCase()))
                      ).length;
                      return (
                        <option key={m.id} value={filterVal}>
                          {displayName} ({mInvoicesCount})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                  {invoiceMemberFilter !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setInvoiceMemberFilter('All')}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="Clear member filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs shrink-0 self-end xl:self-auto border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100">
              <span className="text-slate-500 font-medium">
                Filtered Balance: <strong className="text-rose-600 font-mono font-bold">
                  ${filteredCategoryInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {filteredCategoryInvoices.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {invoiceCategoryFilter === 'All' ? 'No Invoices Issued Yet' : `No "${invoiceCategoryFilter}" Invoices Found`}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {invoiceCategoryFilter === 'All'
                    ? 'Invoices are issued for orders or manually created for Late Payments, Chargebacks, Check Bounces, or Miscellaneous fees.'
                    : `There are currently no statements categorized under "${invoiceCategoryFilter}".`}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenCreateInvoice(undefined, invoiceCategoryFilter !== 'All' && invoiceCategoryFilter !== 'Order Billing' ? invoiceCategoryFilter as any : 'Late Payment')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Create an Invoice
                  </button>
                  {invoiceCategoryFilter !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setInvoiceCategoryFilter('All')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4 w-8"></th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Invoice Title</th>
                      <th className="p-4">Billed To (Member)</th>
                      <th className="p-4">Reference / Order #</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Current Balance Due</th>
                      <th className="p-4">Credit Allocation (Remaining)</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredCategoryInvoices.map((inv) => {
                      const creditInfo = getInvoiceCreditInfo(inv, members, orders, invoices, masterCreditLimit, payments);
                      const paymentSummary = getInvoicePaymentSummary(inv, payments);
                      const isExpanded = !!expandedInvoices[inv.invoiceNumber];
                      const inputAmount = paymentAmounts[inv.invoiceNumber] ?? paymentSummary.currentBalanceDue.toFixed(2);
                      const selectedMethod = paymentMethods[inv.invoiceNumber] || 'Paid with ACH/Wire transfer';
                      const inputRef = paymentRefs[inv.invoiceNumber] || '';
                      const inputDate = paymentDates[inv.invoiceNumber] || new Date().toISOString().split('T')[0];
                      const inputNotes = paymentNotes[inv.invoiceNumber] || '';
                      const currentFeedback = paymentFeedback?.invoiceNumber === inv.invoiceNumber ? paymentFeedback : null;

                      return (
                        <React.Fragment key={inv.invoiceNumber}>
                          <tr className={`transition-colors ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}`}>
                            {/* Expand/Collapse Toggle Icon */}
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandInvoice(inv.invoiceNumber, paymentSummary.currentBalanceDue)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isExpanded 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                                title={isExpanded ? 'Collapse payment details' : 'Expand to view balance and add payments'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>

                            {/* Invoice Number */}
                            <td className="p-4 font-bold font-mono text-blue-600">
                              <button
                                type="button"
                                onClick={() => setViewingInvoice(inv)}
                                className="hover:underline text-left cursor-pointer flex items-center gap-1"
                                title="View statement details"
                              >
                                <span>{inv.invoiceNumber}</span>
                              </button>
                            </td>

                            {/* Title */}
                            <td className="p-4">
                              {renderInvoiceTitleBadge(inv.title)}
                            </td>

                            {/* Billed To */}
                            <td className="p-4">
                              <div>
                                <span className="font-bold text-slate-900 block">{inv.billedTo || inv.customerName || 'Store Member'}</span>
                                {inv.memberUsername && (
                                  <span className="text-[11px] text-blue-600 font-medium">@{inv.memberUsername}</span>
                                )}
                              </div>
                            </td>

                            {/* Order / Ref # */}
                            <td className="p-4 text-slate-600 font-mono text-[11px]">
                              {inv.orderNumber}
                            </td>

                            {/* Dates */}
                            <td className="p-4 text-slate-600">{inv.date}</td>
                            <td className="p-4 text-slate-500">{inv.dueDate}</td>

                            {/* Total Amount */}
                            <td className="p-4 font-bold font-mono text-xs">
                              {inv.amount < 0 ? (
                                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                  <span>-${Math.abs(inv.amount).toFixed(2)}</span>
                                  <span className="text-[9px] font-sans font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">Credit</span>
                                </span>
                              ) : (
                                <span className="text-slate-900">${inv.amount.toFixed(2)}</span>
                              )}
                            </td>

                            {/* Current Balance Due (Key Highlighted Metric) */}
                            <td className="p-4">
                              {paymentSummary.currentBalanceDue < -0.001 ? (
                                <div className="space-y-0.5">
                                  <span className="text-emerald-700 font-extrabold font-mono text-xs block">
                                    -${Math.abs(paymentSummary.currentBalanceDue).toFixed(2)} Credit
                                  </span>
                                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                                    Credit Balance
                                  </span>
                                </div>
                              ) : paymentSummary.currentBalanceDue > 0.001 ? (
                                <div className="space-y-0.5">
                                  <span className="text-rose-700 font-extrabold font-mono text-xs block">
                                    ${paymentSummary.currentBalanceDue.toFixed(2)} Due
                                  </span>
                                  <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 inline-block">
                                    Actual Payment Due
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-emerald-700 font-bold font-mono text-xs block">
                                    $0.00
                                  </span>
                                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                                    Settled
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Credit Allocation Info */}
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className={`font-mono text-xs ${creditInfo.isNegative ? 'text-rose-700 font-extrabold' : 'text-emerald-700'}`}>
                                    {creditInfo.remainingBalance < 0 
                                      ? `-$${Math.abs(creditInfo.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                      : `$${creditInfo.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                                    creditInfo.isNegative 
                                      ? 'text-rose-800 bg-rose-50 border-rose-200' 
                                      : creditInfo.isSurplus 
                                      ? 'text-emerald-800 bg-emerald-100 border-emerald-300' 
                                      : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                  }`}>
                                    {creditInfo.isNegative ? 'Negative' : creditInfo.isSurplus ? `+${creditInfo.surplusAmount.toFixed(0)} Surplus` : 'Available'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  of <span className="font-mono font-semibold text-slate-700">${creditInfo.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> line
                                </div>
                                <div className="w-24 bg-slate-100 rounded-full h-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      creditInfo.isNegative ? 'bg-rose-500' : creditInfo.remainingPct > 50 ? 'bg-emerald-500' : creditInfo.remainingPct > 20 ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${creditInfo.remainingPct}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                paymentSummary.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                paymentSummary.status === 'Partial' ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold' :
                                paymentSummary.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}>
                                {paymentSummary.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                              {/* Add Payment / Settle Toggle Button */}
                              <button 
                                type="button"
                                onClick={() => toggleExpandInvoice(inv.invoiceNumber, paymentSummary.currentBalanceDue)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 border ${
                                  paymentSummary.currentBalanceDue > 0
                                    ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 shadow-2xs'
                                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                                }`}
                                title={paymentSummary.currentBalanceDue > 0 ? "Add payment to settle balance" : "View payment history"}
                              >
                                {paymentSummary.currentBalanceDue > 0 ? (
                                  <>
                                    <PlusCircle className="w-3 h-3 text-blue-600" />
                                    <span>Add Payment</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Paid ({paymentSummary.payments.length})</span>
                                  </>
                                )}
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
                                  downloadInvoicePdf({ 
                                    invoice: inv, 
                                    order: matchingOrder,
                                    creditAllocation: creditInfo.creditAllocation,
                                    remainingCreditBalance: creditInfo.remainingBalance
                                  });
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs" 
                                title="Print / Download PDF Invoice"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Print PDF</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => setViewingInvoice(inv)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex cursor-pointer" 
                                title="View Statement"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Collapsible Row Right Below Master Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b-2 border-blue-200 animate-in fade-in duration-150">
                              <td colSpan={12} className="p-0">
                                <div className="p-5 sm:p-6 space-y-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 border-l-4 border-l-blue-600 rounded-b-xl shadow-inner">
                                  
                                  {/* Top Row Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                                    <div className="flex items-center space-x-2.5">
                                      <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                                        <Receipt className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-slate-900 text-sm">Invoice #{inv.invoiceNumber}</span>
                                          <span className="text-[11px] text-slate-500 font-medium">&bull; Order #{inv.orderNumber}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                          Billed to: <strong className="text-slate-800">{inv.billedTo || inv.customerName || 'Store Account'}</strong>
                                          {inv.memberUsername && <span className="text-blue-600 ml-1">(@{inv.memberUsername})</span>}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandInvoice(inv.invoiceNumber)}
                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                        <span>Close Row</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* 4 Financial Key Metric Cards */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    {/* 1. Total Invoice Amount */}
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                      <div className="flex items-center justify-between text-slate-500">
                                        <span className="text-[10px] uppercase font-bold tracking-wider">1. Total Invoice Amount</span>
                                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                      <div className="font-mono font-bold text-slate-900 text-lg">
                                        ${paymentSummary.invoiceTotal.toFixed(2)}
                                      </div>
                                      <p className="text-[10px] text-slate-500">Total charge for items, shipping & taxes</p>
                                    </div>

                                    {/* 2. Drawn From Credit Allocation */}
                                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                                      <div className="flex items-center justify-between text-emerald-800">
                                        <span className="text-[10px] uppercase font-bold tracking-wider">2. Drawn From Credit Line</span>
                                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                      </div>
                                      <div className="font-mono font-bold text-emerald-700 text-lg">
                                        ${paymentSummary.invoiceTotal.toFixed(2)}
                                      </div>
                                      <p className="text-[10px] text-emerald-800 font-medium">Used member credit allocation to place order</p>
                                    </div>

                                    {/* 3. Actual Payments Settled */}
                                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-1">
                                      <div className="flex items-center justify-between text-blue-800">
                                        <span className="text-[10px] uppercase font-bold tracking-wider">3. Actual Payments Settled</span>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                      </div>
                                      <div className="font-mono font-bold text-blue-700 text-lg">
                                        ${paymentSummary.totalPaid.toFixed(2)}
                                      </div>
                                      <p className="text-[10px] text-blue-700 font-medium">{paymentSummary.payments.length} payment(s) recorded to Admin</p>
                                    </div>

                                    {/* 4. Current Balance Due */}
                                    <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1 ${
                                      paymentSummary.currentBalanceDue > 0
                                        ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200/50'
                                        : 'bg-emerald-50/80 border-emerald-300'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                          paymentSummary.currentBalanceDue > 0 ? 'text-rose-800' : 'text-emerald-800'
                                        }`}>
                                          4. Current Balance Due
                                        </span>
                                        {paymentSummary.currentBalanceDue > 0 ? (
                                          <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        )}
                                      </div>
                                      <div className={`font-mono font-extrabold text-xl ${
                                        paymentSummary.currentBalanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                                      }`}>
                                        ${paymentSummary.currentBalanceDue.toFixed(2)}
                                      </div>
                                      <p className={`text-[10px] font-semibold ${
                                        paymentSummary.currentBalanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                                      }`}>
                                        {paymentSummary.currentBalanceDue > 0
                                          ? 'Payment to Admin is still due'
                                          : 'Fully paid & settled with Admin'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Inline Feedback Toast */}
                                  {currentFeedback && (
                                    <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-150 ${
                                      currentFeedback.type === 'success' 
                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                                    }`}>
                                      {currentFeedback.type === 'success' ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      ) : (
                                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                      )}
                                      <span>{currentFeedback.message}</span>
                                    </div>
                                  )}

                                  {/* Two Columns: Payment History & Add Payment Form */}
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                                    
                                    {/* Left: Payment History Audit List (5 cols) */}
                                    <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-slate-500" />
                                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                            Payment History ({paymentSummary.payments.length})
                                          </h4>
                                        </div>
                                        <span className="text-[11px] font-mono text-slate-500 font-bold">
                                          Settled: ${paymentSummary.totalPaid.toFixed(2)}
                                        </span>
                                      </div>

                                      {paymentSummary.payments.length === 0 ? (
                                        <div className="py-6 px-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 space-y-1.5">
                                          <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                                          <p className="text-xs font-bold text-slate-700">No Payments Recorded Yet</p>
                                          <p className="text-[11px] text-slate-500">
                                            The full balance of <strong className="text-slate-900 font-mono">${paymentSummary.currentBalanceDue.toFixed(2)}</strong> is currently due from the member to Admin.
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                          {paymentSummary.payments.map((p) => (
                                            <div key={p.paymentId} className="p-2.5 bg-slate-50 hover:bg-blue-50/40 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 transition-colors">
                                              <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-mono font-bold text-slate-900 text-xs">${p.amount.toFixed(2)}</span>
                                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                                                    p.method === 'Paid with Credit Memo' || p.method === 'Paid with Cash Memo' || p.method === 'Paid with CM' ? 'bg-blue-100 text-blue-800' :
                                                    p.method === 'Paid with Cash' ? 'bg-emerald-100 text-emerald-800' :
                                                    p.method === 'Paid with Check' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-indigo-100 text-indigo-800'
                                                  }`}>
                                                    {p.method}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                                  <span>{p.date}</span>
                                                  {p.referenceNumber && <span>&bull; Ref: {p.referenceNumber}</span>}
                                                </div>
                                                {p.notes && <p className="text-[10px] text-slate-400 italic truncate">{p.notes}</p>}
                                              </div>

                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
                                                    printOrDownloadPaymentInvoicePdf({
                                                      payment: p,
                                                      invoice: inv,
                                                      order: matchingOrder,
                                                      allPayments: payments,
                                                      creditAllocation: creditInfo.creditAllocation,
                                                      remainingCreditBalance: creditInfo.remainingBalance
                                                    });
                                                  }}
                                                  className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                                  title={`Print Payment Invoice for ${p.method} ($${p.amount.toFixed(2)})`}
                                                >
                                                  <Printer className="w-3 h-3 text-emerald-600" />
                                                  <span>Print Invoice</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteInvoicePayment(p.paymentId, inv.invoiceNumber)}
                                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0 cursor-pointer"
                                                  title="Void / Delete payment"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: Add Payment Form (7 cols) */}
                                    <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-4">
                                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                          <PlusCircle className="w-4 h-4 text-blue-600" />
                                          <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                                            Add Payment to Settle Balance
                                          </h4>
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                          Balance Due: <strong className="text-rose-600 font-mono font-bold">${paymentSummary.currentBalanceDue.toFixed(2)}</strong>
                                        </span>
                                      </div>

                                      <div className="space-y-3">
                                        {/* Row 1: Amount Option & Method Dropdown */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {/* 1. Amount Input */}
                                          <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-700">
                                              Payment Amount <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={inputAmount}
                                                onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value }))}
                                                placeholder="0.00"
                                                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                              />
                                            </div>

                                            {/* Preset Shortcuts */}
                                            {paymentSummary.currentBalanceDue > 0 && (
                                              <div className="flex items-center gap-1.5 pt-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => setPaymentAmounts((prev) => ({ ...prev, [inv.invoiceNumber]: paymentSummary.currentBalanceDue.toFixed(2) }))}
                                                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                                >
                                                  Full (${paymentSummary.currentBalanceDue.toFixed(2)})
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setPaymentAmounts((prev) => ({ ...prev, [inv.invoiceNumber]: (paymentSummary.currentBalanceDue / 2).toFixed(2) }))}
                                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-[10px] font-medium cursor-pointer transition-colors"
                                                >
                                                  50% (${(paymentSummary.currentBalanceDue / 2).toFixed(2)})
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* 2. Payment Method Dropdown (The 4 user-specified options) */}
                                          <div className="space-y-1">
                                            <label className="block text-xs font-bold text-slate-700">
                                              Payment Method <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                              <select
                                                value={selectedMethod}
                                                onChange={(e) => setPaymentMethods((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value as PaymentMethodOption }))}
                                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white appearance-none cursor-pointer"
                                              >
                                                <option value="Paid with Credit Memo">Paid with Credit Memo</option>
                                                <option value="Paid with Cash">Paid with Cash</option>
                                                <option value="Paid with Check">Paid with Check</option>
                                                <option value="Paid with ACH/Wire transfer">Paid with ACH/Wire transfer</option>
                                              </select>
                                              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                                            </div>
                                            <span className="text-[10px] text-slate-400">Select payment channel</span>
                                          </div>
                                        </div>

                                        {/* Row 2: Date, Ref #, Notes */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                          {/* Date */}
                                          <div className="space-y-1">
                                            <label className="block text-[11px] font-bold text-slate-600">Payment Date</label>
                                            <input
                                              type="date"
                                              value={inputDate}
                                              onChange={(e) => setPaymentDates((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value }))}
                                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                            />
                                          </div>

                                          {/* Reference Number */}
                                          <div className="space-y-1">
                                            <label className="block text-[11px] font-bold text-slate-600">Ref / Check #</label>
                                            <input
                                              type="text"
                                              value={inputRef}
                                              onChange={(e) => setPaymentRefs((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value }))}
                                              placeholder="e.g. Check #5021"
                                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                            />
                                          </div>

                                          {/* Notes */}
                                          <div className="space-y-1">
                                            <label className="block text-[11px] font-bold text-slate-600">Notes</label>
                                            <input
                                              type="text"
                                              value={inputNotes}
                                              onChange={(e) => setPaymentNotes((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value }))}
                                              placeholder="Optional memo..."
                                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                            />
                                          </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="pt-2 flex items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleRecordInvoicePayment(inv)}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Record Payment ({selectedMethod})</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );

    case 'payments':
      const filteredPaymentsList = payments.filter((pay) => {
        if (paymentMemberFilter === 'All') return true;
        const filterLower = paymentMemberFilter.toLowerCase();

        const payMemberUser = (pay.memberUsername || '').toLowerCase();
        const payCustomer = (pay.customerName || '').toLowerCase();

        if (payMemberUser === filterLower || payCustomer.includes(filterLower)) {
          return true;
        }

        const inv = invoices.find((i) => i.invoiceNumber === pay.invoiceNumber);
        if (inv) {
          const invMemberUser = (inv.memberUsername || '').toLowerCase();
          const invBilledTo = (inv.billedTo || '').toLowerCase();
          const invCustomer = (inv.customerName || '').toLowerCase();
          if (
            invMemberUser === filterLower ||
            inv.memberId === paymentMemberFilter ||
            invBilledTo.includes(filterLower) ||
            invCustomer.includes(filterLower)
          ) {
            return true;
          }
        }

        return false;
      });

      const totalFilteredPayments = filteredPaymentsList.reduce((sum, p) => sum + p.amount, 0);

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payments History</h2>
                <p className="text-xs text-slate-500">Recorded settlements, payment receipts, and audit trail</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('payment-search')}
              className="px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Payment Search
            </button>
          </div>

          {/* Member Filter Bar for Payments */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Filter Member:
              </span>
              <div className="relative flex items-center gap-1">
                <select
                  value={paymentMemberFilter}
                  onChange={(e) => setPaymentMemberFilter(e.target.value)}
                  className="pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs appearance-none max-w-[220px] truncate"
                >
                  <option value="All">All Members ({payments.length})</option>
                  {members.map((m) => {
                    const displayName = m.name || m.tempUsername || m.email || m.id;
                    const filterVal = m.tempUsername || m.name || m.id;
                    const mPaymentsCount = payments.filter((pay) => {
                      const filterLower = filterVal.toLowerCase();
                      const payMemberUser = (pay.memberUsername || '').toLowerCase();
                      const payCustomer = (pay.customerName || '').toLowerCase();
                      if (payMemberUser === filterLower || payCustomer.includes(filterLower)) return true;
                      const inv = invoices.find((i) => i.invoiceNumber === pay.invoiceNumber);
                      if (inv) {
                        const invMemberUser = (inv.memberUsername || '').toLowerCase();
                        const invBilledTo = (inv.billedTo || '').toLowerCase();
                        const invCustomer = (inv.customerName || '').toLowerCase();
                        if (invMemberUser === filterLower || inv.memberId === m.id || invBilledTo.includes(filterLower) || invCustomer.includes(filterLower)) return true;
                      }
                      return false;
                    }).length;

                    return (
                      <option key={m.id} value={filterVal}>
                        {displayName} ({mPaymentsCount})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                {paymentMemberFilter !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMemberFilter('All')}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="Clear member filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <span className="text-slate-500 font-medium">
                Total Settlements: <strong className="text-emerald-600 font-mono font-bold">
                  ${totalFilteredPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {payments.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Payment Records Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Transactions and payments settled against outstanding invoices will appear here in real-time.
                </p>
                <button
                  onClick={() => onNavigate('invoices')}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> View Invoices
                </button>
              </div>
            ) : filteredPaymentsList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Payments for Selected Member</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  There are no recorded payment transactions associated with this member.
                </p>
                <button
                  onClick={() => setPaymentMemberFilter('All')}
                  className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Show All Members ({payments.length})
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Payment ID</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Customer / Member</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Ref / Check #</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredPaymentsList.map((pay) => {
                      const matchingInvoice = invoices.find((inv) => inv.invoiceNumber === pay.invoiceNumber);
                      const matchingOrder = matchingInvoice ? orders.find((o) => o.orderNumber === matchingInvoice.orderNumber) : undefined;
                      return (
                        <tr key={pay.paymentId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-bold font-mono text-slate-900">{pay.paymentId}</td>
                          <td className="p-4 font-bold font-mono text-blue-600">{pay.invoiceNumber}</td>
                          <td className="p-4 text-slate-700 font-medium">
                            {pay.customerName || (pay.memberUsername ? `@${pay.memberUsername}` : 'Store Account')}
                          </td>
                          <td className="p-4 text-slate-600">{pay.date}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                              pay.method === 'Paid with Credit Memo' || pay.method === 'Paid with Cash Memo' || pay.method === 'Paid with CM' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              pay.method === 'Paid with Cash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              pay.method === 'Paid with Check' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              pay.method === 'Paid with ACH/Wire transfer' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {pay.method}
                            </span>
                          </td>
                          <td className="p-4">
                            {pay.referenceNumber ? (
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 inline-block">
                                {pay.referenceNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                            {pay.notes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[130px]" title={pay.notes}>
                                Note: {pay.notes}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-bold font-mono text-emerald-700">${pay.amount.toFixed(2)}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                              {pay.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (matchingInvoice) {
                                  const creditInfo = getInvoiceCreditInfo(matchingInvoice, members, orders, invoices, masterCreditLimit, payments);
                                  printOrDownloadPaymentInvoicePdf({
                                    payment: pay,
                                    invoice: matchingInvoice,
                                    order: matchingOrder,
                                    allPayments: payments,
                                    creditAllocation: creditInfo.creditAllocation,
                                    remainingCreditBalance: creditInfo.remainingBalance
                                  });
                                }
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title={`Print Payment Invoice for ${pay.paymentId}`}
                            >
                              <Printer className="w-3 h-3 text-emerald-600" />
                              <span>Print Invoice</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );

    case 'invoices-search':
      const filteredInvoices = invoices.filter(
        (i) => (i.invoiceNumber || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.orderNumber || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.title || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.billedTo || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.customerName || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.memberUsername || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.status || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
               (i.notes || '').toLowerCase().includes(invoiceSearchQuery.toLowerCase())
      );

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Invoices Search</h2>
                <p className="text-xs text-slate-500">Filter invoices by invoice number, order ID, title, member, or status</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => onNavigate('invoices')}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> View All Invoices
              </button>

              <button 
                type="button"
                onClick={() => handleOpenCreateInvoice()}
                id="btn-create-invoice-from-search"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs hover:shadow cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Create an Invoice</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Search by invoice # (e.g. INV-2026-...), title (Late Payment, Chargeback), member name, order #, notes..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Invoice Title</th>
                    <th className="p-3">Billed To</th>
                    <th className="p-3">Reference #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Current Balance Due</th>
                    <th className="p-3">Credit Allocation (Remaining)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredInvoices.map((inv) => {
                    const creditInfo = getInvoiceCreditInfo(inv, members, orders, invoices, masterCreditLimit, payments);
                    const paymentSummary = getInvoicePaymentSummary(inv, payments);
                    const isExpanded = !!expandedInvoices[inv.invoiceNumber];
                    const inputAmount = paymentAmounts[inv.invoiceNumber] ?? paymentSummary.currentBalanceDue.toFixed(2);
                    const selectedMethod = paymentMethods[inv.invoiceNumber] || 'Paid with ACH/Wire transfer';
                    const inputRef = paymentRefs[inv.invoiceNumber] || '';
                    const inputDate = paymentDates[inv.invoiceNumber] || new Date().toISOString().split('T')[0];
                    const inputNotes = paymentNotes[inv.invoiceNumber] || '';
                    const currentFeedback = paymentFeedback?.invoiceNumber === inv.invoiceNumber ? paymentFeedback : null;

                    return (
                      <React.Fragment key={inv.invoiceNumber}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandInvoice(inv.invoiceNumber, paymentSummary.currentBalanceDue)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isExpanded 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title={isExpanded ? 'Collapse payment details' : 'Expand to view balance and add payments'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-bold font-mono text-blue-600">{inv.invoiceNumber}</td>
                          <td className="p-3">{renderInvoiceTitleBadge(inv.title)}</td>
                          <td className="p-3 font-bold text-slate-900">{inv.billedTo || inv.customerName || 'Store Account'}</td>
                          <td className="p-3 font-mono text-slate-600 text-[11px]">{inv.orderNumber}</td>
                          <td className="p-3 text-slate-600">{inv.date}</td>
                          <td className="p-3 text-slate-500">{inv.dueDate}</td>
                          <td className="p-3 font-bold font-mono text-xs">
                            {inv.amount < 0 ? (
                              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                <span>-${Math.abs(inv.amount).toFixed(2)}</span>
                                <span className="text-[9px] font-sans font-bold px-1 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">Credit</span>
                              </span>
                            ) : (
                              <span className="text-slate-900">${inv.amount.toFixed(2)}</span>
                            )}
                          </td>
                          
                          {/* Current Balance Due */}
                          <td className="p-3">
                            {paymentSummary.currentBalanceDue < -0.001 ? (
                              <div className="space-y-0.5">
                                <span className="text-emerald-700 font-extrabold font-mono text-xs block">
                                  -${Math.abs(paymentSummary.currentBalanceDue).toFixed(2)} Credit
                                </span>
                                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                                  Credit Balance
                                </span>
                              </div>
                            ) : paymentSummary.currentBalanceDue > 0.001 ? (
                              <div className="space-y-0.5">
                                <span className="text-rose-700 font-extrabold font-mono text-xs block">
                                  ${paymentSummary.currentBalanceDue.toFixed(2)} Due
                                </span>
                                <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 inline-block">
                                  Unsettled
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-emerald-700 font-bold font-mono text-xs block">
                                  $0.00
                                </span>
                                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                                  Settled
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 font-bold">
                                <span className={`font-mono text-xs ${creditInfo.isNegative ? 'text-rose-700 font-extrabold' : 'text-emerald-700'}`}>
                                  {creditInfo.remainingBalance < 0 
                                    ? `-$${Math.abs(creditInfo.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                    : `$${creditInfo.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </span>
                                <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${
                                  creditInfo.isNegative 
                                    ? 'text-rose-800 bg-rose-50 border-rose-200' 
                                    : creditInfo.isSurplus 
                                    ? 'text-emerald-800 bg-emerald-100 border-emerald-300' 
                                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                }`}>
                                  {creditInfo.isNegative ? 'Neg' : creditInfo.isSurplus ? 'Surplus' : 'Avail'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                of ${creditInfo.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              paymentSummary.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              paymentSummary.status === 'Partial' ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold' :
                              paymentSummary.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}>
                              {paymentSummary.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button 
                              type="button"
                              onClick={() => toggleExpandInvoice(inv.invoiceNumber, paymentSummary.currentBalanceDue)}
                              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 border ${
                                paymentSummary.currentBalanceDue > 0
                                  ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 shadow-2xs'
                                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
                              }`}
                              title={paymentSummary.currentBalanceDue > 0 ? "Add payment to settle balance" : "View payment history"}
                            >
                              {paymentSummary.currentBalanceDue > 0 ? (
                                <>
                                  <PlusCircle className="w-3 h-3 text-blue-600" />
                                  <span>Add Payment</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Paid ({paymentSummary.payments.length})</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
                                downloadInvoicePdf({ 
                                  invoice: inv, 
                                  order: matchingOrder,
                                  creditAllocation: creditInfo.creditAllocation,
                                  remainingCreditBalance: creditInfo.remainingBalance
                                });
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Print / Download PDF"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Print PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                            >
                              View Statement
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Row in Search View */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90 border-b-2 border-blue-200 animate-in fade-in duration-150">
                            <td colSpan={12} className="p-0">
                              <div className="p-5 space-y-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 border-l-4 border-l-blue-600 rounded-b-xl shadow-inner">
                                
                                {/* 4 Financial Key Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">1. Total Invoice Amount</span>
                                    <div className="font-mono font-bold text-slate-900 text-base">${paymentSummary.invoiceTotal.toFixed(2)}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">2. Drawn From Credit Line</span>
                                    <div className="font-mono font-bold text-emerald-700 text-base">${paymentSummary.invoiceTotal.toFixed(2)}</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-800">3. Actual Payments Settled</span>
                                    <div className="font-mono font-bold text-blue-700 text-base">${paymentSummary.totalPaid.toFixed(2)}</div>
                                  </div>
                                  <div className={`p-3 rounded-xl border shadow-2xs space-y-0.5 ${
                                    paymentSummary.currentBalanceDue > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'
                                  }`}>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                                      paymentSummary.currentBalanceDue > 0 ? 'text-rose-800' : 'text-emerald-800'
                                    }`}>
                                      4. Current Balance Due
                                    </span>
                                    <div className={`font-mono font-extrabold text-lg ${
                                      paymentSummary.currentBalanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                                    }`}>
                                      ${paymentSummary.currentBalanceDue.toFixed(2)}
                                    </div>
                                  </div>
                                </div>

                                {currentFeedback && (
                                  <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
                                    currentFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}>
                                    {currentFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                    <span>{currentFeedback.message}</span>
                                  </div>
                                )}

                                {/* Existing Payment History for this Invoice */}
                                {paymentSummary.payments.length > 0 && (
                                  <div className="bg-white p-3.5 rounded-xl border border-blue-200 space-y-2">
                                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                      <span>Payment History ({paymentSummary.payments.length})</span>
                                      <span className="text-slate-400 font-normal normal-case">Recorded settlements</span>
                                    </h4>
                                    <div className="divide-y divide-slate-100">
                                      {paymentSummary.payments.map((p) => (
                                        <div key={p.paymentId} className="py-2 flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-slate-800">{p.paymentId}</span>
                                            <span className="text-slate-500">&bull; {p.date}</span>
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded border border-blue-100">{p.method}</span>
                                            <span className="font-mono font-bold text-emerald-700">+${p.amount.toFixed(2)}</span>
                                            {p.referenceNumber && <span className="text-slate-400 text-[11px]">({p.referenceNumber})</span>}
                                            {p.notes && <p className="text-[10px] text-slate-400 italic truncate">{p.notes}</p>}
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
                                                printOrDownloadPaymentInvoicePdf({
                                                  payment: p,
                                                  invoice: inv,
                                                  order: matchingOrder,
                                                  allPayments: payments,
                                                  creditAllocation: creditInfo.creditAllocation,
                                                  remainingCreditBalance: creditInfo.remainingBalance
                                                });
                                              }}
                                              className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                              title={`Print Payment Invoice for ${p.method} ($${p.amount.toFixed(2)})`}
                                            >
                                              <Printer className="w-3 h-3 text-emerald-600" />
                                              <span>Print Invoice</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => handleDeleteInvoicePayment(p.paymentId, inv.invoiceNumber)}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0 cursor-pointer"
                                              title="Void / Delete payment"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Add Payment Form */}
                                <div className="bg-white p-4 rounded-xl border border-blue-200 space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                                      Add Payment (Dropdown Method & Amount)
                                    </h4>
                                    <span className="text-[11px] text-slate-500">
                                      Current Balance: <strong className="text-rose-600 font-mono">${paymentSummary.currentBalanceDue.toFixed(2)}</strong>
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount ($)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={inputAmount}
                                        onChange={(e) => setPaymentAmounts((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value }))}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
                                      <div className="relative">
                                        <select
                                          value={selectedMethod}
                                          onChange={(e) => setPaymentMethods((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value as PaymentMethodOption }))}
                                          className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                          <option value="Paid with Credit Memo">Paid with Credit Memo</option>
                                          <option value="Paid with Cash">Paid with Cash</option>
                                          <option value="Paid with Check">Paid with Check</option>
                                          <option value="Paid with ACH/Wire transfer">Paid with ACH/Wire transfer</option>
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Ref / Memo #</label>
                                      <input
                                        type="text"
                                        value={inputRef}
                                        onChange={(e) => setPaymentRefs((prev) => ({ ...prev, [inv.invoiceNumber]: e.target.value }))}
                                        placeholder="e.g. Check #, Wire Ref"
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div className="flex items-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRecordInvoicePayment(inv)}
                                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Apply Payment
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 text-xs">
                        {invoices.length === 0 
                          ? 'No invoices generated in system yet. Create an invoice or place an order.' 
                          : `No matching invoices found for "${invoiceSearchQuery}".`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    case 'payment-search':
      const filteredPayments = payments.filter(
        (p) => p.paymentId.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
               p.invoiceNumber.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
               p.method.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
               (p.referenceNumber && p.referenceNumber.toLowerCase().includes(paymentSearchQuery.toLowerCase())) ||
               (p.customerName && p.customerName.toLowerCase().includes(paymentSearchQuery.toLowerCase())) ||
               (p.memberUsername && p.memberUsername.toLowerCase().includes(paymentSearchQuery.toLowerCase()))
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payment Search</h2>
              <p className="text-xs text-slate-500">Filter payments by ID, invoice number, method, or ref/check #</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={paymentSearchQuery}
                onChange={(e) => setPaymentSearchQuery(e.target.value)}
                placeholder="Search payment ID, invoice number, or ref/check #..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Ref / Check #</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPayments.map((pay) => {
                    const matchingInvoice = invoices.find((inv) => inv.invoiceNumber === pay.invoiceNumber);
                    const matchingOrder = matchingInvoice ? orders.find((o) => o.orderNumber === matchingInvoice.orderNumber) : undefined;
                    return (
                      <tr key={pay.paymentId} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{pay.paymentId}</td>
                        <td className="p-3 font-bold text-blue-600">{pay.invoiceNumber}</td>
                        <td className="p-3">{pay.date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            pay.method === 'Paid with Credit Memo' || pay.method === 'Paid with Cash Memo' || pay.method === 'Paid with CM' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            pay.method === 'Paid with Cash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            pay.method === 'Paid with Check' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            pay.method === 'Paid with ACH/Wire transfer' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {pay.method}
                          </span>
                        </td>
                        <td className="p-3">
                          {pay.referenceNumber ? (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 inline-block">
                              {pay.referenceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-emerald-700 font-mono">${pay.amount.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (matchingInvoice) {
                                const creditInfo = getInvoiceCreditInfo(matchingInvoice, members, orders, invoices, masterCreditLimit, payments);
                                printOrDownloadPaymentInvoicePdf({
                                  payment: pay,
                                  invoice: matchingInvoice,
                                  order: matchingOrder,
                                  allPayments: payments,
                                  creditAllocation: creditInfo.creditAllocation,
                                  remainingCreditBalance: creditInfo.remainingBalance
                                });
                              }
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-blue-700 border border-slate-300 hover:border-blue-300 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={`Print Payment Invoice for ${pay.paymentId}`}
                          >
                            <Printer className="w-3 h-3 text-emerald-600" />
                            <span>Print Invoice</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                        {payments.length === 0
                          ? 'No payment transactions recorded in system yet.'
                          : `No matching payments found for "${paymentSearchQuery}".`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    // My Orders Views
    case 'place-new-order':
      const cartItemsWithDetails = orderCart.map((item) => ({
        ...item,
        product: products.find((p) => p.id === item.productId) || SAMPLE_PRODUCTS.find((p) => p.id === item.productId)!,
      })).filter((item) => item.product);

      const cartTotal = cartItemsWithDetails.reduce((sum, item) => sum + item.product.price * item.qty, 0);

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Place New Order</h2>
                <p className="text-xs text-slate-500">Select distribution items and submit store purchase orders</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('shop-settings')}
              className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 border border-purple-200 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-600" /> Shop Settings
            </button>
          </div>

          {orderSubmittedMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{orderSubmittedMsg}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onNavigate('view-open-order')}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  View Open Orders
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Catalog Selector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Catalog Selection</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Select product cards or adjust quantities using - / + buttons</p>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={orderCatalogSearch}
                    onChange={(e) => setOrderCatalogSearch(e.target.value)}
                    placeholder="Search by name or SKU..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {orderCatalogSearch && (
                    <button
                      onClick={() => setOrderCatalogSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All Products' },
                  { id: 'metro-phones', label: 'Phones' },
                  { id: 'display-phones', label: 'Dummy Models' },
                  { id: 'sim-cards', label: 'SIM Cards' },
                  { id: 'accessories', label: 'Accessories' },
                  { id: 'supplies', label: 'Supplies' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setOrderCatalogCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                      orderCatalogCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              
              {(() => {
                const filtered = products.filter((p) => {
                  const matchesCat = orderCatalogCategory === 'all' || p.category === orderCatalogCategory;
                  const q = orderCatalogSearch.toLowerCase().trim();
                  const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
                  return matchesCat && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 bg-white border border-slate-200 rounded-xl text-center">
                      <p className="text-xs font-semibold text-slate-600">No items match your filter.</p>
                      <button
                        onClick={() => { setOrderCatalogCategory('all'); setOrderCatalogSearch(''); }}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filtered.map((item) => {
                      const inCart = orderCart.find((ci) => ci.productId === item.id);
                      const isOutOfStock = item.stock <= 0;

                      return (
                        <div 
                          key={item.id} 
                          className={`bg-white border rounded-xl p-4 shadow-2xs transition-all flex flex-col justify-between gap-3 ${
                            inCart 
                              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' 
                              : 'border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {item.image ? (
                              <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5 overflow-hidden">
                                <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 shrink-0 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <Box className="w-6 h-6" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {item.sku}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isOutOfStock 
                                    ? 'text-rose-700 bg-rose-50 border-rose-200' 
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                }`}>
                                  {isOutOfStock ? 'Out of Stock (0)' : `In Stock: ${item.stock}`}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2" title={item.name}>
                                {item.name}
                              </h4>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-sm font-extrabold text-blue-600">${item.price.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-400 font-medium">/ unit</span>
                              </div>
                            </div>
                          </div>

                          {/* Action area: - / + quantity stepper or Add button */}
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {inCart ? (
                                <span className="text-blue-700 font-bold">
                                  Selected: {inCart.qty} units (${(item.price * inCart.qty).toFixed(2)})
                                </span>
                              ) : isOutOfStock ? (
                                <span className="text-rose-600 font-semibold">Unavailable</span>
                              ) : (
                                <span className="text-slate-400">Not in order</span>
                              )}
                            </span>

                            {inCart ? (
                              <div className="flex items-center border border-blue-400 rounded-lg bg-blue-50 p-1 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.id, inCart.qty - 1)}
                                  className="w-7 h-7 flex items-center justify-center font-bold text-blue-900 hover:bg-blue-200 rounded text-sm cursor-pointer transition-colors"
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="px-2.5 font-mono font-extrabold text-xs text-blue-950 min-w-[24px] text-center">
                                  {inCart.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(item.id, inCart.qty + 1)}
                                  disabled={item.stock > 0 && inCart.qty >= item.stock}
                                  className={`w-7 h-7 flex items-center justify-center font-bold text-blue-900 hover:bg-blue-200 rounded text-sm cursor-pointer transition-colors ${
                                    item.stock > 0 && inCart.qty >= item.stock ? 'opacity-40 cursor-not-allowed' : ''
                                  }`}
                                  title={item.stock > 0 && inCart.qty >= item.stock ? 'Maximum available stock reached' : 'Increase quantity'}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(item.id)}
                                disabled={isOutOfStock}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs ${
                                  isOutOfStock
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                }`}
                                title={isOutOfStock ? 'Item is out of stock' : 'Add item to order'}
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{isOutOfStock ? 'Out of Stock' : 'Add to Order'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Order Form Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs h-fit space-y-4">
              <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  On Behalf of Member
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select Member Account</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Billed to Credit Line</span>
                </label>
                <select
                  value={selectedMemberId || (members.length > 0 ? members[0].id : '')}
                  onChange={(e) => {
                    const memId = e.target.value;
                    setSelectedMemberId(memId);
                    const found = members.find((m) => m.id === memId);
                    if (found) {
                      setSelectedStore(found.businessAddress || found.storeLocation || found.name);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {members.length > 0 ? (
                    members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (@{m.username}) — {m.businessAddress || m.storeLocation || 'Main Store'}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Main Distribution HQ - 1044 Market St, San Francisco, CA">
                        Main Distribution HQ - 1044 Market St, San Francisco, CA
                      </option>
                      <option value="Downtown Retail Hub - 450 Sutter St, San Francisco, CA">
                        Downtown Retail Hub - 450 Sutter St, San Francisco, CA
                      </option>
                      <option value="West Coast Fulfillment Center - 1200 Broadway, Oakland, CA">
                        West Coast Fulfillment Center - 1200 Broadway, Oakland, CA
                      </option>
                    </>
                  )}
                </select>

                {(() => {
                  const currentMem = (selectedMemberId ? members.find((m) => m.id === selectedMemberId) : null) || (members.length > 0 ? members[0] : null);
                  if (!currentMem) return null;
                  const cred = getMemberCreditSummary(currentMem, members, orders, invoices, payments, masterCreditLimit);
                  return (
                    <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Role & Location:</span>
                        <span className="font-semibold text-slate-800">{currentMem.role}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Available Credit:</span>
                        <span className="font-mono font-bold text-emerald-700">${cred.availableCredit.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate pt-0.5 border-t border-slate-100" title={currentMem.businessAddress || currentMem.storeLocation}>
                        Ship to: {currentMem.businessAddress || currentMem.storeLocation || 'Main Distribution'}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                  <span>Review & Fee Setup Workflow</span>
                </div>
                <p className="text-amber-800 leading-relaxed text-[10.5px]">
                  Submitting will create this order under <strong>View Open Orders</strong> with status <span className="font-semibold">"Pending review and approval by Admin"</span>. You can then click <strong>"$ Review & Set Fees"</strong> to adjust items and specify Shipping, Taxes, Overpack & Insurance.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Order Items ({cartItemsWithDetails.length}):
                  </span>
                  {cartItemsWithDetails.length > 0 && (
                    <button
                      onClick={() => setOrderCart([])}
                      className="text-[11px] text-slate-400 hover:text-red-600 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {cartItemsWithDetails.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No items selected yet. Click + next to any catalog product or select cards to add items.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {cartItemsWithDetails.map((ci) => (
                      <div key={ci.productId} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-slate-800 block truncate">{ci.product.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">SKU: {ci.product.sku}</span>
                          </div>
                          <button
                            onClick={() => removeFromCart(ci.productId)}
                            className="text-slate-400 hover:text-red-600 font-bold p-1 hover:bg-red-50 rounded transition-colors"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          {/* Stepper inside cart drawer */}
                          <div className="flex items-center border border-slate-200 rounded-md bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartQty(ci.productId, ci.qty - 1)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 rounded text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold text-xs text-slate-900">{ci.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(ci.productId, ci.qty + 1)}
                              disabled={ci.product.stock > 0 && ci.qty >= ci.product.stock}
                              className={`w-5 h-5 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 rounded text-xs cursor-pointer ${
                                ci.product.stock > 0 && ci.qty >= ci.product.stock ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">${ci.product.price.toFixed(2)} ea</span>
                            <span className="font-bold text-slate-900">${(ci.product.price * ci.qty).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartItemsWithDetails.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-sm font-extrabold text-slate-900">
                    <span>Total Amount:</span>
                    <span className="text-blue-600 text-base">${cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Submit Purchase Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'view-previous-order':
      const previousOrders = orders.filter((o) => o.status === 'Completed' || o.status === 'Shipped');

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Previous Orders</h2>
              <p className="text-xs text-slate-500">Historical completed and fulfilled orders</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {previousOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Previous Fulfilled Orders</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Completed and fulfilled wholesale orders will be automatically archived here.
                </p>
                <button
                  onClick={() => onNavigate('place-new-order')}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Place New Order
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Customer Account</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Total</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {previousOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-blue-600">{ord.orderNumber}</td>
                        <td className="p-4 font-semibold text-slate-800">{ord.customerName}</td>
                        <td className="p-4 text-slate-600">{ord.date}</td>
                        <td className="p-4">{ord.itemsCount} items</td>
                        <td className="p-4 font-bold text-slate-900">${ord.total.toFixed(2)}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );

    case 'view-open-order':
      const openOrders = orders.filter((o) => o.status !== 'Completed');
      const pendingAdminCount = orders.filter((o) => o.status === 'Pending review and approval by Admin').length;

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">View Open Orders</h2>
                <p className="text-xs text-slate-500">Active purchase orders requiring fee assessment, review, or fulfillment</p>
              </div>
            </div>
            {pendingAdminCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{pendingAdminCount} {pendingAdminCount === 1 ? 'order' : 'orders'} pending your review & fee setup</span>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {openOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Active Open Orders</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  There are currently no active or pending member purchase orders in the system.
                </p>
                <button
                  onClick={() => onNavigate('place-new-order')}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Place New Order
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Customer / Member Account</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Subtotal</th>
                      <th className="p-4">Fees & Taxes</th>
                      <th className="p-4">Grand Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Fulfillment Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {openOrders.map((ord) => {
                      const isPendingAdmin = ord.status === 'Pending review and approval by Admin';
                      const isSubmittedToMember = ord.status === 'Ready for Member Review & Acceptance';
                      const isDeclined = ord.status === 'Declined by Admin';
                      const isCredited = ord.status === 'Credited';
                      const isUpdatedAndApproved = ord.status === 'Updated and Approved' || ord.status === 'Approved with changes by Admin';
                      const isApprovedOnly = ord.status === 'Approved' || ord.status === 'Approved by Admin';
                      const isApproved = isCredited || isUpdatedAndApproved || isApprovedOnly || ord.status === 'Approved & Processing' || ord.status === 'Open' || ord.status === 'Processing';

                      const subtotal = ord.subtotal || ord.total;
                      const hasFees = (ord.shippingFee !== undefined && ord.shippingFee > 0) ||
                                     (ord.salesTax !== undefined && ord.salesTax > 0) ||
                                     (ord.serviceTax !== undefined && ord.serviceTax > 0) ||
                                     (ord.overpackFee !== undefined && ord.overpackFee > 0) ||
                                     (ord.insuranceFee !== undefined && ord.insuranceFee > 0);

                      return (
                        <tr key={ord.id} className={`hover:bg-slate-50 transition-colors ${isPendingAdmin ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-4 font-bold text-blue-600">
                            <div>{ord.orderNumber}</div>
                            {ord.memberUsername && (
                              <span className="text-[10px] font-mono text-slate-400">@{ord.memberUsername}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{ord.customerName}</div>
                            {ord.businessAddress && (
                              <div className="text-[10px] text-slate-500 max-w-[220px] truncate" title={ord.businessAddress}>
                                {ord.businessAddress}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-slate-600 whitespace-nowrap">{ord.date}</td>
                          <td className="p-4 whitespace-nowrap">{ord.itemsCount} items</td>
                          <td className="p-4 font-semibold text-slate-700">${subtotal.toFixed(2)}</td>
                          <td className="p-4 text-[11px] text-slate-600 whitespace-nowrap">
                            {hasFees ? (
                              <div className="space-y-0.5">
                                <div>Ship: <span className="font-bold text-slate-800">${(ord.shippingFee || 0).toFixed(2)}</span> &bull; Tax: <span className="font-bold text-slate-800">${(ord.salesTax || 0).toFixed(2)}</span></div>
                                <div>Svc: <span className="font-bold text-slate-800">${(ord.serviceTax || 0).toFixed(2)}</span>{((ord.overpackFee || 0) > 0 || (ord.insuranceFee || 0) > 0) ? ` • Pack: $${(ord.overpackFee || 0).toFixed(2)} • Ins: $${(ord.insuranceFee || 0).toFixed(2)}` : ''}</div>
                              </div>
                            ) : (
                              <span className="text-amber-600 font-medium italic">Pending Fee Setup</span>
                            )}
                          </td>
                          <td className="p-4 font-extrabold text-slate-900 text-sm whitespace-nowrap">
                            ${ord.total.toFixed(2)}
                          </td>
                          <td className="p-4">
                            {isPendingAdmin && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold animate-pulse whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                Pending Admin Review
                              </span>
                            )}
                            {isCredited && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Credited
                              </span>
                            )}
                            {isUpdatedAndApproved && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Updated and Approved
                              </span>
                            )}
                            {isApprovedOnly && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Approved
                              </span>
                            )}
                            {isSubmittedToMember && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold whitespace-nowrap">
                                <Send className="w-3 h-3 text-blue-500" />
                                Sent to Member for Accept
                              </span>
                            )}
                            {isDeclined && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold whitespace-nowrap">
                                <XCircle className="w-3 h-3 text-rose-500" />
                                Declined by Admin
                              </span>
                            )}
                            {isApproved && !isCredited && !isUpdatedAndApproved && !isApprovedOnly && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Approved / In Process
                              </span>
                            )}
                            {!isPendingAdmin && !isSubmittedToMember && !isDeclined && !isApproved && (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                                {ord.status}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                            {/* Primary Button: Open Order Summary & Set Fees */}
                            <button
                              onClick={() => handleOpenOrderReview(ord)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                isPendingAdmin
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                  : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200'
                              }`}
                              title="Open order summary to add shipping fee, sales tax, service tax and approve or decline"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{isPendingAdmin ? 'Review & Set Fees' : 'Edit Fees & Summary'}</span>
                            </button>

                            {/* Standard Advancement actions if order is approved */}
                            {isApproved && (
                              <>
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'Shipped')}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors inline-flex items-center gap-1"
                                  title="Advance order to Shipped status"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Mark Shipped</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderStatus(ord.id, 'Completed')}
                                  className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1"
                                  title="Complete and archive order"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Complete</span>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );

    case 'search-order':
      const filteredOrders = orders.filter(
        (o) => o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
               o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
               o.status.toLowerCase().includes(orderSearchQuery.toLowerCase())
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Search Orders</h2>
              <p className="text-xs text-slate-500">Locate orders by order number, account name or status</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search order number (e.g. ORD-2026-...) or store name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Store Account</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-600">{ord.orderNumber}</td>
                      <td className="p-3">{ord.customerName}</td>
                      <td className="p-3">{ord.date}</td>
                      <td className="p-3 font-bold text-slate-900">${ord.total.toFixed(2)}</td>
                      <td className="p-3">
                        {ord.status === 'Credited' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold whitespace-nowrap">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Credited
                          </span>
                        ) : ord.status === 'Updated and Approved' || ord.status === 'Approved with changes by Admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Updated and Approved
                          </span>
                        ) : ord.status === 'Approved' || ord.status === 'Approved by Admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : ord.status === 'Pending review and approval by Admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold whitespace-nowrap">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Admin Review
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold">
                            {ord.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                        {orders.length === 0
                          ? 'No orders in system to search. Start by submitting a purchase order.'
                          : `No orders match "${orderSearchQuery}".`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    // Shopping Category Views
    case 'shop-settings':
      return (
        <ShopSettingsManager
          onNavigateToCategory={(cat) => onNavigate(cat as AdminView)}
          onNavigateToOrder={() => onNavigate('place-new-order')}
        />
      );

    case 'metro-phones':
      return renderProductGrid('metro-phones', 'Metro By T-Mobile Phones', <Smartphone className="w-6 h-6" />);

    case 'display-phones':
      return renderProductGrid('display-phones', 'Display Phones (Dummy Models)', <Tablet className="w-6 h-6" />);

    case 'sim-cards':
      return renderProductGrid('sim-cards', 'Sim Cards Inventory', <SimCardIcon className="w-6 h-6" />);

    case 'accessories':
      return renderProductGrid('accessories', 'Mobile Accessories', <Headphones className="w-6 h-6" />);

    case 'supplies':
      return renderProductGrid('supplies', 'Store Supplies & Packaging', <Box className="w-6 h-6" />);

    default:
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {orderActionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{orderActionFeedback}</span>
          </div>
          <button
            onClick={() => setOrderActionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 hover:bg-emerald-100 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {renderContent()}

      {/* Admin Order Summary & Fee Assessment Modal */}
      {adminReviewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 my-8 max-h-[92vh] overflow-y-auto">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-t-2xl" />

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Order Summary & Fee Assessment
                    </h3>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono text-xs font-bold">
                      {adminReviewingOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set Shipping Fee, Sales Tax, and Service Tax to review and approve or decline fulfillment.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseOrderReview}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Meta Header Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Customer / Store</span>
                  <span className="font-bold text-slate-900">{adminReviewingOrder.customerName}</span>
                  {adminReviewingOrder.memberUsername && (
                    <span className="text-[10px] text-slate-500 block font-mono">@{adminReviewingOrder.memberUsername}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Order Date</span>
                  <span className="font-semibold text-slate-800">{adminReviewingOrder.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Status</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs inline-block ${
                    adminReviewingOrder.status === 'Credited'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : adminReviewingOrder.status === 'Pending review and approval by Admin'
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-blue-700'
                  }`}>
                    {adminReviewingOrder.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Destination Address</span>
                  <span className="text-slate-700 text-[11px] leading-tight block line-clamp-2" title={adminReviewingOrder.businessAddress || 'Store Primary Address'}>
                    {adminReviewingOrder.businessAddress || 'Store Primary Address'}
                  </span>
                </div>
              </div>

              {/* Order Items Table with Edit / Remove Controls */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Order Items Breakdown ({adminReviewingOrder.itemsCount} Total Units)
                  </h4>
                  {isItemsModifiedByAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>Items Modified by Admin</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleResetItemsInReview}
                        className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 underline cursor-pointer"
                        title="Restore original items requested by member"
                      >
                        Reset to Original
                      </button>
                    </div>
                  )}
                </div>

                {isItemsModifiedByAdmin && (
                  <div className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-medium flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Item list or quantities have been modified. When approved, the live order status will be set to <strong className="font-bold text-amber-950">"Updated and Approved"</strong>.
                      </span>
                    </div>
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Unit Price</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3 text-right">Item Subtotal</th>
                        <th className="p-3 text-center">Edit / Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {adminReviewingOrder.items && adminReviewingOrder.items.length > 0 ? (
                        adminReviewingOrder.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-400 text-[10px]">{it.sku}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{it.name}</span>
                              {it.category && (
                                <span className="text-[10px] text-slate-400 capitalize">{it.category.replace('-', ' ')}</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-700 font-mono">${it.price.toFixed(2)}</td>
                            <td className="p-3">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQtyInReview(idx, it.qty - 1)}
                                  className="px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50 min-w-[28px] text-center font-mono">
                                  {it.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQtyInReview(idx, it.qty + 1)}
                                  className="px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs cursor-pointer"
                                  title="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900 font-mono">
                              ${(it.price * it.qty).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromReview(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                                title={`Remove ${it.name} from order`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-rose-600 bg-rose-50/50 text-xs font-medium">
                            <AlertCircle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                            <span>All items have been removed from this order. You must keep at least 1 item to approve, or click <strong>Decline Order Fulfillment</strong>.</span>
                            {adminReviewingOrder.originalItems && adminReviewingOrder.originalItems.length > 0 && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={handleResetItemsInReview}
                                  className="px-3 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Restore Original Items
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-800">
                      <tr>
                        <td colSpan={4} className="p-3 text-right">Items Subtotal:</td>
                        <td className="p-3 text-right text-slate-900 text-sm font-extrabold font-mono">
                          ${currentOrderSubtotal.toFixed(2)}
                        </td>
                        <td className="p-3 text-center text-[10px] text-slate-400">
                          {adminReviewingOrder.itemsCount} Total Units
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Admin Editable Fees Section */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Admin Editable Fees & Taxes (All 5 Required)
                    </h4>
                  </div>
                  <span className="text-[11px] text-blue-700 font-medium">Editable by Admin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. Shipping Fee */}
                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>1. Shipping Fee</span>
                      </span>
                      <span className="text-[10px] text-red-500 font-semibold">*Required</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminShippingFee}
                        onChange={(e) => setAdminShippingFee(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white ${
                          isShippingValid ? 'border-slate-300 focus:ring-blue-500' : 'border-red-400 bg-red-50/40'
                        }`}
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setAdminShippingFee('0.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Free ($0)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminShippingFee('15.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Ground ($15)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminShippingFee('25.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Express ($25)
                      </button>
                    </div>
                  </div>

                  {/* 2. Sales Tax */}
                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-blue-600" />
                        <span>2. Sales Tax</span>
                      </span>
                      <span className="text-[10px] text-red-500 font-semibold">*Required</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminSalesTax}
                        onChange={(e) => setAdminSalesTax(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white ${
                          isSalesTaxValid ? 'border-slate-300 focus:ring-blue-500' : 'border-red-400 bg-red-50/40'
                        }`}
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminSalesTax((currentOrderSubtotal * 0.0825).toFixed(2));
                        }}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        8.25% Tax (${(currentOrderSubtotal * 0.0825).toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminSalesTax('0.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Exempt ($0)
                      </button>
                    </div>
                  </div>

                  {/* 3. Service Tax / Handling */}
                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>3. Service Tax</span>
                      </span>
                      <span className="text-[10px] text-red-500 font-semibold">*Required</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminServiceTax}
                        onChange={(e) => setAdminServiceTax(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white ${
                          isServiceTaxValid ? 'border-slate-300 focus:ring-blue-500' : 'border-red-400 bg-red-50/40'
                        }`}
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setAdminServiceTax('0.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        $0.00
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminServiceTax('10.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Standard ($10)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminServiceTax('25.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Priority ($25)
                      </button>
                    </div>
                  </div>

                  {/* 4. Overpack */}
                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-blue-600" />
                        <span>4. Overpack</span>
                      </span>
                      <span className="text-[10px] text-red-500 font-semibold">*Required</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminOverpackFee}
                        onChange={(e) => setAdminOverpackFee(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white ${
                          isOverpackValid ? 'border-slate-300 focus:ring-blue-500' : 'border-red-400 bg-red-50/40'
                        }`}
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setAdminOverpackFee('0.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Free ($0)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminOverpackFee('5.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Standard ($5)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminOverpackFee('15.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Heavy ($15)
                      </button>
                    </div>
                  </div>

                  {/* 5. Insurance */}
                  <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>5. Insurance</span>
                      </span>
                      <span className="text-[10px] text-red-500 font-semibold">*Required</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adminInsuranceFee}
                        onChange={(e) => setAdminInsuranceFee(e.target.value)}
                        placeholder="0.00"
                        className={`w-full pl-7 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white ${
                          isInsuranceValid ? 'border-slate-300 focus:ring-blue-500' : 'border-red-400 bg-red-50/40'
                        }`}
                      />
                    </div>
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setAdminInsuranceFee('0.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        None ($0)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminInsuranceFee('5.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Basic ($5)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminInsuranceFee('15.00')}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded text-[10px] font-semibold transition-colors"
                      >
                        Full ($15)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Grand Total Calculation Summary */}
                <div className="bg-white p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>Base Items: <span className="font-semibold text-slate-800 font-mono">${currentOrderSubtotal.toFixed(2)}</span> + Shipping: <span className="font-semibold text-slate-800 font-mono">${(parsedShipping || 0).toFixed(2)}</span> + Sales Tax: <span className="font-semibold text-slate-800 font-mono">${(parsedSalesTax || 0).toFixed(2)}</span> + Service Tax: <span className="font-semibold text-slate-800 font-mono">${(parsedServiceTax || 0).toFixed(2)}</span> + Overpack: <span className="font-semibold text-slate-800 font-mono">${(parsedOverpack || 0).toFixed(2)}</span> + Insurance: <span className="font-semibold text-slate-800 font-mono">${(parsedInsurance || 0).toFixed(2)}</span></div>
                    <div className="text-[11px] text-slate-500">Grand Total that will be billed to the member's credit allocation line upon approval</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Calculated Grand Total</span>
                    <span className="text-xl font-extrabold text-blue-700 font-mono">${adminCalculatedGrandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Credit Allocation Impact & Available Remaining Balance Preview */}
                {(() => {
                  const creditImpact = calculateRemainingCreditAfterApproval(
                    {
                      ...adminReviewingOrder,
                      total: adminCalculatedGrandTotal,
                      subtotal: currentOrderSubtotal,
                    },
                    members,
                    orders,
                    masterCreditLimit,
                    payments
                  );
                  const remPct = creditImpact.creditAllocation > 0
                    ? Math.min(100, Math.max(0, (creditImpact.remainingBalance / creditImpact.creditAllocation) * 100))
                    : 0;

                  return (
                    <div className={`p-4 rounded-xl space-y-2.5 animate-in fade-in duration-150 border ${
                      creditImpact.isNegative 
                        ? 'bg-rose-50/90 border-rose-300' 
                        : 'bg-emerald-50/80 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          creditImpact.isNegative ? 'text-rose-900' : 'text-emerald-800'
                        }`}>
                          <Wallet className={`w-4 h-4 ${creditImpact.isNegative ? 'text-rose-600' : 'text-emerald-600'}`} />
                          <span>Member Credit Allocation Balance After Approval</span>
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          creditImpact.isNegative
                            ? 'text-rose-800 bg-rose-100 border-rose-300'
                            : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                        }`}>
                          {creditImpact.isNegative 
                            ? `Over Limit by $${Math.abs(creditImpact.remainingBalance).toFixed(2)}` 
                            : creditImpact.isSurplus 
                            ? `+$${creditImpact.surplusAmount.toFixed(2)} Surplus Line`
                            : `${remPct.toFixed(1)}% Credit Available`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Allocated Credit Line</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ${creditImpact.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">This Invoice Amount</span>
                          <span className="font-mono font-bold text-blue-700 text-sm">
                            -${adminCalculatedGrandTotal.toFixed(2)}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-700 block">Remaining Credit Balance</span>
                          <span className={`font-mono font-extrabold text-sm ${creditImpact.isNegative ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {creditImpact.remainingBalance < 0 
                              ? `-$${Math.abs(creditImpact.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : `$${creditImpact.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${creditImpact.isNegative ? 'bg-rose-500' : 'bg-emerald-600'}`}
                          style={{ width: `${remPct}%` }}
                        />
                      </div>
                      <p className={`text-[11px] ${creditImpact.isNegative ? 'text-rose-800' : 'text-emerald-800'}`}>
                        {creditImpact.isNegative ? (
                          <span>Approving this invoice will allocate <strong>${adminCalculatedGrandTotal.toFixed(2)}</strong> against <strong>{adminReviewingOrder.customerName || 'member'}</strong>'s <strong>${creditImpact.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> credit line, putting the balance into negative: <strong>-${Math.abs(creditImpact.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (surpasses credit line).</span>
                        ) : (
                          <span>Approving this invoice will allocate <strong>${adminCalculatedGrandTotal.toFixed(2)}</strong> against <strong>{adminReviewingOrder.customerName || 'member'}</strong>'s <strong>${creditImpact.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> credit line, leaving <strong>${creditImpact.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> available for future orders.</span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Requirement Alert if not all 5 are filled */}
              {!areAllFeesFilled && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Please fill all five fee fields (Shipping Fee, Sales Tax, Service Tax, Overpack, and Insurance) to enable order approval and decline actions.</span>
                </div>
              )}

              {/* Decline Reason Sub-card (when Admin toggles Decline) */}
              {showDeclineConfirm && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Select Reason for Declining Order Fulfillment:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeclineConfirm(false)}
                      className="text-[11px] text-rose-700 hover:text-rose-900 font-bold"
                    >
                      Cancel Decline
                    </button>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={adminDeclineReason}
                      onChange={(e) => setAdminDeclineReason(e.target.value)}
                      className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Previous overdue balance on account">Previous overdue balance on account (Requires payment settlement)</option>
                      <option value="Credit allocation limit exceeded">Credit allocation limit exceeded for this billing cycle</option>
                      <option value="Product inventory out of stock">Requested product models currently out of stock</option>
                      <option value="Unverified store business address">Store business address unverified or outside distribution zone</option>
                      <option value="Other">Other custom reason...</option>
                    </select>

                    {adminDeclineReason === 'Other' && (
                      <input
                        type="text"
                        value={customDeclineReason}
                        onChange={(e) => setCustomDeclineReason(e.target.value)}
                        placeholder="Type custom decline reason for member..."
                        className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    )}
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeclineConfirm(false)}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineOrderFulfillment}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Confirm & Decline Order Fulfillment</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Section */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCloseOrderReview}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                  {/* Option 1: Decline Order Fulfillment */}
                  <button
                    type="button"
                    disabled={!areAllFeesFilled}
                    onClick={() => setShowDeclineConfirm(true)}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      areAllFeesFilled
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 hover:border-rose-400 cursor-pointer shadow-2xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                    title={areAllFeesFilled ? 'Decline fulfillment (e.g. previous balance)' : 'Fill all 5 fees first'}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>1. Decline Order Fulfillment</span>
                  </button>

                  {/* Option 2: Approve Order Fulfillment directly */}
                  <button
                    type="button"
                    disabled={!areAllFeesFilled || !adminReviewingOrder.items || adminReviewingOrder.items.length === 0}
                    onClick={handleApproveOrderFulfillment}
                    id="admin-approve-order-btn"
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-xs ${
                      areAllFeesFilled && adminReviewingOrder.items && adminReviewingOrder.items.length > 0
                        ? isItemsModifiedByAdmin
                          ? 'bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-sm hover:shadow active:scale-[0.99]'
                          : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-sm hover:shadow active:scale-[0.99]'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                    title={
                      !areAllFeesFilled
                        ? 'Fill all 5 fees first'
                        : !adminReviewingOrder.items || adminReviewingOrder.items.length === 0
                        ? 'Keep at least 1 item to approve order'
                        : isItemsModifiedByAdmin
                        ? 'Approve order with item adjustments into Credited status'
                        : 'Approve order into Credited status against credit allocation'
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isItemsModifiedByAdmin ? '2. Approve Order (Credited - Modified)' : '2. Approve Order (Credited)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Master Credit Allocation Limit Modal ($0 - $100,000) */}
      {isMasterCreditModalOpen && (
        <div 
          id="master-credit-limit-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div 
            id="master-credit-limit-modal"
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-xs">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Master Credit Allocation Limit</h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                      $0 - $100,000 Range
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set global purchasing credit allocation across all new and existing member accounts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMasterCreditModalOpen(false)}
                id="close-master-credit-modal-btn"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <span className="text-xl leading-none font-bold">&times;</span>
              </button>
            </div>

            {/* Current vs Proposed Display Banner */}
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                  Current Master Limit
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  ${masterCreditLimit.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 ml-1.5">active default</span>
              </div>

              <div className="text-blue-400 hidden sm:block">
                <ChevronRight className="w-5 h-5" />
              </div>

              <div className="text-center sm:text-right">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                  Proposed Target Limit
                </span>
                <span className="text-2xl font-black font-mono text-blue-700">
                  ${masterLimitInput.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 ml-1">/ $100k max</span>
              </div>
            </div>

            {/* Interactive Toggle Slider ($0 to $100,000) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Min: $0 (No Credit)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-colors ${
                  masterLimitInput === 0 ? 'bg-slate-200 text-slate-700' :
                  masterLimitInput <= 10000 ? 'bg-blue-100 text-blue-800' :
                  masterLimitInput <= 25000 ? 'bg-indigo-100 text-indigo-800' :
                  masterLimitInput <= 50000 ? 'bg-emerald-100 text-emerald-800' :
                  masterLimitInput <= 75000 ? 'bg-amber-100 text-amber-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {masterLimitInput === 0 ? 'Cash On Delivery Only (No Credit)' :
                   masterLimitInput <= 10000 ? 'Tier 1 • Standard Wholesale ($10,000)' :
                   masterLimitInput <= 25000 ? 'Tier 2 • Preferred Dealer ($25,000)' :
                   masterLimitInput <= 50000 ? 'Tier 3 • High-Volume Store ($50,000)' :
                   masterLimitInput <= 75000 ? 'Tier 4 • Regional Distributor ($75,000)' :
                   'Tier 5 • Enterprise Maximum Credit ($100,000)'}
                </span>
                <span className="flex items-center gap-1 font-bold text-blue-700">
                  Max: $100,000
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                </span>
              </div>

              {/* Slider Track with Custom Fill */}
              <div className="relative flex items-center py-2">
                <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden absolute pointer-events-none">
                  <div 
                    className={`h-full transition-all duration-150 ${
                      masterLimitInput === 0 ? 'bg-slate-300' :
                      masterLimitInput <= 10000 ? 'bg-blue-500' :
                      masterLimitInput <= 25000 ? 'bg-indigo-500' :
                      masterLimitInput <= 50000 ? 'bg-emerald-500' :
                      masterLimitInput <= 75000 ? 'bg-amber-500' :
                      'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
                    }`}
                    style={{ width: `${(masterLimitInput / 100000) * 100}%` }}
                  />
                </div>

                <input
                  type="range"
                  min={0}
                  max={100000}
                  step={1000}
                  value={masterLimitInput}
                  onChange={(e) => setMasterLimitInput(Number(e.target.value))}
                  id="master-credit-slider-input"
                  className="w-full h-3.5 bg-transparent appearance-none cursor-pointer relative z-10 accent-blue-600 focus:outline-none"
                />
              </div>

              {/* Tick Milestones */}
              <div className="grid grid-cols-5 text-[10px] font-medium text-slate-400 pt-0.5">
                <button 
                  type="button" 
                  onClick={() => setMasterLimitInput(0)} 
                  className="text-left hover:text-blue-600 transition-colors cursor-pointer"
                >
                  $0
                </button>
                <button 
                  type="button" 
                  onClick={() => setMasterLimitInput(25000)} 
                  className="text-center hover:text-blue-600 transition-colors cursor-pointer"
                >
                  $25,000
                </button>
                <button 
                  type="button" 
                  onClick={() => setMasterLimitInput(50000)} 
                  className="text-center hover:text-blue-600 transition-colors cursor-pointer"
                >
                  $50,000
                </button>
                <button 
                  type="button" 
                  onClick={() => setMasterLimitInput(75000)} 
                  className="text-center hover:text-blue-600 transition-colors cursor-pointer"
                >
                  $75,000
                </button>
                <button 
                  type="button" 
                  onClick={() => setMasterLimitInput(100000)} 
                  className="text-right hover:text-blue-600 transition-colors cursor-pointer font-bold text-blue-600"
                >
                  $100k
                </button>
              </div>

              {/* Presets and Manual Stepper */}
              <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
                  {[
                    { label: '$0', val: 0 },
                    { label: '$5k', val: 5000 },
                    { label: '$10k (Default)', val: 10000 },
                    { label: '$25k', val: 25000 },
                    { label: '$50k', val: 50000 },
                    { label: '$75k', val: 75000 },
                    { label: '$100k (Max)', val: 100000 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setMasterLimitInput(preset.val)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all border cursor-pointer ${
                        masterLimitInput === preset.val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Fine Tune Manual Input */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] font-medium text-slate-500">Fine Tune:</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      step={500}
                      value={masterLimitInput}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100000, Number(e.target.value) || 0));
                        setMasterLimitInput(val);
                      }}
                      id="master-credit-manual-input"
                      className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Scope and Impact Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Total Members Impacted:</span>
                </span>
                <span className="font-bold text-slate-900">{members.length} registered accounts</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Network Credit Capacity:</span>
                </span>
                <span className="font-mono font-extrabold text-blue-700">
                  ${(masterLimitInput * members.length).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                Applying this master allocation updates the wholesale purchasing ceiling across all existing members and configures the default allocation for newly registered store and team accounts.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMasterCreditModalOpen(false)}
                id="cancel-master-credit-btn"
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyMasterCreditLimit(masterLimitInput, false)}
                  id="apply-master-credit-new-only-btn"
                  className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                  title="Sets the default limit for new members without changing existing member credit allocations"
                >
                  Set for New Members Only
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMasterCreditLimit(masterLimitInput, true)}
                  id="apply-master-credit-all-btn"
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Apply Across All New & Old Members (${masterLimitInput.toLocaleString()})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create an Invoice Modal */}
      {isCreateInvoiceOpen && (
        <div 
          id="create-invoice-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            id="create-invoice-modal"
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Top Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 z-10" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Create an Invoice</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-700 uppercase tracking-wide">
                      Admin Billing
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Issue an adjustment invoice, fee assessment, or credit memo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateInvoiceOpen(false)}
                id="btn-close-create-invoice-modal"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Form (with scrollable body & pinned footer) */}
            <form onSubmit={handleCreateInvoiceSubmit} className="flex flex-col flex-1 overflow-hidden">
              
              {/* Scrollable Form Body */}
              <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                {/* Error Notification Alert */}
                {invoiceFormError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{invoiceFormError}</span>
                  </div>
                )}
                
                {/* Field 1: Billed to (Select member) Dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="select-billed-to-member" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Billed To (Select Member) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="select-billed-to-member"
                      value={invoiceBilledToMemberId}
                      onChange={(e) => setInvoiceBilledToMemberId(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="">-- Select Member / Store Account --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.storeLocation ? `— ${m.storeLocation}` : `(${m.role})`} • @{m.username}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {/* Selected Member Summary Preview */}
                  {(() => {
                    const selectedMember = members.find((m) => m.id === invoiceBilledToMemberId);
                    if (!selectedMember) return null;
                    return (
                      <div className="mt-2 p-2.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shrink-0 shadow-2xs">
                            {selectedMember.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{selectedMember.name}</span>
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                @{selectedMember.username}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {selectedMember.email} &bull; {selectedMember.phone}
                            </div>
                          </div>
                        </div>
                        <div className="sm:text-right border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Credit Allocation</span>
                          <span className="font-mono font-bold text-emerald-700 text-xs">
                            ${(selectedMember.creditAllocation || masterCreditLimit).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Field 2: Invoice Title Dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="select-invoice-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Invoice Title <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="select-invoice-title"
                      value={invoiceTitle}
                      onChange={(e) => handleInvoiceTitleChange(e.target.value as any)}
                      className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="Late Payment">Late Payment</option>
                      <option value="Chargeback">Chargeback</option>
                      <option value="Check Bounce">Check Bounce</option>
                      <option value="Low Performance Penalty">Low Performance Penalty</option>
                      <option value="Good Performance Bonus">Good Performance Bonus</option>
                      <option value="Miscellenous">Miscellenous</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {/* Invoice Title Information Banner */}
                  <div className="p-2 rounded-lg border text-xs flex items-center gap-2 bg-slate-50 border-slate-200">
                    {invoiceTitle === 'Late Payment' && (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-slate-600 text-[11px]">
                          <strong>Late Payment:</strong> Surcharge for overdue statements or delinquent accounts.
                        </span>
                      </>
                    )}
                    {invoiceTitle === 'Chargeback' && (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="text-slate-600 text-[11px]">
                          <strong>Chargeback:</strong> Administrative penalty assessed for payment dispute reversals.
                        </span>
                      </>
                    )}
                    {invoiceTitle === 'Check Bounce' && (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-slate-600 text-[11px]">
                          <strong>Check Bounce:</strong> NSF fee or dishonored bank payment surcharge.
                        </span>
                      </>
                    )}
                    {invoiceTitle === 'Low Performance Penalty' && (
                      <>
                        <TrendingDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="text-slate-600 text-[11px]">
                          <strong>Low Performance Penalty:</strong> Penalty charge assessed for underperformance or service level infractions.
                        </span>
                      </>
                    )}
                    {invoiceTitle === 'Good Performance Bonus' && (
                      <>
                        <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-slate-600 text-[11px]">
                          <strong>Good Performance Bonus:</strong> Incentive reward or performance bonus credited to the member's account.
                        </span>
                      </>
                    )}
                    {invoiceTitle === 'Miscellenous' && (
                      <>
                        <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-slate-600 text-[11px]">
                          <strong>Miscellaneous:</strong> General commercial billing adjustment, credit adjustment, or special assessment.
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Row: Invoice Number & Reference # */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-invoice-number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Invoice # <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setInvoiceNumberInput(generateRandomInvoiceNumber())}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      id="input-invoice-number"
                      value={invoiceNumberInput}
                      onChange={(e) => setInvoiceNumberInput(e.target.value)}
                      placeholder="INV-2026-XXXX"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="input-order-ref" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Reference / Order #
                    </label>
                    <input
                      type="text"
                      id="input-order-ref"
                      value={invoiceOrderRefInput}
                      onChange={(e) => setInvoiceOrderRefInput(e.target.value)}
                      placeholder="REF-XXXX or ORD-XXXX"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Field: Invoice Amount ($) with support for negative and positive values */}
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input-invoice-amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Invoice Amount ($) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Positive = Charge / Due &bull; Negative = Credit Memo
                    </span>
                  </div>

                  {/* Clean direct input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      id="input-invoice-amount"
                      value={invoiceAmountInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow digits, single decimal point, and optional leading minus sign
                        if (/^-?\d*\.?\d*$/.test(val) || val === '' || val === '-') {
                          setInvoiceAmountInput(val);
                        }
                      }}
                      placeholder="e.g. 50.00 or -50.00"
                      className={`w-full px-3.5 py-2 bg-white border rounded-xl text-sm font-mono font-extrabold focus:outline-none focus:ring-2 transition-all ${
                        (parseFloat(invoiceAmountInput) || 0) < 0
                          ? 'border-emerald-300 text-emerald-700 focus:ring-emerald-500'
                          : 'border-slate-300 text-slate-900 focus:ring-blue-500'
                      }`}
                      required
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                    {['-100.00', '-50.00', '-25.00', '25.00', '50.00', '100.00', '250.00'].map((amt) => {
                      const isNeg = amt.startsWith('-');
                      const isSelected = invoiceAmountInput === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setInvoiceAmountInput(amt)}
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-colors cursor-pointer ${
                            isSelected
                              ? isNeg
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : isNeg
                              ? 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isNeg ? `-$${amt.slice(1)}` : `+$${amt}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Real-time Calculated Balance Box */}
                  {(() => {
                    const enteredNum = parseFloat(invoiceAmountInput) || 0;
                    const isNeg = enteredNum < 0;
                    const selectedMember = members.find((m) => m.id === invoiceBilledToMemberId);
                    const currentCredit = selectedMember 
                      ? getMemberCreditSummary(selectedMember, members, orders, invoices, payments, masterCreditLimit)
                      : null;

                    return (
                      <div 
                        id="invoice-balance-calculation-preview"
                        className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all mt-1 ${
                          isNeg 
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                            : 'bg-blue-50/80 border-blue-200 text-blue-950'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Calculated Balance:
                          </span>
                          <span className={`font-mono font-bold text-xs block ${isNeg ? 'text-emerald-700' : 'text-blue-700'}`}>
                            {isNeg 
                              ? `-$${Math.abs(enteredNum).toFixed(2)} (Credit Memo applied to account)` 
                              : `$${enteredNum.toFixed(2)} (Amount Due payable by member)`}
                          </span>
                        </div>

                        {selectedMember && currentCredit && (
                          <div className="sm:text-right border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-200/80 text-[11px]">
                            <span className="text-slate-500 font-medium block">Projected Available Line:</span>
                            <span className={`font-mono font-bold ${isNeg ? 'text-emerald-700' : 'text-blue-700'}`}>
                              ${(currentCredit.availableCredit - enteredNum).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Row: Issue Date & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label htmlFor="input-invoice-date" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      id="input-invoice-date"
                      value={invoiceDateInput}
                      onChange={(e) => setInvoiceDateInput(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="input-invoice-due-date" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Due Date
                      </label>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setInvoiceDueDateInput(today);
                          }}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Today
                        </button>
                        <span>&bull;</span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setInvoiceDueDateInput(d);
                          }}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          +15d
                        </button>
                        <span>&bull;</span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setInvoiceDueDateInput(d);
                          }}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          +30d
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      id="input-invoice-due-date"
                      value={invoiceDueDateInput}
                      onChange={(e) => setInvoiceDueDateInput(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Row: Payment Method & Initial Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label htmlFor="select-invoice-method" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Payment Terms / Method
                    </label>
                    <div className="relative">
                      <select
                        id="select-invoice-method"
                        value={invoicePaymentMethodInput}
                        onChange={(e) => setInvoicePaymentMethodInput(e.target.value)}
                        className="w-full pl-3.5 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white appearance-none cursor-pointer"
                      >
                        <option value="ACH Transfer">ACH Transfer</option>
                        <option value="Company Credit Line">Company Credit Line</option>
                        <option value="Wire Transfer">Wire Transfer</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="select-invoice-status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Initial Invoice Status
                    </label>
                    <div className="relative">
                      <select
                        id="select-invoice-status"
                        value={invoiceStatusInput}
                        onChange={(e) => setInvoiceStatusInput(e.target.value as any)}
                        className="w-full pl-3.5 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white appearance-none cursor-pointer"
                      >
                        <option value="Unpaid">Unpaid (Awaiting Payment)</option>
                        <option value="Paid">Paid (Settled Immediately)</option>
                        <option value="Processing">Processing (Pending Clearance)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Field: Notes / Reason memo */}
                <div className="space-y-1">
                  <label htmlFor="textarea-invoice-notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Notes / Reason Memo (Optional)
                  </label>
                  <textarea
                    id="textarea-invoice-notes"
                    rows={2}
                    value={invoiceNotesInput}
                    onChange={(e) => setInvoiceNotesInput(e.target.value)}
                    placeholder="Add specific invoice notes, check numbers, dispute IDs, or statement description..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions (Sticky Footer) */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  id="btn-cancel-create-invoice"
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-invoice"
                  className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Issue & Send Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement / Invoice Details Modal */}
      {viewingInvoice && (
        <div 
          id="view-invoice-statement-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 my-8 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Top Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

            {/* Header with Print & Close */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">HG World Class Wholesale</h3>
                <p className="text-[11px] text-slate-500">Official Commercial Billing Statement</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="admin-invoice-print-pdf-btn"
                  onClick={() => {
                    const matchingOrder = orders.find((o) => o.orderNumber === viewingInvoice.orderNumber);
                    downloadInvoicePdf({ invoice: viewingInvoice, order: matchingOrder });
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer shadow-2xs"
                  title="Generate and download PDF invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" /> Print / Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Statement Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Number</span>
                <span className="font-mono font-bold text-blue-700">{viewingInvoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Reference #</span>
                <span className="font-mono font-semibold text-slate-700">{viewingInvoice.orderNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Issue Date</span>
                <span className="font-medium text-slate-800">{viewingInvoice.date}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                <span className="font-medium text-slate-800">{viewingInvoice.dueDate}</span>
              </div>
            </div>

            {/* Billed To and Charge Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To (Customer / Member)</span>
                <p className="font-bold text-slate-900 text-sm">{viewingInvoice.billedTo || viewingInvoice.customerName || 'Authorized Store Account'}</p>
                {viewingInvoice.memberUsername && (
                  <p className="text-[11px] text-blue-600 font-medium">Username: @{viewingInvoice.memberUsername}</p>
                )}
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Invoice Category & Status</span>
                <div className="flex items-center gap-2 pt-0.5">
                  {renderInvoiceTitleBadge(viewingInvoice.title)}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    viewingInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    viewingInvoice.status === 'Partial' ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold' :
                    viewingInvoice.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {viewingInvoice.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">Payment Method: {viewingInvoice.method || 'Allocated Credit Line'}</p>
              </div>
            </div>

            {/* Credit Allocation Remaining Balance Summary Box */}
            {(() => {
              const invCredit = getInvoiceCreditInfo(viewingInvoice, members, orders, invoices, masterCreditLimit);
              return (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl mb-6 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Credit Allocation & Remaining Available Balance</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      {invCredit.remainingPct.toFixed(1)}% Available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Credit Line</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${invCredit.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        {viewingInvoice.amount < 0 ? 'Credit Memo Adjustment' : 'Invoice Billed'}
                      </span>
                      <span className={`font-mono font-bold text-sm ${viewingInvoice.amount < 0 ? 'text-emerald-700 font-extrabold' : 'text-blue-700'}`}>
                        {viewingInvoice.amount < 0 ? `-$${Math.abs(viewingInvoice.amount).toFixed(2)}` : `$${viewingInvoice.amount.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Credit Remaining Balance</span>
                      <span className="font-mono font-extrabold text-emerald-700 text-sm">
                        ${invCredit.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${invCredit.remainingPct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Line item breakdown table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Description / Charge Item</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  <tr>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 block">{viewingInvoice.title || 'Wholesale Order Settlement'}</span>
                        {viewingInvoice.amount < 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">Credit Memo</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {viewingInvoice.notes || (viewingInvoice.amount < 0 ? `Credit memo adjustment applied to reference ${viewingInvoice.orderNumber}` : `Commercial wholesale distribution statement for reference ${viewingInvoice.orderNumber}`)}
                      </span>
                    </td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-right font-mono">
                      {viewingInvoice.amount < 0 ? `-$${Math.abs(viewingInvoice.amount).toFixed(2)}` : `$${viewingInvoice.amount.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {viewingInvoice.amount < 0 ? `-$${Math.abs(viewingInvoice.amount).toFixed(2)}` : `$${viewingInvoice.amount.toFixed(2)}`}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50/80 border-t border-slate-200 font-bold text-xs">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-slate-600 uppercase text-[10px]">
                      {viewingInvoice.amount < 0 ? 'Total Credit Amount:' : 'Total Amount Due:'}
                    </td>
                    <td className={`p-3 text-right font-mono text-base font-extrabold ${viewingInvoice.amount < 0 ? 'text-emerald-700' : 'text-blue-700'}`}>
                      {viewingInvoice.amount < 0 ? `-$${Math.abs(viewingInvoice.amount).toFixed(2)}` : `$${viewingInvoice.amount.toFixed(2)}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer / Settlement info */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>Payment Terms: Net 15 &bull; HG World Class Wholesale Network</span>
              {viewingInvoice.status !== 'Paid' && (
                <button
                  type="button"
                  onClick={() => {
                    handlePayInvoice(viewingInvoice.invoiceNumber);
                    setViewingInvoice(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Mark Paid / Settle Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member Invitation and Setup Link Dispatcher Modal */}
      <MemberInvitationModal
        member={selectedInviteMember}
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setSelectedInviteMember(null);
        }}
        senderAdminName={user.name || 'Tousif Sultan'}
        onMarkSent={handleMarkInviteSent}
      />
    </div>
  );
};
