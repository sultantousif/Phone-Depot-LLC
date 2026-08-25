import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Home as HomeIcon, 
  User as UserIcon, 
  UserPlus,
  Users,
  ShoppingBag, 
  PackageCheck, 
  LogOut, 
  Menu, 
  X,
  FileText,
  CreditCard,
  Search,
  PlusCircle,
  Clock,
  Smartphone,
  Tablet,
  Cpu as SimCardIcon,
  Headphones,
  Box,
  SlidersHorizontal,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { AdminView, User } from '../types';

interface HeaderNavProps {
  user: User;
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
  onLogout: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  user,
  activeView,
  onSelectView,
  onLogout,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'my-account' | 'my-orders' | 'shopping' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExecuteReset = () => {
    try {
      localStorage.setItem('distro_invoices', JSON.stringify([]));
      localStorage.setItem('distro_payments', JSON.stringify([]));
      localStorage.setItem('distro_orders', JSON.stringify([]));
      window.dispatchEvent(new CustomEvent('distro_storage_updated'));
      window.dispatchEvent(new CustomEvent('distro_payments_invoices_reset'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
    setIsResetConfirmOpen(false);
    setResetSuccessToast('All payments, invoices, and order balances have been reset to zero ($0.00).');
    setTimeout(() => {
      setResetSuccessToast(null);
    }, 6000);
  };

  const handleSelect = (view: AdminView) => {
    onSelectView(view);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const toggleDropdown = (dropdown: 'my-account' | 'my-orders' | 'shopping') => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const isAccountActive = ['invoices', 'payments', 'invoices-search', 'payment-search', 'add-admin', 'manage-admins', 'add-member', 'manage-members'].includes(activeView);
  const isOrdersActive = ['place-new-order', 'view-previous-order', 'view-open-order', 'search-order'].includes(activeView);
  const isShoppingActive = ['shop-settings', 'metro-phones', 'display-phones', 'sim-cards', 'accessories', 'supplies'].includes(activeView);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-md" ref={navRef}>
      {/* Geometric Blue Accent Top/Bottom Bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Navigation Anchor */}
          <div 
            id="brand-logo-btn"
            className="flex items-center cursor-pointer" 
            onClick={() => handleSelect('home')}
          />

          {/* Desktop Navigation Items */}
          <nav className="hidden md:flex items-center space-x-1.5" aria-label="Main Navigation">
            
            {/* 1. Home Button */}
            <button
              onClick={() => handleSelect('home')}
              id="nav-home-btn"
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                activeView === 'home'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/90'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </button>

            {/* 2. My Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('my-account')}
                id="nav-my-account-btn"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                  isAccountActive || openDropdown === 'my-account'
                    ? 'bg-slate-800 text-blue-400 border-slate-700 shadow-xs'
                    : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/90'
                }`}
                aria-expanded={openDropdown === 'my-account'}
                aria-haspopup="true"
              >
                <UserIcon className="w-4 h-4" />
                <span>My Account</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'my-account' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'my-account' && (
                <div 
                  id="dropdown-my-account-menu"
                  className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Account & Billing
                  </div>

                  <button
                    onClick={() => handleSelect('invoices')}
                    id="menu-item-invoices"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'invoices' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Invoices</span>
                  </button>

                  <button
                    onClick={() => handleSelect('payments')}
                    id="menu-item-payments"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'payments' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Payments</span>
                  </button>

                  <button
                    onClick={() => handleSelect('invoices-search')}
                    id="menu-item-invoices-search"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'invoices-search' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span>Invoices Search</span>
                  </button>

                  <button
                    onClick={() => handleSelect('payment-search')}
                    id="menu-item-payment-search"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'payment-search' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span>Payment Search</span>
                  </button>

                  {/* Admin Only Privileges: Add an Admin, Manage Admins, Add a member, Manage members */}
                  {user.role === 'admin' && (
                    <>
                      <div className="my-1 border-t border-slate-100" />

                      {/* Requested Button: "Add an Admin" under My Account */}
                      <button
                        onClick={() => handleSelect('add-admin')}
                        id="menu-item-add-admin"
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center space-x-2.5 transition-colors ${
                          activeView === 'add-admin'
                            ? 'text-purple-700 font-bold bg-purple-50'
                            : 'text-slate-800 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        <div className="p-1 rounded bg-purple-100 text-purple-700">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight font-bold">Add an Admin</span>
                          <span className="text-[10px] text-slate-400 font-normal">Administrator privileges</span>
                        </div>
                      </button>

                      {/* Requested Button: "Manage Admins" */}
                      <button
                        onClick={() => handleSelect('manage-admins')}
                        id="menu-item-manage-admins"
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center space-x-2.5 transition-colors ${
                          activeView === 'manage-admins'
                            ? 'text-purple-700 font-bold bg-purple-50'
                            : 'text-slate-800 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        <div className="p-1 rounded bg-purple-100 text-purple-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight font-bold">Manage Admins</span>
                          <span className="text-[10px] text-slate-400 font-normal">Admin roster & roles</span>
                        </div>
                      </button>

                      {/* Requested Button: "Add a member" under My Account */}
                      <button
                        onClick={() => handleSelect('add-member')}
                        id="menu-item-add-member"
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center space-x-2.5 transition-colors ${
                          activeView === 'add-member'
                            ? 'text-blue-700 font-bold bg-blue-50'
                            : 'text-slate-800 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <div className="p-1 rounded bg-blue-100 text-blue-600">
                          <UserPlus className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight">Add a member</span>
                          <span className="text-[10px] text-slate-400 font-normal">Team & store accounts</span>
                        </div>
                      </button>

                      {/* Requested Button: "Manage members" below "Add a member" */}
                      <button
                        onClick={() => handleSelect('manage-members')}
                        id="menu-item-manage-members"
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center space-x-2.5 transition-colors ${
                          activeView === 'manage-members'
                            ? 'text-indigo-700 font-bold bg-indigo-50'
                            : 'text-slate-800 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                      >
                        <div className="p-1 rounded bg-indigo-100 text-indigo-600">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight">Manage members</span>
                          <span className="text-[10px] text-slate-400 font-normal">Roster, credits & roles</span>
                        </div>
                      </button>

                      {/* Requested Button: "reset payments and invoices" below "Manage members" */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          setIsResetConfirmOpen(true);
                        }}
                        id="menu-item-reset-payments-invoices"
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center space-x-2.5 rounded-b-lg transition-colors text-rose-700 hover:bg-rose-50 hover:text-rose-800 cursor-pointer border-t border-rose-100/70 bg-rose-50/20"
                      >
                        <div className="p-1 rounded bg-rose-100 text-rose-600">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight font-bold text-rose-700">Reset payments and invoices</span>
                          <span className="text-[10px] text-rose-500 font-normal">Reset all data back to $0.00</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 3. My Orders Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('my-orders')}
                id="nav-my-orders-btn"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                  isOrdersActive || openDropdown === 'my-orders'
                    ? 'bg-slate-800 text-blue-400 border-slate-700 shadow-xs'
                    : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/90'
                }`}
                aria-expanded={openDropdown === 'my-orders'}
                aria-haspopup="true"
              >
                <PackageCheck className="w-4 h-4" />
                <span>My Orders</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'my-orders' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'my-orders' && (
                <div 
                  id="dropdown-my-orders-menu"
                  className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Order Operations
                  </div>

                  <button
                    onClick={() => handleSelect('place-new-order')}
                    id="menu-item-place-new-order"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'place-new-order' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Place New Order</span>
                  </button>

                  <button
                    onClick={() => handleSelect('view-previous-order')}
                    id="menu-item-view-previous-order"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'view-previous-order' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Previous Order</span>
                  </button>

                  <button
                    onClick={() => handleSelect('view-open-order')}
                    id="menu-item-view-open-order"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'view-open-order' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Open Order</span>
                  </button>

                  <button
                    onClick={() => handleSelect('search-order')}
                    id="menu-item-search-order"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'search-order' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span>Search Order</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Shopping Dropdown */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('shopping')}
                id="nav-shopping-btn"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                  isShoppingActive || openDropdown === 'shopping'
                    ? 'bg-slate-800 text-blue-400 border-slate-700 shadow-xs'
                    : 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/90'
                }`}
                aria-expanded={openDropdown === 'shopping'}
                aria-haspopup="true"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Shopping</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'shopping' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'shopping' && (
                <div 
                  id="dropdown-shopping-menu"
                  className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                    Catalog Categories
                  </div>

                  <button
                    onClick={() => handleSelect('metro-phones')}
                    id="menu-item-metro-phones"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'metro-phones' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Metro By T-Mobile Phones</span>
                  </button>

                  <button
                    onClick={() => handleSelect('display-phones')}
                    id="menu-item-display-phones"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'display-phones' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5 text-slate-400" />
                    <span>Display Phones</span>
                  </button>

                  <button
                    onClick={() => handleSelect('sim-cards')}
                    id="menu-item-sim-cards"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'sim-cards' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <SimCardIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sim Cards</span>
                  </button>

                  <button
                    onClick={() => handleSelect('accessories')}
                    id="menu-item-accessories"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'accessories' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5 text-slate-400" />
                    <span>Accessories</span>
                  </button>

                  <button
                    onClick={() => handleSelect('supplies')}
                    id="menu-item-supplies"
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 hover:bg-slate-50 transition-colors ${
                      activeView === 'supplies' ? 'text-blue-600 font-bold bg-blue-50/60' : 'text-slate-700'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supplies</span>
                  </button>

                  {/* Admin Only: Shop Settings button placed under catalog categories */}
                  {user.role === 'admin' && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => handleSelect('shop-settings')}
                        id="menu-item-shop-settings"
                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center space-x-2.5 rounded-b-lg transition-colors ${
                          activeView === 'shop-settings'
                            ? 'text-purple-700 font-bold bg-purple-50'
                            : 'text-slate-800 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        <div className="p-1 rounded bg-purple-100 text-purple-700">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block leading-tight font-bold">Shop Settings</span>
                          <span className="text-[10px] text-slate-400 font-normal">Pictures, inventory stock & member visibility</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

          </nav>

          {/* Right Area: Logout (Username) */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-medium">{user.username}</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/50">
                {user.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              id="nav-logout-btn"
              className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-red-900/40 hover:border-red-700/60 border border-slate-700 transition-all flex items-center space-x-1.5"
              title="Click to logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              id="mobile-menu-toggle-btn"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-4 shadow-xl animate-in fade-in">
          <div className="space-y-1">
            <button
              onClick={() => handleSelect('home')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                activeView === 'home' ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <HomeIcon className="w-4 h-4" /> Home
            </button>

            {/* My Account Mobile Group */}
            <div className="pt-2">
              <div className="px-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">My Account</div>
              <button onClick={() => handleSelect('invoices')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Invoices</button>
              <button onClick={() => handleSelect('payments')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Payments</button>
              <button onClick={() => handleSelect('invoices-search')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Invoices Search</button>
              <button onClick={() => handleSelect('payment-search')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Payment Search</button>
              
              {/* Admin Only Privileges in Mobile: Add an Admin, Manage Admins, Add a member, Manage members */}
              {user.role === 'admin' && (
                <>
                  {/* Requested Mobile Add Admin Button */}
                  <button 
                    id="mobile-menu-item-add-admin"
                    onClick={() => handleSelect('add-admin')} 
                    className={`w-full text-left pl-6 py-1.5 text-xs font-bold flex items-center gap-2 ${
                      activeView === 'add-admin' ? 'text-purple-400 font-extrabold' : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Add an Admin</span>
                  </button>

                  {/* Requested Mobile Manage Admins Button */}
                  <button 
                    id="mobile-menu-item-manage-admins"
                    onClick={() => handleSelect('manage-admins')} 
                    className={`w-full text-left pl-6 py-1.5 text-xs font-bold flex items-center gap-2 ${
                      activeView === 'manage-admins' ? 'text-purple-400 font-extrabold' : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Manage Admins</span>
                  </button>

                  {/* Requested Mobile Add Member Button */}
                  <button 
                    id="mobile-menu-item-add-member"
                    onClick={() => handleSelect('add-member')} 
                    className={`w-full text-left pl-6 py-1.5 text-xs font-bold flex items-center gap-2 ${
                      activeView === 'add-member' ? 'text-blue-400 font-extrabold' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add a member</span>
                  </button>

                  {/* Requested Mobile Manage Members Button */}
                  <button 
                    id="mobile-menu-item-manage-members"
                    onClick={() => handleSelect('manage-members')} 
                    className={`w-full text-left pl-6 py-1.5 text-xs font-bold flex items-center gap-2 ${
                      activeView === 'manage-members' ? 'text-indigo-400 font-extrabold' : 'text-indigo-400 hover:text-indigo-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage members</span>
                  </button>

                  {/* Requested Mobile Reset payments and invoices Button */}
                  <button 
                    id="mobile-menu-item-reset-payments-invoices"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsResetConfirmOpen(true);
                    }} 
                    className="w-full text-left pl-6 py-1.5 text-xs font-bold flex items-center gap-2 text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset payments and invoices</span>
                  </button>
                </>
              )}
            </div>

            {/* My Orders Mobile Group */}
            <div className="pt-2">
              <div className="px-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">My Orders</div>
              <button onClick={() => handleSelect('place-new-order')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Place New Order</button>
              <button onClick={() => handleSelect('view-previous-order')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">View Previous Order</button>
              <button onClick={() => handleSelect('view-open-order')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">View Open Order</button>
              <button onClick={() => handleSelect('search-order')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Search Order</button>
            </div>

            {/* Shopping Mobile Group */}
            <div className="pt-2">
              <div className="px-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Shopping</div>
              <button onClick={() => handleSelect('metro-phones')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Metro By T-Mobile Phones</button>
              <button onClick={() => handleSelect('display-phones')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Display Phones</button>
              <button onClick={() => handleSelect('sim-cards')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Sim Cards</button>
              <button onClick={() => handleSelect('accessories')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Accessories</button>
              <button onClick={() => handleSelect('supplies')} className="w-full text-left pl-6 py-1.5 text-xs text-slate-300 hover:text-white">Supplies</button>
              {user.role === 'admin' && (
                <button 
                  id="mobile-menu-item-shop-settings"
                  onClick={() => handleSelect('shop-settings')} 
                  className={`w-full text-left pl-6 py-1.5 text-xs font-bold flex items-center gap-2 ${
                    activeView === 'shop-settings' ? 'text-purple-400 font-extrabold' : 'text-purple-400 hover:text-purple-300'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Shop Settings</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <div className="px-3 py-1 text-xs text-slate-400">
              Logged in as <span className="text-white font-semibold">{user.username}</span> ({user.role})
            </div>
            <button
              onClick={onLogout}
              className="w-full py-2 px-3 text-xs font-bold text-red-400 hover:bg-red-950/50 rounded-lg flex items-center justify-center gap-2 border border-red-900/50"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}

      {/* Reset Payments & Invoices Confirmation Modal */}
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
                  <p className="text-xs text-slate-500">Reset all ledger and accounting data to $0.00</p>
                </div>
              </div>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-lg leading-none font-bold cursor-pointer"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-950 block mb-1">Verify Calculation & Website Logic</span>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    This will clear all statements, invoice records, payment histories, and order transaction balances back to zero (<strong>$0.00</strong>).
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-rose-200/60 text-[11px] text-rose-700 space-y-1 pl-6">
                <div>&bull; Total Invoices &rarr; <strong>0 ($0.00)</strong></div>
                <div>&bull; Total Payments &rarr; <strong>0 ($0.00)</strong></div>
                <div>&bull; Member Balances &amp; Drawn Credit &rarr; <strong>$0.00</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-reset-payments-invoices"
                onClick={handleExecuteReset}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Data to Zero</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Reset Notification Toast */}
      {resetSuccessToast && (
        <div 
          id="reset-success-toast"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium">{resetSuccessToast}</span>
          <button 
            onClick={() => setResetSuccessToast(null)}
            className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer font-bold"
          >
            &times;
          </button>
        </div>
      )}
    </header>
  );
};
