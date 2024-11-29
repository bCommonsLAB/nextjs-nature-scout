'use client';

import dynamic from 'next/dynamic';

const NatureScout = dynamic(
  () => import('@/components/nature-scout/nature-scout'),
  { ssr: false }
);

export default function ClientNatureScout() {
  return <NatureScout />;
}