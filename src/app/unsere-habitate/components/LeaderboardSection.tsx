"use client";

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Building, MapPin, Trophy } from 'lucide-react';

interface Eintrag {
  name: string;
  count?: number;
  hektar?: number;
  organizationName?: string;
  organizationLogo?: string;
}

interface StatsData {
  topErfasser: Eintrag[];
  topOrganisationen: Eintrag[];
  topGemeinden: Eintrag[];
}

interface Zeile {
  name: string;
  valueText: string;
  logo?: string;
  icon: ReactNode;
}

function formatHa(n: number): string {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ha`;
}

// Logo mit Fallback-Icon, falls keine/defekte URL.
function LogoOrIcon({ url, alt, fallback }: { url?: string; alt: string; fallback: ReactNode }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {fallback}
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

function Bestenliste({ titel, zeilen }: { titel: string; zeilen: Zeile[] }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 font-semibold">{titel}</h3>
      {zeilen.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Daten.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {zeilen.map((z, i) => (
            <li key={z.name} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <Rang platz={i + 1} />
                <LogoOrIcon url={z.logo} alt={z.name} fallback={z.icon} />
                <span className="truncate">{z.name}</span>
              </div>
              <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-700">
                {z.valueText}
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
  const gemeinden = data?.topGemeinden ?? [];

  if (loading) return null;
  if (erfasser.length === 0 && orgs.length === 0 && gemeinden.length === 0) return null;

  const building = <Building className="h-4 w-4" />;
  const mapPin = <MapPin className="h-4 w-4" />;

  return (
    <section className="mt-12 border-t border-gray-200 pt-10">
      <div className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h2 className="text-2xl font-bold">Danke an unsere Gemeinschaft</h2>
        </div>
        <p className="text-gray-600">
          Die fleißigsten Erfasser:innen, die aktivsten Organisationen und die am besten erfassten Gemeinden.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Bestenliste
          titel="Fleißigste Erfasser:innen"
          zeilen={erfasser.map((e) => ({
            name: e.name,
            valueText: String(e.count ?? 0),
            logo: e.organizationLogo,
            icon: building,
          }))}
        />
        <Bestenliste
          titel="Aktivste Organisationen"
          zeilen={orgs.map((e) => ({
            name: e.name,
            valueText: String(e.count ?? 0),
            logo: e.organizationLogo,
            icon: building,
          }))}
        />
        <Bestenliste
          titel="Größte erfasste Fläche je Gemeinde"
          zeilen={gemeinden.map((e) => ({
            name: e.name,
            valueText: formatHa(e.hektar ?? 0),
            icon: mapPin,
          }))}
        />
      </div>
    </section>
  );
}
