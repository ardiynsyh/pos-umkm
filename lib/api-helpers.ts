import { NextRequest, NextResponse } from 'next/server'

// ── Standard API Response Helpers ──────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 400, errors?: unknown) {
  return NextResponse.json(
    { success: false, message, ...(errors ? { errors } : {}) },
    { status }
  )
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// ── Parse pagination params ─────────────────────────────────
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

// ── Parse date range ────────────────────────────────────────
export function parseDateRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate') ?? undefined
  const endDate = searchParams.get('endDate') ?? undefined
  return { startDate, endDate }
}

// ── Auth Helpers ────────────────────────────────────────────

type Role = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'KASIR'

export interface AuthContext {
  tenantId: string | null
  userId:   string | null
  role:     Role | null
  isSuperAdmin: boolean
  isAdmin:      boolean
  isOwner:      boolean // SUPERADMIN atau ADMIN
}

/**
 * Ekstrak auth context dari header request.
 * Header di-inject otomatis oleh middleware dari cookie.
 *
 * Contoh penggunaan:
 *   const auth = getAuth(req)
 *   if (!auth.tenantId) return apiError('Unauthorized', 401)
 */
export function getAuth(req: NextRequest): AuthContext {
  const tenantId = req.headers.get('x-tenant-id')
  const userId   = req.headers.get('x-user-id')
  const role     = req.headers.get('x-user-role') as Role | null

  return {
    tenantId,
    userId,
    role,
    isSuperAdmin: role === 'SUPERADMIN',
    isAdmin:      role === 'ADMIN',
    isOwner:      role === 'SUPERADMIN' || role === 'ADMIN',
  }
}

/**
 * Validasi auth — return AuthContext jika valid, NextResponse 401 jika tidak.
 * Gunakan pattern: const auth = requireAuth(req); if (auth instanceof NextResponse) return auth
 *
 * @param req      - NextRequest
 * @param ownerOnly - jika true, hanya SUPERADMIN & ADMIN yang boleh akses
 * @param superAdminOnly - jika true, hanya SUPERADMIN yang boleh akses
 */
export function requireAuth(
  req: NextRequest,
  options: { ownerOnly?: boolean; superAdminOnly?: boolean } = {}
): AuthContext | NextResponse {
  const auth = getAuth(req)

  // Harus punya tenantId atau jadi SUPERADMIN
  if (!auth.tenantId && !auth.isSuperAdmin) {
    return apiError('Unauthorized', 401)
  }

  if (options.superAdminOnly && !auth.isSuperAdmin) {
    return apiError('Forbidden: hanya SuperAdmin yang dapat mengakses', 403)
  }

  if (options.ownerOnly && !auth.isOwner) {
    return apiError('Forbidden: hanya Admin atau SuperAdmin yang dapat mengakses', 403)
  }

  return auth
}