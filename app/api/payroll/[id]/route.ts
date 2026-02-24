import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'

function normalizeRole(role: string): string {
  return role.toLowerCase()
}

// GET /api/payroll/[id] — detail + breakdown untuk slip gaji
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const p = await prisma.payroll.findUnique({
      where: { id },
      include: {
        user:   { select: { id: true, nama: true, role: true } },
        outlet: { select: { id: true, nama: true } },
      },
    })

    if (!p) return apiError('Payroll tidak ditemukan', 404)

    // Buat breakdown untuk slip gaji
    const breakdown: { label: string; amount: number; type: 'income' | 'deduction' }[] = []

    if (p.gajiPokok > 0)      breakdown.push({ label: 'Gaji Pokok',      amount: p.gajiPokok,      type: 'income' })
    if (p.tunjangan > 0)      breakdown.push({ label: 'Tunjangan',        amount: p.tunjangan,      type: 'income' })
    if (p.lemburNominal > 0)  breakdown.push({ label: 'Uang Lembur',      amount: p.lemburNominal,  type: 'income' })
    if (p.potongan > 0)       breakdown.push({ label: 'Potongan',         amount: p.potongan,       type: 'deduction' })

    // Jika tidak ada breakdown sama sekali (misal owner/superadmin)
    if (breakdown.length === 0) {
      breakdown.push({ label: 'Tidak ada komponen gaji', amount: 0, type: 'income' })
    }

    return apiSuccess({
      id:           p.id,
      userId:       p.userId,
      userName:     p.user.nama,
      userRole:     normalizeRole(p.user.role),
      outletId:     p.outletId,
      outletName:   p.outlet.nama,
      periode:      p.periode,
      hariKerja:    p.hariKerja,
      lemburJam:    p.lemburJam,
      gajiPokok:    p.gajiPokok,
      tunjangan:    p.tunjangan,
      lemburNominal: p.lemburNominal,
      potongan:     p.potongan,
      totalGaji:    p.totalGaji,
      status:       p.status,
      tanggalBayar: p.tanggalBayar,
      catatan:      p.catatan,
      createdAt:    p.createdAt.toISOString(),
      updatedAt:    p.updatedAt.toISOString(),
      breakdown,
    })
  } catch (error) {
    console.error('[GET /api/payroll/[id]]', error)
    return apiError('Gagal mengambil slip gaji', 500)
  }
}

// PUT /api/payroll/[id] — tandai sudah dibayar atau update data
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }   = await params
    const body     = await req.json()
    const { action } = body

    const existing = await prisma.payroll.findUnique({ where: { id } })
    if (!existing) return apiError('Payroll tidak ditemukan', 404)

    // Action: bayar — tandai sudah dibayar
    if (action === 'bayar') {
      const updated = await prisma.payroll.update({
        where: { id },
        data:  {
          status:      'dibayar',
          tanggalBayar: new Date().toISOString().split('T')[0],
          updatedAt:   new Date(),
        },
      })
      return apiSuccess(updated)
    }

    // Update data payroll manual
    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        ...(body.hariKerja     !== undefined && { hariKerja:     body.hariKerja }),
        ...(body.lemburJam     !== undefined && { lemburJam:     body.lemburJam }),
        ...(body.gajiPokok     !== undefined && { gajiPokok:     body.gajiPokok }),
        ...(body.tunjangan     !== undefined && { tunjangan:     body.tunjangan }),
        ...(body.lemburNominal !== undefined && { lemburNominal: body.lemburNominal }),
        ...(body.potongan      !== undefined && { potongan:      body.potongan }),
        ...(body.totalGaji     !== undefined && { totalGaji:     body.totalGaji }),
        ...(body.catatan       !== undefined && { catatan:       body.catatan }),
        updatedAt: new Date(),
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('[PUT /api/payroll/[id]]', error)
    return apiError('Gagal update payroll', 500)
  }
}

// DELETE /api/payroll/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.payroll.delete({ where: { id } })
    return apiSuccess({ id, deleted: true })
  } catch (error) {
    console.error('[DELETE /api/payroll/[id]]', error)
    return apiError('Gagal menghapus payroll', 500)
  }
}