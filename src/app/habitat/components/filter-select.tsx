'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface FilterSelectProps {
  type: 'gemeinden' | 'habitate' | 'familien' | 'schutzstati' | 'personen' | 'organizations';
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  allLabel: string;
}

export function FilterSelect({
  type,
  value,
  onValueChange,
  placeholder,
  allLabel,
}: FilterSelectProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Lade die Optionen, wenn der Dropdown geöffnet wird
  useEffect(() => {
    if (!isOpen) return;

    const fetchOptions = async () => {
      // Wenn bereits geladen, nicht erneut laden
      if (options.length > 0) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/filter-options?type=${type}`);
        
        if (!response.ok) {
          throw new Error(`Fehler ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data[type] && Array.isArray(data[type])) {
          setOptions(data[type]);
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
  }, [isOpen, type, options.length]);

  return (
    <div className="min-w-[150px]">
      <Select 
        value={value} 
        onValueChange={onValueChange}
        onOpenChange={(open) => setIsOpen(open)}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alle">{allLabel}</SelectItem>
          
          {loading && (
            <div className="flex items-center justify-center py-2 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Wird geladen...
            </div>
          )}
          
          {error && (
            <div className="py-2 text-xs text-red-500">
              Fehler: {error}
            </div>
          )}
          
          {!loading && !error && options.length === 0 && (
            <div className="py-2 text-xs text-gray-500">
              Keine Optionen gefunden
            </div>
          )}
          
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 