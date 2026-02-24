'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShiftType } from '@/types/karyawan'
import { useUsers } from '@/hooks/useUsers'

// ── Config ────────────────────────────────────────────────────
const SHIFT_CONFIG: Record<ShiftType, { label: string; time: string; color: string; bg: string }> = {
  pagi:  { label: 'Pagi',  time: '08–17', color: '#2563eb', bg: '#dbeafe' },
  sore:  { label: 'Sore',  time: '14–22', color: '#d97706', bg: '#fef3c7' },
  malam: { label: 'Malam', time: '22–06', color: '#7c3aed', bg: '#ede9fe' },
  libur: { label: 'Libur', time: '—',     color: '#94a3b8', bg: '#f1f5f9' },
}

const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const roleColors: Record<string, { color: string; bg: string }> = {
  superadmin: { color: '#d97706', bg: '#fef3c7' },
  admin:      { color: '#2563eb', bg: '#dbeafe' },
  manager:    { color: '#7c3aed', bg: '#ede9fe' },
  kasir:      { color: '#0d9488', bg: '#ccfbf1' },
}

function getWeekDates(offsetWeek = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offsetWeek * 7)
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function formatWeekLabel(dates: string[]) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const start = new Date(dates[0]).toLocaleDateString('id-ID', opts)
  const end   = new Date(dates[6]).toLocaleDateString('id-ID', { ...opts, year: 'numeric' })
  return `${start} – ${end}`
}

type ScheduleRow = {
  userId:   string
  userName: string
  userRole: string
  days:     Record<string, { id: string; shift: ShiftType; keterangan: string | null } | null>
}

