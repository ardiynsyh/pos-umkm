// ─────────────────────────────────────────────────────────────────────────────
// File ini tidak lagi menggunakan Dexie/IndexedDB.
// Hanya berisi type definitions yang kompatibel dengan API Prisma.
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id?: string | number;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Transaction {
  id?: string | number;
  transactionNumber: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'ewallet' | 'qr';
  paymentAmount: number;
  change: number;
  cashierName?: string;
  notes?: string;
  createdAt?: Date;
}

export interface TransactionItem {
  productId: string | number;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Category {
  id?: string | number;
  name: string;
  description?: string;
  createdAt?: Date;
}

export interface User {
  id?: string | number;
  username?: string;
  password?: string;
  name?: string;
  nama?: string;
  email?: string;
  role: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentQR {
  id?: string | number;
  provider: 'BCA' | 'DANA' | 'OVO' | 'GOPAY';
  qrCode: string;
  accountNumber?: string;
  accountName?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppSettings {
  id?: string | number;
  key: string;
  value: string;
  updatedAt?: Date;
}

// Stub kosong untuk backward compatibility
// Komponen lama yang masih import `db` tidak akan error
export const db = {
  products: { toArray: async () => [], where: () => ({ equals: () => ({ first: async () => null }) }) },
  categories: { toArray: async () => [] },
  users: { toArray: async () => [], where: () => ({ equals: () => ({ first: async () => null }) }), add: async () => {}, update: async () => {}, delete: async () => {} },
  settings: { toArray: async () => [], where: () => ({ equals: () => ({ first: async () => null }) }), add: async () => {}, update: async () => {} },
  seedInitialData: async () => {},
};
