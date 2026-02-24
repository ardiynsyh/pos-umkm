// hooks/useUsers.ts
// Hook terpusat untuk fetch daftar user — dipakai di Absensi, Jadwal, Payroll
// Setiap perubahan user di menu Users otomatis tersinkron karena semua halaman
// menggunakan hook ini, sehingga data selalu fresh dari /api/users

import { useState, useEffect, useCallback } from 'react'

export type UserOption = {
  id: string
  nama: string
  email: string
  role: string
  outletId: string | null
}

type UseUsersReturn = {
  users: UserOption[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users')

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json()

      // API /api/users mengembalikan { users: [...] }
      const list: UserOption[] = (json.users ?? []).map((u: UserOption) => ({
        id:       u.id,
        nama:     u.nama,
        email:    u.email,
        role:     u.role,
        outletId: u.outletId,
      }))

      setUsers(list)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat daftar karyawan'
      setError(msg)
      console.error('[useUsers]', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}