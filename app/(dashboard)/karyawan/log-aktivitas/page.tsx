'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LogAktivitas, LogType, Role } from '@/types/karyawan'

// ── Config ────────────────────────────────────────────────────
const LOG_TYPE_CONFIG: Record<LogType, { label: string; icon: string; color: string; bg: string }> = {
  login:           { label: 'Login',           icon: '🔑', color: '#16a34a', bg: '#dcfce7' },
  logout:          { label: 'Logout',          icon: '🚪', color: '#64748b', bg: '#f1f5f9' },
  transaksi:       { label: 'Transaksi',       icon: '💰', color: '#2563eb', bg: '#dbeafe' },
  user_management: { label: 'User Mgmt',       icon: '👤', color: '#d97706', bg: '#fef3c7' },
  jadwal:          { label: 'Jadwal',          icon: '📅', color: '#7c3aed', bg: '#ede9fe' },
  produk:          { label: 'Produk',          icon: '📦', color: '#0d9488', bg: '#ccfbf1' },
  pengeluaran:     { label: 'Pengeluaran',     icon: '💸', color: '#dc2626', bg: '#fee2e2' },
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  superadmin: { label: 'Superadmin', color: '#d97706', bg: '#fef3c7' },
  admin:      { label: 'Admin',      color: '#2563eb', bg: '#dbeafe' },
  manager:    { label: 'Manager',    color: '#7c3aed', bg: '#ede9fe' },
  kasir:      { label: 'Kasir',      color: '#0d9488', bg: '#ccfbf1' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Component ─────────────────────────────────────────────────
export default function LogAktivitasPage() {
  const [logs, setLogs] = useState<LogAktivitas[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch]       = useState('')
  const [filterRole, setFilterRole] = useState<Role | ''>('')
  const [filterType, setFilterType] = useState<LogType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')

  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '15' })
      if (search)      params.set('search', search)
      if (filterRole)  params.set('role', filterRole)
      if (filterType)  params.set('type', filterType)
      if (startDate)   params.set('startDate', startDate)
      if (endDate)     params.set('endDate', endDate)

      const res  = await fetch(`/api/log-aktivitas?${params}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
        setTotal(json.meta.total)
        setTotalPages(json.meta.totalPages)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterRole, filterType, startDate, endDate])

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      fetchLogs(1)
    }, 400)
  }, [search, filterRole, filterType, startDate, endDate, fetchLogs])

  function resetFilters() {
    setSearch('')
    setFilterRole('')
    setFilterType('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasFilters = search || filterRole || filterType || startDate || endDate

  return (
    <div className="page-container">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Log Aktivitas</h1>
          <p className="page-subtitle">Rekam jejak seluruh aktivitas pengguna</p>
        </div>
        {hasFilters && (
          <button className="btn-reset" onClick={resetFilters}>
            ✕ Reset Filter
          </button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="filters-row">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Cari nama atau aktivitas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value as Role | '')}>
          <option value="">Semua Role</option>
          {Object.entries(ROLE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value as LogType | '')}>
          <option value="">Semua Tipe</option>
          {Object.entries(LOG_TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <input type="date" className="filter-date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Dari tanggal" />
        <input type="date" className="filter-date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="Sampai tanggal" />
      </div>

      {/* ── Results count ────────────────────────────────── */}
      <div className="results-info">
        {!loading && <span>{total} aktivitas ditemukan</span>}
      </div>

      {/* ── Timeline ─────────────────────────────────────── */}
      <div className="timeline-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Memuat log aktivitas...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <span>📭</span>
            <p>Tidak ada log yang sesuai filter</p>
          </div>
        ) : (
          <div className="timeline">
            {logs.map((log, i) => {
              const typeCfg = LOG_TYPE_CONFIG[log.type] ?? LOG_TYPE_CONFIG.login
              const roleCfg = ROLE_CONFIG[log.userRole] ?? ROLE_CONFIG.kasir

              return (
                <div key={log.id} className="timeline-item">
                  {/* Dot + line */}
                  <div className="timeline-track">
                    <div className="timeline-dot" style={{ background: typeCfg.color }} />
                    {i < logs.length - 1 && <div className="timeline-line" />}
                  </div>

                  {/* Content */}
                  <div className="timeline-content">
                    <div className="log-header">
                      <div className="log-meta">
                        <span className="log-icon" style={{ background: typeCfg.bg }}>{typeCfg.icon}</span>
                        <span className="log-user">{log.userName}</span>
                        <span className="role-badge" style={{ background: roleCfg.bg, color: roleCfg.color }}>
                          {roleCfg.label}
                        </span>
                        <span className="type-badge" style={{ background: typeCfg.bg, color: typeCfg.color }}>
                          {typeCfg.label}
                        </span>
                      </div>
                      <div className="log-time" title={formatDateTime(log.createdAt)}>
                        {timeAgo(log.createdAt)}
                      </div>
                    </div>
                    <p className="log-action">{log.action}</p>
                    <div className="log-footer">
                      <span className="log-outlet">🏪 {log.outletName}</span>
                      {log.ipAddress && <span className="log-ip">🌐 {log.ipAddress}</span>}
                      <span className="log-timestamp">{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => { const p = page - 1; setPage(p); fetchLogs(p) }}
          >
            ‹ Prev
          </button>
          <span className="page-info">Halaman {page} dari {totalPages}</span>
          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => { const p = page + 1; setPage(p); fetchLogs(p) }}
          >
            Next ›
          </button>
        </div>
      )}

      <style>{`
        .page-container { padding: 28px; max-width: 1100px; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .page-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: #64748b; }
        .btn-reset { padding: 8px 14px; background: #fee2e2; color: #dc2626; border: none; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; }

        .filters-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .search-wrap { position: relative; flex: 1; min-width: 200px; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; }
        .search-input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; outline: none; }
        .search-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
        .filter-select, .filter-date { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; background: white; outline: none; cursor: pointer; }
        .filter-select:focus, .filter-date:focus { border-color: #2563eb; }
        .results-info { font-size: 12px; color: #94a3b8; margin-bottom: 14px; min-height: 18px; }

        .timeline-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: #94a3b8; font-size: 14px; }
        .empty-state span { font-size: 40px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .timeline { padding: 4px 0; }
        .timeline-item { display: flex; gap: 0; padding: 0 20px; }
        .timeline-track { display: flex; flex-direction: column; align-items: center; width: 24px; flex-shrink: 0; padding-top: 16px; }
        .timeline-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .timeline-line { flex: 1; width: 2px; background: #f1f5f9; margin-top: 4px; min-height: 24px; }
        .timeline-content { flex: 1; padding: 14px 0 14px 14px; border-bottom: 1px solid #f8fafc; }
        .timeline-item:last-child .timeline-content { border-bottom: none; }

        .log-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 12px; }
        .log-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .log-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
        .log-user { font-size: 13px; font-weight: 600; color: #0f172a; }
        .role-badge, .type-badge { padding: 1px 7px; border-radius: 20px; font-size: 10px; font-weight: 600; }
        .log-time { font-size: 11px; color: #94a3b8; white-space: nowrap; flex-shrink: 0; }
        .log-action { font-size: 13px; color: #374151; margin-bottom: 8px; line-height: 1.5; }
        .log-footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .log-outlet, .log-ip, .log-timestamp { font-size: 11px; color: #94a3b8; }

        .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
        .page-btn { padding: 8px 16px; border: 1px solid #e2e8f0; background: white; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; color: #374151; }
        .page-btn:disabled { opacity: .4; cursor: not-allowed; }
        .page-btn:not(:disabled):hover { background: #f8fafc; }
        .page-info { font-size: 13px; color: #64748b; }

        @media (max-width: 700px) {
          .page-container { padding: 16px; }
          .filters-row { flex-direction: column; }
          .filter-select, .filter-date { width: 100%; }
        }
      `}</style>
    </div>
  )
}
