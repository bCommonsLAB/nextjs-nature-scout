'use client';

import dynamic from 'next/dynamic';

const NatureScout = dynamic(
  () => import('@/components/NatureScout/NatureScout'),
  { ssr: false }
);

export default function ClientNatureScout() {
  return <NatureScout />;
}