// lib/menu-permissions.ts
export const ALL_MENUS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Halaman utama' },
  { key: 'kasir', label: 'Kasir', desc: 'Halaman transaksi penjualan' },
  { key: 'produk', label: 'Produk', desc: 'Manajemen produk & stok' },
  { key: 'laporan', label: 'Laporan', desc: 'Laporan penjualan & keuangan' },
  { key: 'pesanan', label: 'Pesanan', desc: 'Daftar pesanan masuk' },
  { key: 'pengeluaran', label: 'Pengeluaran', desc: 'Catatan pengeluaran toko' },
  { key: 'supplier', label: 'Supplier', desc: 'Manajemen data supplier' },
  { key: 'pembelian', label: 'Pembelian', desc: 'Pembelian & stok masuk' },
  { key: 'target-penjualan', label: 'Target Penjualan', desc: 'Atur target bulanan & harian' },
  { key: 'users', label: 'Users', desc: 'Manajemen pengguna' },
  { key: 'settings', label: 'Settings', desc: 'Pengaturan aplikasi' },
  { key: 'absensi', label: 'Absensi', desc: 'Absensi karyawan' },
  { key: 'jadwal', label: 'Jadwal', desc: 'Jadwal kerja' },
  { key: 'log-aktivitas', label: 'Log Aktivitas', desc: 'Catatan aktivitas' },
  { key: 'payroll', label: 'Payroll', desc: 'Penggajian karyawan' },
];

export const CONFIGURABLE_ROLES = ['ADMIN', 'MANAGER', 'KASIR'];
export const ALL_ROLES = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'KASIR'];