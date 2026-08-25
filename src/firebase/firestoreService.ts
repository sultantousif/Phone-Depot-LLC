import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { ProductItem, OrderItem, InvoiceItem, PaymentItem, TeamMember, AdminAccount } from '../types';
import { 
  SAMPLE_PRODUCTS, 
  SAMPLE_ORDERS, 
  SAMPLE_INVOICES, 
  SAMPLE_PAYMENTS, 
  INITIAL_MEMBERS,
  INITIAL_ADMINS
} from '../data/sampleData';

// Collection references
const PRODUCTS_COL = 'products';
const ORDERS_COL = 'orders';
const INVOICES_COL = 'invoices';
const PAYMENTS_COL = 'payments';
const MEMBERS_COL = 'members';
const ADMINS_COL = 'admins';
const SETTINGS_COL = 'shopSettings';

// Initialize and seed Firestore if empty
export async function initializeFirestoreData() {
  try {
    const productsSnap = await getDocs(collection(db, PRODUCTS_COL));
    if (productsSnap.empty) {
      console.log('Seeding initial Firestore products...');
      const batch = writeBatch(db);
      SAMPLE_PRODUCTS.forEach((prod) => {
        const ref = doc(db, PRODUCTS_COL, prod.id);
        batch.set(ref, prod);
      });
      await batch.commit();
    }

    const ordersSnap = await getDocs(collection(db, ORDERS_COL));
    if (ordersSnap.empty && SAMPLE_ORDERS.length > 0) {
      console.log('Seeding initial Firestore orders...');
      const batch = writeBatch(db);
      SAMPLE_ORDERS.forEach((order) => {
        const ref = doc(db, ORDERS_COL, order.id);
        batch.set(ref, order);
      });
      await batch.commit();
    }

    const invoicesSnap = await getDocs(collection(db, INVOICES_COL));
    if (invoicesSnap.empty) {
      console.log('Seeding initial Firestore invoices...');
      const batch = writeBatch(db);
      SAMPLE_INVOICES.forEach((inv) => {
        const ref = doc(db, INVOICES_COL, inv.invoiceNumber);
        batch.set(ref, inv);
      });
      await batch.commit();
    }

    const paymentsSnap = await getDocs(collection(db, PAYMENTS_COL));
    if (paymentsSnap.empty) {
      console.log('Seeding initial Firestore payments...');
      const batch = writeBatch(db);
      SAMPLE_PAYMENTS.forEach((pmt) => {
        const ref = doc(db, PAYMENTS_COL, pmt.paymentId);
        batch.set(ref, pmt);
      });
      await batch.commit();
    }

    const membersSnap = await getDocs(collection(db, MEMBERS_COL));
    if (membersSnap.empty) {
      console.log('Seeding initial Firestore members...');
      const batch = writeBatch(db);
      INITIAL_MEMBERS.forEach((mem) => {
        const ref = doc(db, MEMBERS_COL, mem.id);
        batch.set(ref, mem);
      });
      await batch.commit();
    }

    const adminsSnap = await getDocs(collection(db, ADMINS_COL));
    if (adminsSnap.empty && INITIAL_ADMINS.length > 0) {
      console.log('Seeding initial Firestore admins...');
      const batch = writeBatch(db);
      INITIAL_ADMINS.forEach((adm) => {
        const ref = doc(db, ADMINS_COL, adm.id);
        batch.set(ref, adm);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error during initial Firestore seeding:', error);
    // Non-blocking, fallback gracefully
  }
}

// ---------------- Realtime Listeners ----------------

export function subscribeToProducts(callback: (products: ProductItem[]) => void) {
  const colRef = collection(db, PRODUCTS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const prods: ProductItem[] = [];
      snapshot.forEach((docSnap) => {
        prods.push({ id: docSnap.id, ...docSnap.data() } as ProductItem);
      });
      if (prods.length > 0) {
        callback(prods);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PRODUCTS_COL);
    }
  );
}

export function subscribeToOrders(callback: (orders: OrderItem[]) => void) {
  const colRef = collection(db, ORDERS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const ords: OrderItem[] = [];
      snapshot.forEach((docSnap) => {
        ords.push({ id: docSnap.id, ...docSnap.data() } as OrderItem);
      });
      if (ords.length > 0) {
        callback(ords);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ORDERS_COL);
    }
  );
}

export function subscribeToInvoices(callback: (invoices: InvoiceItem[]) => void) {
  const colRef = collection(db, INVOICES_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const invs: InvoiceItem[] = [];
      snapshot.forEach((docSnap) => {
        invs.push({ ...docSnap.data() } as InvoiceItem);
      });
      if (invs.length > 0) {
        callback(invs);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, INVOICES_COL);
    }
  );
}

