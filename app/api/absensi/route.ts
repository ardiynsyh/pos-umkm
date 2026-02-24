import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { AbsensiStatus, CreateAbsensiInput } from '@/types/karyawan'

// GET /api/absensi
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const tanggal   = searchParams.get('tanggal')   ?? undefined
    const startDate = searchParams.get('startDate') ?? undefined  // ← baru: range filter
    const endDate   = searchParams.get('endDate')   ?? undefined  // ← baru: range filter
    const outletId  = searchParams.get('outletId')  ?? undefined
    const userId    = searchParams.get('userId')    ?? undefined
    const status    = searchParams.get('status')    ?? undefined

    const data = await prisma.absensi.findMany({
      where: {
        ...(tanggal   && { tanggal }),
        // Range filter: gunakan gte/lte jika ada startDate/endDate
        ...(startDate && endDate && {
          tanggal: { gte: startDate, lte: endDate },
        }),
        ...(startDate && !endDate && { tanggal: { gte: startDate } }),
        ...(endDate   && !startDate && { tanggal: { lte: endDate } }),
        ...(outletId  && { outletId }),
        ...(userId    && { userId }),
        ...(status    && { status: status as AbsensiStatus }),
      },
      include: {
        user:   { select: { id: true, nama: true, role: true } },
        outlet: { select: { id: true, nama: true } },
      },
      orderBy: { tanggal: 'desc' },
    })

    const absensi = data.map(d => ({
      id:         d.id,
      userId:     d.userId,
      userName:   d.user.nama,
      userRole:   d.user.role,
      outletId:   d.outletId,
      outletName: d.outlet.nama,
      tanggal:    d.tanggal,
      jamMasuk:   d.jamMasuk,
      jamKeluar:  d.jamKeluar,
      shift:      d.shift,
      status:     d.status,
      keterangan: d.keterangan,
      createdAt:  d.createdAt.toISOString(),
      updatedAt:  d.updatedAt.toISOString(),
    }))

    return apiSuccess({
      absensi,
      summary: {
        hadir:     absensi.filter(d => d.status === 'hadir').length,
        terlambat: absensi.filter(d => d.status === 'terlambat').length,
        izin:      absensi.filter(d => d.status === 'izin').length,
        absen:     absensi.filter(d => d.status === 'absen').length,
      },
    })
  } catch (error) {
    console.error('[GET /api/absensi]', error)
    return apiError('Gagal mengambil data absensi', 500)
  }
}

// POST /api/absensi
export async function POST(req: NextRequest) {
  try {
    const body: CreateAbsensiInput = await req.json()

    if (!body.userId || !body.outletId || !body.tanggal || !body.shift || !body.status) {
      return apiError('Field userId, outletId, tanggal, shift, status wajib diisi')
    }

    const existing = await prisma.absensi.findFirst({
      where: { userId: body.userId, tanggal: body.tanggal },
    })
    if (existing) return apiError('Absensi untuk user dan tanggal ini sudah ada', 409)

    const created = await prisma.absensi.create({
      data: {
        userId:     body.userId,
        outletId:   body.outletId,
        tanggal:    body.tanggal,
        jamMasuk:   body.jamMasuk   ?? null,
        jamKeluar:  body.jamKeluar  ?? null,
        shift:      body.shift,
        status:     body.status,
        keterangan: body.keterangan ?? null,
      },
    })

    return apiSuccess(created, 201)
  } catch (error) {
    console.error('[POST /api/absensi]', error)
    return apiError('Gagal membuat data absensi', 500)
  }
}
