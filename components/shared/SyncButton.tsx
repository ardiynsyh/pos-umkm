'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dbHelpers } from '@/lib/db/dexie';

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/products/sync');
      const data = await response.json();
      
      if (data.products) {
        await dbHelpers.syncProducts(data.products);
        alert(`✅ ${data.products.length} produk berhasil disinkronkan!`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('❌ Gagal sinkronisasi produk');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Produk'}
    </Button>
  );
}