import React, { useState, useEffect } from 'react';
import { 
  User, 
  MemberView, 
  OrderItem, 
  InvoiceItem, 
  PaymentItem, 
  TeamMember, 
  ProductItem, 
  OrderCartItem,
  OrderStatus 
} from '../types';
import { 
  loadStoredProducts, 
  isProductVisibleToMember, 
  PRODUCTS_UPDATED_EVENT 
} from '../utils/productUtils';
import { 
  Home as HomeIcon,
  ShoppingBag,
  PackageCheck,
  CreditCard,
  FileText,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  MapPin,
  DollarSign,
  Wallet,
  Building2,
  Eye,
  Check,
  X,
  Smartphone,
  Tablet,
  Cpu as SimCardIcon,
  Headphones,
  Box,
  Truck,
  Receipt,
  Percent,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Send,
  HelpCircle,
  Printer,
  Download
} from 'lucide-react';
import { downloadInvoicePdf, printOrDownloadInvoicePdf } from '../utils/generateInvoicePdf';
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
  subscribeToProducts,
  saveOrderToFirestore,
  fetchMemberOrdersFromFirestore,
  saveInvoiceToFirestore,
  savePaymentToFirestore
} from '../firebase/firestoreService';

interface MemberWorkspaceProps {
  user: User;
  activeView: MemberView;
  onNavigate: (view: MemberView) => void;
}

