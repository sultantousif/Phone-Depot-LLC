import { ProductItem, OrderItem, InvoiceItem, PaymentItem, TeamMember } from '../types';

export const SAMPLE_PRODUCTS: ProductItem[] = [
  // Metro By T-Mobile Phones
  {
    id: 'p1',
    name: 'Samsung Galaxy A15 5G (Metro)',
    category: 'metro-phones',
    sku: 'METRO-SAM-A15',
    price: 139.99,
    stock: 42,
    description: '6.5" Super AMOLED 90Hz Display, 50MP Triple Camera, 128GB Storage',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80',
    specs: ['5000 mAh Battery', '5G Network', '128GB ROM / 4GB RAM'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p2',
    name: 'Motorola Moto G Stylus 5G (Metro)',
    category: 'metro-phones',
    sku: 'METRO-MOT-STY5G',
    price: 159.99,
    stock: 28,
    description: 'Built-in Stylus, 50MP Camera system with OIS, 120Hz FHD+ Display',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
    specs: ['Built-in Stylus', '5000 mAh Battery', '256GB Storage'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p3',
    name: 'T-Mobile REVVL 7 5G',
    category: 'metro-phones',
    sku: 'METRO-TMO-REV7',
    price: 119.99,
    stock: 65,
    description: '6.58" HD+ Display, 50MP dual camera, long-lasting battery life',
    image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80',
    specs: ['5G Connectivity', 'Face Unlock', 'Clean Android UI'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p4',
    name: 'Samsung Galaxy A25 5G',
    category: 'metro-phones',
    sku: 'METRO-SAM-A25',
    price: 189.99,
    stock: 19,
    description: '120Hz Super AMOLED, Stereo Speakers, Vision Booster Technology',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
    specs: ['6.5" FHD+ Screen', '4K Video Recording', '128GB Storage'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },

  // Display Phones (Dummy / Demo Units)
  {
    id: 'p5',
    name: 'Samsung S24 Ultra Acrylic Display Dummy',
    category: 'display-phones',
    sku: 'DISP-SAM-S24U',
    price: 24.99,
    stock: 150,
    description: 'Non-working retail display model with realistic weight and screen decal',
    image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80',
    specs: ['1:1 Scale', 'Metal Frame', 'Security Tether Compatible'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p6',
    name: 'iPhone 15 Pro Max Store Display Unit',
    category: 'display-phones',
    sku: 'DISP-APL-15PM',
    price: 29.99,
    stock: 80,
    description: 'Full titanium feel 1:1 dummy unit for retail counter displays',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
    specs: ['1:1 Scale', 'Titanium Finish', 'Dummy Glass Screen'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },

  // Sim Cards
  {
    id: 'p7',
    name: 'Metro by T-Mobile Triple-Cut SIM Card (Pack of 10)',
    category: 'sim-cards',
    sku: 'SIM-METRO-10PK',
    price: 25.00,
    stock: 320,
    description: 'Pre-activated batch triple-cut SIM cards (Standard, Micro, Nano)',
    image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=600&q=80',
    specs: ['5G / LTE Compatible', 'Universal Slot', 'Batch Barcode Ready'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p8',
    name: 'T-Mobile Wholesale Pre-Paid SIM Card (Pack of 50)',
    category: 'sim-cards',
    sku: 'SIM-TMO-50PK',
    price: 95.00,
    stock: 110,
    description: 'Bulk store supply pre-paid SIM cards for high-volume dealers',
    image: 'https://images.unsplash.com/photo-1562975327-2c939768a49c?auto=format&fit=crop&w=600&q=80',
    specs: ['50 Units Box', 'Retail Ready', 'Universal ID Tagging'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },

  // Accessories
  {
    id: 'p9',
    name: '30W USB-C Super Fast Wall Charger Block',
    category: 'accessories',
    sku: 'ACC-CHG-30W',
    price: 8.50,
    stock: 500,
    description: 'Compact GaN fast charging block with Power Delivery 3.0',
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    specs: ['30W Output', 'UL Certified', 'Overheat Protection'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p10',
    name: 'Premium Tempered Glass Screen Protector (Bulk 20-Pack)',
    category: 'accessories',
    sku: 'ACC-GLASS-20',
    price: 18.00,
    stock: 240,
    description: '9H Hardness scratch resistant glass for popular Samsung/iPhone models',
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80',
    specs: ['Oleophobic Coating', 'Case Friendly', 'Alignment Tray Included'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p11',
    name: 'Braided Nylon USB-C to USB-C Cable 6ft',
    category: 'accessories',
    sku: 'ACC-CABL-6FT',
    price: 4.25,
    stock: 650,
    description: 'Durable 6-foot heavy duty braided cable supporting 60W charging',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    specs: ['Heavy Nylon Braid', 'Reinforced Neck', 'High Speed Data Transfer'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },

  // Supplies
  {
    id: 'p12',
    name: 'Metro Branded Shopping Bags (Pack of 100)',
    category: 'supplies',
    sku: 'SUP-BAG-100',
    price: 14.99,
    stock: 85,
    description: 'Retail counter plastic bags with reinforced handle cutouts',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    specs: ['100 Count', 'Official Branding', 'Heavy-Duty Film'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  },
  {
    id: 'p13',
    name: 'Receipt Thermal Paper Rolls 3-1/8" x 230\' (50 Box)',
    category: 'supplies',
    sku: 'SUP-PAP-50',
    price: 48.00,
    stock: 40,
    description: 'BPA-free high sensitivity thermal paper rolls for POS printers',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80',
    specs: ['50 Rolls Box', 'BPA Free', 'End-of-roll warning stripe'],
    visibilityMode: 'all',
    allowedMembers: [],
    hiddenMembers: [],
    showStockToMembers: true
  }
];

export const SAMPLE_ORDERS: OrderItem[] = [];

export const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 'mem-101',
    name: 'John Martinez',
    email: 'john.martinez@metrowireless.com',
    username: 'johnmartinez',
    role: 'Store Manager',
    storeLocation: 'Metro Wireless Store #104 - San Francisco, CA',
    businessAddress: '1044 Market St, San Francisco, CA 94102',
    businessAddressDetails: {
      street: '1044 Market St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'USA'
    },
    phone: '(415) 555-0142',
    status: 'Active',
    dateAdded: '2026-01-15',
    permissions: ['place-order', 'view-invoices', 'make-payments', 'view-inventory'],
    creditAllocation: 10000,
  },
  {
    id: 'mem-102',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@primecellular.com',
    username: 'sarahj',
    role: 'Inventory Specialist',
    storeLocation: 'Metro Prime Cellular Store #208 - San Jose, CA',
    businessAddress: '742 Evergreen Terrace, San Jose, CA 95112',
    businessAddressDetails: {
      street: '742 Evergreen Terrace',
      city: 'San Jose',
      state: 'CA',
      zip: '95112',
      country: 'USA'
    },
    phone: '(408) 555-0198',
    status: 'Active',
    dateAdded: '2026-02-01',
    permissions: ['place-order', 'view-inventory'],
    creditAllocation: 10000,
  },
  {
    id: 'mem-103',
    name: 'Michael Chang',
    email: 'm.chang@bayareahub.com',
    username: 'michaelc',
    role: 'Store Manager',
    storeLocation: 'Bay Area Mobile Hub - Oakland, CA',
    businessAddress: '888 Broadway, Oakland, CA 94607',
    businessAddressDetails: {
      street: '888 Broadway',
      city: 'Oakland',
      state: 'CA',
      zip: '94607',
      country: 'USA'
    },
    phone: '(510) 555-0167',
    status: 'Active',
    dateAdded: '2026-02-18',
    permissions: ['place-order', 'view-invoices', 'make-payments', 'view-inventory'],
    creditAllocation: 10000,
  },
  {
    id: 'mem-104',
    name: 'Elena Torres',
    email: 'elena.torres@pacificdealer.com',
    username: 'elenat',
    role: 'Billing Administrator',
    storeLocation: 'Pacific Dealer Network Store #402 - Santa Cruz, CA',
    businessAddress: '1200 Pacific Ave, Santa Cruz, CA 95060',
    businessAddressDetails: {
      street: '1200 Pacific Ave',
      city: 'Santa Cruz',
      state: 'CA',
      zip: '95060',
      country: 'USA'
    },
    phone: '(831) 555-0133',
    status: 'Active',
    dateAdded: '2026-03-05',
    permissions: ['place-order', 'view-invoices', 'make-payments'],
    creditAllocation: 10000,
  }
];

export const SAMPLE_INVOICES: InvoiceItem[] = [
  {
    invoiceNumber: 'INV-2026-8491',
    orderNumber: 'REF-LP-2041',
    title: 'Late Payment',
    memberId: 'mem-101',
    memberUsername: 'johnmartinez',
    customerName: 'John Martinez (Metro Wireless Store #104)',
    billedTo: 'John Martinez (Metro Wireless Store #104)',
    date: '2026-08-01',
    dueDate: '2026-08-16',
    amount: 150.00,
    status: 'Unpaid',
    method: 'ACH Transfer',
    notes: 'Late settlement fee assessed for overdue statement INV-2026-7201'
  },
  {
    invoiceNumber: 'INV-2026-7910',
    orderNumber: 'ORD-2026-3842',
    title: 'Miscellenous',
    memberId: 'mem-102',
    memberUsername: 'sarahj',
    customerName: 'Sarah Jenkins (Metro Prime Cellular Store #208)',
    billedTo: 'Sarah Jenkins (Metro Prime Cellular Store #208)',
    date: '2026-07-28',
    dueDate: '2026-08-12',
    amount: 425.50,
    status: 'Paid',
    method: 'Company Credit',
    notes: 'Restocking and expedited warehouse courier freight fee'
  },
  {
    invoiceNumber: 'INV-2026-6824',
    orderNumber: 'REF-CB-9021',
    title: 'Chargeback',
    memberId: 'mem-103',
    memberUsername: 'michaelc',
    customerName: 'Michael Chang (Bay Area Mobile Hub)',
    billedTo: 'Michael Chang (Bay Area Mobile Hub)',
    date: '2026-07-20',
    dueDate: '2026-08-04',
    amount: 280.00,
    status: 'Unpaid',
    method: 'ACH Transfer',
    notes: 'Dispute chargeback handling and administrative reversal fee'
  }
];

export const SAMPLE_PAYMENTS: PaymentItem[] = [
  {
    paymentId: 'PAY-2026-9104',
    invoiceNumber: 'INV-2026-7910',
    memberUsername: 'sarahj',
    customerName: 'Sarah Jenkins',
    date: '2026-07-30',
    amount: 425.50,
    method: 'Company Credit',
    status: 'Completed'
  }
];


