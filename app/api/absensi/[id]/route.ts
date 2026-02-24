import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { UpdateAbsensiInput } from '@/types/karyawan'

// GET /api/absensi/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const absensi = await prisma.absensi.findUnique({
      where: { id },
      include: {
        user:   { select: { id: true, nama: true, role: true } },  // ← nama
        outlet: { select: { id: true, nama: true } },              // ← nama
      },
    })

    if (!absensi) return apiError('Absensi tidak ditemukan', 404)

    return apiSuccess({
      ...absensi,
      userName:   absensi.user.nama,    // ← .nama
      userRole:   absensi.user.role,
      outletName: absensi.outlet.nama,  // ← .nama
    })
  } catch (error) {
    console.error('[GET /api/absensi/[id]]', error)
    return apiError('Gagal mengambil data absensi', 500)
  }
}

// PUT /api/absensi/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateAbsensiInput = await req.json()

    const updated = await prisma.absensi.update({
      where: { id },
      data: {
        ...(body.tanggal    && { tanggal:    body.tanggal }),
        ...(body.jamMasuk   && { jamMasuk:   body.jamMasuk }),
        ...(body.jamKeluar  && { jamKeluar:  body.jamKeluar }),
        ...(body.shift      && { shift:      body.shift }),
        ...(body.status     && { status:     body.status }),
        ...(body.keterangan !== undefined && { keterangan: body.keterangan }),
        updatedAt: new Date(),
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('[PUT /api/absensi/[id]]', error)
    return apiError('Gagal mengupdate data absensi', 500)
  }
}

// DELETE /api/absensi/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.absensi.delete({ where: { id } })
    return apiSuccess({ id, deleted: true })
  } catch (error) {
    console.error('[DELETE /api/absensi/[id]]', error)
    return apiError('Gagal menghapus data absensi', 500)
  }
}