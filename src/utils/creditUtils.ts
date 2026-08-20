import { InvoiceItem, OrderItem, PaymentItem, TeamMember } from '../types';

export interface MemberCreditSummary {
  baseCreditAllocation: number;
  totalCommittedOrders: number;
  totalCompletedPayments: number;
  netDueBalance: number;
  surplusPayment: number;
  effectiveCreditAllocation: number;
  availableCredit: number;
  isNegative: boolean;
  isSurplus: boolean;
  remainingPct: number;
}

export interface InvoiceCreditInfo {
  creditAllocation: number;
  baseCreditAllocation: number;
  remainingBalance: number;
  usedCredit: number;
  remainingPct: number;
  hasCreditInfo: boolean;
  memberDisplayName: string;
  isNegative: boolean;
  isSurplus: boolean;
  surplusAmount: number;
}

export interface InvoicePaymentSummary {
  invoiceTotal: number;
  totalPaid: number;
  currentBalanceDue: number;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Processing';
  payments: PaymentItem[];
}

/**
 * Calculates payment history, settled payments, and current balance due for an invoice.
 * Supports both standard debit invoices and negative credit memos/adjustments.
 */
export function getInvoicePaymentSummary(
  invoice: InvoiceItem,
  payments: PaymentItem[] = []
): InvoicePaymentSummary {
  const invoicePayments = payments.filter(
    (p) => p.invoiceNumber === invoice.invoiceNumber && p.status === 'Completed'
  );
  const totalPaid = invoicePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const invoiceTotal = Number(invoice.amount) || 0;

  let currentBalanceDue = 0;
  let isFullyPaid = false;
  let isPartiallyPaid = false;

  if (invoiceTotal < 0) {
    // Negative Invoice (Credit Memo / Refund / Credit Adjustment)
    if (invoice.status === 'Paid') {
      currentBalanceDue = 0;
      isFullyPaid = true;
      isPartiallyPaid = false;
    } else {
      // For negative invoice: balance due is negative (credit to account) until settled
      const remainingAbs = Math.abs(invoiceTotal) - Math.abs(totalPaid);
      if (remainingAbs <= 0.001) {
        currentBalanceDue = 0;
        isFullyPaid = true;
        isPartiallyPaid = false;
      } else {
        currentBalanceDue = -remainingAbs;
        isFullyPaid = false;
        isPartiallyPaid = Math.abs(totalPaid) > 0.001;
      }
    }
  } else {
    // Positive Invoice (Debit / Fee / Order Billing)
    currentBalanceDue = Math.max(0, invoiceTotal - totalPaid);
    isFullyPaid = currentBalanceDue <= 0.001;
    isPartiallyPaid = totalPaid > 0.001 && currentBalanceDue > 0.001;
  }

  let status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Processing' = invoice.status;
  if (isFullyPaid) {
    status = 'Paid';
  } else if (isPartiallyPaid) {
    status = 'Partial';
  } else if (invoice.status === 'Overdue') {
    status = 'Overdue';
  } else if (invoice.status === 'Processing') {
    status = 'Processing';
  } else {
    status = 'Unpaid';
  }

  return {
    invoiceTotal,
    totalPaid,
    currentBalanceDue,
    isFullyPaid,
    isPartiallyPaid,
    status,
    payments: invoicePayments,
  };
}

/**
 * Resolves comprehensive member credit summary across all orders, invoices, and payments.
 * Handles negative credit line (when orders surpass credit limit) and surplus credit line
 * (when payments exceed order totals, adding extra to the credit allocation).
 * Also incorporates standalone positive and negative adjustment invoices.
 */
