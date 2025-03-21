'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Check, 
  X,
  Trash2,
  RefreshCw,
  Edit
} from 'lucide-react';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';

interface HabitatBild {
  url: string;
  plantnetResult?: {
    species: {
      scientificName: string;
    };
    score: number;
  };
}

interface Pflanze {
  name: string;
  häufigkeit: string;
}

interface HabitatData {
  jobId: string;
  status: string;
  verified?: boolean;
  verifiedAt?: string;
  metadata?: {
    erfassungsperson?: string;
    email?: string;
    gemeinde?: string;
    flurname?: string;
    latitude?: number;
    longitude?: number;
    standort?: string;
    bilder?: HabitatBild[];
    kommentar?: string;
  };
  result?: {
    habitattyp?: string;
    schutzstatus?: string;
    zusammenfassung?: string;
    standort?: {
      hangneigung?: string;
      exposition?: string;
      bodenfeuchtigkeit?: string;
    };
    pflanzenarten?: Pflanze[];
    evidenz?: {
      dafür_spricht?: string[];
      dagegen_spricht?: string[];
    };
  };
  error?: string;
  updatedAt?: string;
  history?: {
    user?: {
      userName?: string;
      role?: string;
    };
    date?: string;
    module?: string;
    changes?: {
      habitattyp?: string;
      schutzstatus?: string;
      bildCount?: number;
      kommentar?: string;
    };
    previousResult?: {
      habitattyp?: string;
      schutzstatus?: string;
      kommentar?: string;
    };
  }[];
}

