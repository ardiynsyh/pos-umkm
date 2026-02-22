// lib/menu-permissions.ts
// Konstanta menu permissions — dipisah dari route.ts agar tidak konflik dengan Next.js

export const ALL_MENUS = [
  { key: 'kasir',    label: 'Kasir' },
  { key: 'produk',   label: 'Produk' },
  { key: 'laporan',  label: 'Laporan' },
  { key: 'pesanan',  label: 'Pesanan' },
  { key: 'users',    label: 'Users' },
  { key: 'settings', label: 'Settings' },
];

export const CONFIGURABLE_ROLES = ['ADMIN', 'MANAGER', 'KASIR'] as const;
export type ConfigurableRole = typeof CONFIGURABLE_ROLES[number];