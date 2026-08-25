import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, ProductVisibilityMode, TeamMember } from '../types';
import { 
  loadStoredProducts, 
  saveStoredProducts, 
  STOCK_PRESET_IMAGES,
  isProductVisibleToMember,
  CATEGORY_LABELS,
  PRODUCTS_UPDATED_EVENT
} from '../utils/productUtils';
import { SAMPLE_PRODUCTS } from '../data/sampleData';
import {
  SlidersHorizontal,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  PlusCircle,
  MinusCircle,
  Smartphone,
  Tablet,
  Cpu as SimCardIcon,
  Headphones,
  Box,
  Layers,
  Sparkles,
  ChevronDown,
  Lock,
  Globe,
  UserCheck,
  UserX,
  Package,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface ShopSettingsManagerProps {
  onNavigateToCategory?: (category: string) => void;
  onNavigateToOrder?: () => void;
}

export const ShopSettingsManager: React.FC<ShopSettingsManagerProps> = ({
  onNavigateToCategory,
  onNavigateToOrder
}) => {
  const [products, setProducts] = useState<ProductItem[]>(() => loadStoredProducts());
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('distro_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyIds = ['mem-101', 'mem-102', 'mem-103', 'mem-104'];
          return parsed.filter((m) => !legacyIds.includes(m.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVisibilityFilter, setSelectedVisibilityFilter] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Simulation Member Preview
  const [simulatedMember, setSimulatedMember] = useState<string>(''); // username or empty for admin view

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Modals state
  const [imageUploadModalProduct, setImageUploadModalProduct] = useState<ProductItem | null>(null);
  const [memberVisibilityModalProduct, setMemberVisibilityModalProduct] = useState<ProductItem | null>(null);
  const [editProductModalProduct, setEditProductModalProduct] = useState<ProductItem | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  // Listen for external product updates
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

  // Show auto-dismiss feedback
  const showFeedback = (type: 'success' | 'info' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  // Helper to persist updated product array
  const handleUpdateProducts = (updated: ProductItem[], msg?: string) => {
    setProducts(updated);
    saveStoredProducts(updated);
    if (msg) showFeedback('success', msg);
  };

  // Quick Stock Adjustment
  const handleAdjustStock = (productId: string, delta: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const newStock = Math.max(0, (p.stock || 0) + delta);
        return { ...p, stock: newStock };
      }
      return p;
    });
    handleUpdateProducts(updated);
  };

  // Direct Stock Set
  const handleSetStock = (productId: string, newStock: number) => {
    const validStock = Math.max(0, isNaN(newStock) ? 0 : newStock);
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, stock: validStock };
      }
      return p;
    });
    handleUpdateProducts(updated, `Stock updated to ${validStock} units.`);
  };

  // Toggle Numerical Stock Visibility to Shopping Members
  const handleToggleShowStockCount = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const nextState = p.showStockToMembers === false ? true : false;
        return { ...p, showStockToMembers: nextState };
      }
      return p;
    });
    handleUpdateProducts(updated, 'Member stock count visibility toggled.');
  };

  // Quick Toggle: Hide / Show Globally
  const handleQuickToggleVisibility = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const newMode: ProductVisibilityMode = p.visibilityMode === 'hidden' ? 'all' : 'hidden';
        return { ...p, visibilityMode: newMode };
      }
      return p;
    });
    const target = updated.find((p) => p.id === productId);
    const isNowVisible = target?.visibilityMode !== 'hidden';
    handleUpdateProducts(
      updated,
      isNowVisible ? `"${target?.name}" is now visible to shopping members.` : `"${target?.name}" is now HIDDEN from members.`
    );
  };

  // Update Visibility Rules (All, Hidden, Whitelist, Blacklist)
  const handleSaveVisibilityRules = (
    productId: string,
    mode: ProductVisibilityMode,
    allowed: string[],
    hidden: string[]
  ) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          visibilityMode: mode,
          allowedMembers: allowed,
          hiddenMembers: hidden
        };
      }
      return p;
    });
    handleUpdateProducts(updated, 'Member visibility rules updated successfully.');
    setMemberVisibilityModalProduct(null);
  };

  // Save Uploaded / Selected Image
  const handleSaveProductImage = (productId: string, imageUrl: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, image: imageUrl };
      }
      return p;
    });
    handleUpdateProducts(updated, 'Device picture updated successfully.');
    setImageUploadModalProduct(null);
  };

  // Reset to Factory Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset catalog products, pictures, and stock to factory defaults?')) {
      handleUpdateProducts(SAMPLE_PRODUCTS, 'Catalog reset to original default inventory.');
    }
  };

  // Restock all low items
  const handleBulkRestock = () => {
    const updated = products.map((p) => {
      if (p.stock < 15) {
        return { ...p, stock: 50 };
      }
      return p;
    });
    handleUpdateProducts(updated, 'All low stock items replenished to 50 units.');
  };

  // Filtered Products
  const filteredProducts = products.filter((item) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchDesc && !matchCategory) return false;
    }

    // 2. Category Filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }

    // 3. Visibility Filter
    if (selectedVisibilityFilter !== 'all') {
      const mode = item.visibilityMode || 'all';
      if (selectedVisibilityFilter === 'all_visible' && mode !== 'all') return false;
      if (selectedVisibilityFilter === 'member_restricted' && mode !== 'selected_members' && mode !== 'exclude_members') return false;
      if (selectedVisibilityFilter === 'hidden' && mode !== 'hidden') return false;
    }

    // 4. Stock Filter
    if (selectedStockFilter !== 'all') {
      if (selectedStockFilter === 'in_stock' && item.stock <= 10) return false;
      if (selectedStockFilter === 'low_stock' && (item.stock <= 0 || item.stock > 10)) return false;
      if (selectedStockFilter === 'out_of_stock' && item.stock > 0) return false;
    }

    return true;
  });

  // Calculate High-Level Metrics
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalWholesaleValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const hiddenCount = products.filter((p) => p.visibilityMode === 'hidden').length;
  const restrictedCount = products.filter((p) => p.visibilityMode === 'selected_members' || p.visibilityMode === 'exclude_members').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header & Navigation Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle geometric accent lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Admin Distribution Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Shop Settings & Catalog Control
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Upload high-resolution device pictures, control real-time inventory stock levels visible to members, and configure custom member-specific visibility rules so stores only see the products you authorize.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              onClick={() => setIsNewProductModalOpen(true)}
              id="admin-add-product-btn"
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Catalog Item</span>
            </button>
            <button
              onClick={handleBulkRestock}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
              title="Restock low inventory items"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Replenish Low Stock</span>
            </button>
            <button
              onClick={handleResetDefaults}
              className="px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all flex items-center gap-1.5"
              title="Reset catalog items to default"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Catalog KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Items</span>
            <span className="text-xl font-bold text-white">{products.length} Products</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Stock Units</span>
            <span className="text-xl font-bold text-emerald-400">{totalStockUnits.toLocaleString()}</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Catalog Wholesale Val</span>
            <span className="text-xl font-bold text-blue-400">${totalWholesaleValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Low Stock Alert</span>
            <span className={`text-xl font-bold ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {lowStockCount} Items
            </span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Out of Stock</span>
            <span className={`text-xl font-bold ${outOfStockCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {outOfStockCount} Items
            </span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Restricted / Hidden</span>
            <span className="text-xl font-bold text-purple-400">{restrictedCount + hiddenCount} Items</span>
          </div>
        </div>
      </div>

      {/* 2. Toast / Feedback Notification */}
      {feedback && (
        <div 
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs border transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-blue-50 border-blue-300 text-blue-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="p-1 text-slate-500 hover:text-slate-800 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Member Shopping Simulation / Live Experience Tester */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/70 to-blue-50/80 border border-indigo-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                Member Shopping Visibility Simulator
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-800 font-extrabold uppercase">
                  Live Test Mode
                </span>
              </h3>
              <p className="text-xs text-indigo-800/80">
                Select a registered member store to preview exactly which device cards and inventory stock numbers they will see when they log into the shopping portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto">
            <div className="flex-1 md:w-72">
              <select
                id="simulator-member-select"
                value={simulatedMember}
                onChange={(e) => setSimulatedMember(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-indigo-300 rounded-xl text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="">👁️ Full Admin View (Show All Visibility States)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.username}>
                    👤 {m.name} (@{m.username}) - {m.storeLocation || 'Store Account'}
                  </option>
                ))}
              </select>
            </div>
            {simulatedMember && (
              <button
                onClick={() => setSimulatedMember('')}
                className="px-3 py-2 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-colors shrink-0"
              >
                Reset View
              </button>
            )}
          </div>
        </div>

        {simulatedMember && (
          <div className="mt-3 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-900 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Currently previewing member: <strong>{members.find((m) => m.username === simulatedMember)?.name || simulatedMember}</strong> (@{simulatedMember})
              </span>
            </div>
            <div className="text-xs text-indigo-700 font-bold">
              Visible items: {products.filter((p) => isProductVisibleToMember(p, simulatedMember)).length} of {products.length}
            </div>
          </div>
        )}
      </div>

      {/* 4. Controls & Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="shop-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by device name, SKU, specs, or category..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">📁 All Categories ({products.length})</option>
              <option value="metro-phones">📱 Metro Phones ({products.filter((p) => p.category === 'metro-phones').length})</option>
              <option value="display-phones">📲 Display Dummy Phones ({products.filter((p) => p.category === 'display-phones').length})</option>
              <option value="sim-cards">💳 SIM Cards ({products.filter((p) => p.category === 'sim-cards').length})</option>
              <option value="accessories">🎧 Accessories ({products.filter((p) => p.category === 'accessories').length})</option>
              <option value="supplies">📦 Store Supplies ({products.filter((p) => p.category === 'supplies').length})</option>
            </select>

            {/* Visibility Mode Select */}
            <select
              value={selectedVisibilityFilter}
              onChange={(e) => setSelectedVisibilityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">🌐 All Visibility Modes</option>
              <option value="all_visible">🟢 Visible to Everyone ({products.filter((p) => (p.visibilityMode || 'all') === 'all').length})</option>
              <option value="member_restricted">🎯 Member Restricted ({products.filter((p) => p.visibilityMode === 'selected_members' || p.visibilityMode === 'exclude_members').length})</option>
              <option value="hidden">🙈 Completely Hidden ({products.filter((p) => p.visibilityMode === 'hidden').length})</option>
            </select>

            {/* Stock Select */}
            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">📦 All Stock Levels</option>
              <option value="in_stock">✅ Well Stocked (&gt;10)</option>
              <option value="low_stock">⚠️ Low Stock (1-10)</option>
              <option value="out_of_stock">❌ Out of Stock (0)</option>
            </select>

            {/* Layout Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewLayout === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid cards layout"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewLayout === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Compact table layout"
              >
                <Box className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Active Filters Pill Bar */}
        {(selectedCategory !== 'all' || selectedVisibilityFilter !== 'all' || selectedStockFilter !== 'all' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active filters:</span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('all')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedVisibilityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                Visibility: {selectedVisibilityFilter}
                <button onClick={() => setSelectedVisibilityFilter('all')} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedStockFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                Stock: {selectedStockFilter}
                <button onClick={() => setSelectedStockFilter('all')} className="hover:text-amber-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Query: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-slate-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedVisibilityFilter('all');
                setSelectedStockFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 hover:underline font-bold ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* 5. Products Grid / Table View */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Catalog Products Match Your Filters</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Try adjusting your search query, category selection, or stock filters to display items.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedVisibilityFilter('all');
              setSelectedStockFilter('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewLayout === 'grid' ? (
        /* GRID VIEW OF PRODUCT CARDS WITH DIRECT CONTROLS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isVisibleToSimulated = simulatedMember
              ? isProductVisibleToMember(product, simulatedMember)
              : true;
            const isHiddenGlobally = product.visibilityMode === 'hidden';
            const isRestricted = product.visibilityMode === 'selected_members' || product.visibilityMode === 'exclude_members';

            return (
              <div
                key={product.id}
                id={`admin-shop-card-${product.id}`}
                className={`bg-white border rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative ${
                  isHiddenGlobally
                    ? 'border-slate-300 opacity-80 bg-slate-50/50'
                    : isRestricted
                    ? 'border-purple-200 ring-1 ring-purple-100'
                    : 'border-slate-200'
                }`}
              >
                {/* Simulation Status Badge on top if simulating */}
                {simulatedMember && (
                  <div
                    className={`px-3 py-1.5 text-[11px] font-bold flex items-center justify-between border-b ${
                      isVisibleToSimulated
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-rose-600 text-white border-rose-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isVisibleToSimulated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {isVisibleToSimulated ? `Visible for @${simulatedMember}` : `HIDDEN for @${simulatedMember}`}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider opacity-90">
                      {product.visibilityMode || 'all'}
                    </span>
                  </div>
                )}

                <div className="p-5 space-y-4">
                  {/* Card Header: SKU & Global Hide/Show Quick Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold uppercase border border-slate-200">
                        {product.sku}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        {CATEGORY_LABELS[product.category] || product.category}
                      </span>
                    </div>

                    {/* Quick Hide/Show Switch */}
                    <button
                      onClick={() => handleQuickToggleVisibility(product.id)}
                      id={`quick-toggle-visibility-${product.id}`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                        product.visibilityMode === 'hidden'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={product.visibilityMode === 'hidden' ? 'Click to make visible to members' : 'Click to hide completely from members'}
                    >
                      {product.visibilityMode === 'hidden' ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hidden</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visible</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Device Picture Section with Instant Upload Trigger */}
                  <div className="relative group rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback on broken image
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-1 p-4 text-center">
                        <Smartphone className="w-8 h-8 text-slate-300" />
                        <span className="text-[11px] font-medium text-slate-500">No device picture uploaded</span>
                      </div>
                    )}

                    {/* Overlay Button to Upload / Change Picture */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                      <button
                        onClick={() => setImageUploadModalProduct(product)}
                        id={`upload-pic-btn-${product.id}`}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload / Change Picture</span>
                      </button>
                    </div>

                    {/* Corner Picture Badge */}
                    <div className="absolute bottom-2 right-2">
                      <button
                        onClick={() => setImageUploadModalProduct(product)}
                        className="p-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-xs transition-colors"
                        title="Upload device picture"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{product.name}</h3>
                      <button
                        onClick={() => setEditProductModalProduct(product)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                        title="Edit product details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{product.description}</p>
                  </div>

                  {/* Specs Pill List */}
                  {product.specs && product.specs.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {product.specs.slice(0, 3).map((spec, idx) => (
                        <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate">{spec}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* INVENTORY STOCK CONTROL PANEL */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-blue-600" />
                        Inventory Stock Control
                      </span>
                      
                      {/* Stock Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          product.stock === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : product.stock <= 10
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : product.stock <= 10 ? `Low: ${product.stock} left` : `In Stock: ${product.stock}`}
                      </span>
                    </div>

                    {/* Numerical Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdjustStock(product.id, -10)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                        title="Decrease by 10"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => handleAdjustStock(product.id, -1)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                        title="Decrease by 1"
                      >
                        -1
                      </button>

                      <div className="flex-1 text-center">
                        <input
                          type="number"
                          id={`stock-input-${product.id}`}
                          min="0"
                          value={product.stock}
                          onChange={(e) => handleSetStock(product.id, parseInt(e.target.value, 10))}
                          className="w-full text-center py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() => handleAdjustStock(product.id, 1)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                        title="Increase by 1"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleAdjustStock(product.id, 10)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                        title="Increase by 10"
                      >
                        +10
                      </button>
                    </div>

                    {/* Stock Display Toggle Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={product.showStockToMembers !== false}
                        onChange={() => handleToggleShowStockCount(product.id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-600 select-none">
                        Show exact stock quantity to shopping members
                      </span>
                    </label>
                  </div>

                  {/* MEMBER-SPECIFIC VISIBILITY & ACCESS RULES */}
                  <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        Member Visibility Rules
                      </span>
                      <button
                        onClick={() => setMemberVisibilityModalProduct(product)}
                        id={`configure-visibility-btn-${product.id}`}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        Configure Access
                      </button>
                    </div>

                    <div className="text-xs text-slate-700">
                      {product.visibilityMode === 'hidden' && (
                        <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                          <EyeOff className="w-3.5 h-3.5 shrink-0" />
                          <span>Hidden from all registered members</span>
                        </div>
                      )}
                      {(product.visibilityMode === 'all' || !product.visibilityMode) && (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span>Visible to all registered store members</span>
                        </div>
                      )}
                      {product.visibilityMode === 'selected_members' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-purple-800 font-semibold">
                            <UserCheck className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                            <span>
                              Exclusive Whitelist: Visible to {product.allowedMembers?.length || 0} of {members.length} members
                            </span>
                          </div>
                          {product.allowedMembers && product.allowedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {product.allowedMembers.map((u) => (
                                <span key={u} className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-mono">
                                  @{u}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {product.visibilityMode === 'exclude_members' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                            <UserX className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span>
                              Blacklisted: Hidden from {product.hiddenMembers?.length || 0} selected members
                            </span>
                          </div>
                          {product.hiddenMembers && product.hiddenMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {product.hiddenMembers.map((u) => (
                                <span key={u} className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-mono">
                                  @{u}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Wholesale Price & Quick Manage Action */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Wholesale Price</span>
                    <span className="text-lg font-extrabold text-slate-900">${product.price.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMemberVisibilityModalProduct(product)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>Visibility</span>
                    </button>
                    <button
                      onClick={() => setImageUploadModalProduct(product)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Picture</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW OF PRODUCTS FOR RAPID BULK AUDITING */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Device / Item</th>
                  <th className="py-3 px-4">Category & SKU</th>
                  <th className="py-3 px-4">Wholesale Price</th>
                  <th className="py-3 px-4">Inventory Stock</th>
                  <th className="py-3 px-4">Member Stock View</th>
                  <th className="py-3 px-4">Visibility Rules</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Device Thumbnail + Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            onClick={() => setImageUploadModalProduct(product)}
                            className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer group relative"
                            title="Click to change picture"
                          >
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Smartphone className="w-5 h-5" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Upload className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{product.name}</span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs block">{product.description}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category & SKU */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-700 block">{product.sku}</span>
                        <span className="text-[10px] text-slate-400">{CATEGORY_LABELS[product.category] || product.category}</span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-sm">${product.price.toFixed(2)}</span>
                      </td>

                      {/* Stock Level with Stepper */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAdjustStock(product.id, -1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={product.stock}
                            onChange={(e) => handleSetStock(product.id, parseInt(e.target.value, 10))}
                            className="w-14 text-center font-mono font-bold py-0.5 border border-slate-300 rounded text-xs"
                          />
                          <button
                            onClick={() => handleAdjustStock(product.id, 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700"
                          >
                            +
                          </button>
                          <span
                            className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              product.stock === 0
                                ? 'bg-rose-100 text-rose-800'
                                : product.stock <= 10
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {product.stock === 0 ? 'Out' : product.stock <= 10 ? 'Low' : 'OK'}
                          </span>
                        </div>
                      </td>

                      {/* Show stock count toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleShowStockCount(product.id)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border ${
                            product.showStockToMembers !== false
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {product.showStockToMembers !== false ? 'Show Exact Qty' : 'Show In-Stock Only'}
                        </button>
                      </td>

                      {/* Visibility Rule */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuickToggleVisibility(product.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              product.visibilityMode === 'hidden'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                            title="Toggle Visibility"
                          >
                            {product.visibilityMode === 'hidden' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => setMemberVisibilityModalProduct(product)}
                            className="text-xs font-semibold text-purple-700 hover:underline"
                          >
                            {product.visibilityMode === 'hidden'
                              ? 'Hidden for all'
                              : product.visibilityMode === 'selected_members'
                              ? `Whitelist (${product.allowedMembers?.length || 0})`
                              : product.visibilityMode === 'exclude_members'
                              ? `Blacklist (${product.hiddenMembers?.length || 0})`
                              : 'Visible to all'}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setImageUploadModalProduct(product)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                        >
                          Picture
                        </button>
                        <button
                          onClick={() => setEditProductModalProduct(product)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. PICTURE UPLOAD & SELECTION MODAL */}
      {imageUploadModalProduct && (
        <DevicePictureUploadModal
          product={imageUploadModalProduct}
          onClose={() => setImageUploadModalProduct(null)}
          onSave={(newImg) => handleSaveProductImage(imageUploadModalProduct.id, newImg)}
        />
      )}

      {/* 7. MEMBER VISIBILITY & ACCESS RULES CONFIGURATION MODAL */}
      {memberVisibilityModalProduct && (
        <MemberVisibilityConfigModal
          product={memberVisibilityModalProduct}
          allMembers={members}
          onClose={() => setMemberVisibilityModalProduct(null)}
          onSave={(mode, allowed, hidden) =>
            handleSaveVisibilityRules(memberVisibilityModalProduct.id, mode, allowed, hidden)
          }
        />
      )}

      {/* 8. ADD / EDIT PRODUCT MODAL */}
      {(isNewProductModalOpen || editProductModalProduct) && (
        <ProductFormModal
          product={editProductModalProduct || undefined}
          allMembers={members}
          onClose={() => {
            setIsNewProductModalOpen(false);
            setEditProductModalProduct(null);
          }}
          onSave={(savedProduct) => {
            if (editProductModalProduct) {
              const updated = products.map((p) => (p.id === savedProduct.id ? savedProduct : p));
              handleUpdateProducts(updated, `Product "${savedProduct.name}" updated successfully.`);
            } else {
              const updated = [savedProduct, ...products];
              handleUpdateProducts(updated, `New catalog item "${savedProduct.name}" created.`);
            }
            setIsNewProductModalOpen(false);
            setEditProductModalProduct(null);
          }}
        />
      )}

    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENT: Device Picture Upload Modal                                 */
/* -------------------------------------------------------------------------- */
interface DevicePictureUploadModalProps {
  product: ProductItem;
  onClose: () => void;
  onSave: (imageUrl: string) => void;
}

const DevicePictureUploadModal: React.FC<DevicePictureUploadModalProps> = ({
  product,
  onClose,
  onSave,
}) => {
  const [selectedImage, setSelectedImage] = useState<string>(product.image || '');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (customUrlInput.trim()) {
      setSelectedImage(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Device Picture</h3>
              <p className="text-xs text-slate-500">For {product.name} ({product.sku})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Active Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-36 h-28 bg-slate-200 rounded-xl overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center relative">
              {selectedImage ? (
                <img src={selectedImage} alt="Device Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Smartphone className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <span className="text-xs font-bold text-slate-900 block">Current Picture Selection</span>
              <p className="text-xs text-slate-500">
                {selectedImage ? 'This image will be displayed on the wholesale catalog card for members.' : 'No picture assigned. Standard icon will be used.'}
              </p>
              {selectedImage && (
                <button
                  onClick={() => setSelectedImage('')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Picture
                </button>
              )}
            </div>
          </div>

          {/* Option 1: File Dropzone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Upload Local File from Device
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">
                Click to browse device photos or drag & drop here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports PNG, JPG, WEBP, SVG (Max 5MB)
              </p>
            </div>
          </div>

          {/* Option 2: Image URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. Paste Image Web URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/device-photo.jpg"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Apply URL
              </button>
            </div>
          </div>

          {/* Option 3: Presets Gallery */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              3. Choose from Stock Device Photo Library
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
              {STOCK_PRESET_IMAGES.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(preset.url)}
                  className={`border rounded-xl overflow-hidden p-1 cursor-pointer transition-all hover:scale-105 ${
                    selectedImage === preset.url ? 'border-blue-600 ring-2 ring-blue-400' : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-16 object-cover rounded-lg" referrerPolicy="no-referrer" />
                  <span className="text-[10px] text-slate-700 font-medium truncate block mt-1 text-center">{preset.name}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(selectedImage)}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Save Picture
          </button>
        </div>

      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENT: Member Visibility & Access Rules Configuration Modal        */
/* -------------------------------------------------------------------------- */
interface MemberVisibilityConfigModalProps {
  product: ProductItem;
  allMembers: TeamMember[];
  onClose: () => void;
  onSave: (mode: ProductVisibilityMode, allowed: string[], hidden: string[]) => void;
}

const MemberVisibilityConfigModal: React.FC<MemberVisibilityConfigModalProps> = ({
  product,
  allMembers,
  onClose,
  onSave,
}) => {
  const [visibilityMode, setVisibilityMode] = useState<ProductVisibilityMode>(product.visibilityMode || 'all');
  const [allowedMembers, setAllowedMembers] = useState<string[]>(product.allowedMembers || []);
  const [hiddenMembers, setHiddenMembers] = useState<string[]>(product.hiddenMembers || []);
  const [memberFilterQuery, setMemberFilterQuery] = useState('');

  const toggleMemberInList = (username: string, isAllowedList: boolean) => {
    if (isAllowedList) {
      setAllowedMembers((prev) =>
        prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
      );
    } else {
      setHiddenMembers((prev) =>
        prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
      );
    }
  };

  const handleSelectAll = (isAllowedList: boolean) => {
    const allUsernames = allMembers.map((m) => m.username);
    if (isAllowedList) {
      setAllowedMembers(allUsernames);
    } else {
      setHiddenMembers(allUsernames);
    }
  };

  const handleDeselectAll = (isAllowedList: boolean) => {
    if (isAllowedList) {
      setAllowedMembers([]);
    } else {
      setHiddenMembers([]);
    }
  };

  const filteredMemberList = allMembers.filter((m) => {
    if (!memberFilterQuery.trim()) return true;
    const q = memberFilterQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      (m.storeLocation || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Member Visibility & Access Rules</h3>
              <p className="text-xs text-slate-500">Configure who can view and shop: {product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Mode Selector Radio Cards */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Select Visibility Policy:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Visible to All */}
              <div
                onClick={() => setVisibilityMode('all')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  visibilityMode === 'all'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Visible to All Members</span>
                  </div>
                  <input
                    type="radio"
                    checked={visibilityMode === 'all'}
                    onChange={() => setVisibilityMode('all')}
                    className="text-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Every registered member and store account can view and place orders for this item.
                </p>
              </div>

              {/* Option 2: Completely Hidden */}
              <div
                onClick={() => setVisibilityMode('hidden')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  visibilityMode === 'hidden'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-slate-900">Hidden from All Members</span>
                  </div>
                  <input
                    type="radio"
                    checked={visibilityMode === 'hidden'}
                    onChange={() => setVisibilityMode('hidden')}
                    className="text-rose-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Completely hidden from shopping catalog, category search, and ordering for all members.
                </p>
              </div>

              {/* Option 3: Whitelist */}
              <div
                onClick={() => setVisibilityMode('selected_members')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  visibilityMode === 'selected_members'
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">Show to Selected Members (Whitelist)</span>
                  </div>
                  <input
                    type="radio"
                    checked={visibilityMode === 'selected_members'}
                    onChange={() => setVisibilityMode('selected_members')}
                    className="text-purple-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  ONLY the authorized members you select below will see this card when logged in.
                </p>
              </div>

              {/* Option 4: Blacklist */}
              <div
                onClick={() => setVisibilityMode('exclude_members')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  visibilityMode === 'exclude_members'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">Hide from Specific Members (Blacklist)</span>
                  </div>
                  <input
                    type="radio"
                    checked={visibilityMode === 'exclude_members'}
                    onChange={() => setVisibilityMode('exclude_members')}
                    className="text-amber-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Visible to everyone EXCEPT the specific members selected below.
                </p>
              </div>
            </div>
          </div>

          {/* Member Multi-Select Section when Whitelist or Blacklist is active */}
          {(visibilityMode === 'selected_members' || visibilityMode === 'exclude_members') && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {visibilityMode === 'selected_members'
                      ? 'Select Authorized Members (Whitelist):'
                      : 'Select Members to Hide From (Blacklist):'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {visibilityMode === 'selected_members'
                      ? `${allowedMembers.length} of ${allMembers.length} members authorized`
                      : `${hiddenMembers.length} of ${allMembers.length} members blocked`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(visibilityMode === 'selected_members')}
                    className="text-[11px] text-blue-600 hover:underline font-bold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">&bull;</span>
                  <button
                    type="button"
                    onClick={() => handleDeselectAll(visibilityMode === 'selected_members')}
                    className="text-[11px] text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter members search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberFilterQuery}
                  onChange={(e) => setMemberFilterQuery(e.target.value)}
                  placeholder="Filter members by name, username, or store location..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              {/* Members Checklist */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {filteredMemberList.map((member) => {
                  const isChecked =
                    visibilityMode === 'selected_members'
                      ? allowedMembers.includes(member.username)
                      : hiddenMembers.includes(member.username);

                  return (
                    <div
                      key={member.id}
                      onClick={() =>
                        toggleMemberInList(member.username, visibilityMode === 'selected_members')
                      }
                      className={`p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                        isChecked ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{member.name}</span>
                            <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                              @{member.username}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">{member.storeLocation || 'Store Account'}</span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        Credit: ${member.creditAllocation.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(visibilityMode, allowedMembers, hiddenMembers)}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Apply Visibility Rules
          </button>
        </div>

      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENT: Product Creation & Editing Modal                            */
/* -------------------------------------------------------------------------- */
interface ProductFormModalProps {
  product?: ProductItem;
  allMembers: TeamMember[];
  onClose: () => void;
  onSave: (product: ProductItem) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  allMembers,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || 'metro-phones');
  const [sku, setSku] = useState(product?.sku || `METRO-${Date.now().toString().slice(-4)}`);
  const [price, setPrice] = useState(product?.price?.toString() || '99.99');
  const [stock, setStock] = useState(product?.stock?.toString() || '50');
  const [description, setDescription] = useState(product?.description || '');
  const [image, setImage] = useState(product?.image || '');
  const [specsText, setSpecsText] = useState(product?.specs?.join('\n') || '5G Network\nLong-lasting Battery\nFast Charging');
  const [showStockToMembers, setShowStockToMembers] = useState(product?.showStockToMembers !== false);
  const [visibilityMode, setVisibilityMode] = useState<ProductVisibilityMode>(product?.visibilityMode || 'all');
  const [allowedMembers, setAllowedMembers] = useState<string[]>(product?.allowedMembers || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a product name.');
      return;
    }
    const specsArray = specsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newProduct: ProductItem = {
      id: product?.id || `p_${Date.now()}`,
      name: name.trim(),
      category,
      sku: sku.trim().toUpperCase(),
      price: parseFloat(price) || 0,
      stock: parseInt(stock, 10) || 0,
      description: description.trim(),
      image,
      specs: specsArray,
      showStockToMembers,
      visibilityMode,
      allowedMembers,
      hiddenMembers: product?.hiddenMembers || [],
    };

    onSave(newProduct);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {product ? 'Edit Catalog Product' : 'Add New Device / Product to Catalog'}
              </h3>
              <p className="text-xs text-slate-500">Configure name, wholesale price, inventory stock, and visibility</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Samsung Galaxy A15 5G"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="metro-phones">Metro By T-Mobile Phones</option>
                <option value="display-phones">Display Phones (Dummy Units)</option>
                <option value="sim-cards">Sim Cards</option>
                <option value="accessories">Mobile Accessories</option>
                <option value="supplies">Store Supplies & Packaging</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">SKU / Identifier *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Wholesale Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Inventory Stock Units *</label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product summary and key retail specifications..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Device Picture URL or Image Preset
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://images.unsplash.com/... or upload in settings"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {image && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Specs & Features (One per line)
            </label>
            <textarea
              rows={3}
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showStockToMembers}
                onChange={(e) => setShowStockToMembers(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <span className="text-xs text-slate-700">Display exact stock number to shopping members</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {product ? 'Save Changes' : 'Add to Catalog'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
