export type UserRole = 'admin' | 'member' | null;

export interface User {
  username: string;
  role: 'admin' | 'member';
  name: string;
  memberId?: string;
  email?: string;
  phone?: string;
  storeLocation?: string;
  businessAddress?: string;
  creditAllocation?: number;
}

export type AdminView = 
  | 'home'
  // My Account
  | 'invoices'
  | 'payments'
  | 'invoices-search'
  | 'payment-search'
  | 'add-member'
  | 'manage-members'
  // My Orders
  | 'place-new-order'
  | 'view-previous-order'
  | 'view-open-order'
  | 'search-order'
  // Shopping
  | 'metro-phones'
  | 'display-phones'
  | 'sim-cards'
  | 'accessories'
  | 'supplies';

export type MemberView =
  | 'home'
  // My Account
  | 'invoices'
  | 'payments'
  | 'invoices-search'
  | 'payment-search'
  // My Orders
  | 'place-new-order'
  | 'view-previous-order'
  | 'view-open-order'
  | 'search-order'
  // Shopping
  | 'metro-phones'
  | 'display-phones'
  | 'sim-cards'
  | 'accessories'
  | 'supplies';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  username: string;
  tempUsername?: string;
  tempPassword?: string;
  isTempUsername?: boolean;
  isTempPassword?: boolean;
  tempPasswordExpire?: string;
  mustResetPassword?: boolean;
  role: 'Store Manager' | 'Inventory Specialist' | 'Sales Representative' | 'Billing Administrator' | 'Associate';
  storeLocation?: string;
  businessAddress?: string;
  businessAddressDetails?: {
    street: string;
    suite?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  phone: string;
  status: 'Active' | 'Pending Activation' | 'Suspended';
  dateAdded: string;
  permissions: string[];
  creditAllocation: number;
}

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  stock: number;
  description: string;
  image?: string;
  specs?: string[];
}

export interface OrderCartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
}

export type OrderStatus =
  | 'Pending review and approval by Admin'
  | 'Ready for Member Review & Acceptance'
  | 'Declined by Admin'
  | 'Open'
  | 'Processing'
  | 'Approved & Processing'
  | 'Completed'
  | 'Shipped'
  | 'Cancelled';

export interface OrderItem {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  customerName: string;
  memberId?: string;
  memberUsername?: string;
  destinationAddress?: string;
  businessAddress?: string;
  items?: OrderCartItem[];
  itemsCount: number;
  subtotal: number;
  shippingFee?: number;
  salesTax?: number;
  serviceTax?: number;
  total: number;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue' | 'Credit Allocated';
  adminDecision?: 'submitted_to_member' | 'declined';
  adminDeclineReason?: string;
  adminReviewedAt?: string;
  memberAcceptedAt?: string;
  notes?: string;
}

export type InvoiceTitle = 'Late Payment' | 'Chargeback' | 'Check Bounce' | 'Miscellenous' | string;

export interface InvoiceItem {
  invoiceNumber: string;
  orderNumber: string;
  title?: InvoiceTitle;
  memberId?: string;
  memberUsername?: string;
  customerName?: string;
  billedTo?: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Processing';
  method?: string;
  notes?: string;
}

export interface PaymentItem {
  paymentId: string;
  invoiceNumber: string;
  memberUsername?: string;
  customerName?: string;
  date: string;
  amount: number;
  method: 'Credit Card' | 'ACH / Wire' | 'Company Credit' | 'Check';
  status: 'Completed' | 'Pending' | 'Failed';
}
