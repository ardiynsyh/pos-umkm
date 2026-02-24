import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { CreateJadwalInput } from '@/types/karyawan'

// GET /api/jadwal
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const outletId  = searchParams.get('outletId')  ?? undefined
    const startDate = searchParams.get('startDate') ?? undefined
    const endDate   = searchParams.get('endDate')   ?? undefined
    const userId    = searchParams.get('userId')    ?? undefined

    const jadwalList = await prisma.jadwal.findMany({
      where: {
        ...(outletId  && { outletId }),
        ...(userId    && { userId }),
        ...(startDate && { tanggal: { gte: startDate } }),
        ...(endDate   && { tanggal: { lte: endDate } }),
      },
      include: {
        user: { select: { id: true, nama: true, role: true } },  // ← nama
      },
      orderBy: [{ tanggal: 'asc' }, { user: { nama: 'asc' } }],  // ← nama
    })

    // Group by user → weekly grid
    const userMap = new Map<string, {
      userId: string
      userName: string
      userRole: string
      days: Record<string, { id: string; shift: string; keterangan: string | null }>
    }>()

    for (const j of jadwalList) {
      if (!userMap.has(j.userId)) {
        userMap.set(j.userId, {
          userId:   j.userId,
          userName: j.user.nama,    // ← .nama
          userRole: j.user.role,
          days: {},
        })
      }
      userMap.get(j.userId)!.days[j.tanggal] = {
        id:         j.id,
        shift:      j.shift,
        keterangan: j.keterangan,
      }
    }

    const dates: string[] = []
    if (startDate && endDate) {
      const cur = new Date(startDate)
      const end = new Date(endDate)
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }
    }

    return apiSuccess({
      jadwal: Array.from(userMap.values()),
      week: { start: startDate, end: endDate, dates },
    })
  } catch (error) {
    console.error('[GET /api/jadwal]', error)
    return apiError('Gagal mengambil jadwal', 500)
  }
}

// POST /api/jadwal
export async function POST(req: NextRequest) {
  try {
    const body: CreateJadwalInput = await req.json()

    if (!body.userId || !body.outletId || !body.shift || !body.tanggal) {
      return apiError('Field userId, outletId, shift, tanggal wajib diisi')
    }

    const created = await prisma.jadwal.upsert({
      where: {
        userId_tanggal: { userId: body.userId, tanggal: body.tanggal },
      },
      update: {
        shift:      body.shift,
        keterangan: body.keterangan ?? null,
        updatedAt:  new Date(),
      },
      create: {
        userId:     body.userId,
        outletId:   body.outletId,
        tanggal:    body.tanggal,
        shift:      body.shift,
        keterangan: body.keterangan ?? null,
      },
    })

    return apiSuccess(created, 201)
  } catch (error) {
    console.error('[POST /api/jadwal]', error)
    return apiError('Gagal menyimpan jadwal', 500)
  }
}