export function subscribeToPayments(callback: (payments: PaymentItem[]) => void) {
  const colRef = collection(db, PAYMENTS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const pmts: PaymentItem[] = [];
      snapshot.forEach((docSnap) => {
        pmts.push({ ...docSnap.data() } as PaymentItem);
      });
      if (pmts.length > 0) {
        callback(pmts);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PAYMENTS_COL);
    }
  );
}

export function subscribeToMembers(callback: (members: TeamMember[]) => void) {
  const colRef = collection(db, MEMBERS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const mems: TeamMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        mems.push({
          id: docSnap.id,
          name: data.name || 'Member Store',
          email: data.email || '',
          username: data.username || data.tempUsername || docSnap.id.toLowerCase(),
          tempUsername: data.tempUsername || data.username,
          tempPassword: data.tempPassword || data.password || 'metro2026',
          password: data.password || data.tempPassword,
          authMethod: data.authMethod || 'password',
          role: data.role || 'Store Manager',
          storeLocation: data.storeLocation || 'Store Location',
          businessAddress: data.businessAddress || '',
          businessAddressDetails: data.businessAddressDetails,
          phone: data.phone || '',
          status: (data.status || 'Active') as 'Active' | 'Pending Activation' | 'Suspended',
          dateAdded: data.dateAdded || new Date().toISOString().split('T')[0],
          permissions: Array.isArray(data.permissions) ? data.permissions : ['place-order', 'view-invoices'],
          creditAllocation: typeof data.creditAllocation === 'number' ? data.creditAllocation : 10000,
          paymentCycleDays: typeof data.paymentCycleDays === 'number' ? data.paymentCycleDays : 14,
        } as TeamMember);
      });
      callback(mems);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, MEMBERS_COL);
    }
  );
}

export function subscribeToAdmins(callback: (admins: AdminAccount[]) => void) {
  const colRef = collection(db, ADMINS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const adms: AdminAccount[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        adms.push({
          id: docSnap.id,
          name: data.name || 'Administrator',
          email: data.email || '',
          username: data.username || docSnap.id.toLowerCase(),
          phone: data.phone || '',
          adminLevel: (data.adminLevel || data.role || 'Operations Admin') as AdminAccount['adminLevel'],
          role: data.role || data.adminLevel || 'Operations Admin',
          status: (data.status || 'Active') as 'Active' | 'Suspended',
          dateAdded: data.dateAdded || data.createdAt || new Date().toISOString().split('T')[0],
          permissions: Array.isArray(data.permissions) && data.permissions.length > 0
            ? data.permissions
            : ['Full Administrative Access', 'Approve & Modify Orders', 'Manage Product Catalog & Stock'],
          tempPassword: data.tempPassword || data.password || 'admin',
          password: data.password || data.tempPassword,
          authMethod: data.authMethod || 'password',
          notes: data.notes || '',
        } as AdminAccount);
      });
      callback(adms);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ADMINS_COL);
    }
  );
}

export async function fetchAdminsFromFirestore(): Promise<AdminAccount[]> {
  try {
    const snap = await getDocs(collection(db, ADMINS_COL));
    const adms: AdminAccount[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      adms.push({
        id: docSnap.id,
        name: data.name || 'Administrator',
        email: data.email || '',
        username: data.username || docSnap.id.toLowerCase(),
        phone: data.phone || '',
        adminLevel: (data.adminLevel || data.role || 'Operations Admin') as AdminAccount['adminLevel'],
        role: data.role || data.adminLevel || 'Operations Admin',
        status: (data.status || 'Active') as 'Active' | 'Suspended',
        dateAdded: data.dateAdded || data.createdAt || new Date().toISOString().split('T')[0],
        permissions: Array.isArray(data.permissions) && data.permissions.length > 0
          ? data.permissions
          : ['Full Administrative Access', 'Approve & Modify Orders', 'Manage Product Catalog & Stock'],
        tempPassword: data.tempPassword || data.password || 'admin',
        password: data.password || data.tempPassword,
        authMethod: data.authMethod || 'password',
        notes: data.notes || '',
      } as AdminAccount);
    });
    return adms;
  } catch (err) {
    console.error('Error fetching admins from Firestore:', err);
    return [];
  }
}

