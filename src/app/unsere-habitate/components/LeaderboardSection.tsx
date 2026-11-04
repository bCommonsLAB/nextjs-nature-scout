"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Building, Trophy } from 'lucide-react';

interface Eintrag {
  name: string;
  count: number;
  organizationName?: string;
  organizationLogo?: string;
}

interface StatsData {
  topErfasser: Eintrag[];
  topOrganisationen: Eintrag[];
}

// Einzelnes Logo mit Fallback, falls die URL nicht lädt.
function OrgLogo({ url, alt }: { url?: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Building className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={28}
      height={28}
      className="h-7 w-7 flex-shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-gray-200"
      onError={() => setError(true)}
    />
  );
}

function Rang({ platz }: { platz: number }) {
  const medaillen = ['🥇', '🥈', '🥉'];
  return (
    <span className="w-6 flex-shrink-0 text-center text-sm font-semibold text-gray-500">
      {platz <= 3 ? medaillen[platz - 1] : platz}
    </span>
  );
}

function Bestenliste({ titel, eintraege }: { titel: string; eintraege: Eintrag[] }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 font-semibold">{titel}</h3>
      {eintraege.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Daten.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {eintraege.map((e, i) => (
            <li key={e.name} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <Rang platz={i + 1} />
                <OrgLogo url={e.organizationLogo} alt={e.organizationName || e.name} />
                <span className="truncate">{e.name}</span>
              </div>
              <span className="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-700">
                {e.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeaderboardSection() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/habitat/stats?limit=10')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const erfasser = data?.topErfasser ?? [];
  const orgs = data?.topOrganisationen ?? [];

  // Unauffällig bleiben, solange geladen wird oder nichts vorhanden ist.
  if (loading) return null;
  if (erfasser.length === 0 && orgs.length === 0) return null;

  return (
    <section className="mt-12 border-t border-gray-200 pt-10">
      <div className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold">Danke an unsere Gemeinschaft</h2>
        </div>
        <p className="text-gray-600">
          Die fleißigsten Erfasser:innen und aktivsten Organisationen, die unsere Habitate sichtbar machen.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Bestenliste titel="Fleißigste Erfasser:innen" eintraege={erfasser} />
        <Bestenliste titel="Aktivste Organisationen" eintraege={orgs} />
      </div>
    </section>
  );
}
