import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'

// GET /api/gaji-setting?userId=xxx  — ambil setting satu user
// GET /api/gaji-setting?outletId=xxx — ambil semua user di outlet
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const userId   = searchParams.get('userId')   ?? undefined
    const outletId = searchParams.get('outletId') ?? undefined

    if (userId) {
      // Setting satu user
      const setting = await prisma.gajiSetting.findUnique({
        where: { userId },
        include: { user: { select: { id: true, nama: true, role: true } } },
      })
      return apiSuccess(setting ?? null)
    }

    // Semua user di outlet beserta setting gajinya
    const users = await prisma.user.findMany({
      where: { ...(outletId && { outletId }) },
      select: {
        id: true, nama: true, role: true, outletId: true,
        gajiSetting: true,
      },
      orderBy: { nama: 'asc' },
    })

    const result = users.map(u => ({
      userId:             u.id,
      userName:           u.nama,
      userRole:           u.role.toLowerCase(),
      outletId:           u.outletId,
      skema:              u.gajiSetting?.[0]?.skema              ?? 'bulanan',
      gajiPokok:          u.gajiSetting?.[0]?.gajiPokok          ?? 0,
      gajiHarian:         u.gajiSetting?.[0]?.gajiHarian         ?? 0,
      tunjangan:          u.gajiSetting?.[0]?.tunjangan          ?? 0,
      tarifLembur:        u.gajiSetting?.[0]?.tarifLembur        ?? 0,
      potonganTerlambat:  u.gajiSetting?.[0]?.potonganTerlambat  ?? 0,
    }))

    return apiSuccess(result)
  } catch (error) {
    console.error('[GET /api/gaji-setting]', error)
    return apiError('Gagal mengambil setting gaji', 500)
  }
}

// POST /api/gaji-setting — upsert setting gaji untuk satu user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, skema, gajiPokok, gajiHarian, tunjangan, tarifLembur, potonganTerlambat } = body

    if (!userId) return apiError('userId wajib diisi')

    // Pastikan user ada
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return apiError('User tidak ditemukan', 404)

    const setting = await prisma.gajiSetting.upsert({
      where: { userId },
      create: {
        userId,
        skema:             skema             ?? 'bulanan',
        gajiPokok:         gajiPokok         ?? 0,
        gajiHarian:        gajiHarian        ?? 0,
        tunjangan:         tunjangan         ?? 0,
        tarifLembur:       tarifLembur       ?? 0,
        potonganTerlambat: potonganTerlambat ?? 0,
      },
      update: {
        ...(skema             !== undefined && { skema }),
        ...(gajiPokok         !== undefined && { gajiPokok }),
        ...(gajiHarian        !== undefined && { gajiHarian }),
        ...(tunjangan         !== undefined && { tunjangan }),
        ...(tarifLembur       !== undefined && { tarifLembur }),
        ...(potonganTerlambat !== undefined && { potonganTerlambat }),
        updatedAt: new Date(),
      },
    })

    return apiSuccess(setting)
  } catch (error) {
    console.error('[POST /api/gaji-setting]', error)
    return apiError('Gagal menyimpan setting gaji', 500)
  }
}