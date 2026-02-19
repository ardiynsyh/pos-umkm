import { prisma } from '@/lib/prisma';
import OrderClientLoader from './OrderClientLoader';

type ParamsPromise = { params: Promise<{ tableId: string }> };

export default async function Page({ params }: ParamsPromise) {
  const { tableId } = await params;

  const table = await prisma.table.findUnique({ where: { id: tableId } });

  if (!table) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Meja tidak ditemukan</h1>
        <p>ID: {tableId}</p>
      </div>
    );
  }

  return (
    <div>
      {/* render client ordering UI */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <OrderClientLoader tableId={tableId} />
    </div>
  );
}
