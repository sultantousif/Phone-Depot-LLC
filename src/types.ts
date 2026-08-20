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
  paymentCycleDays?: number;
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
  | 'shop-settings'
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
  paymentCycleDays?: number;
}

export type ProductVisibilityMode = 'all' | 'hidden' | 'selected_members' | 'exclude_members';

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
  visibilityMode?: ProductVisibilityMode;
  allowedMembers?: string[]; // List of member usernames or IDs who CAN view this item
  hiddenMembers?: string[];  // List of member usernames or IDs who CANNOT view this item
  showStockToMembers?: boolean; // Whether the exact stock number is visible to members (default true)
  isFeatured?: boolean;
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
  | 'Credited'
  | 'Updated and Approved'
  | 'Approved'
  | 'Approved with changes by Admin'
  | 'Approved by Admin'
  | 'Declined by Admin'
  | 'Ready for Member Review & Acceptance'
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
  overpackFee?: number;
  insuranceFee?: number;
  total: number;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue' | 'Credit Allocated';
  itemsModifiedByAdmin?: boolean;
  originalItems?: OrderCartItem[];
  originalSubtotal?: number;
  adminDecision?: 'approved' | 'approved_with_changes' | 'declined' | 'submitted_to_member';
  adminDeclineReason?: string;
  adminReviewedAt?: string;
  memberAcceptedAt?: string;
  notes?: string;
}

export type InvoiceTitle = 
  | 'Late Payment' 
  | 'Chargeback' 
  | 'Check Bounce' 
  | 'Low Performance Penalty' 
  | 'Good Performance Bonus' 
  | 'Miscellenous' 
  | string;

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
  paidAmount?: number;
  balanceDue?: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Processing';
  method?: string;
  notes?: string;
  creditAllocation?: number;
  remainingCreditBalance?: number;
}

export type PaymentMethodOption = 
  | 'Paid with Credit Memo'
  | 'Paid with Cash Memo'
  | 'Paid with CM'
  | 'Paid with Cash'
  | 'Paid with Check'
  | 'Paid with ACH/Wire transfer'
  | 'Credit Card'
  | 'ACH / Wire'
  | 'Company Credit'
  | 'Check'
  | string;

export interface PaymentItem {
  paymentId: string;
  invoiceNumber: string;
  orderNumber?: string;
  memberUsername?: string;
  customerName?: string;
  date: string;
  amount: number;
  method: PaymentMethodOption;
  status: 'Completed' | 'Pending' | 'Failed';
  referenceNumber?: string;
  notes?: string;
}