export function getMemberCreditSummary(
  memberIdentifier: {
    username?: string;
    tempUsername?: string;
    id?: string;
    name?: string;
    creditAllocation?: number;
  } | undefined,
  members: TeamMember[] = [],
  orders: OrderItem[] = [],
  invoices: InvoiceItem[] = [],
  payments: PaymentItem[] = [],
  fallbackMasterLimit: number = 3200
): MemberCreditSummary {
  // 1. Locate member record
  const member = members.find((m) => {
    if (!memberIdentifier) return false;
    if (memberIdentifier.username && m.username && m.username.toLowerCase() === memberIdentifier.username.toLowerCase()) return true;
    if (memberIdentifier.tempUsername && m.tempUsername && m.tempUsername.toLowerCase() === memberIdentifier.tempUsername.toLowerCase()) return true;
    if (memberIdentifier.id && m.id === memberIdentifier.id) return true;
    if (memberIdentifier.name && m.name && m.name.toLowerCase() === memberIdentifier.name.toLowerCase()) return true;
    return false;
  });

  const baseCreditAllocation = memberIdentifier?.creditAllocation ?? member?.creditAllocation ?? fallbackMasterLimit;

  // 2. Identify all usernames and names associated with this member
  const memberUsernames = [
    memberIdentifier?.username?.toLowerCase(),
    memberIdentifier?.tempUsername?.toLowerCase(),
    member?.username?.toLowerCase(),
    member?.tempUsername?.toLowerCase(),
  ].filter(Boolean) as string[];

  const memberNames = [
    memberIdentifier?.name?.toLowerCase(),
    member?.name?.toLowerCase(),
  ].filter((n): n is string => Boolean(n && n.trim().length >= 3));

  const memberIds = [
    memberIdentifier?.id,
    member?.id,
  ].filter(Boolean) as string[];

  // 3. Filter active committed orders for this member
  const activeOrders = orders.filter((o) => {
    const isMemberMatch =
      (o.memberUsername && memberUsernames.includes(o.memberUsername.toLowerCase())) ||
      (o.memberId && memberIds.includes(o.memberId)) ||
      (o.customerName && memberNames.some((n) => o.customerName.toLowerCase().includes(n)));

    const isCommitted =
      o.status === 'Pending review and approval by Admin' ||
      o.status === 'Credited' ||
      o.status === 'Updated and Approved' ||
      o.status === 'Approved with changes by Admin' ||
      o.status === 'Approved' ||
      o.status === 'Approved by Admin' ||
      o.status === 'Ready for Member Review & Acceptance' ||
      o.status === 'Approved & Processing' ||
      o.status === 'Open' ||
      o.status === 'Processing' ||
      o.status === 'Completed' ||
      o.status === 'Shipped';

    return isMemberMatch && isCommitted;
  });

  const ordersSubtotal = activeOrders.reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);

  // 4. Incorporate standalone invoices (positive fees like late payments, or negative credit memos)
  const standaloneInvoices = invoices.filter((inv) => {
    const isMemberMatch =
      (inv.memberUsername && memberUsernames.includes(inv.memberUsername.toLowerCase())) ||
      (inv.memberId && memberIds.includes(inv.memberId)) ||
      (inv.customerName && memberNames.some((n) => inv.customerName.toLowerCase().includes(n))) ||
      (inv.billedTo && memberNames.some((n) => inv.billedTo.toLowerCase().includes(n)));

    const isFromActiveOrder = activeOrders.some((o) => o.orderNumber === inv.orderNumber);
    return isMemberMatch && !isFromActiveOrder;
  });

  const standaloneInvoicesTotal = standaloneInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  const totalCommittedOrders = Math.max(0, ordersSubtotal + standaloneInvoicesTotal);

  // 5. Find member invoice numbers to also associate payments
  const memberInvoiceNumbers = invoices
    .filter((inv) => {
      return (
        (inv.memberUsername && memberUsernames.includes(inv.memberUsername.toLowerCase())) ||
        (inv.memberId && memberIds.includes(inv.memberId)) ||
        (inv.customerName && memberNames.some((n) => inv.customerName.toLowerCase().includes(n))) ||
        (inv.billedTo && memberNames.some((n) => inv.billedTo.toLowerCase().includes(n)))
      );
    })
    .map((inv) => inv.invoiceNumber);

  // 6. Filter completed payments for this member
  const completedPayments = payments.filter((p) => {
    if (p.status !== 'Completed') return false;
    if (p.memberUsername && memberUsernames.includes(p.memberUsername.toLowerCase())) return true;
    if (p.customerName && memberNames.some((n) => p.customerName.toLowerCase().includes(n))) return true;
    if (p.invoiceNumber && memberInvoiceNumbers.includes(p.invoiceNumber)) return true;
    return false;
  });

  const totalCompletedPayments = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // 7. Compute net balance due, surplus, and available credit
  // Orders = $700, Payments = $0 -> Available = $500 - $700 = -$200 (Negative credit line!)
  // Orders = $700, Payments = $800 -> Surplus = $100 -> Effective Credit = $600 -> Available = $600!
  const effectiveTotalDebits = ordersSubtotal + standaloneInvoicesTotal;
  const netDueBalance = Math.max(0, effectiveTotalDebits - totalCompletedPayments);
  const surplusPayment = Math.max(0, totalCompletedPayments - effectiveTotalDebits);
  const effectiveCreditAllocation = baseCreditAllocation + surplusPayment;
  const availableCredit = baseCreditAllocation - effectiveTotalDebits + totalCompletedPayments;

  const isNegative = availableCredit < -0.001;
  const isSurplus = surplusPayment > 0.001;

  const remainingPct = effectiveCreditAllocation > 0
    ? Math.min(100, Math.max(0, (availableCredit / effectiveCreditAllocation) * 100))
    : 0;

  return {
    baseCreditAllocation,
    totalCommittedOrders,
    totalCompletedPayments,
    netDueBalance,
    surplusPayment,
    effectiveCreditAllocation,
    availableCredit,
    isNegative,
    isSurplus,
    remainingPct,
  };
}

