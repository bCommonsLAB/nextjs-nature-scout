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
  CheckCircle
} from 'lucide-react';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';
import { EffektiverHabitatEditor } from '@/components/habitat/EffektiverHabitatEditor';

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
    habitatFamilie?: string;
    typicalSpecies?: string[];
    kommentar?: string;
  };
  verifiedResult?: {
    habitattyp?: string;
    schutzstatus?: string;
    habitatFamilie?: string;
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
  
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const response = await fetch('/api/users/isExpert');
        const { isExpert } = await response.json();
        setIsExpert(isExpert);
      } catch (error) {
        console.error('Fehler beim Überprüfen der Expertenrechte:', error);
      }
    };
    
    checkPermissions();
  }, []);
  
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

  const handleEditorSaved = (updatedData: { habitattyp: string; habitatFamilie?: string; schutzstatus?: string; kommentar?: string; verified: boolean; verifiedAt: Date | string }) => {
    if (data) {
      setData({
        ...data,
        result: {
          ...data.result,
          habitattyp: updatedData.habitattyp,
          habitatFamilie: updatedData.habitatFamilie,
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
                Erfasst am {data.updatedAt && format(new Date(data.updatedAt), 'dd. MMMM yyyy, HH:mm', { locale: de })} von {data.metadata?.erfassungsperson || 'Unbekannt'}
              </p>
            </div>
            
            {/* Aktions-Buttons nur anzeigen, wenn Benutzer Experte ist ODER das Habitat noch nicht verifiziert wurde */}
            {(isExpert || !data.verified) && (
              <div className="flex flex-wrap gap-2">
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
            )}
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
              
            </div>
            
            {/* Rechte Spalte: Analyseergebnisse */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Analyseergebnis</h2>
                
              </div>
              
              {/* Unterschiedliche Ansichten basierend auf Benutzerrolle und Verifizierungsstatus */}
              {data.result?.habitattyp && (
                <>
                  {/* Für Experten immer den Editor anzeigen */}
                  {isExpert && (
                    <EffektiverHabitatEditor
                      jobId={jobId as string}
                      detectedHabitat={data.result.habitattyp}
                      detectedFamilie={data.result.habitatFamilie}
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
                        <h3 className="font-medium text-lg mb-2">Habitat: {data.result.habitattyp}</h3>
                        {data.result.habitatFamilie && (
                          <p className="text-gray-500 mb-4">Habitat-Gruppe: {data.result.habitatFamilie}</p>
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
                          <span className="font-medium">Dieser Habitat wurde verifiziert</span>
                        </div>
                        {data.verifiedAt && (
                          <p className="text-green-700 text-sm">
                            Verifiziert am {format(new Date(data.verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                            {data.verifiedBy?.userName && ` von ${data.verifiedBy.userName}`}
                            {data.verifiedBy?.role && ` (${data.verifiedBy.role})`}
                          </p>
                        )}
                      </div>
                      
                      {/* Verifizierter Habitat */}
                      <div className="p-4 border rounded-lg bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg mb-2">Habitat: {data.verifiedResult.habitattyp}</h3>
                            {data.verifiedResult.habitatFamilie && (
                              <p className="text-gray-500 mb-4">Habitatfamilie: {data.verifiedResult.habitatFamilie}</p>
                            )}
                          </div>
                          {data.verifiedResult.schutzstatus && (
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSchutzstatusColor(data.verifiedResult.schutzstatus)}`}>
                                {normalizeSchutzstatus(data.verifiedResult.schutzstatus)}
                              </span>
                            </div>
                          )}
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
                  {/* Zuklappbarer Bereich für KI-generierte Hinweise - nur für Experten sichtbar */}
                  {isExpert && (
                    <div className="border border-gray-200 rounded-md overflow-hidden mt-6">
                      <details className="group">
                        <summary className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <span className="font-semibold text-gray-700">Analyse Hinweise (KI generiert)</span>
                          <span className="transition group-open:rotate-180">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </summary>
                        <div className="p-4 border-t border-gray-200 bg-white">
                          <div className="space-y-4">
                            {/* Zusammenfassung */}
                            <div className="bg-gray-50 p-4 rounded">
                              <h3 className="font-semibold text-sm">Zusammenfassung</h3>
                              <p className="mt-1 text-sm text-gray-600">{data.result.zusammenfassung}</p>
                            </div>
                            
                            {/* Typische Pflanzenarten */}
                            {data.result.typicalSpecies && data.result.typicalSpecies.length > 0 && (
                              <div className="bg-gray-50 p-4 rounded">
                                <h3 className="font-semibold text-sm">Typische Pflanzenarten</h3>
                                <ul className="mt-1 pl-5 text-sm list-disc">
                                  {data.result.typicalSpecies.map((species, index) => (
                                    <li key={index}>{species}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Standort */}
                            {data.result.standort && (
                              <div className="bg-gray-50 p-4 rounded">
                                <h3 className="font-semibold text-sm">Standort</h3>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                  <div>Hangneigung: <span className="font-medium">{data.result.standort.hangneigung}</span></div>
                                  <div>Exposition: <span className="font-medium">{data.result.standort.exposition}</span></div>
                                  <div>Bodenfeuchtigkeit: <span className="font-medium">{data.result.standort.bodenfeuchtigkeit}</span></div>
                                </div>
                              </div>
                            )}
                            
                            {/* Pflanzenarten */}
                            {data.result.pflanzenarten && data.result.pflanzenarten.length > 0 && (
                              <div className="bg-gray-50 p-4 rounded">
                                <h3 className="font-semibold text-sm">Erkannte Pflanzenarten</h3>
                                <ul className="mt-2 space-y-1 text-sm">
                                  {data.result.pflanzenarten.map((pflanze: Pflanze, index: number) => (
                                    <li key={index} className="flex justify-between">
                                      <span>{pflanze.name}</span>
                                      <span className="text-gray-500">{pflanze.häufigkeit}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Evidenz */}
                            {data.result.evidenz && (
                              <div className="bg-gray-50 p-4 rounded">
                                <h3 className="font-semibold text-sm">Evidenz</h3>
                                {data.result.evidenz.dafür_spricht && (
                                  <div className="mt-2">
                                    <h4 className="text-xs font-medium text-green-600">Dafür spricht:</h4>
                                    {Array.isArray(data.result.evidenz.dafür_spricht) ? (
                                      <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {data.result.evidenz.dafür_spricht.map((punkt: string, index: number) => (
                                          <li key={index}>{punkt}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm">{data.result.evidenz.dafür_spricht}</p>
                                    )}
                                  </div>
                                )}
                                {data.result.evidenz.dagegen_spricht && (
                                  <div className="mt-2">
                                    <h4 className="text-xs font-medium text-red-500">Dagegen spricht:</h4>
                                    {Array.isArray(data.result.evidenz.dagegen_spricht) ? (
                                      <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {data.result.evidenz.dagegen_spricht.map((punkt: string, index: number) => (
                                          <li key={index}>{punkt}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-sm">{data.result.evidenz.dagegen_spricht}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 bg-yellow-50 p-3 rounded text-sm border border-yellow-200">
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
    </div>
  );
} 