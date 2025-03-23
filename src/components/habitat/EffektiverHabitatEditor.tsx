import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { normalizeSchutzstatus } from '@/lib/utils/data-validation';

interface HabitatType {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  habitatFamilie?: string;
  schutzstatus?: string;
}

interface UpdatedHabitatData {
  habitattyp: string;
  habitatFamilie?: string;
  schutzstatus?: string;
  kommentar?: string;
  verified: boolean;
  verifiedAt: Date | string;
}

interface EffektiverHabitatEditorProps {
  jobId: string;
  detectedHabitat: string;
  detectedFamilie?: string;
  effectiveHabitat?: string;
  kommentar?: string;
  onSaved: (updatedData: UpdatedHabitatData) => void;
  isExpert: boolean;
  isVerified?: boolean;
  returnToList?: boolean;
  verifiedAt?: string;
  verifiedBy?: {
    userId?: string;
    userName?: string;
    role?: string;
  };
}

export function EffektiverHabitatEditor({ 
  jobId, 
  detectedHabitat, 
  detectedFamilie,
  effectiveHabitat, 
  kommentar, 
  onSaved, 
  isExpert,
  isVerified = false,
  returnToList = true,
  verifiedAt,
  verifiedBy
}: EffektiverHabitatEditorProps) {
  const [habitatOptions, setHabitatOptions] = useState<HabitatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Wir initialisieren mit dem verifizierten Habitat (wenn vorhanden) oder dem KI-detektierten Habitat
  const [selectedHabitat, setSelectedHabitat] = useState(effectiveHabitat || detectedHabitat || '');
  const [selectedHabitatInfo, setSelectedHabitatInfo] = useState<HabitatType | null>(null);
  const [habitatKommentar, setHabitatKommentar] = useState(kommentar || '');
  
  // Neue States für die Habitatfamilien
  const [habitatFamilies, setHabitatFamilies] = useState<string[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [filteredHabitats, setFilteredHabitats] = useState<HabitatType[]>([]);
  
  const router = useRouter();
  
  useEffect(() => {
    async function fetchHabitatTypes() {
      try {
        setLoading(true);
        const response = await fetch('/api/habitat-types');
        
        if (!response.ok) {
          throw new Error(`Fehler beim Laden der Habitattypen: ${response.status}`);
        }
        
        const data = await response.json();
        setHabitatOptions(data);
        
        // Extrahiere einzigartige Habitatfamilien
        const families = Array.from(new Set(data
          .map((h: HabitatType) => h.habitatFamilie)
          .filter(Boolean))) as string[];
        
        setHabitatFamilies(families.sort());
        setError(null);
        
        // Nach dem Laden der Daten, initialisiere die ausgewählten Werte
        const initialHabitat = effectiveHabitat || detectedHabitat || '';
        if (initialHabitat) {
          const habitatInfo = data.find((h: HabitatType) => h.name === initialHabitat);
          if (habitatInfo) {
            setSelectedHabitatInfo(habitatInfo);
            setSelectedHabitat(initialHabitat);
            
            // Setze die Familie und filtere Habitate
            if (habitatInfo.habitatFamilie) {
              setSelectedFamily(habitatInfo.habitatFamilie);
              setFilteredHabitats(data.filter((h: HabitatType) => h.habitatFamilie === habitatInfo.habitatFamilie));
            }
          }
        }
      } catch (err) {
        console.error('Fehler beim Laden der Habitattypen:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }
    
    fetchHabitatTypes();
  }, []); // Leeres Abhängigkeitsarray - lädt nur beim Mounten
  
  // Separater Effect für Änderungen an den Props
  useEffect(() => {
    if (habitatOptions.length === 0) return; // Noch nicht geladen
    
    const newSelectedHabitat = effectiveHabitat || detectedHabitat || '';
    
    // Finde das Habitat und seine Familie
    const habitatInfo = habitatOptions.find((h: HabitatType) => h.name === newSelectedHabitat);
    
    if (habitatInfo) {
      setSelectedHabitat(newSelectedHabitat);
      setSelectedHabitatInfo(habitatInfo);
      
      if (habitatInfo.habitatFamilie) {
        setSelectedFamily(habitatInfo.habitatFamilie);
        setFilteredHabitats(habitatOptions.filter((h: HabitatType) => h.habitatFamilie === habitatInfo.habitatFamilie));
      }
    }
  }, [effectiveHabitat, detectedHabitat, habitatOptions]);
  
  // Handler für Änderung der Habitatfamilie
  const handleFamilyChange = (value: string) => {
    setSelectedFamily(value);
    
    // Filtere Habitate nach ausgewählter Familie
    const filteredOptions = habitatOptions.filter((h: HabitatType) => h.habitatFamilie === value);
    setFilteredHabitats(filteredOptions);
    
    // Wenn das aktuell ausgewählte Habitat nicht zur neuen Familie gehört, setze es zurück
    const currentHabitatInFamily = filteredOptions.some((h: HabitatType) => h.name === selectedHabitat);
    if (!currentHabitatInFamily) {
      setSelectedHabitat('');
      setSelectedHabitatInfo(null);
    }
  };
  
  // Wenn sich der ausgewählte Habitat ändert, aktualisiere die zugehörigen Informationen
  const handleHabitatChange = (value: string) => {
    setSelectedHabitat(value);
    const selectedInfo = habitatOptions.find((h: HabitatType) => h.name === value);
    if (selectedInfo) {
      setSelectedHabitatInfo(selectedInfo);
    } else {
      setSelectedHabitatInfo(null);
    }
  };
  
  const handleSave = async () => {
    if (!selectedHabitat) {
      setError('Bitte wählen Sie einen Habitattyp aus');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(`/api/habitat/${jobId}/effective-habitat`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          effectiveHabitat: selectedHabitat,
          kommentar: habitatKommentar
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern des effektiven Habitats');
      }
      
      const updatedData = await response.json();
      onSaved(updatedData);
      setError(null);
      
      // Nach erfolgreichem Speichern zur Habitatliste zurückkehren
      // mit einem Flag, das anzeigt, dass wir von einer Verifizierung zurückkommen
      sessionStorage.setItem('habitat_just_verified', 'true');
      sessionStorage.setItem('habitat_verified_id', jobId);
      if (returnToList) {
        router.push('/habitat');
      } else {
        // Die Seite neu laden, um die aktualisierten Daten zu sehen (inkl. History)
        window.location.reload();
      }
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };
  
  
  if (!isExpert) {
    return null; // Nur für Experten anzeigen
  }
  
  return (
    <div className="space-y-4 mb-6 border p-4 rounded-lg bg-gray-50">
      {isVerified && (
        <div className="bg-green-50 p-3 rounded border border-green-100 mb-4">
          <p className="text-green-700 text-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Dieser Habitat wurde bereits verifiziert. Neue Änderungen werden die bestehende Verifizierung überschreiben.
          </p>
          {verifiedAt && (
            <p className="text-green-700 text-sm mt-1 ml-6">
              Verifiziert am {format(new Date(verifiedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
              {verifiedBy?.userName && ` von ${verifiedBy.userName}`}
              {verifiedBy?.role && ` (${verifiedBy.role})`}
            </p>
          )}
        </div>
      )}
      
      <div className={`flex flex-col ${!isVerified ? 'sm:flex-row' : ''} items-start justify-between gap-4`}>
        {/* Erkanntes Habitat - nur anzeigen, wenn nicht verifiziert */}
        {!isVerified && (
          <div className="space-y-2 flex-1 w-full">
            <div className="text-sm font-medium">Erkannter Habitat (KI)</div>
            <div className="space-y-2">
              {/* Erkannte Habitatfamilie */}
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Habitatfamilie</div>
                <div className="px-3 py-2 border rounded-md bg-gray-50">
                  {detectedFamilie || 'Unbekannt'}
                </div>
              </div>
              
              {/* Erkannter Habitattyp */}
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Habitat</div>
                <div className="px-3 py-2 border rounded-md bg-gray-50">
                  {detectedHabitat || 'Nicht erkannt'}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Effektiver Habitat - immer anzeigen */}
        <div className={`space-y-2 flex-1 w-full ${isVerified ? 'max-w-none' : ''}`}>
          <div className="text-sm font-medium">Effektiver Habitat {isVerified ? '(verifiziert)' : ''}</div>
          {loading ? (
            <div className="px-3 py-2 border rounded-md bg-white flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-gray-500" />
              <span className="text-gray-500">Lade Habitattypen...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Dropdown für Habitatfamilie */}
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Habitatfamilie auswählen</div>
                <Select 
                  value={selectedFamily}
                  onValueChange={handleFamilyChange}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Habitatfamilie auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {habitatFamilies.map((family) => (
                      <SelectItem key={family} value={family}>
                        {family}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Dropdown für Habitate der ausgewählten Familie */}
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Habitat auswählen</div>
                <Select 
                  value={selectedHabitat} 
                  onValueChange={handleHabitatChange}
                  disabled={saving || !selectedFamily}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedFamily ? "Bitte zuerst Familie wählen" : "Habitattyp auswählen"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredHabitats.map((habitat) => (
                      <SelectItem key={habitat._id} value={habitat.name}>
                        {habitat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Zeige Schutzstatus des ausgewählten Habitats an */}
              {selectedHabitatInfo?.schutzstatus && (
                <div className="mt-2 text-sm text-gray-500">
                  Schutzstatus: {normalizeSchutzstatus(selectedHabitatInfo.schutzstatus)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Vorheriger Kommentar, wenn vorhanden */}
      {kommentar && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Vorheriger Kommentar</div>
          <div className="px-3 py-2 bg-blue-50 rounded border border-blue-100 text-sm">
            {kommentar}
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Anmerkung zur Verifizierung</div>
        <Textarea
          placeholder="Ihre Anmerkungen zur Habitat-Verifizierung (z.B. Gründe für die Änderung, besondere Merkmale)"
          value={habitatKommentar}
          onChange={(e) => setHabitatKommentar(e.target.value)}
          disabled={saving}
          rows={3}
        />
      </div>
      
      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={loading || saving || selectedHabitat === ''}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {isVerified ? 'Verifizierung aktualisieren' : 'Effektiven Habitat verifizieren'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 