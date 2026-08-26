import {
  collection,
  collectionGroup,
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
import { ProductItem, ProductVisibilityMode, OrderItem, InvoiceItem, PaymentItem, TeamMember, AdminAccount } from '../types';
import { 
  SAMPLE_ORDERS,
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

// Initialize and seed Firestore if empty / remove legacy mock records
export async function initializeFirestoreData() {
  try {
    // Remove legacy hardcoded sample products (p1..p13) from Firestore if previously present
    const legacyProductIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13'];
    for (const prodId of legacyProductIds) {
      try {
        await deleteDoc(doc(db, PRODUCTS_COL, prodId));
      } catch {
        // ignore
      }
    }

    const ordersSnap = await getDocs(collection(db, ORDERS_COL));
    if (ordersSnap.empty && SAMPLE_ORDERS.length > 0) {
      const batch = writeBatch(db);
      SAMPLE_ORDERS.forEach((order) => {
        const ref = doc(db, ORDERS_COL, order.id);
        batch.set(ref, order);
      });
      await batch.commit();
    }

    // Clean legacy mock invoices if they were previously seeded into Firestore
    const legacyMockInvoiceNumbers = ['INV-2026-8491', 'INV-2026-7910', 'INV-2026-6824'];
    for (const invNum of legacyMockInvoiceNumbers) {
      try {
        await deleteDoc(doc(db, INVOICES_COL, invNum));
      } catch {
        // ignore if not present
      }
    }

    // Clean legacy mock payments if previously seeded
    const legacyMockPaymentIds = ['PAY-2026-9104'];
    for (const pmtId of legacyMockPaymentIds) {
      try {
        await deleteDoc(doc(db, PAYMENTS_COL, pmtId));
      } catch {
        // ignore if not present
      }
    }

    // Clean legacy mock members if previously seeded
    const legacyMockMemberIds = ['mem-101', 'mem-102', 'mem-103', 'mem-104'];
    for (const memId of legacyMockMemberIds) {
      try {
        await deleteDoc(doc(db, MEMBERS_COL, memId));
      } catch {
        // ignore if not present
      }
    }

    // Clean legacy fictional admins
    const legacyMockAdminIds = ['ADM-1002', 'ADM-1003'];
    for (const admId of legacyMockAdminIds) {
      try {
        await deleteDoc(doc(db, ADMINS_COL, admId));
      } catch {
        // ignore if not present
      }
    }

    // Clean any orphaned test orders/invoices for Zoheb Akram or amount 799.92
    try {
      await purgeMemberOrdersAndInvoicesFromFirestore({
        username: 'zoheb.hg',
        tempUsername: 'zoheb.hg',
        name: 'Zoheb Akram',
        email: 'akram@hgworldclass.com',
      });
    } catch (e) {
      console.warn('Initial member cleanup check:', e);
    }

    const adminsSnap = await getDocs(collection(db, ADMINS_COL));
    if (adminsSnap.empty && INITIAL_ADMINS.length > 0) {
      console.log('Seeding primary Firestore admins...');
      const batch = writeBatch(db);
      INITIAL_ADMINS.forEach((adm) => {
        const ref = doc(db, ADMINS_COL, adm.id);
        batch.set(ref, adm);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error during initial Firestore setup:', error);
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
      callback(prods);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PRODUCTS_COL);
    }
  );
}

export function subscribeToOrders(callback: (orders: OrderItem[]) => void) {
  let isUnsubscribed = false;
  let groupOrdersMap = new Map<string, OrderItem>();
  let topOrdersMap = new Map<string, OrderItem>();

  const emit = () => {
    if (isUnsubscribed) return;
    const combined = new Map<string, OrderItem>();
    topOrdersMap.forEach((val, key) => combined.set(key, val));
    groupOrdersMap.forEach((val, key) => combined.set(key, val));
    callback(Array.from(combined.values()));
  };

  // 1. Subscribe to collectionGroup('orders') across all members
  let unsubGroup: (() => void) | null = null;
  try {
    unsubGroup = onSnapshot(
      collectionGroup(db, ORDERS_COL),
      (snapshot) => {
        const nextGroup = new Map<string, OrderItem>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrderItem;
          const id = docSnap.id || data.id;
          if (id) {
            nextGroup.set(id, { ...data, id });
          }
        });
        groupOrdersMap = nextGroup;
        emit();
      },
      (error) => {
        console.warn('CollectionGroup orders subscription fallback note:', error);
      }
    );
  } catch (err) {
    console.warn('Could not initialize collectionGroup listener:', err);
  }

  // 2. Subscribe to top-level orders collection
  const unsubTop = onSnapshot(
    collection(db, ORDERS_COL),
    (snapshot) => {
      const nextTop = new Map<string, OrderItem>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as OrderItem;
        const id = docSnap.id || data.id;
        if (id) {
          nextTop.set(id, { ...data, id });
        }
      });
      topOrdersMap = nextTop;
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ORDERS_COL);
    }
  );

  return () => {
    isUnsubscribed = true;
    if (unsubGroup) unsubGroup();
    unsubTop();
  };
}