export async function fetchMembersFromFirestore(): Promise<TeamMember[]> {
  try {
    const snap = await getDocs(collection(db, MEMBERS_COL));
    const mems: TeamMember[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      mems.push({
        id: docSnap.id,
        name: data.name || 'Member Store',
        email: data.email || '',
        username: data.username || data.tempUsername || docSnap.id.toLowerCase(),
        tempUsername: data.tempUsername || data.username,
        tempPassword: data.tempPassword || data.password || 'metro2026',
        password: data.password || data.tempPassword,
        authMethod: data.authMethod || 'password',
        role: data.role || 'Store Manager',
        storeLocation: data.storeLocation || 'Store Location',
        businessAddress: data.businessAddress || '',
        businessAddressDetails: data.businessAddressDetails,
        phone: data.phone || '',
        status: (data.status || 'Active') as 'Active' | 'Pending Activation' | 'Suspended',
        dateAdded: data.dateAdded || new Date().toISOString().split('T')[0],
        permissions: Array.isArray(data.permissions) ? data.permissions : ['place-order', 'view-invoices'],
        creditAllocation: typeof data.creditAllocation === 'number' ? data.creditAllocation : 10000,
        paymentCycleDays: typeof data.paymentCycleDays === 'number' ? data.paymentCycleDays : 14,
      } as TeamMember);
    });
    return mems;
  } catch (err) {
    console.error('Error fetching members from Firestore:', err);
    return [];
  }
}

// ---------------- Firestore Mutations ----------------

// Products
export async function saveProductToFirestore(product: ProductItem) {
  try {
    const ref = doc(db, PRODUCTS_COL, product.id);
    await setDoc(ref, product, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COL}/${product.id}`);
  }
}

export async function deleteProductFromFirestore(productId: string) {
  try {
    const ref = doc(db, PRODUCTS_COL, productId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COL}/${productId}`);
  }
}

// Orders
export async function saveOrderToFirestore(order: OrderItem) {
  try {
    const ref = doc(db, ORDERS_COL, order.id);
    await setDoc(ref, order, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ORDERS_COL}/${order.id}`);
  }
}

export async function updateOrderStatusInFirestore(orderId: string, updates: Partial<OrderItem>) {
  try {
    const ref = doc(db, ORDERS_COL, orderId);
    await updateDoc(ref, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COL}/${orderId}`);
  }
}

// Invoices
export async function saveInvoiceToFirestore(invoice: InvoiceItem) {
  try {
    const ref = doc(db, INVOICES_COL, invoice.invoiceNumber);
    await setDoc(ref, invoice, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${INVOICES_COL}/${invoice.invoiceNumber}`);
  }
}

// Payments
export async function savePaymentToFirestore(payment: PaymentItem) {
  try {
    const ref = doc(db, PAYMENTS_COL, payment.paymentId);
    await setDoc(ref, payment, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PAYMENTS_COL}/${payment.paymentId}`);
  }
}

// Members
export async function saveMemberToFirestore(member: TeamMember) {
  try {
    const ref = doc(db, MEMBERS_COL, member.id);
    await setDoc(ref, member, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMBERS_COL}/${member.id}`);
  }
}

export async function deleteMemberFromFirestore(memberId: string) {
  try {
    const ref = doc(db, MEMBERS_COL, memberId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MEMBERS_COL}/${memberId}`);
  }
}

// Admins
export async function saveAdminToFirestore(admin: AdminAccount) {
  try {
    const ref = doc(db, ADMINS_COL, admin.id);
    await setDoc(ref, admin, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ADMINS_COL}/${admin.id}`);
  }
}

export async function deleteAdminFromFirestore(adminId: string) {
  try {
    const ref = doc(db, ADMINS_COL, adminId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ADMINS_COL}/${adminId}`);
  }
}

