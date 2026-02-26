// PATH: app/karyawan/absensi/page.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Absensi, AbsensiStatus, ShiftType } from '@/types/karyawan'
import { useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/lib/store/authStore' // ✅ baca role dari store, bukan /api/auth/me

// ── Helper ────────────────────────────────────────────────────
const statusConfig: Record<AbsensiStatus, { label: string; color: string; bg: string }> = {
  hadir:     { label: 'Hadir',     color: '#16a34a', bg: '#dcfce7' },
  terlambat: { label: 'Terlambat', color: '#d97706', bg: '#fef3c7' },
  izin:      { label: 'Izin',      color: '#7c3aed', bg: '#ede9fe' },
  absen:     { label: 'Absen',     color: '#dc2626', bg: '#fee2e2' },
}

const shiftConfig: Record<ShiftType, { label: string; time: string }> = {
  pagi:  { label: 'Pagi',  time: '08:00–17:00' },
  sore:  { label: 'Sore',  time: '14:00–22:00' },
  malam: { label: 'Malam', time: '22:00–06:00' },
  libur: { label: 'Libur', time: '—' },
}

const roleColors: Record<string, { color: string; bg: string }> = {
  superadmin: { color: '#d97706', bg: '#fef3c7' },
  admin:      { color: '#2563eb', bg: '#dbeafe' },
  manager:    { color: '#7c3aed', bg: '#ede9fe' },
  kasir:      { color: '#0d9488', bg: '#ccfbf1' },
}

// ✅ Role yang boleh menambah absensi
const ROLES_CAN_ADD_ABSENSI = ['SUPERADMIN', 'ADMIN', 'MANAGER']

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────
export default function AbsensiPage() {
  const [absensiList, setAbsensiList]   = useState<Absensi[]>([])
  const [summary, setSummary]           = useState({ hadir: 0, terlambat: 0, izin: 0, absen: 0 })
  const [loading, setLoading]           = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState<AbsensiStatus | ''>('')
  const [showModal, setShowModal]       = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [errorMsg, setErrorMsg]         = useState('')

  // ✅ Ambil role dari authStore — tunggu hydration selesai dulu
  // _hasHydrated = true setelah zustand persist selesai load dari localStorage
  const user            = useAuthStore(state => state.user)
  const hasHydrated     = useAuthStore(state => state._hasHydrated)
  const currentUserRole = hasHydrated ? (user?.role?.toUpperCase() ?? '') : ''
  const canAddAbsensi   = ROLES_CAN_ADD_ABSENSI.includes(currentUserRole)

  // ── Gunakan hook terpusat ─────────────────────────────────────────────────
  const { users: userOptions, loading: loadingUsers, error: usersError, refetch: refetchUsers } = useUsers()

  const [form, setForm] = useState({
    userId:     '',
    tanggal:    new Date().toISOString().split('T')[0],
    jamMasuk:   '',
    jamKeluar:  '',
    shift:      'pagi' as ShiftType,
    status:     'hadir' as AbsensiStatus,
    keterangan: '',
  })

  const fetchAbsensi = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tanggal: selectedDate })
      if (filterStatus) params.set('status', filterStatus)
      const res  = await fetch(`/api/absensi?${params}`)
      const json = await res.json()
      if (json.success) {
        setAbsensiList(json.data.absensi)
        setSummary(json.data.summary)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, filterStatus])

  useEffect(() => { fetchAbsensi() }, [fetchAbsensi])

  function openModal() {
    setForm({
      userId:     '',
      tanggal:    new Date().toISOString().split('T')[0],
      jamMasuk:   '',
      jamKeluar:  '',
      shift:      'pagi',
      status:     'hadir',
      keterangan: '',
    })
    setErrorMsg('')
    refetchUsers()
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!form.userId) {
      setErrorMsg('Pilih karyawan terlebih dahulu')
      return
    }

    setSubmitting(true)
    try {
      const selectedUser = userOptions.find(u => u.id === form.userId)
      const outletId     = selectedUser?.outletId ?? 'o1'

      const res  = await fetch('/api/absensi', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, outletId }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setShowModal(false)
        fetchAbsensi()
      } else {
        setErrorMsg(json.message ?? 'Gagal menyimpan absensi')
      }
    } catch {
      setErrorMsg('Terjadi kesalahan, coba lagi')
    } finally {
      setSubmitting(false)
    }
  }

  const summaryCards = [
    { key: 'hadir',     label: 'Hadir',     icon: '✅', ...statusConfig.hadir },
    { key: 'terlambat', label: 'Terlambat', icon: '⏰', ...statusConfig.terlambat },
    { key: 'izin',      label: 'Izin',      icon: '📋', ...statusConfig.izin },
    { key: 'absen',     label: 'Absen',     icon: '❌', ...statusConfig.absen },
  ] as const

  const selectedUser = userOptions.find(u => u.id === form.userId)

  return (
    <div className="page-container">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Absensi Karyawan</h1>
          <p className="page-subtitle">{formatDate(selectedDate)}</p>
        </div>
        <div className="header-actions">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input-date"
          />
          {/* ✅ Tombol hanya muncul untuk ADMIN, MANAGER, SUPERADMIN */}
          {canAddAbsensi && (
            <button className="btn-primary" onClick={openModal}>
              + Tambah Absensi
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────── */}
      <div className="stats-grid">
        {summaryCards.map(({ key, label, icon, color, bg }) => (
          <div
            key={key}
            className={`stat-card ${filterStatus === key ? 'stat-card--active' : ''}`}
            style={{ borderColor: filterStatus === key ? color : 'transparent' }}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
          >
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div className="stat-body">
              <div className="stat-value" style={{ color }}>{summary[key]}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">
            Daftar Absensi
            {filterStatus && (
              <span className="filter-chip" style={{
                background: statusConfig[filterStatus].bg,
                color:      statusConfig[filterStatus].color,
              }}>
                {statusConfig[filterStatus].label}
                <button onClick={() => setFilterStatus('')}>×</button>
              </span>
            )}
          </span>
          <span className="table-count">{absensiList.length} karyawan</span>
        </div>

        {loading ? (
          <div className="table-loading"><div className="spinner" /><span>Memuat data absensi...</span></div>
        ) : absensiList.length === 0 ? (
          <div className="table-empty"><span>📭</span><p>Belum ada data absensi hari ini</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th><th>Shift</th><th>Jam Masuk</th>
                  <th>Jam Keluar</th><th>Status</th><th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {absensiList.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{
                          background: roleColors[item.userRole]?.bg ?? '#f1f5f9',
                          color:      roleColors[item.userRole]?.color ?? '#64748b',
                        }}>
                          {item.userName[0]}
                        </div>
                        <div>
                          <div className="user-name">{item.userName}</div>
                          <span className="role-badge" style={{
                            background: roleColors[item.userRole]?.bg,
                            color:      roleColors[item.userRole]?.color,
                          }}>
                            {item.userRole}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="shift-info">
                        <strong>{shiftConfig[item.shift].label}</strong>
                        <span>{shiftConfig[item.shift].time}</span>
                      </div>
                    </td>
                    <td className="time-cell">{item.jamMasuk  ?? '—'}</td>
                    <td className="time-cell">{item.jamKeluar ?? '—'}</td>
                    <td>
                      <span className="status-badge" style={{
                        background: statusConfig[item.status].bg,
                        color:      statusConfig[item.status].color,
                      }}>
                        {statusConfig[item.status].label}
                      </span>
                    </td>
                    <td className="note-cell">{item.keterangan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Tambah Absensi ──────────────────────────── */}
      {showModal && canAddAbsensi && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Absensi Manual</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">

              {errorMsg   && <div className="error-banner">⚠️ {errorMsg}</div>}
              {usersError && <div className="error-banner">⚠️ {usersError}</div>}

              <div className="form-grid">

                <div className="form-group">
                  <label>Karyawan <span className="required">*</span></label>
                  {loadingUsers ? (
                    <div className="input input--loading">Memuat daftar karyawan...</div>
                  ) : (
                    <select
                      className="input"
                      value={form.userId}
                      onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                      required
                    >
                      <option value="">— Pilih Karyawan —</option>
                      {userOptions.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nama} ({u.role})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedUser && (
                    <div className="user-selected-info">
                      <span className="role-badge" style={{
                        background: roleColors[selectedUser.role.toLowerCase()]?.bg ?? '#f1f5f9',
                        color:      roleColors[selectedUser.role.toLowerCase()]?.color ?? '#64748b',
                      }}>
                        {selectedUser.role}
                      </span>
                      <span className="user-id-hint">ID: {selectedUser.id}</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Tanggal <span className="required">*</span></label>
                  <input
                    type="date" className="input" value={form.tanggal} required
                    onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Jam Masuk</label>
                  <input
                    type="time" className="input" value={form.jamMasuk}
                    onChange={e => setForm(f => ({ ...f, jamMasuk: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Jam Keluar</label>
                  <input
                    type="time" className="input" value={form.jamKeluar}
                    onChange={e => setForm(f => ({ ...f, jamKeluar: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Shift</label>
                  <select
                    className="input" value={form.shift}
                    onChange={e => setForm(f => ({ ...f, shift: e.target.value as ShiftType }))}
                  >
                    <option value="pagi">Pagi (08:00–17:00)</option>
                    <option value="sore">Sore (14:00–22:00)</option>
                    <option value="malam">Malam (22:00–06:00)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="input" value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as AbsensiStatus }))}
                  >
                    <option value="hadir">Hadir</option>
                    <option value="terlambat">Terlambat</option>
                    <option value="izin">Izin</option>
                    <option value="absen">Absen</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Keterangan</label>
                <textarea
                  className="input" rows={2}
                  placeholder="Opsional: alasan izin, keterangan khusus..."
                  value={form.keterangan}
                  onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-primary" disabled={submitting || loadingUsers}>
                  {submitting ? 'Menyimpan...' : 'Simpan Absensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .page-container { padding: 28px; max-width: 1200px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: #64748b; }
        .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .input-date { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: white; cursor: pointer; }
        .btn-primary { padding: 9px 18px; background: #2563eb; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .2s; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 9px 18px; background: white; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 14px; padding: 16px 18px; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,.05); cursor: pointer; display: flex; align-items: center; gap: 14px; transition: all .2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
        .stat-card--active { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
        .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .stat-value { font-size: 26px; font-weight: 800; line-height: 1; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 3px; }
        .table-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .table-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .table-title { font-size: 15px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; }
        .table-count { font-size: 12px; color: #94a3b8; }
        .filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .filter-chip button { background: none; border: none; cursor: pointer; font-size: 14px; line-height: 1; padding: 0 0 0 2px; }
        .table-loading, .table-empty { padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: #94a3b8; font-size: 14px; }
        .table-empty span { font-size: 40px; }
        .spinner { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .table-scroll { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
        .data-table td { padding: 12px 16px; border-bottom: 1px solid #f8fafc; font-size: 13px; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover td { background: #f8fafc; }
        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .user-name { font-weight: 600; color: #0f172a; font-size: 13px; }
        .role-badge { display: inline-block; padding: 1px 7px; border-radius: 20px; font-size: 10px; font-weight: 600; margin-top: 2px; }
        .shift-info { display: flex; flex-direction: column; }
        .shift-info strong { font-size: 13px; font-weight: 600; }
        .shift-info span { font-size: 11px; color: #94a3b8; }
        .time-cell { font-weight: 600; font-size: 13px; }
        .status-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .note-cell { color: #64748b; font-size: 12px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 16px; width: 100%; max-width: 560px; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
        .modal-header { padding: 20px 24px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .modal-header h2 { font-size: 16px; font-weight: 700; }
        .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; line-height: 1; }
        .modal-body { padding: 20px 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #374151; }
        .required { color: #dc2626; }
        .input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; width: 100%; background: white; }
        .input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
        .input--loading { color: #94a3b8; font-style: italic; }
        .user-selected-info { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .user-id-hint { font-size: 10px; color: #94a3b8; font-family: monospace; }
        .error-banner { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
        @media (max-width: 700px) {
          .stats-grid { grid-template-columns: repeat(2,1fr); }
          .page-container { padding: 16px; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