export const MemberWorkspace: React.FC<MemberWorkspaceProps> = ({
  user,
  activeView,
  onNavigate,
}) => {
  // Dynamic Team Members State to get member's specific credit & store details
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('distro_team_members');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic Master Credit Limit State (persisted in localStorage, default $10,000)
  const [masterCreditLimit, setMasterCreditLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('distro_master_credit_limit');
      return saved !== null ? Number(saved) : 10000;
    } catch {
      return 10000;
    }
  });

  // Find current member record
  const currentMemberRecord = members.find(
    (m) => m.username.toLowerCase() === user.username.toLowerCase() || 
           m.id === user.memberId ||
           (m.tempUsername && m.tempUsername.toLowerCase() === user.username.toLowerCase())
  );

  const memberStoreAddress = currentMemberRecord?.businessAddress || 
    (currentMemberRecord?.businessAddressDetails 
      ? `${currentMemberRecord.businessAddressDetails.street}, ${currentMemberRecord.businessAddressDetails.city}, ${currentMemberRecord.businessAddressDetails.state} ${currentMemberRecord.businessAddressDetails.zip}` 
      : (user.businessAddress || 'Metro Store #104 - 1044 Market St, San Francisco, CA 94102'));
  const memberDisplayName = currentMemberRecord?.name || user.name || user.username;

  // Orders State (synced with localStorage)
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('distro_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Invoices State
  const [invoices, setInvoices] = useState<InvoiceItem[]>(() => {
    try {
      const saved = localStorage.getItem('distro_invoices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Payments State
  const [payments, setPayments] = useState<PaymentItem[]>(() => {
    try {
      const saved = localStorage.getItem('distro_payments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic Products State (persisted with device pictures, stock & member-specific visibility rules)
  const [products, setProducts] = useState<ProductItem[]>(() => loadStoredProducts());

  useEffect(() => {
    const handleProductsUpdated = () => {
      setProducts(loadStoredProducts());
    };
    window.addEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, handleProductsUpdated);
    };
  }, []);

  // Listen for cross-tab or localStorage changes (guarded against redundant re-renders)
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
      } catch (err) {
        console.error('Storage sync error:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('distro_storage_updated', handleStorageChange);
    window.addEventListener('distro_payments_invoices_reset', handleStorageChange);
    // Also poll gently every 2s for same-window updates
    const interval = setInterval(handleStorageChange, 2000);
    // Subscribe to Firestore for real-time live database updates
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
    const unsubProducts = subscribeToProducts((newProds) => {
      setProducts(newProds);
      localStorage.setItem('distro_products', JSON.stringify(newProds));
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
      unsubProducts();
    };
  }, []);

  // Fetch orders from Firestore for this member on load and view change
  useEffect(() => {
    const memId = currentMemberRecord?.id || user.memberId;
    if (memId) {
      fetchMemberOrdersFromFirestore(memId)
        .then((mOrders) => {
          if (mOrders && mOrders.length > 0) {
            setOrders((prev) => {
              const map = new Map(prev.map((o) => [o.id, o]));
              mOrders.forEach((o) => map.set(o.id, o));
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => {
          console.error(`Error loading member orders from Firestore for ${memId}:`, err);
        });
    }
  }, [user.memberId, currentMemberRecord?.id, activeView]);

  // Save changes to localStorage and Firestore
  const saveOrders = (updatedOrders: OrderItem[]) => {
    setOrders(updatedOrders);
    localStorage.setItem('distro_orders', JSON.stringify(updatedOrders));
    // Sync latest orders to Firestore under members/{memberId}/orders/{orderId}
    updatedOrders.forEach((ord) => {
      saveOrderToFirestore(ord).catch((err) => {
        console.error(`Error syncing order #${ord.orderNumber} to Firestore:`, err);
      });
    });
  };

  const saveInvoices = (updatedInvoices: InvoiceItem[]) => {
    setInvoices(updatedInvoices);
    localStorage.setItem('distro_invoices', JSON.stringify(updatedInvoices));
    // Sync latest invoices to Firestore
    updatedInvoices.forEach((inv) => {
      saveInvoiceToFirestore(inv).catch(console.error);
    });
  };

  // Filter orders for this member
  const memberOrders = orders.filter((o) => {
    const memUsernames = [
      user.username?.toLowerCase(),
      currentMemberRecord?.username?.toLowerCase(),
      currentMemberRecord?.tempUsername?.toLowerCase(),
    ].filter(Boolean) as string[];

    const memIds = [
      user.memberId,
      currentMemberRecord?.id,
    ].filter(Boolean) as string[];

    const memNames = [
      user.name?.toLowerCase(),
      memberDisplayName?.toLowerCase(),
      currentMemberRecord?.name?.toLowerCase(),
    ].filter((n): n is string => Boolean(n && n.trim().length >= 3));

    if (o.memberUsername && memUsernames.includes(o.memberUsername.toLowerCase())) return true;
    if (o.memberId && memIds.includes(o.memberId)) return true;
    if (o.customerName && memNames.some((n) => o.customerName.toLowerCase().includes(n))) return true;
    return false;
  });

  // Filter invoices for this member to compute Open Balance Due and consolidated payments
  const memberInvoices = invoices.filter((inv) => {
    const memUsernames = [
      user.username?.toLowerCase(),
      currentMemberRecord?.username?.toLowerCase(),
      currentMemberRecord?.tempUsername?.toLowerCase(),
    ].filter(Boolean) as string[];

    const memIds = [
      user.memberId,
      currentMemberRecord?.id,
    ].filter(Boolean) as string[];

    const memNames = [
      user.name?.toLowerCase(),
      memberDisplayName?.toLowerCase(),
      currentMemberRecord?.name?.toLowerCase(),
    ].filter((n): n is string => Boolean(n && n.trim().length >= 3));

    if (inv.memberUsername && memUsernames.includes(inv.memberUsername.toLowerCase())) return true;
    if (inv.memberId && memIds.includes(inv.memberId)) return true;
    if (inv.customerName && memNames.some((n) => inv.customerName.toLowerCase().includes(n))) return true;
    if (inv.billedTo && memNames.some((n) => inv.billedTo.toLowerCase().includes(n))) return true;
    if (inv.orderNumber) {
      const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
      if (matchingOrder) {
        if (matchingOrder.memberUsername && memUsernames.includes(matchingOrder.memberUsername.toLowerCase())) return true;
        if (matchingOrder.memberId && memIds.includes(matchingOrder.memberId)) return true;
        if (matchingOrder.customerName && memNames.some((n) => matchingOrder.customerName.toLowerCase().includes(n))) return true;
      }
    }
    return false;
  });

  // Calculate payment summaries for all invoices belonging to this member
  const memberInvoiceSummaries = memberInvoices.map((inv) => ({
    invoice: inv,
    summary: getInvoicePaymentSummary(inv, payments),
  }));

  const openBalanceDue = memberInvoiceSummaries.reduce((sum, item) => sum + item.summary.currentBalanceDue, 0);
  const totalInvoicedAmount = memberInvoiceSummaries.reduce((sum, item) => sum + item.summary.invoiceTotal, 0);
  const totalPaidOnInvoices = memberInvoiceSummaries.reduce((sum, item) => sum + item.summary.totalPaid, 0);
  const unpaidInvoicesCount = memberInvoiceSummaries.filter((item) => item.summary.currentBalanceDue > 0.001).length;

  // Compute full member credit summary supporting negative balance & payment surplus
  const memberCreditSummary = getMemberCreditSummary(
    {
      username: user.username,
      tempUsername: currentMemberRecord?.tempUsername,
      id: currentMemberRecord?.id || user.memberId,
      name: memberDisplayName,
      creditAllocation: currentMemberRecord?.creditAllocation ?? user.creditAllocation,
    },
    members,
    orders,
    invoices,
    payments,
    masterCreditLimit
  );

  const baseCreditLimit = memberCreditSummary.baseCreditAllocation;
  const memberCreditLimit = memberCreditSummary.effectiveCreditAllocation;
  const committedCredit = memberCreditSummary.totalCommittedOrders;
  const availableCredit = memberCreditSummary.availableCredit;
  const isNegativeCredit = memberCreditSummary.isNegative;
  const isSurplusCredit = memberCreditSummary.isSurplus;
  const surplusAmount = memberCreditSummary.surplusPayment;
  const totalCompletedPayments = memberCreditSummary.totalCompletedPayments;

  // Compute payment cycle days and overdue invoice status
  const paymentCycleInfo = getMemberPaymentCycleInfo(
    {
      username: user.username,
      tempUsername: currentMemberRecord?.tempUsername,
      id: currentMemberRecord?.id || user.memberId,
      name: memberDisplayName,
      creditAllocation: currentMemberRecord?.creditAllocation ?? user.creditAllocation,
      paymentCycleDays: currentMemberRecord?.paymentCycleDays ?? user.paymentCycleDays ?? 14,
    },
    members,
    invoices,
    payments
  );

  // Shopping / Place Order Cart State
  const [orderCart, setOrderCart] = useState<{ productId: string; qty: number }[]>([]);
  const [shippingAddress, setShippingAddress] = useState(memberStoreAddress);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmittedAlert, setOrderSubmittedAlert] = useState<string | null>(null);
  const [orderRestrictionAlert, setOrderRestrictionAlert] = useState<string | null>(null);

  // Modal State for Member Review & Acceptance of Admin-reviewed order
  const [reviewingOrder, setReviewingOrder] = useState<OrderItem | null>(null);
  const [viewingMemberInvoice, setViewingMemberInvoice] = useState<InvoiceItem | null>(null);
  const [acceptanceSuccessMsg, setAcceptanceSuccessMsg] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Search state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');

  // Cart Helper functions
  const addToCart = (productId: string, quantity: number = 1) => {
    setOrderCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [...prev, { productId, qty: quantity }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setOrderCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, qty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setOrderCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Cart items with full details
  const cartItemsWithDetails = orderCart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((item): item is { productId: string; qty: number; product: ProductItem } => item !== null);

  const cartSubtotal = cartItemsWithDetails.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const remainingCreditAfterCart = availableCredit - cartSubtotal;
  const willExceedCredit = remainingCreditAfterCart < -0.001 || cartSubtotal > (availableCredit > 0 ? availableCredit : 0) || availableCredit <= 0;

  // Handle Member Order Submission
  const handleSubmitMemberOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItemsWithDetails.length === 0) return;

    // Enforce simultaneous invoice clearing / payment cycle policy
    if (!paymentCycleInfo.canPlaceOrders) {
      setOrderRestrictionAlert(
        paymentCycleInfo.restrictionReason ||
          `Order placement is temporarily locked. You have ${paymentCycleInfo.overdueInvoices.length} overdue invoice(s) past your ${paymentCycleInfo.paymentCycleDays}-day payment cycle totaling $${paymentCycleInfo.overdueBalance.toFixed(2)}. Please clear overdue invoices to resume placing orders.`
      );
      return;
    }

    // Enforce strict credit limit policy: No member can place orders exceeding their credit limit
    if (availableCredit <= 0) {
      setOrderRestrictionAlert(
        `Order placement blocked: Your available credit line is ${availableCredit < 0 ? `-$${Math.abs(availableCredit).toFixed(2)}` : '$0.00'}. You cannot place new orders until existing balances or invoices are settled.`
      );
      return;
    }

    if (cartSubtotal > availableCredit || willExceedCredit) {
      const excess = cartSubtotal - Math.max(0, availableCredit);
      setOrderRestrictionAlert(
        `Order placement blocked: Your order total ($${cartSubtotal.toFixed(2)}) exceeds your available credit limit ($${availableCredit.toFixed(2)}) by $${excess.toFixed(2)}. Members are not permitted to place orders exceeding their credit limit.`
      );
      return;
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newOrderNumber = `ORD-2026-${randomNum}`;
    const currentDate = new Date().toISOString().split('T')[0];

    const newOrder: OrderItem = {
      id: `ord_${Date.now()}`,
      orderNumber: newOrderNumber,
      date: currentDate,
      // EXACT REQUESTED STATUS: "Pending review and approval by Admin"
      status: 'Pending review and approval by Admin',
      customerName: memberDisplayName,
      memberId: currentMemberRecord?.id || user.memberId || 'mem_1',
      memberUsername: user.username,
      destinationAddress: shippingAddress || memberStoreAddress,
      businessAddress: shippingAddress || memberStoreAddress,
      items: cartItemsWithDetails.map((ci) => ({
        productId: ci.productId,
        name: ci.product.name,
        sku: ci.product.sku,
        price: ci.product.price,
        qty: ci.qty,
      })),
      itemsCount: cartItemsWithDetails.reduce((sum, item) => sum + item.qty, 0),
      subtotal: cartSubtotal,
      shippingFee: 0,
      salesTax: 0,
      serviceTax: 0,
      overpackFee: 0,
      insuranceFee: 0,
      total: cartSubtotal, // Base subtotal before Admin adds shipping/taxes
      paymentStatus: 'Credit Allocated',
      notes: orderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedOrders = [newOrder, ...orders];
    saveOrders(updatedOrders);

    setOrderCart([]);
    setOrderNotes('');
    setOrderRestrictionAlert(null);
    setOrderSubmittedAlert(
      `Order ${newOrderNumber} has been successfully submitted with status: "Pending review and approval by Admin".`
    );
  };

  // Handle Member Final Acceptance of Admin-Reviewed Order
  const handleMemberAcceptOrder = (order: OrderItem) => {
    const updatedOrders = orders.map((o) => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'Approved & Processing' as OrderStatus,
          memberAcceptedAt: new Date().toISOString(),
          paymentStatus: 'Paid' as const,
        };
      }
      return o;
    });
    saveOrders(updatedOrders);

    // Auto-generate invoice
    const newInvoice: InvoiceItem = {
      invoiceNumber: `INV-${order.orderNumber.replace('ORD-', '')}`,
      orderNumber: order.orderNumber,
      memberUsername: user.username,
      customerName: memberDisplayName,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: order.total,
      status: 'Paid',
      method: 'Allocated Credit Line',
    };
    saveInvoices([newInvoice, ...invoices]);

    setReviewingOrder(null);
    setAcceptanceSuccessMsg(`Order ${order.orderNumber} has been accepted and confirmed! Invoice ${newInvoice.invoiceNumber} generated.`);
  };

  // Handle Member Cancellation of Order
  const handleMemberCancelOrder = (order: OrderItem) => {
    const updatedOrders = orders.map((o) => {
      if (o.id === order.id) {
        return {
          ...o,
          status: 'Cancelled' as OrderStatus,
          notes: cancellationReason ? `Cancelled by Member: ${cancellationReason}` : 'Cancelled by Member during quote review',
        };
      }
      return o;
    });
    saveOrders(updatedOrders);
    setReviewingOrder(null);
    setShowCancelModal(false);
    setCancellationReason('');
    setAcceptanceSuccessMsg(`Order ${order.orderNumber} was cancelled.`);
  };

  // Helper to render product grid for shopping
  const renderProductGrid = (categoryKey: string, categoryTitle: string, categoryIcon: React.ReactNode) => {
    const visibleProducts = products.filter((p) => p.category === categoryKey && isProductVisibleToMember(p, user.username));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              {categoryIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{categoryTitle}</h2>
              <p className="text-xs text-slate-500">Order wholesale stock with your allocated credit line</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-lg text-xs border ${
              isNegativeCredit 
                ? 'bg-rose-50 border-rose-300 text-rose-800' 
                : isSurplusCredit
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="font-bold">
                {isNegativeCredit ? 'Credit Line (Negative): ' : isSurplusCredit ? 'Credit Line (+Surplus): ' : 'Available Credit: '}
              </span>
              <span className={`font-mono font-extrabold ${isNegativeCredit ? 'text-rose-900' : 'text-emerald-900'}`}>
                {availableCredit < 0 ? `-$${Math.abs(availableCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
              {isSurplusCredit && (
                <span className="ml-1.5 text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                  +${surplusAmount.toFixed(2)} Surplus
                </span>
              )}
              {isNegativeCredit && (
                <span className="ml-1.5 text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                  Over Limit
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate('place-new-order')}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-300 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> View Cart ({cartItemsWithDetails.length})
            </button>
          </div>
        </div>

        {paymentCycleInfo.hasOverdueInvoices && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong className="font-bold">Ordering Locked:</strong> You have {paymentCycleInfo.overdueInvoices.length} overdue invoice(s) exceeding your {paymentCycleInfo.paymentCycleDays}-day cycle. Please settle pending invoices.
              </span>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <CreditCard className="w-3 h-3" />
              <span>Settle Invoices</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProducts.map((item) => {
            const inCart = orderCart.find((ci) => ci.productId === item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
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
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {item.showStockToMembers !== false ? `In Stock (${item.stock})` : 'In Stock (Available)'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug">{item.name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{item.description}</p>

                  {item.specs && (
                    <div className="mb-4 space-y-1">
                      {item.specs.map((spec, idx) => (
                        <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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

                  <div className="flex items-center gap-2">
                    {inCart ? (
                      <div className="flex items-center border border-emerald-300 rounded-lg bg-emerald-50 p-1">
                        <button
                          onClick={() => updateCartQty(item.id, inCart.qty - 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-emerald-800 hover:bg-emerald-200 rounded text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-xs text-emerald-900">{inCart.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.id, inCart.qty + 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-emerald-800 hover:bg-emerald-200 rounded text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add to Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {visibleProducts.length === 0 && (
            <div className="col-span-full p-12 bg-white border border-slate-200 rounded-xl text-center">
              <p className="text-sm font-semibold text-slate-700">No items available in this category for your account.</p>
              <p className="text-xs text-slate-500 mt-1">Please contact your distribution administrator for catalog access.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper status badge renderer
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending review and approval by Admin':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            <span>Pending review and approval by Admin</span>
          </span>
        );
      case 'Credited':
        return (
          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Credited</span>
          </span>
        );
      case 'Updated and Approved':
      case 'Approved with changes by Admin':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Updated and Approved</span>
          </span>
        );
      case 'Approved':
      case 'Approved by Admin':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Approved</span>
          </span>
        );
      case 'Ready for Member Review & Acceptance':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Approved & Processing</span>
          </span>
        );
      case 'Declined by Admin':
        return (
          <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Declined by Admin</span>
          </span>
        );
      case 'Approved & Processing':
      case 'Processing':
      case 'Open':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{status}</span>
          </span>
        );
      case 'Shipped':
        return (
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Truck className="w-3 h-3 text-indigo-600" />
            <span>Shipped</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-slate-600" />
            <span>Completed</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  // Active open orders for member
  const openMemberOrders = memberOrders.filter(
    (o) => o.status !== 'Completed' && o.status !== 'Shipped' && o.status !== 'Cancelled'
  );

  const previousMemberOrders = memberOrders.filter(
    (o) => o.status === 'Completed' || o.status === 'Shipped' || o.status === 'Cancelled'
  );

  // Render Member View
  const renderContent = () => {
    switch (activeView) {
    // 1. Member Home Dashboard
    case 'home':
      return (
        <div className="space-y-8 max-w-5xl mx-auto">
          {/* Welcome Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md mb-3 inline-block border border-emerald-200">
                  Member Portal &bull; {currentMemberRecord?.role || 'Authorized Member'}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                  Welcome back, {memberDisplayName}!
                </h1>
                <p className="text-xs md:text-sm text-slate-600 max-w-2xl leading-relaxed flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{memberStoreAddress}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('place-new-order')}
                  id="member-home-place-order-btn"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Place Shopping Order</span>
                </button>
              </div>
            </div>
          </div>

          {/* Payment Cycle Overdue Warning Banner */}
          {paymentCycleInfo.hasOverdueInvoices && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-rose-950">Payment Cycle Settlement Action Required</h3>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-[10px] font-extrabold rounded uppercase tracking-wider">
                      Orders Locked
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    You have <strong className="font-bold">{paymentCycleInfo.overdueInvoices.length} overdue invoice(s)</strong> totaling <strong className="font-mono font-bold">${paymentCycleInfo.overdueBalance.toFixed(2)}</strong> that exceed your <strong className="font-bold">{paymentCycleInfo.paymentCycleDays}-day payment cycle</strong>. Simultaneous invoice clearing is required to unlock new order placements.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('invoices')}
                id="settle-overdue-invoices-btn"
                className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Settle Invoices Now</span>
              </button>
            </div>
          )}

          {/* Allocated Credit Summary Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Allocated Credit */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Allocated Credit Line</span>
                  <span className="text-[10.5px] font-semibold text-amber-700 mt-0.5 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{paymentCycleInfo.paymentCycleDays} Days Cycle</span>
                  </span>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  ${memberCreditLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {isSurplusCredit ? (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <span>${baseCreditLimit.toLocaleString()} Base + ${surplusAmount.toFixed(2)} Payment Surplus</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Authorized credit line set by Administrator</p>
                )}
              </div>
            </div>

            {/* Open Balance Due */}
            <div 
              id="member-card-open-balance-due"
              onClick={() => onNavigate('invoices')}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:shadow-sm group"
              title="Click to view all statements, invoices and settlement history"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">
                  Open Balance Due
                </span>
                <div className={`p-2 rounded-lg ${openBalanceDue > 0.001 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className={`text-2xl font-extrabold font-mono ${openBalanceDue > 0.001 ? 'text-amber-800' : 'text-slate-900'}`}>
                  ${openBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {openBalanceDue > 0.001 ? (
                  <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center justify-between">
                    <span>{unpaidInvoicesCount} open invoice{unpaidInvoicesCount === 1 ? '' : 's'}</span>
                    <span className="text-slate-500 font-mono text-[10.5px]">
                      {totalPaidOnInvoices > 0 ? `$${totalPaidOnInvoices.toFixed(2)} paid of $${totalInvoicedAmount.toFixed(2)}` : `totaling $${totalInvoicedAmount.toFixed(2)}`}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{totalInvoicedAmount > 0 ? `All invoices settled ($${totalPaidOnInvoices.toFixed(2)} paid)` : 'No outstanding balances due'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Available to Shop */}
            <div className={`rounded-xl p-5 shadow-xs flex flex-col justify-between border ${
              isNegativeCredit 
                ? 'bg-rose-950 text-white border-rose-800' 
                : 'bg-emerald-950 text-white border-emerald-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${isNegativeCredit ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {isNegativeCredit ? 'Credit Line (Negative)' : 'Available Shopping Credit'}
                </span>
                <div className={`p-2 rounded-lg ${isNegativeCredit ? 'bg-rose-800 text-rose-200' : 'bg-emerald-800 text-emerald-200'}`}>
                  {isNegativeCredit ? <AlertTriangle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white font-mono">
                  {availableCredit < 0 
                    ? `-$${Math.abs(availableCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                    : `$${availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className={`w-full rounded-full h-1.5 mt-2.5 overflow-hidden ${isNegativeCredit ? 'bg-rose-900' : 'bg-emerald-900'}`}>
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${isNegativeCredit ? 'bg-rose-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(100, Math.max(0, (availableCredit / (memberCreditLimit || 1)) * 100))}%` }}
                  />
                </div>
                {isNegativeCredit && (
                  <p className="text-[10px] text-rose-300 font-semibold mt-1">Orders surpass credit limit by ${Math.abs(availableCredit).toFixed(2)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Active Orders Tracker Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Your Active Orders ({openMemberOrders.length})</h2>
              </div>
              <button
                onClick={() => onNavigate('view-open-order')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View All Open Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {openMemberOrders.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
                <p className="text-xs">No active shopping orders right now.</p>
                <button
                  onClick={() => onNavigate('place-new-order')}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Place a New Order
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Total Quote</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {openMemberOrders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-mono text-emerald-700">{ord.orderNumber}</td>
                        <td className="p-3 text-slate-500">{ord.date}</td>
                        <td className="p-3">{ord.itemsCount} items</td>
                        <td className="p-3 font-bold text-slate-900">${(ord.total || ord.subtotal).toFixed(2)}</td>
                        <td className="p-3">{renderStatusBadge(ord.status)}</td>
                        <td className="p-3 text-right">
                          {ord.status === 'Ready for Member Review & Acceptance' ? (
                            <button
                              onClick={() => setReviewingOrder(ord)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Review & Accept</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onNavigate('view-open-order')}
                              className="px-2 py-1 text-slate-600 hover:text-slate-900 text-[11px] font-semibold hover:bg-slate-100 rounded"
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Shopping Categories Launchpad */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Browse Product Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <button
                onClick={() => onNavigate('metro-phones')}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all text-center flex flex-col items-center group cursor-pointer"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Metro Phones</span>
              </button>

              <button
                onClick={() => onNavigate('display-phones')}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all text-center flex flex-col items-center group cursor-pointer"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Tablet className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Display Units</span>
              </button>

              <button
                onClick={() => onNavigate('sim-cards')}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all text-center flex flex-col items-center group cursor-pointer"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <SimCardIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">SIM Cards</span>
              </button>

              <button
                onClick={() => onNavigate('accessories')}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all text-center flex flex-col items-center group cursor-pointer"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Accessories</span>
              </button>

              <button
                onClick={() => onNavigate('supplies')}
                className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all text-center flex flex-col items-center group cursor-pointer"
              >
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Box className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Store Supplies</span>
              </button>
            </div>
          </div>
        </div>
      );

    // 2. Place New Order Form
    case 'place-new-order':
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Place Shopping Order</h2>
                <p className="text-xs text-slate-500">Order wholesale distribution inventory against your allocated credit</p>
              </div>
            </div>

            {/* Live Credit Display */}
            <div className={`text-white px-4 py-2 rounded-xl text-xs flex items-center gap-3 ${
              isNegativeCredit ? 'bg-rose-900' : 'bg-emerald-900'
            }`}>
              <div>
                <span className={`text-[10px] block uppercase font-bold ${isNegativeCredit ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {isNegativeCredit ? 'Credit Line (Negative)' : 'Available Credit'}
                </span>
                <span className="text-sm font-extrabold font-mono text-white">
                  {availableCredit < 0 
                    ? `-$${Math.abs(availableCredit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                    : `$${availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>
          </div>

          {/* Overdue Payment Cycle Alert Banner */}
          {paymentCycleInfo.hasOverdueInvoices && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-900">
                    Order Placement Locked &bull; {paymentCycleInfo.overdueInvoices.length} Overdue Invoice(s) Past {paymentCycleInfo.paymentCycleDays}-Day Cycle
                  </div>
                  <div className="text-rose-800 text-[11px] mt-0.5">
                    Outstanding overdue balance of <span className="font-mono font-bold">${paymentCycleInfo.overdueBalance.toFixed(2)}</span> must be settled before new distribution orders can be submitted.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('invoices')}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Go to Invoices & Settle</span>
              </button>
            </div>
          )}

          {orderRestrictionAlert && (
            <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{orderRestrictionAlert}</span>
              </div>
              <button
                onClick={() => setOrderRestrictionAlert(null)}
                className="text-rose-500 hover:text-rose-700 text-base font-bold px-2 py-0.5"
              >
                &times;
              </button>
            </div>
          )}

          {orderSubmittedAlert && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{orderSubmittedAlert}</span>
              </div>
              <button
                onClick={() => {
                  setOrderSubmittedAlert(null);
                  onNavigate('view-open-order');
                }}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
              >
                View Open Orders
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Catalog Selection */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Catalog Selection</h3>
                <span className="text-[11px] text-slate-400 font-medium">Click + to add item to your order cart</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products
                  .filter((item) => isProductVisibleToMember(item, user.username))
                  .map((item) => {
                    const inCart = orderCart.find((ci) => ci.productId === item.id);
                    return (
                      <div 
                        key={item.id} 
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition-all gap-3"
                      >
                        {item.image && (
                          <div className="w-12 h-12 shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-1 overflow-hidden">
                            <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 block">{item.sku}</span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              {item.showStockToMembers !== false ? `Stock: ${item.stock}` : 'In Stock'}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{item.name}</h4>
                          <span className="text-xs font-bold text-emerald-700 font-mono">${item.price.toFixed(2)}</span>
                        </div>

                        {inCart ? (
                          <div className="flex items-center border border-emerald-300 rounded-lg bg-emerald-50 p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, inCart.qty - 1)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-emerald-800 hover:bg-emerald-200 rounded text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-1.5 font-mono font-bold text-xs text-emerald-900">{inCart.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, inCart.qty + 1)}
                              className="w-5 h-5 flex items-center justify-center font-bold text-emerald-800 hover:bg-emerald-200 rounded text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item.id)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition-colors border border-emerald-200 shrink-0 cursor-pointer"
                            title="Add to order"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Col: Order Cart & Credit Checkout */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs h-fit space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Order Summary & Credit Check</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {cartItemsWithDetails.length} Items
                </span>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Destination / Store Address</span>
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter store delivery address"
                />
              </div>

              {/* Cart items list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block">Selected Items:</span>
                {cartItemsWithDetails.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    No items in cart. Click + on any catalog product to add.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cartItemsWithDetails.map((ci) => (
                      <div key={ci.productId} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="truncate max-w-[150px]">
                          <span className="font-bold text-slate-800 block truncate">{ci.product.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">${ci.product.price.toFixed(2)} x {ci.qty}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 font-mono">${(ci.product.price * ci.qty).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(ci.productId)}
                            className="text-rose-500 hover:text-rose-700 font-bold text-xs p-1 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional order notes */}
              {cartItemsWithDetails.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Order Notes / Special Requests (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="e.g. Urgent store restocking, deliver during morning hours..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              )}

              {/* Credit Calculation Box */}
              {cartItemsWithDetails.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-200 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Available Allocated Credit:</span>
                      <span className={`font-mono font-bold ${isNegativeCredit ? 'text-rose-700' : 'text-slate-900'}`}>
                        {availableCredit < 0 ? `-$${Math.abs(availableCredit).toFixed(2)}` : `$${availableCredit.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Order Items Subtotal:</span>
                      <span className="font-mono font-bold text-emerald-800">${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold">
                      <span>Remaining Credit After Order:</span>
                      <span className={`font-mono ${willExceedCredit ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {remainingCreditAfterCart < 0 ? `-$${Math.abs(remainingCreditAfterCart).toFixed(2)}` : `$${remainingCreditAfterCart.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Warning if Credit Limit Exceeded or Invoices Overdue */}
                  {paymentCycleInfo.hasOverdueInvoices ? (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs font-semibold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Ordering Restricted: </span>
                        <span>You have overdue invoices exceeding your {paymentCycleInfo.paymentCycleDays}-day cycle. Please settle pending invoices before submitting new orders.</span>
                      </div>
                    </div>
                  ) : availableCredit <= 0 ? (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Credit Limit Exhausted: </span>
                        <span>Your available credit is {availableCredit < 0 ? `-$${Math.abs(availableCredit).toFixed(2)}` : '$0.00'}. Members cannot place new orders until existing invoices are settled or credit is replenished.</span>
                      </div>
                    </div>
                  ) : willExceedCredit ? (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Order Exceeds Credit Limit: </span>
                        <span>This order (${cartSubtotal.toFixed(2)}) exceeds your available credit line (${availableCredit.toFixed(2)}) by ${(cartSubtotal - Math.max(0, availableCredit)).toFixed(2)}. Members are not allowed to place orders exceeding their credit limit.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Order is within your authorized credit allocation limit.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    id="submit-member-order-btn"
                    disabled={cartItemsWithDetails.length === 0 || !paymentCycleInfo.canPlaceOrders || willExceedCredit || availableCredit <= 0}
                    onClick={handleSubmitMemberOrder}
                    className={`w-full py-3 font-bold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 ${
                      cartItemsWithDetails.length === 0 || !paymentCycleInfo.canPlaceOrders || willExceedCredit || availableCredit <= 0
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white cursor-pointer'
                    }`}
                  >
                    {!paymentCycleInfo.canPlaceOrders ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Order Placement Locked (Overdue Invoices)</span>
                      </>
                    ) : availableCredit <= 0 ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span>Credit Limit Exhausted ({availableCredit < 0 ? `-$${Math.abs(availableCredit).toFixed(2)}` : '$0.00'})</span>
                      </>
                    ) : willExceedCredit ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span>Exceeds Credit Limit (Over by ${(cartSubtotal - Math.max(0, availableCredit)).toFixed(2)})</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Order for Admin Review & Approval</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    Once submitted, your order will show <span className="font-semibold text-slate-600">"Pending review and approval by Admin"</span> until Admin adds shipping fee and taxes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    // 3. View Open Orders
    case 'view-open-order':
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">View Open Orders</h2>
                <p className="text-xs text-slate-500">Track active orders, approval statuses, and review Admin quotes</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('place-new-order')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Place New Order
            </button>
          </div>

          {acceptanceSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{acceptanceSuccessMsg}</span>
              </div>
              <button
                onClick={() => setAcceptanceSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 rounded"
              >
                &times;
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {openMemberOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <PackageCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Active Open Orders</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  You currently have no open or pending purchase orders.
                </p>
                <button
                  onClick={() => onNavigate('place-new-order')}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
                      <th className="p-4">Date</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Subtotal</th>
                      <th className="p-4">Shipping / Tax</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Live Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {openMemberOrders.map((ord) => {
                      const totalFees = (ord.shippingFee || 0) + (ord.salesTax || 0) + (ord.serviceTax || 0) + (ord.overpackFee || 0) + (ord.insuranceFee || 0);
                      const hasAdminFees = ord.shippingFee !== undefined || ord.salesTax !== undefined;

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-bold font-mono text-emerald-700">{ord.orderNumber}</td>
                          <td className="p-4 text-slate-600">{ord.date}</td>
                          <td className="p-4">{ord.itemsCount} items</td>
                          <td className="p-4 font-mono font-bold text-slate-800">${ord.subtotal.toFixed(2)}</td>
                          <td className="p-4 font-mono text-slate-600">
                            {hasAdminFees ? (
                              <span className="text-blue-700 font-semibold">+${totalFees.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Admin</span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-extrabold text-slate-900">${(ord.total || ord.subtotal).toFixed(2)}</td>
                          <td className="p-4">{renderStatusBadge(ord.status)}</td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => setReviewingOrder(ord)}
                              id={`member-view-order-btn-${ord.id}`}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Details</span>
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

    // 4. View Previous Orders
    case 'view-previous-order':
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Previous Orders</h2>
              <p className="text-xs text-slate-500">Historical completed, shipped, or archived purchase orders</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {previousMemberOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Previous Orders Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Completed and shipped orders will be archived here for historical record and reordering.
                </p>
                <button
                  onClick={() => onNavigate('place-new-order')}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
                      <th className="p-4">Date</th>
                      <th className="p-4">Items Count</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {previousMemberOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold font-mono text-emerald-700">{ord.orderNumber}</td>
                        <td className="p-4 text-slate-600">{ord.date}</td>
                        <td className="p-4">{ord.itemsCount} items</td>
                        <td className="p-4 font-bold text-slate-900">${(ord.total || ord.subtotal).toFixed(2)}</td>
                        <td className="p-4">{renderStatusBadge(ord.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );

    // 5. Search Orders
    case 'search-order':
      const filteredMemberOrders = memberOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
          o.status.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
          (o.items && o.items.some((it) => it.name.toLowerCase().includes(orderSearchQuery.toLowerCase())))
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Search Orders</h2>
              <p className="text-xs text-slate-500">Find any order by order number, product name, or status</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search order number (e.g. ORD-2026-...) or product..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMemberOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-emerald-700">{ord.orderNumber}</td>
                      <td className="p-3">{ord.date}</td>
                      <td className="p-3">{ord.itemsCount} items</td>
                      <td className="p-3 font-bold text-slate-900">${(ord.total || ord.subtotal).toFixed(2)}</td>
                      <td className="p-3">{renderStatusBadge(ord.status)}</td>
                    </tr>
                  ))}
                  {filteredMemberOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                        No matching orders found for "{orderSearchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    // 6. Invoices View (Member Invoices)
    case 'invoices':
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Invoices</h2>
              <p className="text-xs text-slate-500">View statement billing and invoice receipts for your store orders</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {invoices.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Invoices Generated Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Invoices are automatically issued when your orders are approved and confirmed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Title / Category</th>
                      <th className="p-4">Order / Ref #</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Current Balance Due</th>
                      <th className="p-4">Credit Allocation (Remaining)</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {invoices.map((inv) => {
                      const creditInfo = getInvoiceCreditInfo(inv, members, orders, invoices, masterCreditLimit);
                      const paymentSummary = getInvoicePaymentSummary(inv, payments);

                      return (
                        <tr key={inv.invoiceNumber} className="hover:bg-slate-50">
                          <td className="p-4 font-bold font-mono text-emerald-700">
                            <button
                              type="button"
                              onClick={() => setViewingMemberInvoice(inv)}
                              className="hover:underline text-left cursor-pointer"
                              title="View statement details"
                            >
                              {inv.invoiceNumber}
                            </button>
                          </td>
                          <td className="p-4">
                            {inv.title === 'Late Payment' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Late Payment
                              </span>
                            ) : inv.title === 'Chargeback' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Chargeback
                              </span>
                            ) : inv.title === 'Check Bounce' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Check Bounce
                              </span>
                            ) : inv.title === 'Low Performance Penalty' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                Low Performance Penalty
                              </span>
                            ) : inv.title === 'Good Performance Bonus' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Good Performance Bonus
                              </span>
                            ) : inv.title === 'Miscellenous' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Miscellenous
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {inv.title || 'Wholesale Order'}
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-slate-700">{inv.orderNumber}</td>
                          <td className="p-4 text-slate-600">{inv.date}</td>
                          <td className="p-4 text-slate-600">{inv.dueDate}</td>
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

                          {/* Current Balance Due */}
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
                          <td className="p-4 text-slate-600">{inv.method || 'Company Credit'}</td>
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
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
                                downloadInvoicePdf({ 
                                  invoice: inv, 
                                  order: matchingOrder,
                                  companyName: 'HG World Class Wholesale Distribution',
                                  companyContact: 'billing@hgworldclass.com | +1 (800) 555-0199',
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
                              onClick={() => setViewingMemberInvoice(inv)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex cursor-pointer"
                              title="View Statement"
                            >
                              <FileText className="w-4 h-4" />
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

    // 7. Payments View
    case 'payments':
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payments & Credit Activity</h2>
              <p className="text-xs text-slate-500">Record of credit draws and payment settlements</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {payments.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Payment History Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Settled transactions and credit balance disbursements will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Payment ID</th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Ref / Check #</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {payments.map((p) => (
                      <tr key={p.paymentId} className="hover:bg-slate-50">
                        <td className="p-4 font-bold font-mono text-emerald-700">{p.paymentId}</td>
                        <td className="p-4 font-mono text-slate-700">{p.invoiceNumber}</td>
                        <td className="p-4 text-slate-600">{p.date}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                            p.method === 'Paid with Credit Memo' || p.method === 'Paid with Cash Memo' || p.method === 'Paid with CM' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            p.method === 'Paid with Cash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            p.method === 'Paid with Check' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            p.method === 'Paid with ACH/Wire transfer' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {p.method}
                          </span>
                        </td>
                        <td className="p-4">
                          {p.referenceNumber ? (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 inline-block">
                              {p.referenceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-900 font-mono">${p.amount.toFixed(2)}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                            {p.status}
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

    // 8. Invoices Search
    case 'invoices-search':
      const filteredMemberInvoices = invoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
          i.orderNumber.toLowerCase().includes(invoiceSearchQuery.toLowerCase()) ||
          i.status.toLowerCase().includes(invoiceSearchQuery.toLowerCase())
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Invoices Search</h2>
              <p className="text-xs text-slate-500">Filter your invoices by ID, order number, or status</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="Search invoice number (e.g. INV-2026-...) or order..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Current Balance Due</th>
                    <th className="p-3">Credit Allocation (Remaining)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMemberInvoices.map((inv) => {
                    const creditInfo = getInvoiceCreditInfo(inv, members, orders, invoices, masterCreditLimit);
                    const paymentSummary = getInvoicePaymentSummary(inv, payments);

                    return (
                      <tr key={inv.invoiceNumber} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-mono text-emerald-700">
                          <button
                            type="button"
                            onClick={() => setViewingMemberInvoice(inv)}
                            className="hover:underline text-left cursor-pointer"
                          >
                            {inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="p-3 font-mono">{inv.orderNumber}</td>
                        <td className="p-3">{inv.date}</td>
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
                            onClick={() => {
                              const matchingOrder = orders.find((o) => o.orderNumber === inv.orderNumber);
                              downloadInvoicePdf({ 
                                invoice: inv, 
                                order: matchingOrder,
                                companyName: 'HG World Class Wholesale Distribution',
                                companyContact: 'billing@hgworldclass.com | +1 (800) 555-0199',
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
                            onClick={() => setViewingMemberInvoice(inv)}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                          >
                            View Statement
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMemberInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                        No matching invoices found for "{invoiceSearchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    // 9. Payment Search
    case 'payment-search':
      const filteredMemberPayments = payments.filter(
        (p) =>
          p.paymentId.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
          p.invoiceNumber.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
          p.method.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
          (p.referenceNumber && p.referenceNumber.toLowerCase().includes(paymentSearchQuery.toLowerCase()))
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payment Search</h2>
              <p className="text-xs text-slate-500">Filter your payment history by ID, invoice, or ref/check #</p>
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMemberPayments.map((pay) => (
                    <tr key={pay.paymentId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-emerald-700">{pay.paymentId}</td>
                      <td className="p-3 font-mono">{pay.invoiceNumber}</td>
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
                      <td className="p-3 font-bold font-mono text-slate-900">${pay.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {filteredMemberPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                        No matching payments found for "{paymentSearchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );

    // 10. Shopping Category Views
    case 'metro-phones':
      return renderProductGrid('metro-phones', 'Metro By T-Mobile Phones', <Smartphone className="w-6 h-6" />);
    case 'display-phones':
      return renderProductGrid('display-phones', 'Display Phones (Demo Units)', <Tablet className="w-6 h-6" />);
    case 'sim-cards':
      return renderProductGrid('sim-cards', 'SIM Cards & Activation Packs', <SimCardIcon className="w-6 h-6" />);
    case 'accessories':
      return renderProductGrid('accessories', 'Charging & Protective Accessories', <Headphones className="w-6 h-6" />);
    case 'supplies':
      return renderProductGrid('supplies', 'Store Retail & Shipping Supplies', <Box className="w-6 h-6" />);

    default:
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}

      {/* Member Review & Acceptance Modal for Admin-Reviewed Orders */}
      {reviewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 my-8 max-h-[92vh] overflow-y-auto">
            {/* Top decorative bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-blue-500 to-indigo-600 rounded-t-2xl" />

            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Order Summary & Fulfillment Status
                    </h3>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono text-xs font-bold">
                      {reviewingOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Order fulfillment breakdown, assessed shipping fees, and taxes from Admin.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const inv = invoices.find((i) => i.orderNumber === reviewingOrder.orderNumber) || {
                      invoiceNumber: `INV-${reviewingOrder.orderNumber.replace('ORD-', '')}`,
                      orderNumber: reviewingOrder.orderNumber,
                      title: 'Wholesale Order Settlement',
                      customerName: reviewingOrder.customerName || memberDisplayName,
                      billedTo: reviewingOrder.businessAddress || memberStoreAddress,
                      memberUsername: user.username,
                      date: reviewingOrder.date,
                      dueDate: 'Net 15 Days',
                      amount: reviewingOrder.total,
                      status: 'Paid',
                      method: 'Allocated Credit Line'
                    };
                    downloadInvoicePdf({ 
                      invoice: inv, 
                      order: reviewingOrder,
                      companyName: 'HG World Class Wholesale Distribution',
                      companyContact: 'billing@hgworldclass.com | +1 (800) 555-0199'
                    });
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Print / Download PDF Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => setReviewingOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Order Status Banners */}
              {reviewingOrder.status === 'Declined by Admin' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-semibold flex items-center gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Declined by Admin: {reviewingOrder.adminDeclineReason || 'Fulfillment could not be approved at this time.'}</span>
                </div>
              ) : reviewingOrder.status === 'Credited' ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs font-semibold flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Order Status: <strong>Credited</strong>. Approved by Admin and funded via your allocated credit line. Actual payment settlement to Admin is pending.</span>
                </div>
              ) : reviewingOrder.status === 'Updated and Approved' || reviewingOrder.status === 'Approved with changes by Admin' || reviewingOrder.itemsModifiedByAdmin ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Notice: This order has been updated and approved with item adjustments or quantity modifications made by Admin.</span>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Order approved and queued for warehouse fulfillment. Funded via your allocated credit line.</span>
                </div>
              )}

              {/* Order Meta Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Order Date</span>
                  <span className="font-semibold text-slate-800">{reviewingOrder.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Store Location</span>
                  <span className="font-semibold text-slate-800 truncate block">{reviewingOrder.businessAddress || memberStoreAddress}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Status</span>
                  <span className={`font-bold ${reviewingOrder.status === 'Credited' ? 'text-amber-700 font-extrabold' : 'text-emerald-700'}`}>{reviewingOrder.status}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Order Items Breakdown ({reviewingOrder.itemsCount} Units)
                  </h4>
                  {reviewingOrder.itemsModifiedByAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
                      Modified by Admin
                    </span>
                  )}
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reviewingOrder.items && reviewingOrder.items.length > 0 ? (
                        reviewingOrder.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-400 text-[10px]">{it.sku}</td>
                            <td className="p-3 font-bold text-slate-900">{it.name}</td>
                            <td className="p-3 text-slate-700">${it.price.toFixed(2)}</td>
                            <td className="p-3">{it.qty}</td>
                            <td className="p-3 text-right font-bold text-slate-900">${(it.price * it.qty).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-3 text-slate-600">
                            Wholesale Distribution Catalog Items ({reviewingOrder.itemsCount} Units)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fee & Tax Breakdown Box */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200/60 pb-2">
                  Admin Assessed Fees & Taxes Summary
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>Base Products Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ${(reviewingOrder.subtotal || reviewingOrder.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Shipping Fee:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      +${(reviewingOrder.shippingFee || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sales Tax:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      +${(reviewingOrder.salesTax || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-blue-600" />
                      <span>Service Tax / Processing:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      +${(reviewingOrder.serviceTax || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-blue-600" />
                      <span>Overpack Fee:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      +${(reviewingOrder.overpackFee || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Insurance Fee:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      +${(reviewingOrder.insuranceFee || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-blue-200 flex justify-between items-center text-slate-900">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wide block">Final Order Grand Total:</span>
                      <span className="text-[10px] text-slate-500">Funded by Allocated Credit Line</span>
                    </div>
                    <span className="font-mono font-black text-xl text-emerald-800">
                      ${reviewingOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Member Credit Allocation Remaining Balance Summary Box in Review Modal */}
                {(() => {
                  const orderCredit = calculateRemainingCreditAfterApproval(
                    reviewingOrder,
                    members,
                    orders,
                    masterCreditLimit,
                    payments
                  );
                  const remPct = orderCredit.creditAllocation > 0
                    ? Math.min(100, Math.max(0, (orderCredit.remainingBalance / orderCredit.creditAllocation) * 100))
                    : 0;

                  return (
                    <div className={`p-4 rounded-xl space-y-2.5 text-xs border ${
                      orderCredit.isNegative 
                        ? 'bg-rose-50/90 border-rose-200 text-rose-900' 
                        : 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Wallet className="w-4 h-4" />
                          <span>Your Credit Allocation & Balance Status</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          orderCredit.isNegative
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {orderCredit.isNegative 
                            ? `Over Limit by $${Math.abs(orderCredit.remainingBalance).toFixed(2)}` 
                            : orderCredit.isSurplus
                            ? `+$${orderCredit.surplusAmount.toFixed(2)} Surplus Line`
                            : `${remPct.toFixed(1)}% Credit Available`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Credit Line</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ${orderCredit.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">This Order Total</span>
                          <span className="font-mono font-bold text-blue-700 text-sm">
                            -${reviewingOrder.total.toFixed(2)}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-slate-700 block">Remaining Credit Balance</span>
                          <span className={`font-mono font-extrabold text-sm ${orderCredit.isNegative ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {orderCredit.remainingBalance < 0 
                              ? `-$${Math.abs(orderCredit.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : `$${orderCredit.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${orderCredit.isNegative ? 'bg-rose-500' : 'bg-emerald-600'}`}
                          style={{ width: `${remPct}%` }}
                        />
                      </div>
                      <p className="text-[11px]">
                        {orderCredit.isNegative ? (
                          <span>Your active orders surpass your ${orderCredit.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credit limit. Balance is currently <strong>-${Math.abs(orderCredit.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> (in negative).</span>
                        ) : orderCredit.isSurplus ? (
                          <span>Your credit line is increased to <strong>${orderCredit.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> thanks to a <strong>+${orderCredit.surplusAmount.toFixed(2)}</strong> surplus overpayment.</span>
                        ) : reviewingOrder.status === 'Credited' || reviewingOrder.status === 'Approved' || reviewingOrder.status === 'Fulfilled' || reviewingOrder.status === 'Processing' ? (
                          <span>This order has been allocated against your ${orderCredit.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credit limit. You have <strong>${orderCredit.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> remaining for new purchases.</span>
                        ) : (
                          <span>Upon approval by Admin, <strong>${reviewingOrder.total.toFixed(2)}</strong> will be drawn from your <strong>${orderCredit.creditAllocation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> credit allocation.</span>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const inv = invoices.find((i) => i.orderNumber === reviewingOrder.orderNumber) || {
                      invoiceNumber: `INV-${reviewingOrder.orderNumber.replace('ORD-', '')}`,
                      orderNumber: reviewingOrder.orderNumber,
                      title: 'Wholesale Order Settlement',
                      customerName: reviewingOrder.customerName || memberDisplayName,
                      billedTo: reviewingOrder.businessAddress || memberStoreAddress,
                      memberUsername: user.username,
                      date: reviewingOrder.date,
                      dueDate: 'Net 15 Days',
                      amount: reviewingOrder.total,
                      status: 'Paid',
                      method: 'Allocated Credit Line'
                    };
                    downloadInvoicePdf({ 
                      invoice: inv, 
                      order: reviewingOrder,
                      companyName: 'HG World Class Wholesale Distribution',
                      companyContact: 'billing@hgworldclass.com | +1 (800) 555-0199'
                    });
                  }}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Download / Print Invoice PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewingOrder(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Close Order Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Invoice / Statement Modal */}
      {viewingMemberInvoice && (
        <div 
          id="view-member-invoice-statement-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8 my-8 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Top Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500" />

            {/* Header with Print & Close */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">HG World Class Wholesale</h3>
                <p className="text-[11px] text-slate-500">Official Commercial Billing Statement</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="member-invoice-print-pdf-btn"
                  onClick={() => {
                    const matchingOrder = orders.find((o) => o.orderNumber === viewingMemberInvoice.orderNumber);
                    downloadInvoicePdf({ 
                      invoice: viewingMemberInvoice, 
                      order: matchingOrder,
                      companyName: 'HG World Class Wholesale Distribution',
                      companyContact: 'billing@hgworldclass.com | +1 (800) 555-0199'
                    });
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer shadow-2xs"
                  title="Generate and download PDF invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" /> Print / Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMemberInvoice(null)}
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
                <span className="font-mono font-bold text-emerald-700">{viewingMemberInvoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Reference #</span>
                <span className="font-mono font-semibold text-slate-700">{viewingMemberInvoice.orderNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Issue Date</span>
                <span className="font-medium text-slate-800">{viewingMemberInvoice.date}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                <span className="font-medium text-slate-800">{viewingMemberInvoice.dueDate}</span>
              </div>
            </div>

            {/* Billing Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Issued By</span>
                <p className="font-bold text-slate-900">HG World Class Distribution Inc.</p>
                <p className="text-slate-600">450 Mission Street, Suite 800</p>
                <p className="text-slate-600">San Francisco, CA 94105</p>
                <p className="text-slate-500 mt-1">billing@hgworldclass.com</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Billed To (Retail Member)</span>
                <p className="font-bold text-slate-900">{viewingMemberInvoice.customerName || memberDisplayName}</p>
                <p className="text-slate-600">{viewingMemberInvoice.billedTo || memberStoreAddress}</p>
                <p className="text-slate-500 mt-1">Account: @{user.username}</p>
              </div>
            </div>

            {/* Member Credit Allocation & Remaining Balance Summary */}
            {(() => {
              const invCredit = getInvoiceCreditInfo(viewingMemberInvoice, members, orders, invoices, masterCreditLimit);
              return (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl mb-6 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Credit Allocation & Available Remaining Balance</span>
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
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Billed</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        -${viewingMemberInvoice.amount.toFixed(2)}
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

            {/* Actual Settlement & Current Balance Due Breakdown Card */}
            {(() => {
              const paymentSummary = getInvoicePaymentSummary(viewingMemberInvoice, payments);
              return (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Payment Settlement & Current Balance Due</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      paymentSummary.currentBalanceDue > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {paymentSummary.currentBalanceDue > 0 ? `$${paymentSummary.currentBalanceDue.toFixed(2)} Balance Due` : 'Fully Settled ($0.00 Due)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Invoice</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${paymentSummary.invoiceTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-blue-800 block">Actual Payments Settled</span>
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        ${paymentSummary.totalPaid.toFixed(2)}
                      </span>
                    </div>

                    <div className={`p-3 rounded-lg border shadow-2xs ${
                      paymentSummary.currentBalanceDue > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'
                    }`}>
                      <span className={`text-[10px] uppercase font-bold block ${
                        paymentSummary.currentBalanceDue > 0 ? 'text-rose-800' : 'text-emerald-800'
                      }`}>
                        Current Balance Due
                      </span>
                      <span className={`font-mono font-black text-sm ${
                        paymentSummary.currentBalanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        ${paymentSummary.currentBalanceDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {paymentSummary.payments.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Audit Trail ({paymentSummary.payments.length})</span>
                      <div className="space-y-1">
                        {paymentSummary.payments.map((p) => (
                          <div key={p.paymentId} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700">{p.paymentId}</span>
                              <span className="text-slate-500">&bull; {p.date}</span>
                              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">{p.method}</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-700">+${p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Items / Line Charges */}
            {(() => {
              const matchingOrder = orders.find((o) => o.orderNumber === viewingMemberInvoice.orderNumber);
              const items = matchingOrder?.items || [];
              const subtotal = matchingOrder?.subtotal || viewingMemberInvoice.amount;
              const shippingFee = matchingOrder?.shippingFee || 0;
              const salesTax = matchingOrder?.salesTax || 0;
              const serviceTax = matchingOrder?.serviceTax || 0;
              const overpackFee = matchingOrder?.overpackFee || 0;
              const insuranceFee = matchingOrder?.insuranceFee || 0;

              return (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Item / Description</th>
                          <th className="p-3 text-center">SKU</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {items.length > 0 ? (
                          items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                              <td className="p-3 text-center font-mono text-[10px] text-slate-500">{item.sku}</td>
                              <td className="p-3 text-right text-slate-700">${item.price.toFixed(2)}</td>
                              <td className="p-3 text-center text-slate-800">{item.qty}</td>
                              <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                ${(item.price * item.qty).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-3 font-semibold text-slate-900">
                              {viewingMemberInvoice.title || 'Wholesale Distribution Order Fulfillment'}
                            </td>
                            <td className="p-3 text-center font-mono text-[10px] text-slate-500">WHOLESALE-DIST</td>
                            <td className="p-3 text-right text-slate-700">${viewingMemberInvoice.amount.toFixed(2)}</td>
                            <td className="p-3 text-center text-slate-800">1</td>
                            <td className="p-3 text-right font-bold text-slate-900 font-mono">
                              ${viewingMemberInvoice.amount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Products Subtotal:</span>
                      <span className="font-mono font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    {shippingFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Assessed Freight & Shipping:</span>
                        <span className="font-mono font-semibold text-slate-900">+${shippingFee.toFixed(2)}</span>
                      </div>
                    )}
                    {salesTax > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>State Sales Tax:</span>
                        <span className="font-mono font-semibold text-slate-900">+${salesTax.toFixed(2)}</span>
                      </div>
                    )}
                    {serviceTax > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Warehouse Processing / Service Fee:</span>
                        <span className="font-mono font-semibold text-slate-900">+${serviceTax.toFixed(2)}</span>
                      </div>
                    )}
                    {overpackFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Secure Overpack / Protective Packaging:</span>
                        <span className="font-mono font-semibold text-slate-900">+${overpackFee.toFixed(2)}</span>
                      </div>
                    )}
                    {insuranceFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Transit & Cargo Insurance:</span>
                        <span className="font-mono font-semibold text-slate-900">+${insuranceFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-900">Grand Total:</span>
                      <span className="font-mono font-black text-base text-emerald-700">
                        ${viewingMemberInvoice.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer with Payment info & Close button */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Payment Method: <span className="font-semibold text-slate-800">{viewingMemberInvoice.method || 'Company Credit Allocation'}</span>
                <span className={`ml-2 px-2 py-0.5 rounded font-bold ${
                  viewingMemberInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  viewingMemberInvoice.status === 'Partial' ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold' :
                  viewingMemberInvoice.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {viewingMemberInvoice.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const matchingOrder = orders.find((o) => o.orderNumber === viewingMemberInvoice.orderNumber);
                    downloadInvoicePdf({ 
                      invoice: viewingMemberInvoice, 
                      order: matchingOrder,
                      companyName: 'HG World Class Wholesale Distribution',
                      companyContact: 'billing@hgworldclass.com | +1 (800) 555-0199'
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMemberInvoice(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
