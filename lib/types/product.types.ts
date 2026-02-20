// lib/types/product.types.ts
export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price: number;
  stock: number;
  category?: string | null;
  categoryId?: string | null;
  image?: string | null;
}

export function mapPrismaProduct(prismaProduct: any): Product {
  return {
    id: prismaProduct.id,
    name: prismaProduct.nama,
    sku: prismaProduct.sku,
    barcode: prismaProduct.barcode,
    price: prismaProduct.hargaJual,
    stock: prismaProduct.stok,
    category: prismaProduct.category?.nama || null,
    categoryId: prismaProduct.categoryId || null,
    image: prismaProduct.foto || null,
  };
}