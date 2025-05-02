'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';

interface FilterOption {
  value: string;
  count: number;
}

interface MultiSelectFilterProps {
  type: 'gemeinden' | 'habitate' | 'familien' | 'schutzstati' | 'personen' | 'verifizierungsstatus';
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder: string;
  verifizierungsstatus?: string;
}

export function MultiSelectFilter({
  type,
  value,
  onValueChange,
  placeholder,
  verifizierungsstatus = 'alle'
}: MultiSelectFilterProps) {
  const [options, setOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lade die Optionen beim ersten Rendern
  useEffect(() => {
    const fetchOptions = async () => {
      // Wenn bereits geladen, nicht erneut laden
      if (options.length > 0) return;

      setLoading(true);
      setError(null);

      try {
        // URL mit verifizierungsstatus Parameter, wenn dieser vorhanden ist
        const url = new URL('/api/public-filter-options', window.location.origin);
        url.searchParams.append('type', type);
        
        // Nur hinzufügen, wenn wir nicht selbst der Verifizierungsstatus-Filter sind
        if (type !== 'verifizierungsstatus' && verifizierungsstatus !== 'alle') {
          url.searchParams.append('verifizierungsstatus', verifizierungsstatus);
        }
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`Fehler ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data[type] && Array.isArray(data[type])) {
          // Dedupliziere die Optionen basierend auf value
          const uniqueOptions = Array.from(
            new Map(data[type].map((item: FilterOption) => [item.value, item])).values()
          );
          
          // Sortiere die Optionen nach Anzahl (absteigend)
          const sortedOptions = [...uniqueOptions].sort((a, b) => b.count - a.count);
          setOptions(sortedOptions);
        } else {
          console.error('Unerwartetes Datenformat:', data);
          setError('Unerwartetes Datenformat');
        }
      } catch (err) {
        console.error(`Fehler beim Laden der ${type}:`, err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [type, verifizierungsstatus, options.length]);

  // Prüfen, ob ein Wert ausgewählt ist
  const isSelected = (val: string) => value.includes(val);
  
  // Einzelnen Wert auswählen oder abwählen
  const toggleValue = (val: string) => {
    if (isSelected(val)) {
      // Abwählen
      onValueChange(value.filter(v => v !== val));
    } else {
      // Auswählen
      onValueChange([...value, val]);
    }
  };
  
  // Berechne die Gesamtzahl der Dokumente
  const totalCount = options.reduce((sum, option) => sum + option.count, 0);
  
  // Berechne die Höhe basierend auf der Anzahl der Optionen (26px pro Option, maximal 7 Optionen)
  const height = Math.min(options.length, 7) * 25;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-medium">{placeholder} ({totalCount})</h3>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-2 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Wird geladen...
        </div>
      ) : error ? (
        <div className="py-1 text-xs text-red-500">
          Fehler: {error}
        </div>
      ) : options.length === 0 ? (
        <div className="py-1 text-xs text-gray-500">
          Keine Optionen gefunden
        </div>
      ) : (
        <div className="border border-gray-200 rounded-md">
          <ScrollArea style={{ height: options.length > 0 ? `${height}px` : 'auto' }}>
            <div className="space-y-0">
              {/* Filteroptionen */}
              {options.map((option, index) => (
                <div 
                  key={`${option.value}-${index}`}
                  className="flex items-center space-x-2 py-1 px-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                  onClick={() => toggleValue(option.value)}
                >
                  <Checkbox
                    id={`${type}-${index}`}
                    checked={isSelected(option.value)}
                    onCheckedChange={() => toggleValue(option.value)}
                    className="h-3 w-3"
                  />
                  <label 
                    htmlFor={`${type}-${index}`}
                    className="text-xs cursor-pointer flex justify-between w-full"
                  >
                    <span className="truncate max-w-[70%]" title={option.value}>
                      {option.value} ({option.count})
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
} 