// ── Component ─────────────────────────────────────────────────
export default function JadwalPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDates, setWeekDates]   = useState<string[]>(getWeekDates(0))
  const [schedule, setSchedule]     = useState<ScheduleRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [editModal, setEditModal]   = useState<{
    open: boolean; userId: string; userName: string
    tanggal: string; shift: ShiftType; jadwalId: string | null
  }>({ open: false, userId: '', userName: '', tanggal: '', shift: 'pagi', jadwalId: null })
  const [saving, setSaving] = useState(false)

  // ── Gunakan hook terpusat — otomatis sinkron dengan perubahan di Users ──
  const { users, refetch: refetchUsers } = useUsers()

  useEffect(() => { setWeekDates(getWeekDates(weekOffset)) }, [weekOffset])

  const fetchJadwal = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ startDate: weekDates[0], endDate: weekDates[6] })
      const res    = await fetch(`/api/jadwal?${params}`)
      const json   = await res.json()

      if (json.success) {
        // Merge jadwal dari API dengan daftar user terbaru
        // Sehingga user baru yang ditambah di Users langsung muncul di grid
        const jadwalMap = new Map<string, ScheduleRow>(
          (json.data.jadwal as ScheduleRow[]).map(r => [r.userId, r])
        )

        // Tambahkan user yang belum ada jadwalnya agar tetap muncul di grid
        const merged: ScheduleRow[] = users.map(u => {
          const existing = jadwalMap.get(u.id)
          return existing ?? {
            userId:   u.id,
            userName: u.nama,
            userRole: u.role.toLowerCase(),
            days:     {},
          }
        })

        setSchedule(merged.length > 0 ? merged : json.data.jadwal)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [weekDates, users])

  useEffect(() => { fetchJadwal() }, [fetchJadwal])

  // Refetch users saat halaman mount agar selalu sinkron
  useEffect(() => { refetchUsers() }, [refetchUsers])

  function openEditModal(row: ScheduleRow, tanggal: string) {
    const existing = row.days[tanggal]
    setEditModal({
      open:     true,
      userId:   row.userId,
      userName: row.userName,
      tanggal,
      shift:    existing?.shift ?? 'pagi',
      jadwalId: existing?.id ?? null,
    })
  }

  async function saveShift() {
    setSaving(true)
    try {
      const method = editModal.jadwalId ? 'PUT' : 'POST'
      const url    = editModal.jadwalId ? `/api/jadwal/${editModal.jadwalId}` : '/api/jadwal'

      // Ambil outletId dari user yang dipilih
      const user     = users.find(u => u.id === editModal.userId)
      const outletId = user?.outletId ?? 'o1'

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:   editModal.userId,
          outletId,
          tanggal:  editModal.tanggal,
          shift:    editModal.shift,
        }),
      })
      setEditModal(m => ({ ...m, open: false }))
      fetchJadwal()
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="page-container">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Jadwal Karyawan</h1>
          <p className="page-subtitle">{formatWeekLabel(weekDates)}</p>
        </div>
        <div className="week-nav">
          <button className="week-btn" onClick={() => setWeekOffset(w => w - 1)}>‹ Minggu Lalu</button>
          <button className="week-btn week-btn--today" onClick={() => setWeekOffset(0)}>Minggu Ini</button>
          <button className="week-btn" onClick={() => setWeekOffset(w => w + 1)}>Minggu Depan ›</button>
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────── */}
      <div className="legend">
        {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG[ShiftType]][]).map(([key, cfg]) => (
          <div key={key} className="legend-item">
            <div className="legend-dot" style={{ background: cfg.bg, border: `2px solid ${cfg.color}` }} />
            <span>{cfg.label}</span>
            <span className="legend-time">{cfg.time}</span>
          </div>
        ))}
      </div>

      {/* ── Schedule Grid ────────────────────────────────── */}
      {loading ? (
        <div className="loading-state"><div className="spinner" /><span>Memuat jadwal...</span></div>
      ) : (
        <div className="grid-card">
          <div className="schedule-grid" style={{ gridTemplateColumns: `200px repeat(7, 1fr)` }}>
            {/* Header */}
            <div className="grid-cell grid-cell--header grid-cell--name">Karyawan</div>
            {weekDates.map((date, i) => {
              const isToday = date === today
              return (
                <div key={date} className={`grid-cell grid-cell--header ${isToday ? 'grid-cell--today' : ''}`}>
                  <div className="day-label">{DAYS_ID[i]}</div>
                  <div className={`day-date ${isToday ? 'day-date--today' : ''}`}>
                    {new Date(date).getDate()}
                  </div>
                </div>
              )
            })}

            {/* Rows */}
            {schedule.map(row => (
              <>
                <div key={`name-${row.userId}`} className="grid-cell grid-cell--name">
                  <div className="user-avatar-sm" style={{
                    background: roleColors[row.userRole]?.bg ?? '#f1f5f9',
                    color:      roleColors[row.userRole]?.color ?? '#64748b',
                  }}>
                    {row.userName[0]}
                  </div>
                  <div>
                    <div className="username-text">{row.userName}</div>
                    <span className="role-badge-sm" style={{
                      background: roleColors[row.userRole]?.bg,
                      color:      roleColors[row.userRole]?.color,
                    }}>
                      {row.userRole}
                    </span>
                  </div>
                </div>

                {weekDates.map(date => {
                  const item    = row.days[date]
                  const cfg     = item ? SHIFT_CONFIG[item.shift] : null
                  const isToday = date === today
                  return (
                    <div
                      key={`${row.userId}-${date}`}
                      className={`grid-cell grid-cell--shift ${isToday ? 'grid-cell--today-col' : ''}`}
                      onClick={() => openEditModal(row, date)}
                      title="Klik untuk edit"
                    >
                      {item && cfg ? (
                        <div className="shift-block" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color }}>
                          <span className="shift-label">{cfg.label}</span>
                          <span className="shift-time">{cfg.time}</span>
                        </div>
                      ) : (
                        <div className="shift-empty">+</div>
                      )}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────── */}
      {editModal.open && (
        <div className="modal-overlay" onClick={() => setEditModal(m => ({ ...m, open: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Edit Shift</h2>
                <p className="modal-subtitle">
                  {editModal.userName} —{' '}
                  {new Date(editModal.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
              </div>
              <button className="modal-close" onClick={() => setEditModal(m => ({ ...m, open: false }))}>×</button>
            </div>
            <div className="modal-body">
              <p className="shift-label-form">Pilih Shift</p>
              <div className="shift-options">
                {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG[ShiftType]][]).map(([key, cfg]) => (
                  <div
                    key={key}
                    className={`shift-option ${editModal.shift === key ? 'shift-option--active' : ''}`}
                    style={editModal.shift === key ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color } : {}}
                    onClick={() => setEditModal(m => ({ ...m, shift: key }))}
                  >
                    <strong>{cfg.label}</strong>
                    <span>{cfg.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditModal(m => ({ ...m, open: false }))}>Batal</button>
              <button className="btn-primary" onClick={saveShift} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-container { padding: 28px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: #64748b; }
        .week-nav { display: flex; gap: 6px; }
        .week-btn { padding: 8px 14px; border: 1px solid #e2e8f0; background: white; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; color: #374151; transition: all .2s; }
        .week-btn:hover { background: #f1f5f9; }
        .week-btn--today { background: #2563eb; color: white; border-color: #2563eb; }
        .week-btn--today:hover { background: #1d4ed8; }
        .legend { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
        .legend-dot { width: 14px; height: 14px; border-radius: 4px; }
        .legend-time { color: #94a3b8; }
        .loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 80px; color: #64748b; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .grid-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); overflow-x: auto; }
        .schedule-grid { display: grid; min-width: 700px; }
        .grid-cell { padding: 10px 12px; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .grid-cell--header { background: #f8fafc; text-align: center; font-size: 11px; font-weight: 600; color: #64748b; }
        .grid-cell--name { display: flex; align-items: center; gap: 8px; background: white; position: sticky; left: 0; z-index: 2; }
        .grid-cell--today { background: #eff6ff; }
        .grid-cell--today-col { background: #fafbff; }
        .grid-cell--shift { cursor: pointer; transition: background .15s; min-height: 60px; display: flex; align-items: center; justify-content: center; }
        .grid-cell--shift:hover { background: #f8fafc; }
        .day-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; margin-bottom: 2px; }
        .day-date { font-size: 15px; font-weight: 700; color: #374151; }
        .day-date--today { background: #2563eb; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 13px; }
        .user-avatar-sm { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .username-text { font-size: 12px; font-weight: 600; color: #0f172a; white-space: nowrap; }
        .role-badge-sm { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 20px; }
        .shift-block { padding: 4px 8px; border-radius: 7px; border: 1.5px solid; text-align: center; min-width: 60px; }
        .shift-label { display: block; font-size: 12px; font-weight: 700; }
        .shift-time { display: block; font-size: 10px; opacity: .75; }
        .shift-empty { color: #cbd5e1; font-size: 18px; font-weight: 300; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: white; border-radius: 16px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
        .modal-header { padding: 20px 24px 16px; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
        .modal-header h2 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
        .modal-subtitle { font-size: 12px; color: #64748b; }
        .modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; }
        .modal-body { padding: 20px 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9; }
        .shift-label-form { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 12px; }
        .shift-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .shift-option { padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all .2s; }
        .shift-option strong { display: block; font-size: 14px; margin-bottom: 2px; }
        .shift-option span { font-size: 11px; color: #94a3b8; }
        .shift-option:hover { border-color: #94a3b8; }
        .shift-option--active strong { font-weight: 700; }
        .btn-primary { padding: 9px 18px; background: #2563eb; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .btn-secondary { padding: 9px 18px; background: white; color: #64748b; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
        @media (max-width: 700px) { .page-container { padding: 16px; } .week-nav { width: 100%; justify-content: space-between; } }
      `}</style>
    </div>
  )
}