export default function HabitateDetailPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<HabitatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/habitat/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    if (jobId) {
      fetchData();
    }
  }, [jobId]);

  const handleVerify = async (verify: boolean) => {
    if (!data) return;
    
    setVerifying(true);
    try {
      const response = await fetch(`/api/habitat/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified: verify }),
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Aktualisieren des Verifizierungsstatus');
      }
      
      // Aktualisiere lokalen Zustand
      setData({
        ...data,
        verified: verify,
        verifiedAt: new Date().toISOString()
      });
      
    } catch (err: unknown) {
      console.error('Verifizierungsfehler:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert('Fehler bei der Verifizierung: ' + errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!data || !confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/habitat/${jobId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Eintrags');
      }
      
      // Zurück zur Habitatübersicht navigieren
      router.push('/habitat');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleReanalyze = async () => {
    if (!data) return;
    
    if (!confirm('Möchten Sie diesen Eintrag neu analysieren?')) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/habitat/${jobId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newAnalysisModule: 'Standard-Reanalyse',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der erneuten Analyse');
      }
      
      // Seite neu laden, um die aktualisierten Daten zu sehen
      window.location.reload();
    } catch (error) {
      console.error('Fehler bei der erneuten Analyse:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler bei der Analyse'}`);
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleEdit = () => {
    // Weiterleiten zum Analyseflow mit vorausgefüllten Daten
    // Wir kodieren die Job-ID als URL-Parameter, damit der Flow weiß, 
    // dass es sich um eine Bearbeitung handelt
    router.push(`/naturescout?editJobId=${jobId}`);
  };

  const getVerificationStatus = () => {
    if (data?.verified === true) {
      return (
        <div className="flex items-center text-green-600">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>
            Verifiziert am {data.verifiedAt ? 
              format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de }) : 
              'unbekannt'
            }
          </span>
        </div>
      );
    } else if (data?.verified === false) {
      return (
        <div className="flex items-center text-red-600">
          <XCircle className="h-5 w-5 mr-2" />
          <span>
            Abgelehnt am {data.verifiedAt ? 
              format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de }) : 
              'unbekannt'
            }
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-500">
          <HelpCircle className="h-5 w-5 mr-2" />
          <span>Nicht überprüft</span>
        </div>
      );
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
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <button 
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
        </button>
        
        <div className="text-red-500 py-4 bg-red-50 px-4 rounded">
          Fehler beim Laden der Daten: {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <button 
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                Habitaterfassung: {data.result?.habitattyp || 'Nicht klassifiziert'}
              </h1>
              <p className="text-gray-500">
                Erfasst am {data.updatedAt && format(new Date(data.updatedAt), 'dd. MMMM yyyy, HH:mm', { locale: de })} 
                von {data.metadata?.erfassungsperson || 'Unbekannt'}
              </p>
              
              <div className="mt-2">
                {getVerificationStatus()}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleVerify(true)}
                disabled={verifying || data.verified === true}
                className="inline-flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4 mr-2" /> Verifizieren
              </button>
              
              <button
                onClick={() => handleVerify(false)}
                disabled={verifying || data.verified === false}
                className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4 mr-2" /> Ablehnen
              </button>

              <button
                onClick={handleReanalyze}
                disabled={analyzing}
                className="inline-flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> {analyzing ? 'Analysiere...' : 'Neu analysieren'}
              </button>

              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" /> Bearbeiten
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-2" /> {deleting ? 'Wird gelöscht...' : 'Löschen'}
              </button>
            </div>
          </div>
          
          {data.result?.schutzstatus && (
            <div className={`inline-block mb-6 px-3 py-1 rounded-full text-sm font-medium ${getSchutzstatusColor(typeof data.result.schutzstatus === 'string' ? data.result.schutzstatus : 'unbekannt')}`}>
              {normalizeSchutzstatus(data.result.schutzstatus)}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linke Spalte: Bilder und Metadaten */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Bilder</h2>
              <div className="space-y-4">
                {data.metadata?.bilder?.map((bild: HabitatBild, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded">
                    <div className="relative h-64 w-full">
                      <Image
                        src={bild.url}
                        alt={`Bild ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {index === 0 ? 'Panoramabild' : `Detailbild ${index}`}
                      {bild.plantnetResult && (
                        <span className="block font-semibold">
                          {bild.plantnetResult.species.scientificName} 
                          <span className="font-normal text-xs ml-1">
                            ({(bild.plantnetResult.score * 100).toFixed(0)}%)
                          </span>
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Standort</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p>Gemeinde: {data.metadata?.gemeinde || '-'}</p>
                  <p>Flurname: {data.metadata?.flurname || '-'}</p>
                  <p>Koordinaten: {data.metadata?.latitude}, {data.metadata?.longitude}</p>
                </div>
              </div>
            </div>
            
            {/* Rechte Spalte: Analyseergebnisse */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Analyseergebnisse</h2>
              
              {data.error ? (
                <div className="bg-red-50 text-red-500 p-4 rounded">
                  Fehler bei der Analyse: {data.error}
                </div>
              ) : !data.result ? (
                <div className="bg-yellow-50 text-yellow-600 p-4 rounded">
                  Keine Analyseergebnisse verfügbar
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold">Habitat</h3>
                    <p className="text-lg">{data.result.habitattyp}</p>
                    <p className="mt-2">{data.result.zusammenfassung}</p>
                  </div>
                  
                  {data.result.standort && (
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold">Standort</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>Hangneigung: <span className="font-medium">{data.result.standort.hangneigung}</span></div>
                        <div>Exposition: <span className="font-medium">{data.result.standort.exposition}</span></div>
                        <div>Bodenfeuchtigkeit: <span className="font-medium">{data.result.standort.bodenfeuchtigkeit}</span></div>
                      </div>
                    </div>
                  )}
                  
                  {data.result.pflanzenarten && data.result.pflanzenarten.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold">Pflanzenarten</h3>
                      <ul className="mt-2 space-y-1">
                        {data.result.pflanzenarten.map((pflanze: Pflanze, index: number) => (
                          <li key={index} className="flex justify-between">
                            <span>{pflanze.name}</span>
                            <span className="text-gray-500">{pflanze.häufigkeit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {data.result.evidenz && (
                    <div className="bg-gray-50 p-4 rounded">
                      <h3 className="font-semibold">Evidenz</h3>
                      {data.result.evidenz.dafür_spricht && data.result.evidenz.dafür_spricht.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium text-green-600">Dafür spricht:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.result.evidenz.dafür_spricht.map((punkt: string, index: number) => (
                              <li key={index}>{punkt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.result.evidenz?.dagegen_spricht && data.result.evidenz.dagegen_spricht.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-sm font-medium text-red-500">Dagegen spricht:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {data.result.evidenz.dagegen_spricht.map((punkt: string, index: number) => (
                              <li key={index}>{punkt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {data.metadata?.kommentar && (
                    <div className="bg-blue-50 p-4 rounded">
                      <h3 className="font-semibold text-blue-700">Kommentar des Erfassers</h3>
                      <p className="mt-2 italic">{data.metadata?.kommentar}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nach dem Abschnitt mit den Analyseergebnissen, vor dem Seitenende */}
      {data.history && data.history.length > 0 && (
        <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Änderungsverlauf</h2>
          <div className="space-y-6">
            {data.history.map((entry, index) => (
              <div key={index} className="border-l-4 border-primary pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {entry.user?.userName || 'Unbekannter Benutzer'} 
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({entry.user?.role || 'Benutzer'})
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {entry.date && format(new Date(entry.date), 'dd. MMMM yyyy, HH:mm', { locale: de })}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-sm text-gray-600">
                    Verwendetes Modul: <span className="font-medium">{entry.module || 'Standard'}</span>
                  </div>
                  
                  {entry.changes && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {entry.changes.habitattyp && (
                        <div className="text-sm">
                          <span className="text-gray-500">Habitattyp:</span> {entry.changes.habitattyp}
                        </div>
                      )}
                      {entry.changes.schutzstatus && (
                        <div className="text-sm">
                          <span className="text-gray-500">Schutzstatus:</span> {normalizeSchutzstatus(entry.changes.schutzstatus)}
                        </div>
                      )}
                      {entry.changes.bildCount && (
                        <div className="text-sm">
                          <span className="text-gray-500">Bilder:</span> {entry.changes.bildCount}
                        </div>
                      )}
                      {entry.changes.kommentar && (
                        <div className="text-sm col-span-2">
                          <span className="text-gray-500">Kommentar:</span> {entry.changes.kommentar}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {entry.previousResult && (
                    <div className="mt-3 text-xs text-gray-500">
                      <details>
                        <summary className="cursor-pointer">Vorherige Werte anzeigen</summary>
                        <div className="mt-2 pl-2 border-l-2 border-gray-200">
                          {entry.previousResult.habitattyp && (
                            <div>Habitattyp: {entry.previousResult.habitattyp}</div>
                          )}
                          {entry.previousResult.schutzstatus && (
                            <div>Schutzstatus: {normalizeSchutzstatus(entry.previousResult.schutzstatus)}</div>
                          )}
                          {entry.previousResult.kommentar && (
                            <div>Kommentar: {entry.previousResult.kommentar}</div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 