'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArchiveList } from './components/archive-list';
import { SearchBar } from './components/search-bar';
import { Pagination } from '@/components/ui/pagination';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function ArchivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [personen, setPersonen] = useState<string[]>([]);
  
  const page = Number(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const selectedPerson = searchParams.get('person') || '';
  
  // Funktion zum Extrahieren eindeutiger Personen aus den Daten
  const extractUniquePersons = (entries: any[]) => {
    if (!entries || entries.length === 0) return [];
    
    const uniquePersons = new Set<string>();
    entries.forEach(entry => {
      if (entry.metadata?.erfassungsperson) {
        uniquePersons.add(entry.metadata.erfassungsperson);
      }
    });
    
    return Array.from(uniquePersons).sort();
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          sortBy,
          sortOrder
        });
        
        if (search) {
          queryParams.set('search', search);
        }
        
        if (selectedPerson) {
          queryParams.set('person', selectedPerson);
        }
        
        const response = await fetch(`/api/archiv?${queryParams.toString()}`);
        
        if (!response.ok) {
          console.error('API-Fehler:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Fehlerdetails:', errorText);
          throw new Error(`Fehler beim Laden der Daten: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
        
        // Extrahiere eindeutige Personen aus den Daten
        // Hier können wir alle Einträge verwenden, falls die API diese Information liefert
        if (result.allPersons) {
          setPersonen(result.allPersons);
        } else if (result.entries) {
          setPersonen(extractUniquePersons(result.entries));
        }
      } catch (err: any) {
        setError(err.message || 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [page, search, sortBy, sortOrder, selectedPerson]);
  
  const handleSearch = (term: string) => {
    // Setzen des Suchbegriffs und zurück zur ersten Seite
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handlePersonChange = (person: string) => {
    const params = new URLSearchParams(searchParams);
    if (person && person !== 'alle') {
      params.set('person', person);
    } else {
      params.delete('person');
    }
    params.set('page', '1');
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams);
    const currentSortBy = params.get('sortBy') || 'updatedAt';
    const currentSortOrder = params.get('sortOrder') || 'desc';
    
    // Wenn das gleiche Feld erneut angeklickt wird, ändere die Sortierrichtung
    if (field === currentSortBy) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'desc'); // Standard ist absteigend
    }
    
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/archiv?${params.toString()}`);
  };
  
  const handleDelete = async (jobId: string) => {
    setDeleteLoading(jobId);
    try {
      const response = await fetch(`/api/archiv/${jobId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Eintrags');
      }
      
      // Datensatz aus der Liste entfernen oder neu laden
      if (data) {
        const updatedEntries = data.entries.filter((entry: any) => entry.jobId !== jobId);
        setData({
          ...data,
          entries: updatedEntries,
          pagination: {
            ...data.pagination,
            total: data.pagination.total - 1
          }
        });
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler beim Löschen'}`);
    } finally {
      setDeleteLoading(null);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <h1 className="text-3xl font-bold mb-6">Archiv der Habitaterfassungen</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <SearchBar onSearch={handleSearch} initialValue={search} />
        </div>
        
        <div className="min-w-[200px]">
          <Select 
            value={selectedPerson || 'alle'} 
            onValueChange={handlePersonChange}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Person auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Personen</SelectItem>
              {personen.map((person) => (
                <SelectItem key={person} value={person}>
                  {person}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 py-4 bg-red-50 px-4 rounded">Fehler: {error}</div>
      ) : !data || data.entries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-500">Keine Einträge gefunden</p>
          {search && (
            <button 
              className="mt-4 text-blue-500 underline"
              onClick={() => handleSearch('')}
            >
              Suche zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500 flex justify-between items-center">
            <span>{data.pagination.total} {data.pagination.total === 1 ? 'Eintrag' : 'Einträge'} gefunden</span>
            <span className="text-xs italic text-gray-400 hidden sm:inline-block">Bei kleinem Bildschirm horizontal scrollen</span>
          </div>
          
          <div className="overflow-x-auto -mx-2 sm:mx-0 px-2">
            <ArchiveList 
              entries={data.entries} 
              onSort={handleSort} 
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              onDelete={handleDelete}
            />
          </div>
          
          {data.pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={data.pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
} 