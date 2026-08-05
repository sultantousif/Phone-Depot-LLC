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
import { SAMPLE_PRODUCTS } from '../data/sampleData';
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
  ArrowRight,
  RefreshCw,
  Send,
  HelpCircle
} from 'lucide-react';

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

  // Allocated Credit limit: from member record or user prop or master credit limit ($0 - $100,000)
  const memberCreditLimit = currentMemberRecord?.creditAllocation ?? user.creditAllocation ?? masterCreditLimit;
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

  // Listen for cross-tab or localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedOrders = localStorage.getItem('distro_orders');
        if (savedOrders) setOrders(JSON.parse(savedOrders));
        const savedInvoices = localStorage.getItem('distro_invoices');
        if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
        const savedPayments = localStorage.getItem('distro_payments');
        if (savedPayments) setPayments(JSON.parse(savedPayments));
        const savedMembers = localStorage.getItem('distro_team_members');
        if (savedMembers) setMembers(JSON.parse(savedMembers));
        const savedMasterLimit = localStorage.getItem('distro_master_credit_limit');
        if (savedMasterLimit !== null) {
          const parsed = Number(savedMasterLimit);
          if (!isNaN(parsed)) setMasterCreditLimit(parsed);
        }
      } catch (err) {
        console.error('Storage sync error:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also poll gently every 2s for same-window updates
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Save changes to localStorage
  const saveOrders = (updatedOrders: OrderItem[]) => {
    setOrders(updatedOrders);
    localStorage.setItem('distro_orders', JSON.stringify(updatedOrders));
  };

  const saveInvoices = (updatedInvoices: InvoiceItem[]) => {
    setInvoices(updatedInvoices);
    localStorage.setItem('distro_invoices', JSON.stringify(updatedInvoices));
  };

  // Filter orders for this member
  const memberOrders = orders.filter((o) => {
    if (o.memberUsername) {
      return o.memberUsername.toLowerCase() === user.username.toLowerCase() ||
             (currentMemberRecord?.tempUsername && o.memberUsername.toLowerCase() === currentMemberRecord.tempUsername.toLowerCase());
    }
    return true; // If no username tagged, show in shared prototype
  });

  // Compute used / committed credit
  const committedCredit = memberOrders
    .filter((o) => 
      o.status === 'Pending review and approval by Admin' ||
      o.status === 'Ready for Member Review & Acceptance' ||
      o.status === 'Approved & Processing' ||
      o.status === 'Open' ||
      o.status === 'Processing'
    )
    .reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);

  const availableCredit = Math.max(0, memberCreditLimit - committedCredit);

  // Shopping / Place Order Cart State
  const [orderCart, setOrderCart] = useState<{ productId: string; qty: number }[]>([]);
  const [shippingAddress, setShippingAddress] = useState(memberStoreAddress);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmittedAlert, setOrderSubmittedAlert] = useState<string | null>(null);

  // Modal State for Member Review & Acceptance of Admin-reviewed order
  const [reviewingOrder, setReviewingOrder] = useState<OrderItem | null>(null);
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
      const product = SAMPLE_PRODUCTS.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((item): item is { productId: string; qty: number; product: ProductItem } => item !== null);

  const cartSubtotal = cartItemsWithDetails.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const isCreditExceeded = cartSubtotal > availableCredit;
  const remainingCreditAfterCart = availableCredit - cartSubtotal;

  // Handle Member Order Submission
  const handleSubmitMemberOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItemsWithDetails.length === 0) return;
    if (isCreditExceeded) return;

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
      total: cartSubtotal, // Base subtotal before Admin adds shipping/taxes
      paymentStatus: 'Credit Allocated',
      notes: orderNotes.trim() || undefined,
    };

    const updatedOrders = [newOrder, ...orders];
    saveOrders(updatedOrders);

    setOrderCart([]);
    setOrderNotes('');
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
    const products = SAMPLE_PRODUCTS.filter((p) => p.category === categoryKey);

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
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-emerald-700 font-bold">Available Credit: </span>
              <span className="font-mono font-extrabold text-emerald-900">${availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <button
              onClick={() => onNavigate('place-new-order')}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-300"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> View Cart ({cartItemsWithDetails.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((item) => {
            const inCart = orderCart.find((ci) => ci.productId === item.id);
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold uppercase border border-slate-200">
                      SKU: {item.sku}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      In Stock ({item.stock})
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
                          className="w-6 h-6 flex items-center justify-center font-bold text-emerald-800 hover:bg-emerald-200 rounded text-xs"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-xs text-emerald-900">{inCart.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.id, inCart.qty + 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-emerald-800 hover:bg-emerald-200 rounded text-xs"
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
      case 'Ready for Member Review & Acceptance':
        return (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1 animate-pulse">
            <AlertCircle className="w-3 h-3 text-blue-600" />
            <span>Ready for Member Review & Acceptance</span>
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

  // Orders awaiting member action
  const ordersAwaitingMember = memberOrders.filter(
    (o) => o.status === 'Ready for Member Review & Acceptance'
  );

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

          {/* Critical Attention Banner: Orders awaiting member review */}
          {ordersAwaitingMember.length > 0 && (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 shadow-md border border-blue-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-500/30 rounded-lg text-blue-300 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Action Required: Quote Ready for Your Review & Acceptance ({ordersAwaitingMember.length})
                  </h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    The Admin has assessed shipping and taxes for your order. Review the quote summary and accept to confirm fulfillment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingOrder(ordersAwaitingMember[0])}
                id="home-action-review-order-btn"
                className="px-4 py-2 bg-white text-blue-950 font-bold text-xs rounded-lg shadow-xs hover:bg-blue-50 transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Review Quote Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Allocated Credit Summary Widget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Allocated Credit */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Allocated Credit Line</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono">
                  ${memberCreditLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Authorized credit line set by Administrator</p>
              </div>
            </div>

            {/* Committed / In Review */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In-Process Orders</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-amber-800 font-mono">
                  ${committedCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Pending approval, review or fulfillment</p>
              </div>
            </div>

            {/* Available to Shop */}
            <div className="bg-emerald-950 text-white rounded-xl p-5 shadow-xs flex flex-col justify-between border border-emerald-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Available Shopping Credit</span>
                <div className="p-2 bg-emerald-800 text-emerald-200 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white font-mono">
                  ${availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="w-full bg-emerald-900 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (availableCredit / (memberCreditLimit || 1)) * 100)}%` }}
                  />
                </div>
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
            <div className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-3">
              <div>
                <span className="text-[10px] text-emerald-300 block uppercase font-bold">Available Credit</span>
                <span className="text-sm font-extrabold font-mono text-white">
                  ${availableCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

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
                {SAMPLE_PRODUCTS.map((item) => {
                  const inCart = orderCart.find((ci) => ci.productId === item.id);
                  return (
                    <div 
                      key={item.id} 
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition-all"
                    >
                      <div className="pr-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">{item.sku}</span>
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
                      <span className="font-mono font-bold text-slate-900">${availableCredit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Order Items Subtotal:</span>
                      <span className="font-mono font-bold text-emerald-800">${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold">
                      <span>Remaining Credit After Order:</span>
                      <span className={`font-mono ${isCreditExceeded ? 'text-rose-600' : 'text-emerald-700'}`}>
                        ${remainingCreditAfterCart.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Warning if Credit Limit Exceeded */}
                  {isCreditExceeded ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span>Credit Limit Exceeded: </span>
                        <span>This order (${cartSubtotal.toFixed(2)}) exceeds your available allocated credit (${availableCredit.toFixed(2)}). Please reduce quantities or contact Admin.</span>
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
                    disabled={isCreditExceeded || cartItemsWithDetails.length === 0}
                    onClick={handleSubmitMemberOrder}
                    className={`w-full py-3 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isCreditExceeded || cartItemsWithDetails.length === 0
                        ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Order for Admin Review & Approval</span>
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
                      const totalFees = (ord.shippingFee || 0) + (ord.salesTax || 0) + (ord.serviceTax || 0);
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
                            {ord.status === 'Ready for Member Review & Acceptance' ? (
                              <button
                                onClick={() => setReviewingOrder(ord)}
                                id={`member-review-quote-btn-${ord.id}`}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Review & Accept Quote</span>
                              </button>
                            ) : ord.status === 'Declined by Admin' ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {ord.adminDeclineReason || 'Declined by Admin'}
                                </span>
                              </div>
                            ) : ord.status === 'Pending review and approval by Admin' ? (
                              <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                <span>Awaiting Admin</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                In Fulfillment
                              </span>
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
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {invoices.map((inv) => (
                      <tr key={inv.invoiceNumber} className="hover:bg-slate-50">
                        <td className="p-4 font-bold font-mono text-emerald-700">{inv.invoiceNumber}</td>
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
                        <td className="p-4 font-bold text-slate-900 font-mono">${inv.amount.toFixed(2)}</td>
                        <td className="p-4 text-slate-600">{inv.method || 'Company Credit'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            inv.status === 'Overdue' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {inv.status}
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
                        <td className="p-4 text-slate-600">{p.method}</td>
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
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMemberInvoices.map((inv) => (
                    <tr key={inv.invoiceNumber} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-emerald-700">{inv.invoiceNumber}</td>
                      <td className="p-3 font-mono">{inv.orderNumber}</td>
                      <td className="p-3">{inv.date}</td>
                      <td className="p-3 font-bold font-mono text-slate-900">${inv.amount.toFixed(2)}</td>
                      <td className="p-3 font-bold text-emerald-600">{inv.status}</td>
                    </tr>
                  ))}
                  {filteredMemberInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
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
          p.method.toLowerCase().includes(paymentSearchQuery.toLowerCase())
      );

      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payment Search</h2>
              <p className="text-xs text-slate-500">Filter your payment history by ID or invoice</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={paymentSearchQuery}
                onChange={(e) => setPaymentSearchQuery(e.target.value)}
                placeholder="Search payment ID or invoice number..."
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
                    <th className="p-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMemberPayments.map((pay) => (
                    <tr key={pay.paymentId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-emerald-700">{pay.paymentId}</td>
                      <td className="p-3 font-mono">{pay.invoiceNumber}</td>
                      <td className="p-3">{pay.date}</td>
                      <td className="p-3 text-slate-600">{pay.method}</td>
                      <td className="p-3 font-bold font-mono text-slate-900">${pay.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {filteredMemberPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
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
                      Order Fulfillment Quote & Fee Review
                    </h3>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono text-xs font-bold">
                      {reviewingOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Admin has reviewed your order and provided shipping fee, sales tax, and service tax calculations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewingOrder(null);
                  setShowCancelModal(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close review"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
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
                  <span className="font-bold text-blue-700">{reviewingOrder.status}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Order Items Breakdown ({reviewingOrder.itemsCount} Units)
                </h4>
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

                  <div className="pt-3 border-t border-blue-200 flex justify-between items-center text-slate-900">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wide block">Final Order Grand Total:</span>
                      <span className="text-[10px] text-slate-500">Charged against your allocated credit</span>
                    </div>
                    <span className="font-mono font-black text-xl text-emerald-800">
                      ${reviewingOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Verification Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Your Allocated Credit Line:</span>
                  <span className="font-mono font-bold text-slate-900">${memberCreditLimit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Available Credit Balance:</span>
                  <span className="font-mono font-bold text-emerald-700">${availableCredit.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 font-semibold text-[11px]">
                    Your allocated credit line is active and will fund this order upon acceptance.
                  </span>
                </div>
              </div>

              {/* Cancellation Form (if toggled) */}
              {showCancelModal && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
                  <span className="text-xs font-bold text-rose-900 block">
                    Please provide an optional cancellation reason:
                  </span>
                  <input
                    type="text"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="e.g. Price higher than expected, delivery timeline not feasible..."
                    className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMemberCancelOrder(reviewingOrder)}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Confirm Cancel Order
                    </button>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline / Cancel Order</span>
                </button>

                <div className="w-full sm:w-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewingOrder(null)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMemberAcceptOrder(reviewingOrder)}
                    id="accept-and-confirm-order-btn"
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Order & Confirm Fulfillment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
