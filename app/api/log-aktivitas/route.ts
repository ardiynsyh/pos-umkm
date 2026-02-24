import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiPaginated, apiError, parsePagination } from '@/lib/api-helpers'
import { UserRole } from '@prisma/client'

// GET /api/log-aktivitas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const search    = searchParams.get('search')    ?? ''
    const role      = searchParams.get('role')      ?? ''
    const type      = searchParams.get('type')      ?? ''
    const startDate = searchParams.get('startDate') ?? ''
    const endDate   = searchParams.get('endDate')   ?? ''
    const outletId  = searchParams.get('outletId')  ?? ''
    const { page, limit, offset } = parsePagination(searchParams)

    // Validasi role jika ada
    const validRoles = Object.values(UserRole)
    if (role && !validRoles.includes(role as UserRole)) {
      return apiError('Role tidak valid', 400)
    }

    // ── Kalau filter by role, cari userId dulu ────────────────
    let userIdFilter: string[] | undefined
    if (role) {
      const usersWithRole = await prisma.user.findMany({
        where: { role: role as UserRole },
        select: { id: true },
      })
      userIdFilter = usersWithRole.map(u => u.id)
      // Kalau tidak ada user dengan role tersebut, return kosong
      if (userIdFilter.length === 0) {
        return apiPaginated([], 0, page, limit)
      }
    }

    // ── Kalau filter by search nama user, cari userId dulu ────
    let searchUserIds: string[] | undefined
    if (search) {
      const matchingUsers = await prisma.user.findMany({
        where: { nama: { contains: search, mode: 'insensitive' } },
        select: { id: true },
      })
      searchUserIds = matchingUsers.map(u => u.id)
    }

    // ── Build where clause (tanpa relasi) ─────────────────────
    const where = {
      ...(type     && { type }),
      ...(outletId && { outletId }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate   && { createdAt: { lte: new Date(endDate + 'T23:59:59') } }),
      // Filter role via userId list
      ...(userIdFilter && { userId: { in: userIdFilter } }),
      // Filter search: action ATAU userId dari nama yang cocok
      ...(search && {
        OR: [
          { action: { contains: search, mode: 'insensitive' as const } },
          ...(searchUserIds && searchUserIds.length > 0
            ? [{ userId: { in: searchUserIds } }]
            : []
          ),
        ],
      }),
    }

    // ── Query paralel count + data ────────────────────────────
    const [total, logs] = await Promise.all([
      prisma.logAktivitas.count({ where }),
      prisma.logAktivitas.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        // Tidak pakai include — relasi belum ada di schema
      }),
    ])

    // ── Ambil data user & outlet secara terpisah ──────────────
    const userIds   = [...new Set(logs.map(l => l.userId))]
    const outletIds = [...new Set(logs.map(l => l.outletId))]

    const [users, outlets] = await Promise.all([
      prisma.user.findMany({
        where:  { id: { in: userIds } },
        select: { id: true, nama: true, role: true },
      }),
      prisma.outlet.findMany({
        where:  { id: { in: outletIds } },
        select: { id: true, nama: true },
      }),
    ])

    const userMap   = new Map(users.map(u => [u.id, u]))
    const outletMap = new Map(outlets.map(o => [o.id, o]))

    // ── Mapping ke shape frontend ─────────────────────────────
    const data = logs.map(l => ({
      id:         l.id,
      userId:     l.userId,
      userName:   userMap.get(l.userId)?.nama   ?? l.userId,
      userRole:   userMap.get(l.userId)?.role   ?? '-',
      outletId:   l.outletId,
      outletName: outletMap.get(l.outletId)?.nama ?? l.outletId,
      action:     l.action,
      type:       l.type,
      meta:       l.meta,
      ipAddress:  l.ipAddress,
      createdAt:  l.createdAt.toISOString(),
    }))

    return apiPaginated(data, total, page, limit)
  } catch (error) {
    console.error('[GET /api/log-aktivitas]', error)
    return apiError('Gagal mengambil log aktivitas', 500)
  }
}