/**
 * Resolves credit allocation line and available remaining credit balance for any invoice.
 */
export function getInvoiceCreditInfo(
  invoice: InvoiceItem,
  members: TeamMember[] = [],
  orders: OrderItem[] = [],
  invoices: InvoiceItem[] = [],
  fallbackMasterLimit: number = 3200,
  payments: PaymentItem[] = []
): InvoiceCreditInfo {
  // 1. Resolve member record
  const member = members.find((m) => {
    if (invoice.memberUsername) {
      if (m.username && m.username.toLowerCase() === invoice.memberUsername.toLowerCase()) return true;
      if (m.tempUsername && m.tempUsername.toLowerCase() === invoice.memberUsername.toLowerCase()) return true;
    }
    if (invoice.memberId && m.id === invoice.memberId) return true;
    if (invoice.customerName && m.name && m.name.toLowerCase() === invoice.customerName.toLowerCase()) return true;
    if (invoice.billedTo && m.name && invoice.billedTo.toLowerCase().includes(m.name.toLowerCase())) return true;
    return false;
  });

  const memberDisplayName = invoice.customerName || invoice.billedTo || member?.name || invoice.memberUsername || 'Store Member';

  // Compute full member credit summary
  const creditSummary = getMemberCreditSummary(
    {
      username: invoice.memberUsername,
      name: invoice.customerName || invoice.billedTo,
      id: invoice.memberId,
      creditAllocation: invoice.creditAllocation ?? member?.creditAllocation,
    },
    members,
    orders,
    invoices,
    payments,
    fallbackMasterLimit
  );

  return {
    creditAllocation: creditSummary.effectiveCreditAllocation,
    baseCreditAllocation: creditSummary.baseCreditAllocation,
    remainingBalance: creditSummary.availableCredit,
    usedCredit: creditSummary.totalCommittedOrders,
    remainingPct: creditSummary.remainingPct,
    hasCreditInfo: true,
    memberDisplayName,
    isNegative: creditSummary.isNegative,
    isSurplus: creditSummary.isSurplus,
    surplusAmount: creditSummary.surplusPayment,
  };
}

/**
 * Calculates member credit allocation, total committed orders, and remaining available balance upon order approval.
 */
