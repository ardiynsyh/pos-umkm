import Dexie, { Table } from 'dexie';

export interface IProduct {
  id: string;
  sku: string;
  barcode?: string;
  nama: string;
  hargaJual: number;
  stok: number;
  categoryId: string;
}

export interface ICartItem {
  id: string;
  productId: string;
  nama: string;
  hargaSatuan: number;
  quantity: number;
  subtotal: number;
  sku: string;
}

export interface IOfflineTransaction {
  id: string;
  nomorTransaksi: string;
  total: number;
  diskon: number;
  pajak: number;
  totalBayar: number;
  uangDibayar: number;
  kembalian: number;
  metodePembayaran: string;
  items: ICartItem[];
  status: 'TERTUNDA' | 'SYNCING' | 'SYNCED';
  createdAt: number;
  syncAttempts: number;
}

export class POSDatabase extends Dexie {
  products!: Table<IProduct, string>;
  cart!: Table<ICartItem, string>;
  offlineTransactions!: Table<IOfflineTransaction, string>;

  constructor() {
    super('POSDatabase');
    this.version(1).stores({
      products: 'id, sku, barcode, nama',
      cart: 'id, productId',
      offlineTransactions: 'id, status, createdAt',
    });
  }
}

export const db = new POSDatabase();

export const dbHelpers = {
  async syncProducts(products: IProduct[]) {
    await db.products.clear();
    await db.products.bulkAdd(products);
  },

  async searchProduct(query: string): Promise<IProduct | undefined> {
    const byBarcode = await db.products.where('barcode').equals(query).first();
    if (byBarcode) return byBarcode;
    
    const bySKU = await db.products.where('sku').equals(query).first();
    if (bySKU) return bySKU;
    
    return await db.products
      .filter(p => p.nama.toLowerCase().includes(query.toLowerCase()))
      .first();
  },

  async addToCart(product: IProduct, quantity: number = 1) {
    const existing = await db.cart.get(product.id);
    
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      await db.cart.update(product.id, {
        quantity: newQuantity,
        subtotal: newQuantity * existing.hargaSatuan,
      });
    } else {
      await db.cart.add({
        id: product.id,
        productId: product.id,
        nama: product.nama,
        hargaSatuan: product.hargaJual,
        quantity,
        subtotal: product.hargaJual * quantity,
        sku: product.sku,
      });
    }
  },

  async updateCartItem(id: string, quantity: number) {
    const item = await db.cart.get(id);
    if (item) {
      await db.cart.update(id, {
        quantity,
        subtotal: quantity * item.hargaSatuan,
      });
    }
  },

  async removeFromCart(id: string) {
    await db.cart.delete(id);
  },

  async clearCart() {
    await db.cart.clear();
  },

  async saveOfflineTransaction(transaction: Omit<IOfflineTransaction, 'id' | 'status' | 'createdAt' | 'syncAttempts'>) {
    await db.offlineTransactions.add({
      ...transaction,
      id: crypto.randomUUID(),
      status: 'TERTUNDA',
      createdAt: Date.now(),
      syncAttempts: 0,
    });
  },

  async getPendingTransactions(): Promise<IOfflineTransaction[]> {
    return await db.offlineTransactions.where('status').equals('TERTUNDA').toArray();
  },

  async markTransactionSynced(id: string) {
    await db.offlineTransactions.update(id, { status: 'SYNCED' });
  },
};