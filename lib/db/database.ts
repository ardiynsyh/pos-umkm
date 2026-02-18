import Dexie, { Table } from 'dexie';

export interface Product {
  id?: number;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id?: number;
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
  createdAt: Date;
}

export interface TransactionItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Category {
  id?: number;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface User {
  id?: number;
  username: string;
  password: string;
  name: string;
  role: 'owner' | 'kasir';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentQR {
  id?: number;
  provider: 'BCA' | 'DANA' | 'OVO' | 'GOPAY';
  qrCode: string; // base64 image
  accountNumber?: string;
  accountName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

export class POSDatabase extends Dexie {
  products!: Table<Product>;
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  users!: Table<User>;
  paymentQRs!: Table<PaymentQR>;
  settings!: Table<AppSettings>;

  constructor() {
    super('POSDatabase');
    this.version(2).stores({
      products: '++id, name, barcode, category, createdAt',
      transactions: '++id, transactionNumber, createdAt',
      categories: '++id, name',
      users: '++id, username, role',
      paymentQRs: '++id, provider, isActive',
      settings: '++id, key',
    });
  }

  // Seed initial data
  async seedInitialData() {
    const productCount = await this.products.count();
    if (productCount === 0) {
      // Add sample products
      await this.products.bulkAdd([
        {
          name: 'Indomie Goreng',
          barcode: '8992388100100',
          price: 3000,
          stock: 100,
          category: 'Makanan',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Aqua 600ml',
          barcode: '8992388101100',
          price: 5000,
          stock: 50,
          category: 'Minuman',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Kopi Kapal Api',
          barcode: '8992388102100',
          price: 2000,
          stock: 75,
          category: 'Minuman',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Roti Tawar',
          barcode: '8992388103100',
          price: 15000,
          stock: 30,
          category: 'Makanan',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Teh Botol Sosro',
          barcode: '8992388104100',
          price: 6000,
          stock: 60,
          category: 'Minuman',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Add sample categories
      await this.categories.bulkAdd([
        { name: 'Makanan', createdAt: new Date() },
        { name: 'Minuman', createdAt: new Date() },
        { name: 'Snack', createdAt: new Date() },
        { name: 'Alat Tulis', createdAt: new Date() },
      ]);
    }

    // Add default owner user if no users exist
    const userCount = await this.users.count();
    if (userCount === 0) {
      await this.users.add({
        username: 'owner',
        password: 'owner123', // In production, use hashed password
        name: 'Owner',
        role: 'owner',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.users.add({
        username: 'kasir',
        password: 'kasir123',
        name: 'Kasir Demo',
        role: 'kasir',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Add default settings
    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.bulkAdd([
        {
          key: 'copyright',
          value: 'Created by Your Company Name',
          updatedAt: new Date(),
        },
        {
          key: 'storeName',
          value: 'Toko UMKM',
          updatedAt: new Date(),
        },
        {
          key: 'voiceEnabled',
          value: 'true',
          updatedAt: new Date(),
        },
      ]);
    }
  }
}

export const db = new POSDatabase();

// Initialize database with sample data
if (typeof window !== 'undefined') {
  db.seedInitialData();
}