export function calculateRemainingCreditAfterApproval(
  targetOrder: OrderItem,
  members: TeamMember[] = [],
  orders: OrderItem[] = [],
  fallbackMasterLimit: number = 3200,
  payments: PaymentItem[] = []
): {
  creditAllocation: number;
  baseCreditAllocation: number;
  remainingBalance: number;
  totalCommitted: number;
  totalPaid: number;
  orderTotal: number;
  isNegative: boolean;
  isSurplus: boolean;
  surplusAmount: number;
} {
  const member = members.find((m) => {
    if (targetOrder.memberUsername) {
      if (m.username && m.username.toLowerCase() === targetOrder.memberUsername.toLowerCase()) return true;
      if (m.tempUsername && m.tempUsername.toLowerCase() === targetOrder.memberUsername.toLowerCase()) return true;
    }
    if (targetOrder.memberId && m.id === targetOrder.memberId) return true;
    if (targetOrder.customerName && m.name && m.name.toLowerCase() === targetOrder.customerName.toLowerCase()) return true;
    return false;
  });

  const baseCreditAllocation = member?.creditAllocation ?? fallbackMasterLimit;
  const orderTotal = targetOrder.total || targetOrder.subtotal || 0;

  const memberUsernames = [
    targetOrder.memberUsername?.toLowerCase(),
    member?.username?.toLowerCase(),
    member?.tempUsername?.toLowerCase(),
  ].filter(Boolean) as string[];

  const memberNames = [
    targetOrder.customerName?.toLowerCase(),
    member?.name?.toLowerCase(),
  ].filter(Boolean) as string[];

  // Sum other approved/in-process orders (excluding current target order if it exists in list)
  const otherApprovedOrdersTotal = orders
    .filter((o) => {
      if (o.id === targetOrder.id || (targetOrder.orderNumber && o.orderNumber === targetOrder.orderNumber)) return false;
      const isMemberMatch =
        (o.memberUsername && memberUsernames.includes(o.memberUsername.toLowerCase())) ||
        (o.customerName && memberNames.some((n) => o.customerName.toLowerCase().includes(n)));

      const isApprovedOrProcessing =
        o.status === 'Pending review and approval by Admin' ||
        o.status === 'Credited' ||
        o.status === 'Approved' ||
        o.status === 'Updated and Approved' ||
        o.status === 'Approved with changes by Admin' ||
        o.status === 'Approved by Admin' ||
        o.status === 'Approved & Processing' ||
        o.status === 'Ready for Member Review & Acceptance' ||
        o.status === 'Open' ||
        o.status === 'Processing' ||
        o.status === 'Completed' ||
        o.status === 'Shipped';

      return isMemberMatch && isApprovedOrProcessing;
    })
    .reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);

  const totalCommitted = otherApprovedOrdersTotal + orderTotal;

  // Member payments
  const totalPaid = payments
    .filter((p) => {
      if (p.status !== 'Completed') return false;
      if (p.memberUsername && memberUsernames.includes(p.memberUsername.toLowerCase())) return true;
      if (p.customerName && memberNames.some((n) => p.customerName.toLowerCase().includes(n))) return true;
      return false;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const surplusAmount = Math.max(0, totalPaid - totalCommitted);
  const creditAllocation = baseCreditAllocation + surplusAmount;
  const remainingBalance = baseCreditAllocation - totalCommitted + totalPaid;

  return {
    creditAllocation,
    baseCreditAllocation,
    remainingBalance,
    totalCommitted,
    totalPaid,
    orderTotal,
    isNegative: remainingBalance < -0.001,
    isSurplus: surplusAmount > 0.001,
    surplusAmount,
  };
}

export interface MemberPaymentCycleInfo {
  paymentCycleDays: number;
  hasOverdueInvoices: boolean;
  overdueInvoices: InvoiceItem[];
  overdueBalance: number;
  upcomingInvoices: InvoiceItem[];
  upcomingBalance: number;
  oldestOverdueInvoice: InvoiceItem | null;
  maxDaysOverdue: number;
  canPlaceOrders: boolean;
  restrictionReason?: string;
  inGoodStanding: boolean;
  activeCycleSummary: string;
}

/**
 * Evaluates payment cycle compliance for a member.
 * - Enforces that every approved order's invoice must be paid within the member's allocated payment cycle days (default: 14 days).
 * - If an invoice is past its due date with an outstanding balance, future order placement is restricted until cleared.
 * - In the meantime (within the payment cycle window), the member can freely max out their shopping credit line while simultaneously clearing invoices.
 */
export function getMemberPaymentCycleInfo(
  memberIdentifier: {
    username?: string;
    tempUsername?: string;
    id?: string;
    name?: string;
    paymentCycleDays?: number;
    creditAllocation?: number;
  } | undefined,
  members: TeamMember[] = [],
  invoices: InvoiceItem[] = [],
  payments: PaymentItem[] = [],
  currentDateStr?: string
): MemberPaymentCycleInfo {
  const member = members.find((m) => {
    if (!memberIdentifier) return false;
    if (memberIdentifier.username && m.username && m.username.toLowerCase() === memberIdentifier.username.toLowerCase()) return true;
    if (memberIdentifier.tempUsername && m.tempUsername && m.tempUsername.toLowerCase() === memberIdentifier.tempUsername.toLowerCase()) return true;
    if (memberIdentifier.id && m.id === memberIdentifier.id) return true;
    if (memberIdentifier.name && m.name && m.name.toLowerCase() === memberIdentifier.name.toLowerCase()) return true;
    return false;
  });

  const paymentCycleDays = memberIdentifier?.paymentCycleDays ?? member?.paymentCycleDays ?? 14;
  const todayStr = currentDateStr || new Date().toISOString().split('T')[0];

  const memberUsernames = [
    memberIdentifier?.username?.toLowerCase(),
    memberIdentifier?.tempUsername?.toLowerCase(),
    member?.username?.toLowerCase(),
    member?.tempUsername?.toLowerCase(),
  ].filter(Boolean) as string[];

  const memberNames = [
    memberIdentifier?.name?.toLowerCase(),
    member?.name?.toLowerCase(),
  ].filter((n): n is string => Boolean(n && n.trim().length >= 3));

  const memberIds = [
    memberIdentifier?.id,
    member?.id,
  ].filter(Boolean) as string[];

  // Filter invoices for this member
  const memberInvoices = invoices.filter((inv) => {
    if (inv.memberUsername && memberUsernames.includes(inv.memberUsername.toLowerCase())) return true;
    if (inv.memberId && memberIds.includes(inv.memberId)) return true;
    if (inv.customerName && memberNames.some((n) => inv.customerName.toLowerCase().includes(n))) return true;
    if (inv.billedTo && memberNames.some((n) => inv.billedTo.toLowerCase().includes(n))) return true;
    return false;
  });

  function memberInvoicesLengthCheck(allInvs: InvoiceItem[], idObj?: { username?: string; id?: string }) {
    // If running in sample environment where invoices may lack explicit IDs
    if (!idObj?.username && !idObj?.id) return true;
    return false;
  }

  const overdueInvoices: InvoiceItem[] = [];
  const upcomingInvoices: InvoiceItem[] = [];
  let overdueBalance = 0;
  let upcomingBalance = 0;
  let oldestOverdueInvoice: InvoiceItem | null = null;
  let maxDaysOverdue = 0;

  for (const inv of memberInvoices) {
    const paymentSummary = getInvoicePaymentSummary(inv, payments);
    if (paymentSummary.currentBalanceDue > 0.001) {
      const isPastDue = inv.dueDate && todayStr > inv.dueDate;
      if (isPastDue) {
        overdueInvoices.push(inv);
        overdueBalance += paymentSummary.currentBalanceDue;
        const diffTime = Math.max(0, new Date(todayStr).getTime() - new Date(inv.dueDate).getTime());
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysOverdue > maxDaysOverdue) {
          maxDaysOverdue = daysOverdue;
          oldestOverdueInvoice = inv;
        }
      } else {
        upcomingInvoices.push(inv);
        upcomingBalance += paymentSummary.currentBalanceDue;
      }
    }
  }

  const hasOverdueInvoices = overdueInvoices.length > 0;
  const inGoodStanding = !hasOverdueInvoices;
  const canPlaceOrders = inGoodStanding;

  let restrictionReason: string | undefined;
  if (hasOverdueInvoices) {
    restrictionReason = `Order placement restricted: ${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? '' : 's'} totaling ${overdueBalance.toFixed(2)} are past your ${paymentCycleDays}-day payment cycle (due on ${oldestOverdueInvoice?.dueDate || 'past due date'}). Simultaneous invoice clearing is required to restore order placement privileges.`;
  }

  const activeCycleSummary = `${paymentCycleDays}-Day Payment Cycle (Net ${paymentCycleDays})`;

  return {
    paymentCycleDays,
    hasOverdueInvoices,
    overdueInvoices,
    overdueBalance,
    upcomingInvoices,
    upcomingBalance,
    oldestOverdueInvoice,
    maxDaysOverdue,
    canPlaceOrders,
    restrictionReason,
    inGoodStanding,
    activeCycleSummary,
  };
}

