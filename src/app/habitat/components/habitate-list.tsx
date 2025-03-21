'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Trash2 
} from 'lucide-react';

interface HabitateEntry {
  jobId: string;
  status: string;
  updatedAt: string;
  verified?: boolean;
  metadata?: {
    erfassungsperson?: string;
    email?: string;
    gemeinde?: string;
    flurname?: string;
    standort?: string;
    bilder?: Array<{url: string}>;
  };
  result?: {
    habitattyp?: string;
    schutzstatus?: string;
  };
  error?: string;
}

interface HabitateListProps {
  entries: HabitateEntry[];
  onSort: (field: string) => void;
  currentSortBy: string;
  currentSortOrder: string;
  onDelete?: (jobId: string) => void;
}

export function HabitateList({ entries, onSort, currentSortBy, currentSortOrder, onDelete }: HabitateListProps) {
  if (!entries || entries.length === 0) {
    return <div className="text-center py-12 text-gray-500">Keine Einträge gefunden</div>;
  }
  
  const renderSortIcon = (field: string) => {
    if (currentSortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return currentSortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };
  
  const getSortableHeaderClass = (field: string) => {
    return `cursor-pointer hover:bg-gray-50 ${
      currentSortBy === field ? 'text-primary' : ''
    }`;
  };
  
  const getVerificationIcon = (entry: HabitateEntry) => {
    if (entry.verified === true) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (entry.verified === false) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <HelpCircle className="h-5 w-5 text-gray-300" />;
    }
  };
  
  const getSchutzstatusColor = (status: string) => {
    const normalizedStatus = normalizeSchutzstatus(status);
    switch (normalizedStatus) {
      case 'gesetzlich geschützt':
        return 'bg-red-500 text-white';
      case 'schützenswert':
      case 'ökologisch hochwertig':
        return 'bg-yellow-500 text-white';
      case 'nicht geschützt':
      case 'ökologisch niederwertig':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              Bild
            </th>
            <th 
              className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 ${getSortableHeaderClass('updatedAt')}`}
              onClick={() => onSort('updatedAt')}
            >
              <div className="flex items-center">
                Datum {renderSortIcon('updatedAt')}
              </div>
            </th>
            <th 
              className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 ${getSortableHeaderClass('metadata.erfassungsperson')}`}
              onClick={() => onSort('metadata.erfassungsperson')}
            >
              <div className="flex items-center">
                Person {renderSortIcon('metadata.erfassungsperson')}
              </div>
            </th>
            <th 
              className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40 ${getSortableHeaderClass('metadata.gemeinde')}`}
              onClick={() => onSort('metadata.gemeinde')}
            >
              <div className="flex items-center">
                Standort {renderSortIcon('metadata.gemeinde')}
              </div>
            </th>
            <th 
              className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 ${getSortableHeaderClass('result.habitattyp')}`}
              onClick={() => onSort('result.habitattyp')}
            >
              <div className="flex items-center">
                Habitat {renderSortIcon('result.habitattyp')}
              </div>
            </th>
            <th 
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
            >
              Status
            </th>
            <th 
              className={`px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20 ${getSortableHeaderClass('verified')}`}
              onClick={() => onSort('verified')}
            >
              <div className="flex items-center justify-center">
                Prüf. {renderSortIcon('verified')}
              </div>
            </th>
            {onDelete && (
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Akt.
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {entries.map((entry) => (
            <tr 
              key={entry.jobId} 
              className="hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <td className="px-2 py-2 whitespace-nowrap">
                <Link href={`/habitat/${entry.jobId}`}>
                  {entry.metadata?.bilder && entry.metadata.bilder.length > 0 && entry.metadata.bilder[0]?.url ? (
                    <div className="relative h-14 w-16">
                      <Image
                        src={entry.metadata.bilder[0].url}
                        alt="Vorschaubild"
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      Kein Bild
                    </div>
                  )}
                </Link>
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                <Link href={`/habitat/${entry.jobId}`} className="block">
                  {entry.updatedAt && format(new Date(entry.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                </Link>
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                <Link href={`/habitat/${entry.jobId}`} className="block">
                  <div className="font-medium">{entry.metadata?.erfassungsperson || '-'}</div>
                </Link>
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                <Link href={`/habitat/${entry.jobId}`} className="block">
                  <div className="font-medium">{entry.metadata?.gemeinde || '-'}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[160px]" title={entry.metadata?.standort || '-'}>
                    {entry.metadata?.standort || '-'}
                  </div>
                </Link>
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                <Link href={`/habitat/${entry.jobId}`} className="block">
                  {entry.result?.habitattyp || (
                    <span className="text-red-500">
                      {entry.error ? 'Fehler' : 'Nicht analysiert'}
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-2 py-2 whitespace-nowrap">
                <Link href={`/habitat/${entry.jobId}`} className="block">
                  {entry.result?.schutzstatus ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(normalizeSchutzstatus(entry.result.schutzstatus))}`}>
                      {normalizeSchutzstatus(entry.result.schutzstatus)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </Link>
              </td>
              <td className="px-2 py-2 whitespace-nowrap text-center">
                <Link href={`/habitat/${entry.jobId}`} className="block flex justify-center">
                  {getVerificationIcon(entry)}
                </Link>
              </td>
              {onDelete && (
                <td className="px-2 py-2 whitespace-nowrap text-center">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) {
                        onDelete(entry.jobId);
                      }
                    }}
                    className="text-gray-500 hover:text-red-500 transition-colors inline-flex items-center justify-center"
                    title="Eintrag löschen"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 