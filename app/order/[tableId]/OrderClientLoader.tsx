"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const ScriptlessOrderClient = dynamic(() => import('./OrderClient'), { ssr: false });

export default function OrderClientLoader({ tableId }: { tableId: string }) {
  return <ScriptlessOrderClient tableId={tableId} />;
}
