import { ProductItem, OrderItem, InvoiceItem, PaymentItem, TeamMember, AdminAccount } from '../types';

export const SAMPLE_PRODUCTS: ProductItem[] = [];

export const SAMPLE_ORDERS: OrderItem[] = [];

export const INITIAL_MEMBERS: TeamMember[] = [];

export const SAMPLE_INVOICES: InvoiceItem[] = [];

export const SAMPLE_PAYMENTS: PaymentItem[] = [];

export const INITIAL_ADMINS: AdminAccount[] = [
  {
    id: 'ADM-1001',
    name: 'Super Administrator',
    email: 'admin@hgwcwportal.com',
    username: 'admin',
    phone: '(800) 555-0199',
    adminLevel: 'Super Admin',
    status: 'Active',
    dateAdded: '2026-01-01',
    permissions: [
      'Full Administrative Access',
      'Manage Members & Credit Limits',
      'Approve & Modify Orders',
      'Issue Invoices & Debit/Credit Memos',
      'Manage Product Catalog & Stock',
      'Add & Manage Admin Accounts',
      'Master Shop Settings'
    ],
    tempPassword: 'admin',
    notes: 'Primary Master System Administrator with unrestricted access.'
  },
  {
    id: 'ADM-1004',
    name: 'Tousif Sultan',
    email: 'sultantousif@gmail.com',
    username: 'stousif',
    phone: '(800) 555-0199',
    adminLevel: 'Super Admin',
    status: 'Active',
    dateAdded: '2026-01-01',
    permissions: [
      'Full Administrative Access',
      'Manage Members & Credit Limits',
      'Approve & Modify Orders',
      'Issue Invoices & Debit/Credit Memos',
      'Manage Product Catalog & Stock',
      'Add & Manage Admin Accounts',
      'Master Shop Settings'
    ],
    tempPassword: 'admin',
    notes: 'Super Administrator account.'
  }
];




