'use client'

import { useState, useEffect, useCallback } from 'react'
import { Payroll, PayrollStatus } from '@/types/karyawan'
import { useUsers } from '@/hooks/useUsers'
import type { Role } from '@/types/karyawan'

// ── Types ─────────────────────────────────────────────────────
type GajiSetting = {
  userId:            string
  userName:          string
  userRole:          string
  outletId:          string | null
  skema:             'bulanan' | 'harian'
  gajiPokok:         number
  gajiHarian:        number
  tunjangan:         number
  tarifLembur:       number
  potonganTerlambat: number
}

type AbsensiSummary = {
  hadir: number; terlambat: number; izin: number; absen: number; total: number
}

type SlipGaji = Payroll & {
  breakdown: { label: string; amount: number; type: 'income' | 'deduction' }[]
}

// ── Config ────────────────────────────────────────────────────
const roleColors: Record<string, { color: string; bg: string }> = {
  superadmin: { color: '#d97706', bg: '#fef3c7' },
  admin:      { color: '#2563eb', bg: '#dbeafe' },
  manager:    { color: '#7c3aed', bg: '#ede9fe' },
  kasir:      { color: '#0d9488', bg: '#ccfbf1' },
}

function formatRupiah(amount: number) {
  if (amount === 0) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatPeriode(periode: string) {
  const [year, month] = periode.split('-')
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${months[parseInt(month) - 1]} ${year}`
}

// ── Component ─────────────────────────────────────────────────
export default function PayrollPage() {
  const today          = new Date()
  const currentPeriode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [payrolls, setPayrolls]       = useState<Payroll[]>([])
  const [summary, setSummary]         = useState({ totalPenggajian: 0, sudahDibayar: 0, belumDibayar: 0, totalPotongan: 0 })
  const [loading, setLoading]         = useState(true)
  const [periode, setPeriode]         = useState(currentPeriode)
  const [filterStatus, setFilterStatus] = useState<PayrollStatus | ''>('')

  // Gaji Setting
  const [gajiSettings, setGajiSettings]   = useState<GajiSetting[]>([])
  const [showGajiModal, setShowGajiModal] = useState(false)
  const [editGaji, setEditGaji]           = useState<GajiSetting | null>(null)
  const [savingGaji, setSavingGaji]       = useState(false)

  // Absensi summary per user
  const [absensiMap, setAbsensiMap] = useState<Record<string, AbsensiSummary>>({})

  // Generate
  const [generating, setGenerating]   = useState(false)
  const [generateMsg, setGenerateMsg] = useState('')

  // Slip
  const [slipModal, setSlipModal]     = useState<{ open: boolean; data: SlipGaji | null }>({ open: false, data: null })
  const [loadingSlip, setLoadingSlip] = useState(false)
  const [payingId, setPayingId]       = useState<string | null>(null)

  const { users, refetch: refetchUsers } = useUsers()
  const userMap = new Map(users.map(u => [u.id, u]))

  // ── Fetch payroll ─────────────────────────────────────────
  const fetchPayroll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ periode })
      if (filterStatus) params.set('status', filterStatus)
      const res  = await fetch(`/api/payroll?${params}`)
      const json = await res.json()
      if (json.success) {
        setPayrolls(json.data.payrolls)
        setSummary(json.data.summary)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [periode, filterStatus])

  // ── Fetch gaji settings ───────────────────────────────────
  const fetchGajiSettings = useCallback(async () => {
    try {
      const res  = await fetch('/api/gaji-setting')
      const json = await res.json()
      if (json.success) setGajiSettings(json.data ?? [])
    } catch (e) { console.error(e) }
  }, [])

  // ── Fetch absensi summary bulan ini ──────────────────────
  const fetchAbsensiSummary = useCallback(async () => {
    try {
      const [year, month] = periode.split('-').map(Number)
      const startDate = `${periode}-01`
      const lastDay   = new Date(year, month, 0).getDate()
      const endDate   = `${periode}-${String(lastDay).padStart(2, '0')}`

      // Fetch absensi untuk semua tanggal di periode ini
      const allAbsensi: { userId: string; status: string }[] = []

      // Fetch per hari tidak efisien — gunakan range query langsung
      const res  = await fetch(`/api/absensi?startDate=${startDate}&endDate=${endDate}`)
      const json = await res.json()
      if (json.success) {
        const list = json.data?.absensi ?? []
        list.forEach((a: { userId: string; status: string }) => allAbsensi.push(a))
      }

      // Group by userId
      const map: Record<string, AbsensiSummary> = {}
      for (const a of allAbsensi) {
        if (!map[a.userId]) map[a.userId] = { hadir: 0, terlambat: 0, izin: 0, absen: 0, total: 0 }
        const key = a.status as keyof Omit<AbsensiSummary, 'total'>
        if (key in map[a.userId]) map[a.userId][key]++
        map[a.userId].total++
      }
      setAbsensiMap(map)
    } catch (e) { console.error(e) }
  }, [periode])

  useEffect(() => { fetchPayroll() },        [fetchPayroll])
  useEffect(() => { fetchGajiSettings() },   [fetchGajiSettings])
  useEffect(() => { fetchAbsensiSummary() }, [fetchAbsensiSummary])
  useEffect(() => { refetchUsers() },        [refetchUsers])

  // ── Generate payroll ──────────────────────────────────────
  async function handleGenerate() {
    if (!confirm(`Generate payroll untuk periode ${formatPeriode(periode)}?\nKaryawan yang sudah ada payrollnya akan dilewati.`)) return

    setGenerating(true)
    setGenerateMsg('')
    try {
      // Ambil outletId dari user pertama yang ada
      const firstUser = users[0]
      const outletId  = firstUser?.outletId ?? ''
      if (!outletId) { setGenerateMsg('❌ Outlet tidak ditemukan'); return }

      const res  = await fetch('/api/payroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ outletId, periode }),
      })
      const json = await res.json()
      if (json.success) {
        setGenerateMsg(`✅ ${json.data.message}`)
        fetchPayroll()
      } else {
        setGenerateMsg(`❌ ${json.message}`)
      }
    } catch { setGenerateMsg('❌ Gagal generate payroll') }
    finally { setGenerating(false) }
  }

  // ── Buka modal edit gaji ──────────────────────────────────
  function openGajiModal(userId?: string) {
    if (userId) {
      const existing = gajiSettings.find(g => g.userId === userId)
      const user     = userMap.get(userId)
      setEditGaji(existing ?? {
        userId,
        userName:          user?.nama ?? '',
        userRole:          user?.role ?? '',
        outletId:          user?.outletId ?? null,
        skema:             'bulanan',
        gajiPokok:         0,
        gajiHarian:        0,
        tunjangan:         0,
        tarifLembur:       0,
        potonganTerlambat: 0,
      })
    } else {
      // Buka dropdown pilih user
      setEditGaji({
        userId: '', userName: '', userRole: '', outletId: null,
        skema: 'bulanan', gajiPokok: 0, gajiHarian: 0,
        tunjangan: 0, tarifLembur: 0, potonganTerlambat: 0,
      })
    }
    setShowGajiModal(true)
  }

  // Saat user dipilih di dropdown
  function handleSelectUser(userId: string) {
    const existing = gajiSettings.find(g => g.userId === userId)
    const user     = userMap.get(userId)
    setEditGaji(existing ?? {
      userId,
      userName:          user?.nama ?? '',
      userRole:          user?.role ?? '',
      outletId:          user?.outletId ?? null,
      skema:             'bulanan',
      gajiPokok:         0,
      gajiHarian:        0,
      tunjangan:         0,
      tarifLembur:       0,
      potonganTerlambat: 0,
    })
  }

  // ── Simpan setting gaji ───────────────────────────────────
  async function saveGajiSetting() {
    if (!editGaji?.userId) return
    setSavingGaji(true)
    try {
      const res  = await fetch('/api/gaji-setting', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(editGaji),
      })
      const json = await res.json()
      if (json.success) {
        setShowGajiModal(false)
        fetchGajiSettings()
      }
    } finally { setSavingGaji(false) }
  }

  // ── Slip & Bayar ──────────────────────────────────────────
  async function openSlip(payroll: Payroll) {
    setSlipModal({ open: true, data: null })
    setLoadingSlip(true)
    try {
      const res  = await fetch(`/api/payroll/${payroll.id}`)
      const json = await res.json()
      if (json.success) setSlipModal({ open: true, data: json.data })
    } finally { setLoadingSlip(false) }
  }

  async function markAsPaid(payrollId: string) {
    setPayingId(payrollId)
    try {
      const res = await fetch(`/api/payroll/${payrollId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bayar' }),
      })
      if (res.ok) fetchPayroll()
    } finally { setPayingId(null) }
  }

  // Gabungkan data payroll dengan nama terbaru
  const enrichedPayrolls = payrolls.map(p => {
    const user = userMap.get(p.userId)
    return { ...p, userName: user?.nama ?? p.userName, userRole: (user?.role?.toLowerCase() ?? p.userRole) as Role }
  })

  const summaryCards = [
    { label: 'Total Penggajian', value: formatRupiah(summary.totalPenggajian), icon: '💰', color: '#2563eb', bg: '#dbeafe' },
    { label: 'Sudah Dibayar',   value: `${summary.sudahDibayar} orang`,        icon: '✅', color: '#16a34a', bg: '#dcfce7' },
    { label: 'Belum Dibayar',   value: `${summary.belumDibayar} orang`,        icon: '⏳', color: '#d97706', bg: '#fef3c7' },
    { label: 'Total Potongan',  value: formatRupiah(summary.totalPotongan),    icon: '📉', color: '#dc2626', bg: '#fee2e2' },
  ]

  // Setting gaji per user (lookup cepat)
  const gajiSettingMap = new Map(gajiSettings.map(g => [g.userId, g]))

  return (
    <div className="page-container">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Karyawan</h1>
          <p className="page-subtitle">Penggajian periode {formatPeriode(periode)}</p>
        </div>
        <div className="header-actions">
          <input type="month" className="input-month" value={periode} onChange={e => setPeriode(e.target.value)} />
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value as PayrollStatus | '')}>
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="dibayar">Sudah Dibayar</option>
          </select>
          <button className="btn-setting" onClick={() => openGajiModal()}>⚙️ Setting Gaji</button>
          <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? '⏳ Generating...' : '▶ Generate Payroll'}
          </button>
        </div>
      </div>

      {/* ── Generate message ─────────────────────────────── */}
      {generateMsg && (
        <div className={`generate-msg ${generateMsg.startsWith('✅') ? 'generate-msg--ok' : 'generate-msg--err'}`}>
          {generateMsg}
          <button onClick={() => setGenerateMsg('')}>×</button>
        </div>
      )}

      {/* ── Summary Cards ────────────────────────────────── */}
      <div className="stats-grid">
        {summaryCards.map(({ label, value, icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg, color }}>{icon}</div>
            <div><div className="stat-value" style={{ color }}>{value}</div><div className="stat-label">{label}</div></div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>Memuat data payroll...</span></div>
        ) : enrichedPayrolls.length === 0 ? (
          <div className="empty-state">
            <span>📭</span>
            <p>Belum ada data payroll untuk periode ini</p>
            <p className="empty-hint">Klik <strong>Generate Payroll</strong> untuk membuat payroll otomatis dari data absensi</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Absensi</th>
                  <th>Skema Gaji</th>
                  <th>Potongan</th>
                  <th>Gaji Pokok</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {enrichedPayrolls.map(p => {
                  const abs = absensiMap[p.userId]
                  const gs  = gajiSettingMap.get(p.userId)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar" style={{
                            background: roleColors[p.userRole]?.bg ?? '#f1f5f9',
                            color:      roleColors[p.userRole]?.color ?? '#64748b',
                          }}>{p.userName[0]}</div>
                          <div>
                            <div className="user-name">{p.userName}</div>
                            <span className="role-badge" style={{
                              background: roleColors[p.userRole]?.bg,
                              color:      roleColors[p.userRole]?.color,
                            }}>{p.userRole}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {abs ? (
                          <div className="absensi-pills">
                            <span className="pill pill--hadir">{abs.hadir}H</span>
                            <span className="pill pill--terlambat">{abs.terlambat}T</span>
                            <span className="pill pill--izin">{abs.izin}I</span>
                            <span className="pill pill--absen">{abs.absen}A</span>
                          </div>
                        ) : (
                          <span className="text-muted">— hari</span>
                        )}
                        <div className="hari-kerja-text">{p.hariKerja} hari kerja</div>
                      </td>
                      <td>
                        <div className="skema-cell">
                          <span className={`skema-badge ${gs?.skema === 'harian' ? 'skema-badge--harian' : 'skema-badge--bulanan'}`}>
                            {gs?.skema === 'harian' ? '📅 Harian' : '📆 Bulanan'}
                          </span>
                          <button className="btn-edit-gaji" onClick={() => openGajiModal(p.userId)}>Edit</button>
                        </div>
                      </td>
                      <td className="num-cell deduction">{p.potongan > 0 ? formatRupiah(p.potongan) : '—'}</td>
                      <td className="num-cell">{formatRupiah(p.gajiPokok)}</td>
                      <td className="num-cell total">{formatRupiah(p.totalGaji)}</td>
                      <td>
                        {p.status === 'dibayar'
                          ? <span className="status-badge status-paid">✓ Dibayar</span>
                          : <span className="status-badge status-pending">⏳ Pending</span>}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button className="btn-slip" onClick={() => openSlip(p)}>Slip</button>
                          {p.status === 'pending' && p.totalGaji > 0 && (
                            <button className="btn-pay" onClick={() => markAsPaid(p.id)} disabled={payingId === p.id}>
                              {payingId === p.id ? '...' : 'Bayar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Setting Gaji ────────────────────────────── */}
      {showGajiModal && editGaji && (
        <div className="modal-overlay" onClick={() => setShowGajiModal(false)}>
          <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>⚙️ Setting Gaji Karyawan</h2>
                <p className="modal-subtitle">Konfigurasi skema dan nominal gaji</p>
              </div>
              <button className="modal-close" onClick={() => setShowGajiModal(false)}>×</button>
            </div>
            <div className="modal-body">

              {/* Dropdown pilih karyawan */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Pilih Karyawan <span className="required">*</span></label>
                <select
                  className="input"
                  value={editGaji.userId}
                  onChange={e => handleSelectUser(e.target.value)}
                >
                  <option value="">— Pilih Karyawan —</option>
                  {users.map(u => {
                    const hasGaji = gajiSettings.some(g => g.userId === u.id)
                    return (
                      <option key={u.id} value={u.id}>
                        {u.nama} ({u.role}){hasGaji ? ' ✓' : ''}
                      </option>
                    )
                  })}
                </select>
                <p className="input-hint">✓ = sudah ada setting gaji</p>
              </div>

              {editGaji.userId && (
                <>
                  {/* Skema gaji */}
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label>Skema Gaji</label>
                    <div className="skema-options">
                      <div
                        className={`skema-option ${editGaji.skema === 'bulanan' ? 'skema-option--active' : ''}`}
                        onClick={() => setEditGaji(g => g ? { ...g, skema: 'bulanan' } : g)}
                      >
                        <strong>📆 Bulanan</strong>
                        <span>Gaji tetap per bulan</span>
                      </div>
                      <div
                        className={`skema-option ${editGaji.skema === 'harian' ? 'skema-option--active' : ''}`}
                        onClick={() => setEditGaji(g => g ? { ...g, skema: 'harian' } : g)}
                      >
                        <strong>📅 Harian</strong>
                        <span>Gaji × hari hadir</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    {/* Gaji sesuai skema */}
                    {editGaji.skema === 'bulanan' ? (
                      <div className="form-group">
                        <label>Gaji Pokok (Bulanan)</label>
                        <div className="input-prefix-wrap">
                          <span className="input-prefix">Rp</span>
                          <input
                            type="number" className="input input--prefix" min={0}
                            value={editGaji.gajiPokok}
                            onChange={e => setEditGaji(g => g ? { ...g, gajiPokok: Number(e.target.value) } : g)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Gaji Per Hari</label>
                        <div className="input-prefix-wrap">
                          <span className="input-prefix">Rp</span>
                          <input
                            type="number" className="input input--prefix" min={0}
                            value={editGaji.gajiHarian}
                            onChange={e => setEditGaji(g => g ? { ...g, gajiHarian: Number(e.target.value) } : g)}
                          />
                        </div>
                        {/* Preview estimasi */}
                        {editGaji.gajiHarian > 0 && (
                          <p className="input-hint">
                            Estimasi 22 hari kerja: {formatRupiah(editGaji.gajiHarian * 22)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Tunjangan</label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">Rp</span>
                        <input
                          type="number" className="input input--prefix" min={0}
                          value={editGaji.tunjangan}
                          onChange={e => setEditGaji(g => g ? { ...g, tunjangan: Number(e.target.value) } : g)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Tarif Lembur (per jam)</label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">Rp</span>
                        <input
                          type="number" className="input input--prefix" min={0}
                          value={editGaji.tarifLembur}
                          onChange={e => setEditGaji(g => g ? { ...g, tarifLembur: Number(e.target.value) } : g)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Potongan per Keterlambatan</label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">Rp</span>
                        <input
                          type="number" className="input input--prefix" min={0}
                          value={editGaji.potonganTerlambat}
                          onChange={e => setEditGaji(g => g ? { ...g, potonganTerlambat: Number(e.target.value) } : g)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview total estimasi */}
                  <div className="gaji-preview">
                    <div className="preview-title">Preview Estimasi Gaji</div>
                    <div className="preview-rows">
                      <div className="preview-row">
                        <span>{editGaji.skema === 'harian' ? 'Gaji Harian × 22 hari' : 'Gaji Pokok'}</span>
                        <span>{formatRupiah(editGaji.skema === 'harian' ? editGaji.gajiHarian * 22 : editGaji.gajiPokok)}</span>
                      </div>
                      <div className="preview-row">
                        <span>Tunjangan</span>
                        <span>{formatRupiah(editGaji.tunjangan)}</span>
                      </div>
                      <div className="preview-row preview-row--deduction">
                        <span>Potongan (estimasi 0×)</span>
                        <span>—</span>
                      </div>
                      <div className="preview-row preview-row--total">
                        <span>Estimasi Total</span>
                        <strong>{formatRupiah(
                          (editGaji.skema === 'harian' ? editGaji.gajiHarian * 22 : editGaji.gajiPokok)
                          + editGaji.tunjangan
                        )}</strong>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowGajiModal(false)}>Batal</button>
              <button className="btn-primary" onClick={saveGajiSetting} disabled={savingGaji || !editGaji.userId}>
                {savingGaji ? 'Menyimpan...' : '💾 Simpan Setting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slip Gaji Modal ───────────────────────────────── */}
      {slipModal.open && (
        <div className="modal-overlay" onClick={() => setSlipModal({ open: false, data: null })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Slip Gaji</h2>
                {slipModal.data && <p className="modal-subtitle">{slipModal.data.userName} — {formatPeriode(slipModal.data.periode)}</p>}
              </div>
              <button className="modal-close" onClick={() => setSlipModal({ open: false, data: null })}>×</button>
            </div>
            <div className="modal-body">
              {loadingSlip ? (
                <div className="loading-state" style={{ padding: 40 }}><div className="spinner" /><span>Memuat slip...</span></div>
              ) : slipModal.data ? (
                <>
                  <div className="slip-employee">
                    <div className="slip-avatar" style={{
                      background: roleColors[slipModal.data.userRole]?.bg ?? '#f1f5f9',
                      color:      roleColors[slipModal.data.userRole]?.color ?? '#64748b',
                    }}>{slipModal.data.userName[0]}</div>
                    <div>
                      <div className="slip-name">{slipModal.data.userName}</div>
                      <div className="slip-meta">
                        <span className="role-badge" style={{
                          background: roleColors[slipModal.data.userRole]?.bg,
                          color:      roleColors[slipModal.data.userRole]?.color,
                        }}>{slipModal.data.userRole}</span>
                        <span className="slip-outlet">🏪 {slipModal.data.outletName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="slip-summary">
                    <div className="slip-summary-item"><span>Hari Kerja</span><strong>{slipModal.data.hariKerja} hari</strong></div>
                    <div className="slip-summary-item"><span>Jam Lembur</span><strong>{slipModal.data.lemburJam} jam</strong></div>
                    <div className="slip-summary-item"><span>Periode</span><strong>{formatPeriode(slipModal.data.periode)}</strong></div>
                  </div>

                  <div className="slip-breakdown">
                    <div className="breakdown-section">
                      <div className="breakdown-title income-title">Pendapatan</div>
                      {slipModal.data.breakdown.filter(b => b.type === 'income').map(b => (
                        <div key={b.label} className="breakdown-row">
                          <span>{b.label}</span>
                          <span className="income-amount">{formatRupiah(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="breakdown-divider" />
                    <div className="breakdown-section">
                      <div className="breakdown-title deduction-title">Potongan</div>
                      {slipModal.data.breakdown.filter(b => b.type === 'deduction').map(b => (
                        <div key={b.label} className="breakdown-row">
                          <span>{b.label}</span>
                          <span className="deduction-amount">– {formatRupiah(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="breakdown-total">
                      <span>Total Gaji Bersih</span>
                      <strong className="total-amount">{formatRupiah(slipModal.data.totalGaji)}</strong>
                    </div>
                  </div>

                  <div className="slip-status">
                    {slipModal.data.status === 'dibayar'
                      ? <span className="status-badge status-paid">✓ Sudah Dibayar</span>
                      : <span className="status-badge status-pending">⏳ Belum Dibayar</span>}
                  </div>
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSlipModal({ open: false, data: null })}>Tutup</button>
              {slipModal.data && <button className="btn-print" onClick={() => window.print()}>🖨️ Cetak Slip</button>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-container { padding: 28px; max-width: 1200px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: #64748b; }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .input-month, .filter-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: white; outline: none; cursor: pointer; }
        .btn-primary { padding: 9px 16px; background: #2563eb; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .btn-secondary { padding: 9px 16px; background: white; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-setting { padding: 9px 16px; background: #f8fafc; color: #374151; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-setting:hover { background: #f1f5f9; }

        .generate-msg { padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .generate-msg--ok { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
        .generate-msg--err { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
        .generate-msg button { background: none; border: none; font-size: 16px; cursor: pointer; opacity: .6; }

        .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 14px; padding: 16px 18px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,.05); display: flex; align-items: center; gap: 14px; }
        .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .stat-value { font-size: 15px; font-weight: 700; line-height: 1.3; }
        .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }

        .table-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px; color: #94a3b8; font-size: 14px; text-align: center; }
        .empty-state span { font-size: 40px; }
        .empty-hint { font-size: 12px; color: #cbd5e1; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .table-scroll { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
        .data-table td { padding: 12px 14px; border-bottom: 1px solid #f8fafc; font-size: 13px; vertical-align: middle; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover td { background: #fafbff; }

        .user-cell { display: flex; align-items: center; gap: 10px; }
        .user-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .user-name { font-weight: 600; color: #0f172a; font-size: 13px; }
        .role-badge { display: inline-block; padding: 1px 7px; border-radius: 20px; font-size: 10px; font-weight: 600; margin-top: 2px; }

        .absensi-pills { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; }
        .pill { padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .pill--hadir    { background: #dcfce7; color: #16a34a; }
        .pill--terlambat { background: #fef3c7; color: #d97706; }
        .pill--izin     { background: #ede9fe; color: #7c3aed; }
        .pill--absen    { background: #fee2e2; color: #dc2626; }
        .hari-kerja-text { font-size: 11px; color: #94a3b8; }
        .text-muted { color: #cbd5e1; font-size: 12px; }

        .skema-cell { display: flex; align-items: center; gap: 8px; }
        .skema-badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .skema-badge--bulanan { background: #dbeafe; color: #2563eb; }
        .skema-badge--harian  { background: #fef3c7; color: #d97706; }
        .btn-edit-gaji { padding: 3px 8px; border: 1px solid #e2e8f0; background: white; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; color: #64748b; }
        .btn-edit-gaji:hover { background: #f8fafc; }

        .num-cell { text-align: right; font-weight: 500; white-space: nowrap; }
        .deduction { color: #dc2626; }
        .total { color: #2563eb; font-weight: 700; font-size: 14px !important; }
        .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; white-space: nowrap; }
        .status-paid    { background: #dcfce7; color: #16a34a; }
        .status-pending { background: #fef3c7; color: #d97706; }
        .actions-cell { display: flex; gap: 6px; }
        .btn-slip { padding: 5px 10px; border: 1px solid #e2e8f0; background: white; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; color: #64748b; }
        .btn-slip:hover { background: #f8fafc; }
        .btn-pay { padding: 5px 10px; background: #2563eb; color: white; border: none; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .btn-pay:hover { background: #1d4ed8; }
        .btn-pay:disabled { opacity: .6; cursor: not-allowed; }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.2); max-height: 90vh; overflow-y: auto; }
        .modal--wide { max-width: 580px; }
        .modal-header { padding: 20px 24px 16px; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; background: white; z-index: 1; }
        .modal-header h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
        .modal-subtitle { font-size: 12px; color: #64748b; }
        .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; flex-shrink: 0; }
        .modal-body { padding: 20px 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9; position: sticky; bottom: 0; background: white; }

        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #374151; }
        .required { color: #dc2626; }
        .input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; width: 100%; background: white; }
        .input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
        .input-hint { font-size: 11px; color: #94a3b8; margin-top: 3px; }
        .input-prefix-wrap { position: relative; }
        .input-prefix { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #94a3b8; font-weight: 600; pointer-events: none; }
        .input--prefix { padding-left: 30px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .skema-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .skema-option { padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all .2s; }
        .skema-option strong { display: block; font-size: 14px; margin-bottom: 3px; }
        .skema-option span { font-size: 11px; color: #94a3b8; }
        .skema-option:hover { border-color: #94a3b8; }
        .skema-option--active { border-color: #2563eb; background: #eff6ff; }
        .skema-option--active strong { color: #2563eb; }

        .gaji-preview { background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin-top: 16px; }
        .preview-title { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
        .preview-rows { display: flex; flex-direction: column; gap: 6px; }
        .preview-row { display: flex; justify-content: space-between; font-size: 13px; color: #374151; }
        .preview-row--deduction { color: #dc2626; }
        .preview-row--total { font-weight: 700; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; }

        /* Slip */
        .slip-employee { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
        .slip-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
        .slip-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .slip-meta { display: flex; align-items: center; gap: 8px; }
        .slip-outlet { font-size: 11px; color: #64748b; }
        .slip-summary { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
        .slip-summary-item { background: #f8fafc; border-radius: 10px; padding: 10px 12px; }
        .slip-summary-item span { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 3px; }
        .slip-summary-item strong { font-size: 13px; font-weight: 700; }
        .slip-breakdown { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 14px; }
        .breakdown-section { padding: 12px 16px; }
        .breakdown-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
        .income-title { color: #16a34a; }
        .deduction-title { color: #dc2626; }
        .breakdown-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; color: #374151; }
        .income-amount { font-weight: 600; color: #16a34a; }
        .deduction-amount { font-weight: 600; color: #dc2626; }
        .breakdown-divider { height: 1px; background: #f1f5f9; }
        .breakdown-total { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
        .breakdown-total span { font-size: 13px; font-weight: 600; }
        .total-amount { font-size: 18px; font-weight: 800; color: #2563eb; }
        .slip-status { text-align: center; }
        .btn-print { padding: 9px 18px; background: #1e293b; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }

        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2,1fr); }
          .page-container { padding: 16px; }
          .form-grid { grid-template-columns: 1fr; }
          .slip-summary { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  )
}