import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { UpdateJadwalInput } from '@/types/karyawan'

// PUT /api/jadwal/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params   // ← await params dulu
    const body: UpdateJadwalInput = await req.json()

    const updated = await prisma.jadwal.update({
      where: { id },
      data: {
        ...(body.shift      && { shift:      body.shift }),
        ...(body.tanggal    && { tanggal:    body.tanggal }),
        ...(body.keterangan !== undefined && { keterangan: body.keterangan }),
        updatedAt: new Date(),
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('[PUT /api/jadwal/[id]]', error)
    return apiError('Gagal mengupdate jadwal', 500)
  }
}

// DELETE /api/jadwal/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params   // ← await params dulu

    await prisma.jadwal.delete({ where: { id } })
    return apiSuccess({ id, deleted: true })
  } catch (error) {
    console.error('[DELETE /api/jadwal/[id]]', error)
    return apiError('Gagal menghapus jadwal', 500)
  }
}