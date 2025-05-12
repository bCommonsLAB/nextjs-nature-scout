'use client';

import dynamic from 'next/dynamic';

const NatureScout = dynamic(
  () => import('@/components/natureScout/NatureScout'),
  { ssr: false }
);

export default function ClientNatureScout() {
  return <NatureScout />;
}