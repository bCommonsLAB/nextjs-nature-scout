'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Trash2,
  RefreshCw,
  Edit,
  CheckCircle,
  SearchIcon,
  XIcon
} from 'lucide-react';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { EffektiverHabitatEditor } from '@/components/habitat/EffektiverHabitatEditor';
import { ParameterHeading } from '@/components/natureScout/ParameterHeading';

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
  startTime?: string;
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: {
    userId?: string;
    userName?: string;
    role?: string;
  };
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
      dafür_spricht?: string[] | string;
      dagegen_spricht?: string[] | string;
    };
    habitatfamilie?: string;
    typicalSpecies?: string[];
    kommentar?: string;
    bildanalyse?: any[];
    vegetationsstruktur?: Record<string, any>;
    blühaspekte?: Record<string, any>;
    nutzung?: Record<string, any>;
    bewertung?: Record<string, any>;
  };
  llmInfo?: {
    habitatStructuredOutput?: Record<string, any>;
    schutzstatusStructuredOutput?: Record<string, any>;
  };
  verifiedResult?: {
    habitattyp?: string;
    schutzstatus?: string;
    habitatfamilie?: string;
    kommentar?: string;
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
      effectiveHabitat?: string;
      schutzstatus?: string;
      bildCount?: number;
      kommentar?: string;
    };
    previousResult?: {
      habitattyp?: string;
      effectiveHabitat?: string;
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
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isExpert, setIsExpert] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // Hilfsfunktion für Retry-Logik mit exponentieller Verzögerung
  const fetchWithRetry = async (url: string, maxRetries = 3, delay = 1000): Promise<Response> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response;
        }
        
        // Bei 5xx-Fehlern (Server-Fehler) retry, bei 4xx-Fehlern (Client-Fehler) nicht
        if (response.status >= 500 && attempt < maxRetries) {
          console.warn(`API-Aufruf fehlgeschlagen (Versuch ${attempt}/${maxRetries}): ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
          continue;
        }
        
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`API-Aufruf fehlgeschlagen (Versuch ${attempt}/${maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
    throw new Error('Maximale Anzahl von Wiederholungsversuchen erreicht');
  };

  useEffect(() => {
    const fetchDataAndPermissions = async () => {
      // Cache-Check: Nur laden wenn Daten älter als 30 Sekunden sind oder nicht vorhanden
      const now = Date.now();
      const cacheTimeout = 30000; // 30 Sekunden
      
      if (data && (now - lastFetchTime) < cacheTimeout) {
        console.log('Verwende gecachte Daten');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Parallele API-Aufrufe mit Retry-Logik für bessere Stabilität
        const [habitatResponse, expertResponse] = await Promise.allSettled([
          fetchWithRetry(`/api/habitat/${jobId}`),
          fetchWithRetry('/api/users/isExpert')
        ]);
        
        // Habitat-Daten verarbeiten
        if (habitatResponse.status === 'fulfilled') {
          const habitatResult = habitatResponse.value;
          if (!habitatResult.ok) {
            throw new Error(`Fehler beim Laden der Daten: ${habitatResult.status}`);
          }
          const habitatData = await habitatResult.json();
          setData(habitatData);
          setError(null);
          setLastFetchTime(now);
        } else {
          throw new Error(`Fehler beim Laden der Habitat-Daten: ${habitatResponse.reason}`);
        }
        
        // Expertenrechte verarbeiten
        if (expertResponse.status === 'fulfilled') {
          const expertResult = expertResponse.value;
          if (expertResult.ok) {
            const { isExpert } = await expertResult.json();
            setIsExpert(isExpert);
          } else {
            console.warn('Fehler beim Überprüfen der Expertenrechte:', expertResult.status);
            // Setze isExpert auf false als Fallback
            setIsExpert(false);
          }
        } else {
          console.warn('Fehler beim Überprüfen der Expertenrechte:', expertResponse.reason);
          setIsExpert(false);
        }
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(errorMessage);
        console.error('Fehler beim Laden der Daten:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (jobId) {
      fetchDataAndPermissions();
    }
  }, [jobId, data, lastFetchTime]);

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
      
      // Abfrage des Analysestatus, bis die Analyse abgeschlossen ist
      const checkAnalysisStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/habitat/${jobId}`);
          
          if (!statusResponse.ok) {
            throw new Error('Fehler beim Abrufen des Analysestatus');
          }
          
          const statusData = await statusResponse.json();
          
          if (statusData.status === 'completed') {
            // Analyse abgeschlossen - Daten aktualisieren und Zustand zurücksetzen
            setData(statusData);
            setAnalyzing(false);
          } else if (statusData.status === 'failed') {
            // Fehler bei der Analyse
            throw new Error(statusData.error || 'Analyse fehlgeschlagen');
          } else {
            // Analyse läuft noch, erneut abfragen
            setTimeout(checkAnalysisStatus, 2000);
          }
        } catch (error) {
          console.error('Fehler beim Abrufen des Analysestatus:', error);
          alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler beim Abrufen des Status'}`);
          setAnalyzing(false);
        }
      };
      
      // Starte die Statusabfrage
      await checkAnalysisStatus();
      
    } catch (error) {
      console.error('Fehler bei der erneuten Analyse:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler bei der Analyse'}`);
      setAnalyzing(false);
    }
  };
  
  const handleEdit = () => {
    // Weiterleiten zum Analyseflow mit vorausgefüllten Daten
    // Wir kodieren die Job-ID als URL-Parameter, damit der Flow weiß, 
    // dass es sich um eine Bearbeitung handelt
    router.push(`/naturescout?editJobId=${jobId}`);
  };

  const handleUnverify = async () => {
    if (!data || !confirm('Sind Sie sicher, dass Sie die Verifizierung zurücknehmen möchten? Das Habitat kann dann wieder bearbeitet werden.')) return;
    
    try {
      const response = await fetch(`/api/habitat/${jobId}/unverify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Zurücknehmen der Verifizierung');
      }
      
      // Daten aktualisieren - Verifizierung entfernen
      setData({
        ...data,
        verified: false,
        verifiedAt: undefined,
        verifiedBy: undefined,
        verifiedResult: undefined
      });
      
      alert('Verifizierung wurde erfolgreich zurückgenommen. Das Habitat kann jetzt wieder bearbeitet werden.');
    } catch (error) {
      console.error('Fehler beim Zurücknehmen der Verifizierung:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler beim Zurücknehmen der Verifizierung'}`);
    }
  };
  
  // Hilfsfunktion für die Bestimmung der Farbe des Schutzstatus
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

  // Hilfsfunktion zur Transformation der Tooltip-Daten
  const transformSchemaToTooltips = (schema: Record<string, any>) => {
    const tooltips: Record<string, any> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (typeof value === 'string') {
        tooltips[key] = {
          title: key,
          description: value
        };
      } else if (typeof value === 'object') {
        tooltips[key] = {
          title: key,
          description: '',
          ...Object.entries(value).reduce((acc, [subKey, subValue]) => ({
            ...acc,
            [subKey]: typeof subValue === 'string' ? subValue : ''
          }), {})
        };
      }
    }
    return tooltips;
  };

  // Tooltip-Daten für Habitat-Parameter
  const habitatTooltips = data?.llmInfo?.habitatStructuredOutput 
    ? transformSchemaToTooltips(data.llmInfo.habitatStructuredOutput)
    : {};

  const handleEditorSaved = (updatedData: { habitattyp: string; habitatfamilie?: string; schutzstatus?: string; kommentar?: string; verified: boolean; verifiedAt: Date | string }) => {
    if (data) {
      setData({
        ...data,
        result: {
          ...data.result,
          habitattyp: updatedData.habitattyp,
          habitatfamilie: updatedData.habitatfamilie, 
          schutzstatus: updatedData.schutzstatus,
          kommentar: updatedData.kommentar
        },
        verified: updatedData.verified,
        verifiedAt: typeof updatedData.verifiedAt === 'string' 
          ? updatedData.verifiedAt 
          : updatedData.verifiedAt.toISOString()
      });
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
          <div className="flex flex-1 md:flex-row justify-between items-start gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                Habitaterfassung: 
              </h1>
              <p className="text-gray-500">
                Erfasst am {data.startTime && format(new Date(data.startTime), 'dd. MMMM yyyy, HH:mm', { locale: de })} von {data.metadata?.erfassungsperson || 'Unbekannt'}
              </p>
            </div>
            
            {/* Aktions-Buttons basierend auf Verifizierungsstatus */}
            <div className="flex flex-wrap gap-2">
              {/* Für verifizierte Habitate: Nur Verifizierung zurücknehmen und Löschen */}
              {data.verified && isExpert && (
                <>
                  <button
                    onClick={handleUnverify}
                    className="inline-flex items-center px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Verifizierung zurücknehmen
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> {deleting ? 'Wird gelöscht...' : 'Löschen'}
                  </button>
                </>
              )}
              
              {/* Für nicht-verifizierte Habitate: Alle Aktionen erlaubt */}
              {!data.verified && (isExpert || !data.verified) && (
                <>
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
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


            {/* Linke Spalte: Bilder und Metadaten */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Standort</h2>
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p>Gemeinde: {data.metadata?.gemeinde || '-'}</p>
                <p>Flurname: {data.metadata?.flurname || '-'}</p>
                <p>Koordinaten: {data.metadata?.latitude}, {data.metadata?.longitude}</p>
              </div>

              <h2 className="text-xl font-semibold mb-4">Bilder</h2>
              <div className="space-y-4">
                {data.metadata?.bilder?.map((bild: HabitatBild, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded">
                    <div 
                      className="relative w-full aspect-[4/3] cursor-pointer bg-gray-100 rounded overflow-hidden"
                      onClick={() => setPreviewImage(bild.url)}
                    >
                      <Image
                        src={bild.url.replace('.jpg', '_low.jpg')}
                        alt={`Bild ${index + 1}`}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity">
                        <SearchIcon className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                      </div>
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
              
            </div>
            
            {/* Rechte Spalte: Analyseergebnisse */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Analyseergebnis</h2>
                <div className="text-sm text-gray-500 text-right">
                  <div>Letzte Analyse vom</div>
                  <div className="font-medium">
                    {data.updatedAt && format(new Date(data.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </div>
                </div>
              </div>
              
              {/* Unterschiedliche Ansichten basierend auf Benutzerrolle und Verifizierungsstatus */}
              {data.result?.habitattyp && (
                <>
                  {/* Für Experten: Editor nur für nicht-verifizierte Habitate */}
                  {isExpert && !data.verified && (
                    <EffektiverHabitatEditor
                      jobId={jobId as string}
                      detectedHabitat={data.result.habitattyp}
                      detectedFamilie={data.result.habitatfamilie}
                      effectiveHabitat={data.verifiedResult?.habitattyp || data.result.habitattyp}
                      kommentar={data.verifiedResult?.kommentar || data.result.kommentar}
                      onSaved={handleEditorSaved}
                      isExpert={isExpert}
                      isVerified={data.verified || false}
                      returnToList={false}
                      verifiedAt={data.verifiedAt}
                      verifiedBy={data.verifiedBy}
                    />
                  )}
                  
                  {/* Für Experten: Verifizierte Habitate - nur Anzeige */}
                  {isExpert && data.verified && data.verifiedResult && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded border border-green-200 mb-4">
                        <div className="flex items-center text-green-700 mb-3">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="font-medium">✅ Habitat final verifiziert und abgeschlossen</span>
                        </div>
                        {data.verifiedAt && (
                          <p className="text-green-700 text-sm">
                            Verifiziert am {format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                            {data.verifiedBy?.userName && ` von ${data.verifiedBy.userName}`}
                            {data.verifiedBy?.role && ` (${data.verifiedBy.role})`}
                          </p>
                        )}
                        <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                          <strong>Hinweis:</strong> Verifizierte Habitate sind final abgeschlossen. Verwenden Sie "Verifizierung zurücknehmen", um Änderungen zu ermöglichen.
                        </div>
                      </div>
                      
                      {/* Verifizierter Habitat - Read-Only für Experten */}
                      <div className="p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg mb-2">Habitat: {data.verifiedResult.habitattyp}</h3>
                            {data.verifiedResult.habitatfamilie && (
                              <p className="text-gray-500 mb-4">Habitatgruppe: {data.verifiedResult.habitatfamilie}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {data.verifiedResult.schutzstatus && (
                              <div className="mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(data.verifiedResult.schutzstatus)}`}>
                                  {normalizeSchutzstatus(data.verifiedResult.schutzstatus)}
                                </span>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              <div className="font-semibold text-green-600">Verifiziert am</div>
                              <div className="font-medium">
                                {data.verifiedAt && format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                              </div>
                              {/* Zeige auch KI-Analyse-Datum, falls es vom Verifizierungs-Datum abweicht */}
                              {data.updatedAt && data.verifiedAt && 
                               new Date(data.updatedAt).getTime() !== new Date(data.verifiedAt).getTime() && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-blue-600">Letzte KI-Analyse vom</div>
                                  <div className="font-medium">
                                    {format(new Date(data.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {data.verifiedResult.kommentar && (
                          <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
                            <p className="text-gray-700 font-medium mb-1">Expertenkommentar:</p>
                            <p className="text-gray-800">{data.verifiedResult.kommentar}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Für normale Benutzer und nicht verifizierte Habitate - nur KI-Ergebnisse mit Hinweis */}
                  {!isExpert && !data.verified && (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-4">
                        <div className="flex items-center text-yellow-700 mb-3">
                          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="font-medium">Habitat noch nicht verifiziert</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Dieses Habitat wurde noch nicht von einem Experten verifiziert. 
                          Die angezeigte Klassifizierung und der Schutzstatus sind vorläufig und wurden automatisch durch KI erstellt.
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">Habitat: {data.result.habitattyp}</h3>
                          <div className="text-xs text-gray-500 text-right">
                            <div className="text-blue-600 font-semibold">KI-Analyse vom</div>
                            <div className="font-medium">
                              {data.updatedAt && format(new Date(data.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </div>
                          </div>
                        </div>
                        {data.result.habitatfamilie && (
                          <p className="text-gray-500 mb-4">Habitat-Gruppe: {data.result.habitatfamilie}</p>
                        )}
                        {data.result.zusammenfassung && (
                          <p className="mb-4">{data.result.zusammenfassung}</p>
                        )}
                        {data.result.schutzstatus && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(data.result.schutzstatus)}`}>
                              {normalizeSchutzstatus(data.result.schutzstatus)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Für normale Benutzer und verifizierte Habitate - nur verifizierte Daten anzeigen */}
                  {!isExpert && data.verified && data.verifiedResult && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded border border-green-200 mb-4">
                        <div className="flex items-center text-green-700 mb-3">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="font-medium">✅ Habitat final verifiziert und abgeschlossen</span>
                        </div>
                        {data.verifiedAt && (
                          <p className="text-green-700 text-sm">
                            Verifiziert am {format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                            {data.verifiedBy?.userName && ` von ${data.verifiedBy.userName}`}
                            {data.verifiedBy?.role && ` (${data.verifiedBy.role})`}
                          </p>
                        )}
                        <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                          <strong>Hinweis:</strong> Verifizierte Habitate sind final abgeschlossen und können nicht mehr bearbeitet werden.
                        </div>
                      </div>
                      
                      {/* Verifizierter Habitat */}
                      <div className="p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg mb-2">Habitat: {data.verifiedResult.habitattyp}</h3>
                            {data.verifiedResult.habitatfamilie && (
                              <p className="text-gray-500 mb-4">Habitatgruppe: {data.verifiedResult.habitatfamilie}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {data.verifiedResult.schutzstatus && (
                              <div className="mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(data.verifiedResult.schutzstatus)}`}>
                                  {normalizeSchutzstatus(data.verifiedResult.schutzstatus)}
                                </span>
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              <div className="font-semibold text-green-600">Verifiziert am</div>
                              <div className="font-medium">
                                {data.verifiedAt && format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                              </div>
                              {/* Zeige auch KI-Analyse-Datum, falls es vom Verifizierungs-Datum abweicht */}
                              {data.updatedAt && data.verifiedAt && 
                               new Date(data.updatedAt).getTime() !== new Date(data.verifiedAt).getTime() && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-blue-600">Letzte KI-Analyse vom</div>
                                  <div className="font-medium">
                                    {format(new Date(data.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {data.verifiedResult.kommentar && (
                          <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
                            <p className="text-gray-700 font-medium mb-1">Expertenkommentar:</p>
                            <p className="text-gray-800">{data.verifiedResult.kommentar}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              
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
                  {/* Detaillierte KI-Analyse - nur für Experten sichtbar */}
                  {isExpert && (
                    <div className="border border-gray-200 rounded-md overflow-hidden mt-6">
                      <details className="group">
                        <summary className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <span className="font-semibold text-gray-700">Wie kam dieses Ergebnis zustande?</span>
                          <span className="transition group-open:rotate-180">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </summary>
                        <div className="p-4 border-t border-gray-200 bg-white">
                          
                          <div className="space-y-6">
                            {/* Erkannte Parameter */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <ParameterHeading 
                                title="Erkannte Parameter"
                                description="Die hier gelisteten Parameter wurden durch das LLM aufgrund von Wahrscheinlichkeiten analysiert. Jeder Parameter wird durch eine gezielte Frage bestimmt, die hinter dem Fragesymbol erklärt wird. Es kann sein, dass einige erkannte Parameter falsch sind, aber es zwingt das LLM viele Indizien zu berücksichtigen und die Einschätzung zu verbessern."
                                details={{}}
                              />
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Bildanalyse */}
                                {data.result?.bildanalyse && Array.isArray(data.result.bildanalyse) && data.result.bildanalyse.length > 0 && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.bildanalyse?.title || 'Bildanalyse'}
                                      description={habitatTooltips.bildanalyse?.description || ''}
                                      details={{
                                        Bilder: habitatTooltips.bildanalyse?.bilder || ''
                                      }}
                                    />
                                    <div className="ml-6 space-y-1">
                                      {data.result.bildanalyse.map((analyse: any, index: number) => (
                                        <p key={index} className="text-sm text-gray-600">
                                          {typeof analyse === 'string' ? analyse : JSON.stringify(analyse)}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Pflanzenarten */}
                                {data.result?.pflanzenarten && Array.isArray(data.result.pflanzenarten) && data.result.pflanzenarten.length > 0 && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.pflanzenarten?.title || 'Pflanzenarten'}
                                      description={habitatTooltips.pflanzenarten?.description || ''}
                                      details={{
                                        Name: habitatTooltips.pflanzenarten?.name || '',
                                        Häufigkeit: habitatTooltips.pflanzenarten?.häufigkeit || '',
                                        "Ist Zeiger": habitatTooltips.pflanzenarten?.istzeiger || ''
                                      }}
                                    />
                                    <div className="ml-6 space-y-1">
                                      {data.result.pflanzenarten.map((pflanze: any, index: number) => (
                                        <p key={index} className="text-sm text-gray-600">
                                          {typeof pflanze === 'string' ? pflanze : `${pflanze.name || pflanze.species || 'Unbekannt'} (${pflanze.häufigkeit || pflanze.score || 'unbekannt'})`}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Vegetationsstruktur */}
                                {data.result?.vegetationsstruktur && typeof data.result.vegetationsstruktur === 'object' && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.vegetationsstruktur?.title || 'Vegetationsstruktur'}
                                      description={habitatTooltips.vegetationsstruktur?.description || ''}
                                      details={{
                                        Höhe: habitatTooltips.vegetationsstruktur?.höhe || '',
                                        Dichte: habitatTooltips.vegetationsstruktur?.dichte || '',
                                        Deckung: habitatTooltips.vegetationsstruktur?.deckung || ''
                                      }}
                                    />
                                    <div className="ml-6 space-y-1 text-sm text-gray-600">
                                      {Object.entries(data.result.vegetationsstruktur).map(([key, value]) => (
                                        <p key={key}>
                                          {key.charAt(0).toUpperCase() + key.slice(1)}: <span className="font-medium">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Blühaspekte */}
                                {data.result?.blühaspekte && typeof data.result.blühaspekte === 'object' && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.blühaspekte?.title || 'Blühaspekte'}
                                      description={habitatTooltips.blühaspekte?.description || ''}
                                      details={{
                                        Intensität: habitatTooltips.blühaspekte?.intensität || '',
                                        "Anzahl Farben": habitatTooltips.blühaspekte?.anzahlfarben || ''
                                      }}
                                    />
                                    <div className="ml-6 space-y-1 text-sm text-gray-600">
                                      {Object.entries(data.result.blühaspekte).map(([key, value]) => (
                                        <p key={key}>
                                          {key.charAt(0).toUpperCase() + key.slice(1)}: <span className="font-medium">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Nutzung */}
                                {data.result?.nutzung && typeof data.result.nutzung === 'object' && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.nutzung?.title || 'Nutzung'}
                                      description={habitatTooltips.nutzung?.description || ''}
                                      details={{
                                        Beweidung: habitatTooltips.nutzung?.beweidung || '',
                                        Mahd: habitatTooltips.nutzung?.mahd || '',
                                        Düngung: habitatTooltips.nutzung?.düngung || ''
                                      }}
                                    />
                                    <div className="ml-6 space-y-1 text-sm text-gray-600">
                                      {Object.entries(data.result.nutzung).map(([key, value]) => (
                                        <p key={key}>
                                          {key.charAt(0).toUpperCase() + key.slice(1)}: <span className="font-medium">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Bewertung */}
                                {data.result?.bewertung && typeof data.result.bewertung === 'object' && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.bewertung?.title || 'Bewertung'}
                                      description={habitatTooltips.bewertung?.description || ''}
                                      details={{
                                        Artenreichtum: habitatTooltips.bewertung?.artenreichtum || '',
                                        Konfidenz: habitatTooltips.bewertung?.konfidenz || ''
                                      }}
                                    />
                                    <div className="ml-6 space-y-1 text-sm text-gray-600">
                                      {Object.entries(data.result.bewertung).map(([key, value]) => (
                                        <p key={key}>
                                          {key.charAt(0).toUpperCase() + key.slice(1)}: <span className="font-medium">
                                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                          </span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Habitattyp */}
                                {data.result?.habitattyp && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.habitattyp?.title || 'Habitattyp'}
                                      description={habitatTooltips.habitattyp?.description || ''}
                                      details={{}}
                                    />
                                    <p className="text-sm text-gray-600 ml-6">
                                      Typ: <span className="font-medium">{data.result.habitattyp}</span>
                                    </p>
                                  </div>
                                )}

                                {/* Schutzstatus */}
                                {data.result?.schutzstatus && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.schutzstatus?.title || 'Schutzstatus'}
                                      description={habitatTooltips.schutzstatus?.description || ''}
                                      details={{}}
                                    />
                                    <p className="text-sm text-gray-600 ml-6">
                                      Status: <span className="font-medium">{data.result.schutzstatus}</span>
                                    </p>
                                  </div>
                                )}

                                {/* Habitatfamilie */}
                                {data.result?.habitatfamilie && (
                                  <div className="space-y-3">
                                    <ParameterHeading 
                                      title={habitatTooltips.habitatfamilie?.title || 'Habitatfamilie'}
                                      description={habitatTooltips.habitatfamilie?.description || ''}
                                      details={{}}
                                    />
                                    <p className="text-sm text-gray-600 ml-6">
                                      Familie: <span className="font-medium">{data.result.habitatfamilie}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Evidenz */}
                            {data.result?.evidenz && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <ParameterHeading 
                                  title={habitatTooltips.evidenz?.title || 'Evidenz'}
                                  description={habitatTooltips.evidenz?.description || ''}
                                  details={{
                                    dafür_spricht: habitatTooltips.evidenz?.dafür_spricht || '',
                                    dagegen_spricht: habitatTooltips.evidenz?.dagegen_spricht || ''
                                  }}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {data.result.evidenz.dafür_spricht && (
                                    <div>
                                      <h4 className="text-sm font-medium text-green-600 mb-2">Dafür spricht:</h4>
                                      {Array.isArray(data.result.evidenz.dafür_spricht) ? (
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                          {data.result.evidenz.dafür_spricht.map((punkt: string, index: number) => (
                                            <li key={index}>{punkt}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-gray-600">{data.result.evidenz.dafür_spricht}</p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {data.result.evidenz.dagegen_spricht && (
                                    <div>
                                      <h4 className="text-sm font-medium text-red-500 mb-2">Dagegen spricht:</h4>
                                      {Array.isArray(data.result.evidenz.dagegen_spricht) ? (
                                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                          {data.result.evidenz.dagegen_spricht.map((punkt: string, index: number) => (
                                            <li key={index}>{punkt}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-gray-600">{data.result.evidenz.dagegen_spricht}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Zusammenfassung */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <ParameterHeading 
                                title={habitatTooltips.zusammenfassung?.title || 'Zusammenfassung'}
                                description={habitatTooltips.zusammenfassung?.description || ''}
                                details={{}}
                              />
                              <p className="text-sm text-gray-600">
                                Das Habitat ist wahrscheinlich ein {data.result?.habitattyp || 'unbekannter Typ'}.
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-6 bg-yellow-50 p-4 rounded text-sm border border-yellow-200">
                            <p className="text-yellow-700">
                              <strong>Hinweis:</strong> Diese Analyseinformationen wurden automatisch durch KI erzeugt und dienen nur als Orientierungshilfe. 
                              Experten verifizieren nur den Habitattyp und den Schutzstatus, nicht die dargestellten Analysehinweise.
                            </p>
                          </div>
                        </div>
                      </details>
                    </div>
                  )}
                  
                  {/* Kommentar des Erfassers - immer sichtbar */}
                  {data.metadata?.kommentar && (
                    <div className="bg-blue-50 p-4 rounded mt-4">
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
      {isExpert && data.history && data.history.length > 0 && (
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
      <div>
        <p className="text-gray-500 text-xs">
            jobId: {data.jobId}
        </p>
      </div>

      {/* Bild-Vorschau-Popup */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] p-2">
            <button 
              className="absolute -top-12 right-0 bg-white rounded-full p-2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(null);
              }}
            >
              <XIcon className="h-5 w-5" />
            </button>
            <Image
              src={previewImage}
              alt="Große Vorschau"
              width={1800}
              height={1200}
              className="habitat-image max-h-[85vh] w-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
} 