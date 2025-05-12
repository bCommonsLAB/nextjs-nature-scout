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
  Trash2,
  SearchIcon,
  XIcon
} from 'lucide-react';
import { useState } from 'react';

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
    organizationId?: string;
    organizationName?: string;
    organizationLogo?: string;
  };
  result?: {
    habitattyp?: string;
    schutzstatus?: string;
    habitatfamilie?: string;
  };
  verifiedResult?: {
    habitattyp?: string;
    schutzstatus?: string;
    habitatfamilie?: string;
    kommentar?: string;
    zusammenfassung?: string;
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
  
  // Hilfsfunktion, um vorrangig verifizierte Daten anzuzeigen
  const getHabitatData = (entry: HabitateEntry) => {
    // Debug-Ausgaben
    return {
      habitattyp: entry.verifiedResult?.habitattyp || entry.result?.habitattyp || '',
      schutzstatus: entry.verifiedResult?.schutzstatus || entry.result?.schutzstatus || '',
      habitatfamilie: entry.verifiedResult?.habitatfamilie || entry.result?.habitatfamilie || ''
    };
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
              className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 ${getSortableHeaderClass('metadata.organizationName')}`}
              onClick={() => onSort('metadata.organizationName')}
            >
              <div className="flex items-center">
                Organisation {renderSortIcon('metadata.organizationName')}
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
              className={`px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 ${getSortableHeaderClass('result.habitatfamilie')}`}
              onClick={() => onSort('result.habitatfamilie')}
            >
              <div className="flex items-center">
                Habitatgruppe {renderSortIcon('result.habitatfamilie')}
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
          {entries.map((entry) => {
            const habitatData = getHabitatData(entry);
            
            return (
              <tr 
                key={entry.jobId} 
                id={`habitat-row-${entry.jobId}`}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-2 py-2 whitespace-nowrap">
                  <div className="relative group">
                    <Link href={`/habitat/${entry.jobId}`} className="block">
                      {entry.metadata?.bilder && entry.metadata.bilder.length > 0 && entry.metadata.bilder[0]?.url ? (
                        <div className="relative h-14 w-16">
                          <Image
                            src={entry.metadata.bilder[0].url.replace('.jpg', '_low.jpg')}
                            alt="Vorschaubild"
                            width={120}
                            height={90}
                            className="object-cover rounded"
                          />
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (entry.metadata?.bilder?.[0]?.url) {
                                setPreviewImage(entry.metadata.bilder[0].url);
                              }
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity"
                          >
                            <SearchIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-14 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          Kein Bild
                        </div>
                      )}
                    </Link>
                  </div>
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
                    <div className="flex items-center">
                      <div className="font-medium text-sm text-gray-700">
                        {entry.metadata?.organizationName || 'Keine Organisation'}
                      </div>
                    </div>
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
                    {habitatData.habitattyp ? (
                      <>
                        <div>{habitatData.habitattyp}</div>
                        {entry.verified && entry.verifiedResult?.habitattyp && (
                          <span className="text-xs text-green-600 mt-1 block">Verifiziert</span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-500">
                        {entry.error ? 'Fehler' : 'Nicht analysiert'}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <Link href={`/habitat/${entry.jobId}`} className="block">
                    {habitatData.habitatfamilie ? (
                      <div className="text-gray-700 text-sm">{habitatData.habitatfamilie}</div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </Link>
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <Link href={`/habitat/${entry.jobId}`} className="block">
                    {habitatData.schutzstatus ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(normalizeSchutzstatus(habitatData.schutzstatus))}`}>
                        {normalizeSchutzstatus(habitatData.schutzstatus)}
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
            );
          })}
        </tbody>
      </table>
      {/* Bild-Vorschau-Popup */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button 
              className="absolute -top-10 right-0 bg-white rounded-full p-2"
              onClick={() => setPreviewImage(null)}
            >
              <XIcon className="h-5 w-5" />
            </button>
            <Image
              src={previewImage}
              alt="Große Vorschau"
              width={1200}
              height={800}
              className="max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
} 