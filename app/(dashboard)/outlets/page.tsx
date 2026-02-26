'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OutletsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tenants');
  }, [router]);

  return null;
}