export function subscribeToMemberOrders(memberId: string, callback: (orders: OrderItem[]) => void) {
  if (!memberId) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, MEMBERS_COL, memberId, ORDERS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const ords: OrderItem[] = [];
      snapshot.forEach((docSnap) => {
        ords.push({ id: docSnap.id, ...docSnap.data() } as OrderItem);
      });
      callback(ords);
    },
    (error) => {
      console.error(`Error subscribing to orders for member ${memberId}:`, error);
      handleFirestoreError(error, OperationType.GET, `${MEMBERS_COL}/${memberId}/${ORDERS_COL}`);
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
      callback(invs);
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
      callback(pmts);
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
          tempPassword: data.tempPassword || data.password || 'Metro2026!',
          password: data.password || data.tempPassword || 'Metro2026!',
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
        tempPassword: data.tempPassword || data.password || 'Metro2026!',
        password: data.password || data.tempPassword || 'Metro2026!',
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

export async function fetchMemberOrdersFromFirestore(memberId: string): Promise<OrderItem[]> {
  if (!memberId) return [];
  try {
    const colRef = collection(db, MEMBERS_COL, memberId, ORDERS_COL);
    const snap = await getDocs(colRef);
    const ords: OrderItem[] = [];
    snap.forEach((docSnap) => {
      ords.push({ id: docSnap.id, ...docSnap.data() } as OrderItem);
    });
    return ords;
  } catch (error) {
    console.error(`Error fetching orders from members/${memberId}/orders:`, error);
    handleFirestoreError(error, OperationType.GET, `${MEMBERS_COL}/${memberId}/${ORDERS_COL}`);
    return [];
  }
}

export async function fetchAllOrdersFromFirestore(membersList?: TeamMember[]): Promise<OrderItem[]> {
  const orderMap = new Map<string, OrderItem>();

  // 1. Fetch from collectionGroup across all members
  try {
    const groupSnap = await getDocs(collectionGroup(db, ORDERS_COL));
    groupSnap.forEach((docSnap) => {
      const data = docSnap.data() as OrderItem;
      const id = docSnap.id || data.id;
      if (id) {
        orderMap.set(id, { ...data, id });
      }
    });
  } catch (groupErr) {
    console.warn('CollectionGroup query notice:', groupErr);
  }

  // 2. Fetch from each member's orders subcollection: members/{memberId}/orders
  try {
    let mems = membersList;
    if (!mems || mems.length === 0) {
      mems = await fetchMembersFromFirestore();
    }
    if (mems && mems.length > 0) {
      await Promise.all(
        mems.map(async (m) => {
          if (!m.id) return;
          try {
            const subOrders = await fetchMemberOrdersFromFirestore(m.id);
            subOrders.forEach((o) => {
              if (o.id) {
                orderMap.set(o.id, o);
              }
            });
          } catch (mErr) {
            console.warn(`Could not load orders for member ${m.id}:`, mErr);
          }
        })
      );
    }
  } catch (memErr) {
    console.error('Error fetching member-specific orders:', memErr);
  }

  // 3. Check top-level orders as well
  try {
    const topSnap = await getDocs(collection(db, ORDERS_COL));
    topSnap.forEach((docSnap) => {
      const data = docSnap.data() as OrderItem;
      const id = docSnap.id || data.id;
      if (id && !orderMap.has(id)) {
        orderMap.set(id, { ...data, id });
      }
    });
  } catch (topErr) {
    console.warn('Top-level orders fallback notice:', topErr);
  }

  return Array.from(orderMap.values());
}

// ---------------- Firestore Mutations ----------------

// Products
export async function fetchProductsFromFirestore(): Promise<ProductItem[]> {
  try {
    const snap = await getDocs(collection(db, PRODUCTS_COL));
    const prods: ProductItem[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      prods.push({
        id: docSnap.id,
        name: data.name || '',
        category: data.category || 'metro-phones',
        sku: data.sku || '',
        price: typeof data.price === 'number' ? data.price : 0,
        stock: typeof data.stock === 'number' ? data.stock : 0,
        description: data.description || '',
        image: data.image || '',
        specs: Array.isArray(data.specs) ? data.specs : [],
        visibilityMode: (data.visibilityMode || 'all') as ProductVisibilityMode,
        allowedMembers: Array.isArray(data.allowedMembers) ? data.allowedMembers : [],
        hiddenMembers: Array.isArray(data.hiddenMembers) ? data.hiddenMembers : [],
        showStockToMembers: data.showStockToMembers !== undefined ? data.showStockToMembers : true,
        isFeatured: !!data.isFeatured,
      });
    });
    return prods;
  } catch (err) {
    console.error('Error fetching products from Firestore:', err);
    return [];
  }
}

