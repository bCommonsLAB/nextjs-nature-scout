"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Sprout, ShieldCheck, Leaf } from 'lucide-react';

interface Summary {
  totalHabitats: number;
  hektarGesetzlich: number;
  hektarHochwertig: number;
}

// Dieselben Filter wie Galerie/Karte – die Kennzahlen reagieren darauf.
export interface StatsFilters {
  search?: string;
  gemeinde?: string[];
  habitat?: string[];
  habitatfamilie?: string[];
  protectionStatus?: string[];
  person?: string[];
  organization?: string[];
}

interface Tile {
  icon: ReactNode;
  value: string;
  label: string;
  accent: string; // linke Akzent-Kante
  iconClasses: string; // Hintergrund + Farbe des Icons
}

function formatNumber(n: number): string {
  return n.toLocaleString('de-DE');
}

function formatHa(n: number): string {
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ha`;
}

function buildQuery(filters: StatsFilters): string {
  const p = new URLSearchParams();
  if (filters.search) p.set('search', filters.search);
  if (filters.gemeinde?.length) p.set('gemeinde', filters.gemeinde.join(','));
  if (filters.habitat?.length) p.set('habitat', filters.habitat.join(','));
  if (filters.habitatfamilie?.length) p.set('habitatfamilie', filters.habitatfamilie.join(','));
  if (filters.protectionStatus?.length) p.set('protectionStatus', filters.protectionStatus.join(','));
  if (filters.person?.length) p.set('person', filters.person.join(','));
  if (filters.organization?.length) p.set('organization', filters.organization.join(','));
  p.set('limit', '1'); // nur summary nötig
  return p.toString();
}

// Drei Kennzahlen als Stat-Kacheln (keine Diagramme nötig).
// Status-Farben (rot = gesetzlich, bernstein = hochwertig) tragen Bedeutung,
// jeweils zusätzlich mit Icon + Label – Identität also nie nur über Farbe.
export function StatsHighlights({ filters }: { filters: StatsFilters }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  // Nur der Wertestring triggert ein Neu-Laden, nicht die Objekt-Identität.
  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    let active = true;
    fetch(`/api/habitat/stats?${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // Vorherige Zahlen beim Neu-Filtern stehen lassen, bis neue da sind.
        if (active && d?.summary) setSummary(d.summary);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [query]);

  if (!summary) return null;

  const tiles: Tile[] = [
    {
      icon: <Sprout className="h-6 w-6" />,
      value: formatNumber(summary.totalHabitats),
      label: 'Habitate erfasst',
      accent: 'border-l-emerald-500',
      iconClasses: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      value: formatHa(summary.hektarGesetzlich),
      label: 'gesetzlich geschützt',
      accent: 'border-l-red-500',
      iconClasses: 'bg-red-50 text-red-600',
    },
    {
      icon: <Leaf className="h-6 w-6" />,
      value: formatHa(summary.hektarHochwertig),
      label: 'ökologisch hochwertig',
      accent: 'border-l-amber-500',
      iconClasses: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`flex items-center gap-4 rounded-lg border border-gray-100 border-l-4 ${t.accent} bg-white p-5 shadow-sm`}
        >
          <span
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${t.iconClasses}`}
          >
            {t.icon}
          </span>
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{t.value}</div>
            <div className="truncate text-sm text-gray-600">{t.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
