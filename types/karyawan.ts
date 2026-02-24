// ============================================================
// TYPES — Karyawan (Employee Management)
// ============================================================

export type Role = 'superadmin' | 'admin' | 'manager' | 'kasir'

export type AbsensiStatus = 'hadir' | 'terlambat' | 'izin' | 'absen'

export type ShiftType = 'pagi' | 'sore' | 'malam' | 'libur'

export type PayrollStatus = 'dibayar' | 'pending'

export type LogType =
  | 'login'
  | 'logout'
  | 'transaksi'
  | 'user_management'
  | 'jadwal'
  | 'produk'
  | 'pengeluaran'

// ── Absensi ──────────────────────────────────────────────────
export interface Absensi {
  id: string
  userId: string
  userName: string
  userRole: Role
  outletId: string
  outletName: string
  tanggal: string           // ISO date string "YYYY-MM-DD"
  jamMasuk: string | null   // "HH:mm"
  jamKeluar: string | null  // "HH:mm"
  shift: ShiftType
  status: AbsensiStatus
  keterangan: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAbsensiInput {
  userId: string
  outletId: string
  tanggal: string
  jamMasuk?: string
  jamKeluar?: string
  shift: ShiftType
  status: AbsensiStatus
  keterangan?: string
}

export interface UpdateAbsensiInput extends Partial<CreateAbsensiInput> {}

export interface AbsensiFilter {
  tanggal?: string
  outletId?: string
  userId?: string
  status?: AbsensiStatus
}

// ── Jadwal ───────────────────────────────────────────────────
export interface JadwalItem {
  id: string
  userId: string
  userName: string
  userRole: Role
  outletId: string
  shift: ShiftType
  tanggal: string   // "YYYY-MM-DD"
  keterangan: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateJadwalInput {
  userId: string
  outletId: string
  shift: ShiftType
  tanggal: string
  keterangan?: string
}

export interface UpdateJadwalInput extends Partial<CreateJadwalInput> {}

export interface WeeklySchedule {
  userId: string
  userName: string
  userRole: Role
  days: Record<string, JadwalItem | null>  // key: "YYYY-MM-DD"
}

// ── Log Aktivitas ────────────────────────────────────────────
export interface LogAktivitas {
  id: string
  userId: string
  userName: string
  userRole: Role
  outletId: string
  outletName: string
  action: string
  type: LogType
  meta: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export interface LogFilter {
  search?: string
  role?: Role | ''
  type?: LogType | ''
  startDate?: string
  endDate?: string
  outletId?: string
  page?: number
  limit?: number
}

export interface LogPaginatedResponse {
  data: LogAktivitas[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Payroll ──────────────────────────────────────────────────
export interface Payroll {
  id: string
  userId: string
  userName: string
  userRole: Role
  outletId: string
  outletName: string
  periode: string       // "YYYY-MM" e.g. "2026-02"
  hariKerja: number
  lemburJam: number
  gajiPokok: number
  tunjangan: number
  lemburNominal: number
  potongan: number
  totalGaji: number
  status: PayrollStatus
  tanggalBayar: string | null
  catatan: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollFilter {
  periode?: string
  outletId?: string
  status?: PayrollStatus
}

export interface SlipGaji extends Payroll {
  breakdown: {
    label: string
    amount: number
    type: 'income' | 'deduction'
  }[]
}