export async function saveProductToFirestore(product: ProductItem): Promise<void> {
  try {
    const ref = doc(db, PRODUCTS_COL, product.id);
    const payload: ProductItem = {
      id: product.id,
      name: product.name || '',
      category: product.category || 'metro-phones',
      sku: product.sku || '',
      price: typeof product.price === 'number' ? product.price : 0,
      stock: typeof product.stock === 'number' ? product.stock : 0,
      description: product.description || '',
      image: product.image || '',
      specs: Array.isArray(product.specs) ? product.specs : [],
      visibilityMode: product.visibilityMode || 'all',
      allowedMembers: Array.isArray(product.allowedMembers) ? product.allowedMembers : [],
      hiddenMembers: Array.isArray(product.hiddenMembers) ? product.hiddenMembers : [],
      showStockToMembers: product.showStockToMembers !== undefined ? product.showStockToMembers : true,
      isFeatured: !!product.isFeatured,
    };
    await setDoc(ref, payload, { merge: true });
    console.log(`Product "${product.name}" (${product.id}) successfully saved to Firestore.`);
  } catch (error) {
    console.error(`Error saving product "${product.name}" to Firestore:`, error);
    handleFirestoreError(error, OperationType.WRITE, `${PRODUCTS_COL}/${product.id}`);
    throw error;
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    const ref = doc(db, PRODUCTS_COL, productId);
    await deleteDoc(ref);
    console.log(`Product (${productId}) successfully deleted from Firestore.`);
  } catch (error) {
    console.error(`Error deleting product (${productId}) from Firestore:`, error);
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COL}/${productId}`);
    throw error;
  }
}

export async function clearAllProductsFromFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, PRODUCTS_COL));
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log('All products successfully cleared from Firestore.');
  } catch (error) {
    console.error('Error clearing products from Firestore:', error);
  }
}

// Orders - Writes to members/{memberId}/orders/{orderId} with instant synchronization and error handling
export async function saveOrderToFirestore(order: OrderItem) {
  const memberId = order.memberId || 'general';
  const orderPayload: OrderItem = {
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.date || new Date().toISOString().split('T')[0],
    status: order.status,
    customerName: order.customerName,
    memberId: memberId,
    memberUsername: order.memberUsername || '',
    destinationAddress: order.destinationAddress || order.businessAddress || '',
    businessAddress: order.businessAddress || order.destinationAddress || '',
    items: order.items || [],
    itemsCount: typeof order.itemsCount === 'number' ? order.itemsCount : (order.items?.reduce((s, i) => s + i.qty, 0) || 0),
    subtotal: typeof order.subtotal === 'number' ? order.subtotal : 0,
    shippingFee: typeof order.shippingFee === 'number' ? order.shippingFee : 0,
    salesTax: typeof order.salesTax === 'number' ? order.salesTax : 0,
    serviceTax: typeof order.serviceTax === 'number' ? order.serviceTax : 0,
    overpackFee: typeof order.overpackFee === 'number' ? order.overpackFee : 0,
    insuranceFee: typeof order.insuranceFee === 'number' ? order.insuranceFee : 0,
    total: typeof order.total === 'number' ? order.total : 0,
    paymentStatus: order.paymentStatus || 'Credit Allocated',
    notes: order.notes || '',
    createdAt: order.createdAt || new Date().toISOString(),
    ...(order.itemsModifiedByAdmin !== undefined ? { itemsModifiedByAdmin: order.itemsModifiedByAdmin } : {}),
    ...(order.originalItems ? { originalItems: order.originalItems } : {}),
    ...(order.originalSubtotal !== undefined ? { originalSubtotal: order.originalSubtotal } : {}),
    ...(order.adminDecision ? { adminDecision: order.adminDecision } : {}),
    ...(order.adminDeclineReason ? { adminDeclineReason: order.adminDeclineReason } : {}),
    ...(order.adminReviewedAt ? { adminReviewedAt: order.adminReviewedAt } : {}),
    ...(order.memberAcceptedAt ? { memberAcceptedAt: order.memberAcceptedAt } : {}),
  };

  // 1. Write to members/{memberId}/orders/{orderId}
  try {
    const memberOrderRef = doc(db, MEMBERS_COL, memberId, ORDERS_COL, order.id);
    await setDoc(memberOrderRef, orderPayload, { merge: true });
    console.log(`✓ Order ${order.orderNumber} (${order.id}) written to Firestore path: members/${memberId}/orders/${order.id}`);
  } catch (error) {
    console.error(`Error saving order to Firestore members subcollection (members/${memberId}/orders/${order.id}):`, error);
    handleFirestoreError(error, OperationType.WRITE, `${MEMBERS_COL}/${memberId}/${ORDERS_COL}/${order.id}`);
  }

  // 2. Also write to top-level orders/{orderId}
  try {
    const topOrderRef = doc(db, ORDERS_COL, order.id);
    await setDoc(topOrderRef, orderPayload, { merge: true });
  } catch (error) {
    console.error(`Error saving order to top-level orders collection (orders/${order.id}):`, error);
  }
}

export async function deleteOrderFromFirestore(orderId: string, memberId?: string) {
  if (memberId) {
    try {
      const memberOrderRef = doc(db, MEMBERS_COL, memberId, ORDERS_COL, orderId);
      await deleteDoc(memberOrderRef);
    } catch (error) {
      console.error(`Error deleting order from members/${memberId}/orders:`, error);
    }
  }
  try {
    const topOrderRef = doc(db, ORDERS_COL, orderId);
    await deleteDoc(topOrderRef);
  } catch (error) {
    console.error(`Error deleting order from orders collection:`, error);
  }
}

export async function updateOrderStatusInFirestore(orderId: string, updates: Partial<OrderItem>, memberId?: string) {
  if (memberId) {
    try {
      const memberOrderRef = doc(db, MEMBERS_COL, memberId, ORDERS_COL, orderId);
      await updateDoc(memberOrderRef, updates);
    } catch (error) {
      console.error(`Error updating order status in members/${memberId}/orders:`, error);
    }
  }
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

export async function purgeMemberOrdersAndInvoicesFromFirestore(memberIdentifier: {
  id?: string;
  username?: string;
  tempUsername?: string;
  name?: string;
  email?: string;
}) {
  try {
    const usernames = [
      memberIdentifier.username?.toLowerCase(),
      memberIdentifier.tempUsername?.toLowerCase(),
      'zoheb.hg',
    ].filter(Boolean) as string[];

    const names = [
      memberIdentifier.name?.toLowerCase(),
      'zoheb',
      'zoheb akram',
    ].filter((n): n is string => Boolean(n && n.trim().length >= 3));

    const ids = [memberIdentifier.id].filter(Boolean) as string[];

    // 1. Delete matching invoices from top-level invoices collection
    const invSnap = await getDocs(collection(db, INVOICES_COL));
    for (const docSnap of invSnap.docs) {
      const data = docSnap.data() as InvoiceItem;
      const isMatch =
        (data.memberId && ids.includes(data.memberId)) ||
        (data.memberUsername && usernames.includes(data.memberUsername.toLowerCase())) ||
        (data.customerName && names.some((n) => data.customerName.toLowerCase().includes(n))) ||
        (data.billedTo && names.some((n) => data.billedTo.toLowerCase().includes(n))) ||
        Math.abs(Number(data.amount) - 799.92) < 0.01;
      if (isMatch) {
        console.log(`Deleting invoice ${docSnap.id} for member`);
        await deleteDoc(docSnap.ref);
      }
    }

    // 2. Delete matching orders from top-level orders collection
    const topOrdersSnap = await getDocs(collection(db, ORDERS_COL));
    for (const docSnap of topOrdersSnap.docs) {
      const data = docSnap.data() as OrderItem;
      const isMatch =
        (data.memberId && ids.includes(data.memberId)) ||
        (data.memberUsername && usernames.includes(data.memberUsername.toLowerCase())) ||
        (data.customerName && names.some((n) => data.customerName.toLowerCase().includes(n))) ||
        Math.abs(Number(data.total || data.subtotal) - 799.92) < 0.01;
      if (isMatch) {
        console.log(`Deleting top order ${docSnap.id} for member`);
        await deleteDoc(docSnap.ref);
      }
    }

    // 3. Delete matching orders from collectionGroup('orders')
    try {
      const groupOrdersSnap = await getDocs(collectionGroup(db, ORDERS_COL));
      for (const docSnap of groupOrdersSnap.docs) {
        const data = docSnap.data() as OrderItem;
        const isMatch =
          (data.memberId && ids.includes(data.memberId)) ||
          (data.memberUsername && usernames.includes(data.memberUsername.toLowerCase())) ||
          (data.customerName && names.some((n) => data.customerName.toLowerCase().includes(n))) ||
          Math.abs(Number(data.total || data.subtotal) - 799.92) < 0.01;
        if (isMatch) {
          console.log(`Deleting group order ${docSnap.ref.path}`);
          await deleteDoc(docSnap.ref);
        }
      }
    } catch (e) {
      console.warn('collectionGroup order deletion warning:', e);
    }

    // 4. Delete subcollection members/{memberId}/orders if memberId exists
    if (memberIdentifier.id) {
      try {
        const memOrdersSnap = await getDocs(collection(db, MEMBERS_COL, memberIdentifier.id, ORDERS_COL));
        for (const docSnap of memOrdersSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } catch (e) {
        console.warn('member subcollection order deletion warning:', e);
      }
    }

    // 5. Clean local storage
    try {
      const savedOrders = localStorage.getItem('distro_orders');
      if (savedOrders) {
        const parsed: OrderItem[] = JSON.parse(savedOrders);
        const filtered = parsed.filter((data) => {
          const isMatch =
            (data.memberId && ids.includes(data.memberId)) ||
            (data.memberUsername && usernames.includes(data.memberUsername.toLowerCase())) ||
            (data.customerName && names.some((n) => data.customerName.toLowerCase().includes(n))) ||
            Math.abs(Number(data.total || data.subtotal) - 799.92) < 0.01;
          return !isMatch;
        });
        localStorage.setItem('distro_orders', JSON.stringify(filtered));
      }

      const savedInvoices = localStorage.getItem('distro_invoices');
      if (savedInvoices) {
        const parsed: InvoiceItem[] = JSON.parse(savedInvoices);
        const filtered = parsed.filter((data) => {
          const isMatch =
            (data.memberId && ids.includes(data.memberId)) ||
            (data.memberUsername && usernames.includes(data.memberUsername.toLowerCase())) ||
            (data.customerName && names.some((n) => data.customerName.toLowerCase().includes(n))) ||
            (data.billedTo && names.some((n) => data.billedTo.toLowerCase().includes(n))) ||
            Math.abs(Number(data.amount) - 799.92) < 0.01;
          return !isMatch;
        });
        localStorage.setItem('distro_invoices', JSON.stringify(filtered));
      }

      window.dispatchEvent(new Event('distro_storage_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('LocalStorage purge error:', e);
    }
  } catch (err) {
    console.error('Error purging member orders and invoices:', err);
  }
}


