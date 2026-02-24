import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'

function normalizeRole(role: string): string {
  return role.toLowerCase()
}

// GET /api/payroll
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const periode  = searchParams.get('periode')  ?? new Date().toISOString().slice(0, 7)
    const outletId = searchParams.get('outletId') ?? undefined
    const status   = searchParams.get('status')   ?? undefined

    const payrollRecords = await prisma.payroll.findMany({
      where: {
        periode,
        ...(outletId && { outletId }),
        ...(status   && { status }),
      },
      include: {
        user:   { select: { id: true, nama: true, role: true } },
        outlet: { select: { id: true, nama: true } },
      },
      orderBy: { user: { nama: 'asc' } },
    })

    const payrolls = payrollRecords.map(p => ({
      id:            p.id,
      userId:        p.userId,
      userName:      p.user.nama,
      userRole:      normalizeRole(p.user.role),
      outletId:      p.outletId,
      outletName:    p.outlet.nama,
      periode:       p.periode,
      hariKerja:     p.hariKerja,
      lemburJam:     p.lemburJam,
      gajiPokok:     p.gajiPokok,
      tunjangan:     p.tunjangan,
      lemburNominal: p.lemburNominal,
      potongan:      p.potongan,
      totalGaji:     p.totalGaji,
      status:        p.status,
      tanggalBayar:  p.tanggalBayar,
      catatan:       p.catatan,
      createdAt:     p.createdAt.toISOString(),
      updatedAt:     p.updatedAt.toISOString(),
    }))

    const summary = {
      totalPenggajian: payrolls.reduce((s, p) => s + p.totalGaji, 0),
      sudahDibayar:    payrolls.filter(p => p.status === 'dibayar').length,
      belumDibayar:    payrolls.filter(p => p.status === 'pending').length,
      totalPotongan:   payrolls.reduce((s, p) => s + p.potongan, 0),
    }

    return apiSuccess({ payrolls, summary })
  } catch (error) {
    console.error('[GET /api/payroll]', error)
    return apiError('Gagal mengambil data payroll', 500)
  }
}

// POST /api/payroll — generate payroll semua karyawan sekaligus
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { outletId, periode } = body

    if (!outletId || !periode) {
      return apiError('outletId dan periode wajib diisi')
    }

    const users = await prisma.user.findMany({
      where: { outletId },
      select: { id: true, nama: true },
    })

    if (users.length === 0) {
      return apiError('Tidak ada karyawan di outlet ini')
    }

    const [year, month] = periode.split('-').map(Number)
    const startDate = `${periode}-01`
    const lastDay   = new Date(year, month, 0).getDate()
    const endDate   = `${periode}-${String(lastDay).padStart(2, '0')}`

    const created: string[] = []
    const skipped: string[] = []

    for (const user of users) {
      const existing = await prisma.payroll.findUnique({
        where: { userId_periode: { userId: user.id, periode } },
      })

      if (existing) {
        skipped.push(user.nama)
        continue
      }

      // Absensi bulan ini
      const absensiList = await prisma.absensi.findMany({
        where: {
          userId:  user.id,
          outletId,
          tanggal: { gte: startDate, lte: endDate },
        },
      })

      // Setting gaji
      const gs = await prisma.gajiSetting.findUnique({ where: { userId: user.id } })

      const skema            = (gs as { skema?: string } | null)?.skema ?? 'bulanan'
      const gajiPokok        = gs?.gajiPokok        ?? 0
      const gajiHarian       = (gs as { gajiHarian?: number } | null)?.gajiHarian ?? 0
      const tunjangan        = gs?.tunjangan        ?? 0
      const tarifLembur      = gs?.tarifLembur      ?? 0
      const potonganPerTlb   = gs?.potonganTerlambat ?? 0

      const hariKerja        = absensiList.filter(a => a.status === 'hadir' || a.status === 'terlambat').length
      const jumlahTerlambat  = absensiList.filter(a => a.status === 'terlambat').length
      const potongan         = jumlahTerlambat * potonganPerTlb
      const lemburJam        = 0
      const lemburNominal    = lemburJam * tarifLembur

      // ── Hitung gaji berdasarkan skema ─────────────────────
      let gajiDihitung: number

      if (skema === 'harian') {
        // Skema harian: gajiHarian × hari hadir
        gajiDihitung = gajiHarian * hariKerja
      } else {
        // Skema bulanan: gajiPokok penuh (sudah termasuk semua hari kerja)
        gajiDihitung = gajiPokok
      }

      const totalGaji = gajiDihitung + tunjangan + lemburNominal - potongan

      await prisma.payroll.create({
        data: {
          userId:       user.id,
          outletId,
          periode,
          hariKerja,
          lemburJam,
          gajiPokok:    skema === 'harian' ? gajiHarian * hariKerja : gajiPokok,
          tunjangan,
          lemburNominal,
          potongan,
          totalGaji:    Math.max(0, totalGaji),
          status:       'pending',
        },
      })

      created.push(user.nama)
    }

    return apiSuccess({
      message: `Payroll ${periode} berhasil digenerate untuk ${created.length} karyawan`,
      created: created.length,
      skipped: skipped.length,
      detail:  { created, skipped },
    }, 201)
  } catch (error) {
    console.error('[POST /api/payroll]', error)
    return apiError('Gagal generate payroll', 500)
  }
}