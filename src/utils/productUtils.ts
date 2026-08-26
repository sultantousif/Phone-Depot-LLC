import { ProductItem, ProductVisibilityMode } from '../types';

export const STORAGE_KEY_PRODUCTS = 'distro_products';
export const PRODUCTS_UPDATED_EVENT = 'distro_products_updated';

// Curated stock device & accessory photo presets for quick selection
export const STOCK_PRESET_IMAGES = [
  {
    name: 'Samsung Galaxy Black 5G',
    category: 'metro-phones',
    url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Modern Smartphone Front & Back',
    category: 'metro-phones',
    url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Clean Stylus / Android Smartphone',
    category: 'metro-phones',
    url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'High-End Curved Screen Phone',
    category: 'metro-phones',
    url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'S24 Ultra Display Dummy Unit',
    category: 'display-phones',
    url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'iPhone Titanium Display Dummy',
    category: 'display-phones',
    url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Triple-Cut SIM Card Batch',
    category: 'sim-cards',
    url: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Wholesale Prepaid SIM Box',
    category: 'sim-cards',
    url: 'https://images.unsplash.com/photo-1562975327-2c939768a49c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'GaN Super Fast Wall Charger',
    category: 'accessories',
    url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Tempered Glass Screen Protector',
    category: 'accessories',
    url: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Heavy Duty Braided USB-C Cable',
    category: 'accessories',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Retail Store Shopping Bags',
    category: 'supplies',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'POS Receipt Thermal Paper Rolls',
    category: 'supplies',
    url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80',
  }
];

export const CATEGORY_LABELS: Record<string, string> = {
  'metro-phones': 'Metro By T-Mobile Phones',
  'display-phones': 'Display Phones (Dummy Models)',
  'sim-cards': 'Sim Cards Inventory',
  'accessories': 'Mobile Accessories',
  'supplies': 'Store Supplies & Packaging',
};

const LEGACY_SAMPLE_PRODUCT_IDS = new Set([
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13'
]);

/**
 * Loads products from localStorage, filtering out legacy hardcoded samples
 */
export function loadStoredProducts(): ProductItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any legacy hardcoded mock products so only newly created products remain
      const cleanList = parsed.filter((p) => !LEGACY_SAMPLE_PRODUCT_IDS.has(p.id));
      if (cleanList.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(cleanList));
      }
      // Ensure all objects conform to latest structure
      return cleanList.map((p) => ({
        ...p,
        visibilityMode: p.visibilityMode || 'all',
        allowedMembers: Array.isArray(p.allowedMembers) ? p.allowedMembers : [],
        hiddenMembers: Array.isArray(p.hiddenMembers) ? p.hiddenMembers : [],
        showStockToMembers: p.showStockToMembers !== undefined ? p.showStockToMembers : true,
        image: p.image || '',
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to load products from localStorage:', err);
    return [];
  }
}

/**
 * Saves products to localStorage and notifies all components
 */
export function saveStoredProducts(products: ProductItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent(PRODUCTS_UPDATED_EVENT, { detail: products }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to save products to localStorage:', err);
  }
}

/**
 * Checks whether a product should be visible to a specific member based on login / username
 */
export function isProductVisibleToMember(
  product: ProductItem,
  username?: string,
  memberId?: string
): boolean {
  if (!product) return false;

  // 1. If product is completely hidden for all members
  const mode: ProductVisibilityMode = product.visibilityMode || 'all';
  if (mode === 'hidden') {
    return false;
  }

  // If no username is provided (e.g. public/unauthenticated view preview)
  if (!username && !memberId) {
    return mode === 'all';
  }

  const cleanUser = username?.trim().toLowerCase() || '';
  const cleanId = memberId?.trim().toLowerCase() || '';

  // 2. If product is restricted to SELECTED members only (whitelist)
  if (mode === 'selected_members') {
    const allowed = (product.allowedMembers || []).map((m) => m.trim().toLowerCase());
    if (allowed.length === 0) return false; // If nobody selected in whitelist, hidden by default
    return allowed.includes(cleanUser) || (cleanId ? allowed.includes(cleanId) : false);
  }

  // 3. If product is HIDDEN from specific members (blacklist)
  if (mode === 'exclude_members') {
    const hidden = (product.hiddenMembers || []).map((m) => m.trim().toLowerCase());
    if (hidden.includes(cleanUser) || (cleanId && hidden.includes(cleanId))) {
      return false;
    }
    return true;
  }

  // 4. Default: 'all' -> visible to all members
  return true;
}
